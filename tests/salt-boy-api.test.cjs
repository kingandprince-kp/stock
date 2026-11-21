const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = resolve(__dirname, '..', relative);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
function query(rows, columns) {
  let result = rows;
  const builder = {
    eq(key, value) { result = result.filter((row) => row[key] === value); return this; },
    not(key, operator, value) { assert.equal(operator, 'is'); result = result.filter((row) => row[key] !== value); return this; },
    lt(key, value) { result = result.filter((row) => row[key] < value); return this; },
    order() { return this; }, limit(n) { result = result.slice(0, n); return this; },
    then(ok, bad) { return Promise.resolve({ data: result.map((row) => Object.fromEntries(columns.split(',').map((key) => [key, row[key]]))), error: null }).then(ok, bad); },
    async maybeSingle() { return { data: result[0] ?? null, error: null }; },
  };
  return builder;
}
const hash = (id) => createHash('sha256').update(id).digest('hex');
const clientId = 'test-browser-random-owner-12345';
const requestId = '88c91f5a-57be-48ae-8e54-f830d278d832';
const body = () => ({ storeId: 307, items: [{ productId: 1, quantity: 0, stockStatus: 'in_stock' }], clientId, requestId, turnstileToken: 'test-token' });
const request = (value, path = 'inventory-report', origin = 'https://kingandprince-stock.vercel.app') => new Request(`https://kingandprince-stock.vercel.app/api/salt-boy/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(value) });

test('inventory API verifies Turnstile and sends normalized per-listing estimates to checked RPC', async () => {
  const previous = { fetch: global.fetch, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, secret: process.env.TURNSTILE_SECRET_KEY };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-key';
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  let calls = [], security = [], verification = { success: true, hostname: 'kingandprince-stock.vercel.app', action: 'inventory_report' }, rpcError = null;
  const db = {
    async rpc(name, args) { calls.push({ name, args }); return { data: [{ report_id: 1 }], error: rpcError }; },
    from(table) { return { select: (cols) => query([{ review_status: 'approved' }], cols), insert: async (row) => { security.push({ table, row }); return { error: null }; } }; },
  };
  global.fetch = async () => Response.json(verification);
  const { POST } = load('app/api/salt-boy/inventory-report/route.ts', {
    '@/app/stockchecker/saltboy/data': { inventoryDb: () => db },
    '@/app/stockchecker/saltboy/shipping-estimate': load('app/stockchecker/saltboy/shipping-estimate.ts'),
  });
  try {
    let value = body();
    value.items[0].shippingEstimate = { basis: 'delivery', kind: 'date', date: '2026-11-28', source: 'product_page' };
    let response = await POST(request(value));
    assert.equal(response.status, 200);
    assert.equal(calls[0].name, 'salt_boy_submit_inventory_checked');
    assert.equal(calls[0].args.p_client_hash, hash(clientId));
    assert.equal(calls[0].args.p_items[0].shipping_estimate.basis, 'delivery');
    assert.equal(calls[0].args.p_items[0].auto_publish, true);
    assert.equal(calls[0].args.p_request_id, requestId);
    for (const invalid of [{ success: false }, { ...verification, hostname: 'wrong.example' }, { ...verification, action: 'wrong_action' }]) {
      calls = []; verification = invalid;
      response = await POST(request(body()));
      assert.equal(response.status, 403); assert.equal(calls.length, 0);
    }
    assert.ok(security.every((row) => row.table === 'salt_boy_security_events'));
    verification = { success: true, hostname: 'kingandprince-stock.vercel.app', action: 'inventory_report' };
    for (const invalid of [null, { ...body(), items: [{ ...body().items[0], comment: 123 }] }, { ...body(), items: [{ ...body().items[0], shippingEstimate: { kind: 'range', minDays: 0, maxDays: 30, basis: 'shipping', source: 'product_page' } }] }]) {
      response = await POST(request(invalid)); assert.equal(response.status, 400);
    }
    response = await POST(request(body(), 'inventory-report', 'https://other.example'));
    assert.equal(response.status, 403);
    rpcError = { code: 'P0429', message: '同じ店舗・同じ商品への連続投稿は、3分以上時間をおいてください。' };
    response = await POST(request(body())); assert.equal(response.status, 429);
    assert.match((await response.json()).message, /3分/);
    rpcError = { code: '23505', message: 'different payload' };
    response = await POST(request(body())); assert.equal(response.status, 409);
    rpcError = null;
    global.fetch = async () => { throw new Error('simulated timeout'); };
    response = await POST(request(body())); assert.equal(response.status, 500);
    global.fetch = async () => Response.json(verification);
    response = await POST(request(body())); assert.equal(response.status, 200);
    assert.equal(calls.at(-1).args.p_request_id, requestId, 'retry must preserve the request ID');
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [['NEXT_PUBLIC_SUPABASE_URL', previous.url], ['SUPABASE_SERVICE_ROLE_KEY', previous.key], ['TURNSTILE_SECRET_KEY', previous.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('own reports are scoped to the browser; deletion is idempotent and cannot delete another owner', async () => {
  const rows = [
    { id: 1, client_hash: hash(clientId), store_id: 307, deleted_at: null },
    { id: 2, client_hash: hash('another-owner'), store_id: 308, deleted_at: null },
  ];
  const db = {
    from() { return { select: (columns) => query(rows, columns) }; },
    async rpc(name, args) {
      assert.equal(name, 'salt_boy_delete_own_inventory_report');
      const row = rows.find((row) => row.id === args.p_report_id && row.client_hash === args.p_client_hash && row.deleted_at === null);
      if (row) row.deleted_at = new Date().toISOString();
      return { data: !!row, error: null };
    },
  };
  const { POST } = load('app/api/salt-boy/own-reports/route.ts', { '@/app/stockchecker/saltboy/data': { inventoryDb: () => db } });
  let response = await POST(request({ action: 'list', clientId }, 'own-reports'));
  const result = await response.json();
  assert.equal(result.reports.length, 1); assert.equal(result.reports[0].id, 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(result).includes('client_hash'));
  for (const id of [1, 1, 2]) {
    response = await POST(request({ action: 'delete', clientId, reportId: id }, 'own-reports'));
    assert.equal(response.status, id === 2 ? 404 : 200);
  }
  assert.equal(rows[1].deleted_at, null);
  response = await POST(request({ action: 'list', clientId, before: -1 }, 'own-reports'));
  assert.equal(response.status, 400);
  response = await POST(request({ action: 'list' }, 'own-reports'));
  assert.equal(response.status, 400);
  response = await POST(request({ action: 'delete', clientId, reportId: 1 }, 'own-reports', 'https://other.example'));
  assert.equal(response.status, 403);
});
