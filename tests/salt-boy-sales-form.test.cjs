const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../app/admin/page.tsx'),'utf8');
const start=source.indexOf('  async function handleSalesUpdate('),end=source.indexOf('  function handleSalesDateChange(',start);
const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:9,module:1}}).outputText;
test('sales handler saves 55,952 with no goal instead of blocking the submit button',async()=>{
  const calls=[],errors=[],messages=[],updating=[];
  const db={rpc:async(name,args)=>{assert.equal(updating.at(-1),true);calls.push({name,args});return {data:name.includes('preview')?[{week_start:'2026-11-23',week_end:'2026-11-29',weekly_sales:55952,total_sales:55952}]:null,error:null}}};
  const handler=new Function('supabase','salesUpdating','salesDate','todaySales','salesGoal','setMessage','setErrorMessage','setSalesUpdating','loadSalesData','formatShortDateKey','addDaysToDateKey','window',code+';return handleSalesUpdate;')(db,false,'2026-11-24','55952','',v=>messages.push(v),v=>errors.push(v),v=>updating.push(v),async()=>{},v=>v,()=> '2026-11-25',{confirm:()=>true});
  await handler({preventDefault(){}});
  assert.equal(errors.filter(Boolean).length,0);
  assert.deepEqual(calls.map(c=>c.name),['salt_boy_preview_sales_day_admin','salt_boy_upsert_sales_day_admin']);
  assert.deepEqual(calls[1].args,{p_sales_date:'2026-11-24',p_sales:55952,p_goal:null});
  assert(messages.some(m=>m.includes('売上を反映しました')));
  assert.deepEqual(updating,[true,false]);
});
