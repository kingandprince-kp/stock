const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', source)((name) => {
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')));
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const model = load('app/stockchecker/saltboy/first-week-model.ts');
const shipping = load('app/stockchecker/saltboy/shipping-estimate.ts');
const { listingFirstWeek } = load('app/stockchecker/saltboy/listing-first-week.ts');
const rule = (overrides = {}) => ({ store_id: 307, basis: 'shipping', cutoff_date: '2026-11-29', cutoff_time: null, whole_day: true, evidence: 'verified test source', verified_at: '2026-11-22T00:00:00Z', order_cutoff_kind: 'none', order_cutoff_time: null, business_weekdays: null, excluded_dates: null, calendar_verified_from: null, calendar_verified_until: null, ...overrides });
const date = (value, overrides = {}) => ({ basis: 'shipping', kind: 'date', date: value, source: 'product_page', sourceDetail: '', condition: '', ...overrides });
const range = (referenceDate, maxDays, overrides = {}) => ({ basis: 'shipping', kind: 'range', minDays: 0, maxDays, source: 'product_page', sourceDetail: '', condition: '', relative: { referenceDate, referenceTime: '', anchor: 'order', calendar: 'calendar', orderType: 'stock' }, ...overrides });
test('explicit shipping dates use the site deadline without requiring retailer registration', () => {
  for (const inputRule of [undefined, rule({basis:'delivery'}), rule({evidence:''})]) {
    assert.equal(model.firstWeekEstimate(date('2026-11-25'), inputRule).status, 'likely');
    assert.equal(model.firstWeekEstimate(date('2026-11-28'), inputRule).status, 'likely');
    assert.equal(model.firstWeekEstimate(date('2026-11-30'), inputRule).status, 'unlikely');
  }
  assert.match(model.firstWeekEstimate(date('2026-11-25')).reason, /サイトの発送目安/);
  assert.equal(model.firstWeekEstimate(date('2026-11-29')).status,'check');
  assert.equal(model.firstWeekEstimate(date('2026-11-25'),undefined,{cutoff_date:null}).status,'check');
  assert.equal(model.firstWeekEstimate(date('2026-11-27'),rule()).status,'likely');
  assert.equal(model.firstWeekEstimate(date('2026-11-27',{basis:'delivery'})).status,'check');
  assert.equal(model.firstWeekEstimate(date('2026-11-27',{condition:'入金後'})).status,'check');
});
test('site fallback classifies explicit shipping ranges without inventing relative-day conditions', () => {
  const input={...date('2026-11-25'),kind:'date_range',earliestDate:'2026-11-25',latestDate:'2026-11-28'};
  assert.equal(model.firstWeekEstimate(input).status,'likely');
  assert.equal(model.firstWeekEstimate({...input,latestDate:'2026-11-30'}).status,'check');
  assert.equal(model.firstWeekEstimate({...input,earliestDate:'2026-11-30',latestDate:'2026-12-01'}).status,'unlikely');
  assert.equal(model.firstWeekEstimate(range('2026-11-25',1)).status,'check');
  assert.equal(model.firstWeekEstimate(range('2026-11-25',1),rule({evidence:''})).status,'check');
});
test('listing uses the same configured site deadline for badge and filter result', () => {
  const item={store_id:307,product_id:1,purchase_variant:null,stock_status:'in_stock',created_at:'2026-11-24T14:03:00Z',shipping_estimate:date('2026-11-25')};
  const inventory={rules:[],firstWeek:[],settings:{...model.DEFAULT_FIRST_WEEK_SETTINGS,cutoff_date:'2026-11-29'}};
  assert.equal(listingFirstWeek(item,307,1,null,inventory).result.status,'likely');
  assert.equal(listingFirstWeek(item,307,1,null,{...inventory,settings:{...inventory.settings,cutoff_date:'2026-11-24'}}).result.status,'unlikely');
});
test('Sunday shipment and Monday arrival use independent cutoffs', () => {
  assert.equal(model.firstWeekEstimate(date('2026-11-29'), rule()).status, 'likely');
  assert.equal(model.firstWeekEstimate(date('2026-11-30'), rule()).status, 'unlikely');
  assert.equal(model.firstWeekEstimate(date('2026-11-30', { basis: 'delivery' }), rule({ basis: 'delivery', cutoff_date: '2026-11-30' })).status, 'likely');
  assert.equal(model.firstWeekEstimate(date('2026-11-30', { basis: 'delivery' }), rule()).status, 'check');
});
test('unknown cutoff-day time stays check; dates before or after remain classifiable', () => {
  const r = rule({ whole_day: false });
  assert.equal(model.firstWeekEstimate(date('2026-11-28'), r).status, 'likely');
  assert.equal(model.firstWeekEstimate(date('2026-11-29'), r).status, 'check');
  assert.equal(model.firstWeekEstimate(date('2026-11-30'), r).status, 'unlikely');
});
test('explicit cutoff time handles before, exactly, after, and unknown time', () => {
  const r = rule({ whole_day: false, cutoff_time: '17:00:00' });
  for (const [time, expected] of [['16:59:59','likely'], ['17:00:00','likely'], ['17:00:01','unlikely'], [undefined,'check']]) {
    assert.equal(model.firstWeekEstimate(date('2026-11-29', { time }), r).status, expected, time);
  }
});
test('date ranges spanning the deadline are check, not red or blue', () => {
  const value = { ...date('2026-11-28'), kind: 'date_range', earliestDate: '2026-11-28', latestDate: '2026-11-30' };
  assert.equal(model.firstWeekEstimate(value, rule()).status, 'check');
  assert.equal(model.firstWeekEstimate({ ...value, latestDate: '2026-11-29' }, rule()).status, 'likely');
  assert.equal(model.firstWeekEstimate({ ...value, earliestDate: '2026-11-30', latestDate: '2026-12-01' }, rule()).status, 'unlikely');
});
test('relative days depend on the supplied order date: Wednesday +4, Friday +2', () => {
  for (const [day, days] of [['2026-11-25',4],['2026-11-27',2]]) {
    const result = model.firstWeekEstimate(range(day, days), rule());
    assert.equal(result.normalized.latestDate, '2026-11-29'); assert.equal(result.status, 'likely');
  }
  assert.equal(model.firstWeekEstimate(range('2026-11-27',3), rule()).status, 'check');
});
test('legacy relative days never acquire an invented order date or business calendar', () => {
  const { relative, ...legacy } = range('2026-11-25', 1);
  assert.equal(model.firstWeekEstimate(legacy, rule()).status, 'check');
  assert.equal(model.firstWeekEstimate(range('2026-11-25',1,{relative:{...relative,calendar:'unknown'}}), rule()).status, 'check');
  assert.equal(model.firstWeekEstimate(range('2026-11-25',1), rule({order_cutoff_kind:'unknown'})).status, 'check');
});
test('business-day conversion skips confirmed weekends and holidays, within the confirmed calendar', () => {
  const context = { referenceDate:'2026-11-20',referenceTime:'12:00',anchor:'order',calendar:'business',orderType:'stock' };
  const value = range('2026-11-20',1,{minDays:1,relative:context});
  const r = rule({business_weekdays:[1,2,3,4,5],excluded_dates:['2026-11-23'],calendar_verified_from:'2026-11-20',calendar_verified_until:'2026-11-30'});
  assert.equal(model.normalizeTiming(value,r).latestDate,'2026-11-24');
  assert.equal(model.firstWeekEstimate(value,r).status,'likely');
  assert.equal(model.firstWeekEstimate(value,rule()).status,'check');
  assert.equal(model.firstWeekEstimate(value,{...r,calendar_verified_until:'2026-11-23'}).status,'check');
  assert.equal(model.firstWeekEstimate(value,{...r,calendar_verified_from:'2026-11-21'}).status,'check');
});
test('after the order cutoff rolls to the next eligible day; seconds are respected', () => {
  const r = rule({order_cutoff_kind:'time',order_cutoff_time:'13:00:00',business_weekdays:[1,2,3,4,5],calendar_verified_from:'2026-11-20',calendar_verified_until:'2026-12-02'});
  const relative = {referenceDate:'2026-11-27',referenceTime:'13:00:00',anchor:'order',calendar:'business',orderType:'stock'};
  assert.equal(model.normalizeTiming(range('2026-11-27',0,{relative}),r).earliestDate,'2026-11-27');
  assert.equal(model.normalizeTiming(range('2026-11-27',0,{relative:{...relative,referenceTime:'13:00:01'}}),r).earliestDate,'2026-11-30');
  assert.equal(model.firstWeekEstimate(range('2026-11-27',0,{relative:{...relative,referenceTime:''}}),r).status,'check');
});
test('preorders, backorders, payment and conditional wording retain their prerequisites', () => {
  const relative = range('2026-11-25',1).relative;
  for (const orderType of ['unknown','preorder','backorder']) {
    assert.equal(model.firstWeekEstimate(range('2026-11-25',1,{relative:{...relative,orderType}}),rule()).status,'check');
  }
  assert.equal(model.firstWeekEstimate(range('2026-11-25',1,{relative:{...relative,orderType:'preorder',anchor:'ready'}}),rule()).status,'likely');
  assert.equal(model.firstWeekEstimate(date('2026-11-28',{condition:'入金確認後'}),rule()).status,'check');
  assert.equal(model.firstWeekEstimate(date('2026-11-28',{condition:'入金確認後',conditionsMet:true}),rule()).status,'likely');
});
test('unidentified wording stays check', () => {
  assert.equal(model.firstWeekEstimate({...date('2026-11-25'),kind:'other',wording:'入荷次第発送'},rule()).status,'check');
});
test('parser validates dates, ranges, times and seven-day input; legacy reads preserve old ranges', () => {
  assert.equal(shipping.parseShippingEstimate(date('2026-02-30')),null);
  assert.equal(shipping.parseShippingEstimate(date('2026-11-29',{time:'24:00'})),null);
  assert.equal(shipping.parseShippingEstimate({...date('2026-11-29'),kind:'date_range',earliestDate:'2026-11-30',latestDate:'2026-11-29'}),null);
  assert.equal(shipping.parseShippingEstimate(range('2026-11-25',30)),null);
  assert.equal(shipping.parseShippingEstimate(range('2026-11-25',30),30).maxDays,30);
  assert.ok(shipping.parseShippingEstimate(range('2026-11-25',7,{basis:'delivery'})));
});
test('raw wording and confirmation time survive parse/retry without changing payload', () => {
  const value={...date('2026-11-29'),originalText:'11月29日〜30日お届け',confirmedAt:'2026-11-22T13:00:00+09:00',conditionsMet:false};
  const once=shipping.parseShippingEstimate(value),twice=shipping.parseShippingEstimate(once);
  assert.deepEqual(once,twice);assert.equal(once.confirmedAt,'2026-11-22T04:00:00.000Z');
});
test('JST midnight is independent of server timezone', () => {
  assert.equal(model.japanDate('2026-11-28T15:00:00Z'),'2026-11-29');
  assert.equal(model.jstMillis('2026-11-29','17:00'),Date.parse('2026-11-29T08:00:00Z'));
});
const physical = (overrides={}) => ({cutoff_date:'2026-11-29',cutoff_kind:'time',cutoff_time:'17:00',evidence:'当日店舗に確認',verified_at:'2026-11-22T00:00:00Z',...overrides});
test('physical cutoff display and comparison use the same confirmed date/time', () => {
  const info=physical(),cutoff=model.jstMillis('2026-11-29','17:00');
  assert.equal(model.physicalFirstWeek(info,cutoff-1).status,'likely');
  assert.equal(model.physicalFirstWeek(info,cutoff).status,'likely');
  assert.equal(model.physicalFirstWeek(info,cutoff+1).status,'unlikely');
  assert.match(model.physicalFirstWeek(info,cutoff).cutoffLabel,/17:00/);
});
test('closing time must be confirmed for that exact closing date; ordinary hours are never inferred', () => {
  const info=physical({cutoff_kind:'closing',cutoff_time:null,closing_time:'20:00',closing_verified_date:'2026-11-29'});
  const cutoff=model.jstMillis('2026-11-29','20:00');
  assert.equal(model.physicalFirstWeek(info,cutoff).status,'likely');
  assert.equal(model.physicalFirstWeek(info,cutoff+1).status,'unlikely');
  assert.equal(model.physicalFirstWeek({...info,closing_verified_date:'2026-11-28'},cutoff).status,'check');
  assert.equal(model.physicalFirstWeek({...info,closing_time:null,business_hours:'10時〜20時'},cutoff).status,'check');
  assert.equal(model.physicalFirstWeek({...info,evidence:null},cutoff).status,'check');
  assert.equal(model.physicalFirstWeek(undefined,cutoff).status,'check');
});
test('listing source selection preserves bonus variants and takes the latest confirmed source', () => {
  const item={store_id:308,product_id:1,purchase_variant:'special',quantity:0,stock_status:'in_stock',created_at:'2026-11-22T00:00:00Z',shipping_estimate:date('2026-12-01')};
  const inventory={rules:[rule({store_id:308})],firstWeek:[{store_id:308,product_id:1,purchase_variant:'special',estimate_basis:'shipping',earliest_date:'2026-11-27',latest_date:'2026-11-28',note:null,evidence:'verified',verified_at:'2026-11-23T00:00:00Z'}]};
  assert.equal(listingFirstWeek(item,308,1,'special',inventory).result.status,'likely');
  assert.equal(listingFirstWeek(item,308,1,'no_special',inventory).result.status,'unlikely');
  assert.equal(listingFirstWeek({...item,created_at:'2026-11-24T00:00:00Z'},308,1,'special',inventory).result.status,'unlikely');
  assert.equal(listingFirstWeek(undefined,308,1,'no_special',inventory),null);
});
