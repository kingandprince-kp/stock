const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
function fixture(isActive, sourceType='store_comment', rpc=async()=>({data:214,error:null})) {
  const cells=[]; let cursor=0; let tree; const calls=[];
  const mod={exports:{}};
  const hooks={
    useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value;}];},
    useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i];}
  };
  const runtime={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/admin/hide-store-action.tsx'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}
  }).outputText;
  new Function('require','module','exports',source)(name=>{
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return runtime;
    if(name==='@/app/lib/supabase')return {supabase:{rpc:async(name,args)=>{calls.push({name,args});return rpc(name,args);}}};
    throw Error(name);
  },mod,mod.exports);
  const props={isActive,sourceType,sourceId:sourceType==='store_info'?55:54,storeName:'検証店舗',defaultNote:'取扱無し'};
  function render(){cursor=0;tree=mod.exports.default(props);return tree;}
  function nodes(node,match){if(!node||typeof node!=='object')return[];if(Array.isArray(node))return node.flatMap(n=>nodes(n,match));return[...(match(node)?[node]:[]),...nodes(node.props?.children,match)];}
  function text(node){if(node==null||typeof node==='boolean')return'';if(typeof node!=='object')return String(node);if(Array.isArray(node))return node.map(text).join('');return text(node.props?.children);}
  const find=type=>nodes(tree,node=>node.type===type)[0];
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  render();
  return{calls,find,render,text:()=>text(tree),fill(value){find('textarea').props.onChange({target:{value}});render();},
    async click(){find('button').props.onClick();await flush();render();},
    async flush(){await flush();render();}};
}
test('hidden state from DB offers restore immediately, including after remount',()=>{
  for(const source of ['store_info','store_comment']){
    const ui=fixture(false,source);
    assert.match(ui.text(),/店舗: 非表示中/);
    assert.match(ui.text(),/メモを保存して店舗を再表示/);
    assert.equal(ui.find('textarea').props.value,'');
    assert.equal(fixture(false,source).find('button').props.disabled,false);
  }
});
test('hide and restore switch the action in both directions and preserve source identity',async()=>{
  for(const source of ['store_info','store_comment']){
    const ui=fixture(true,source);
    await ui.click();
    assert.match(ui.text(),/店舗: 非表示中/);
    assert.match(ui.text(),/メモを保存して店舗を再表示/);
    ui.fill('取扱いを再確認したため');
    await ui.click();
    assert.match(ui.text(),/店舗: 表示中/);
    assert.match(ui.text(),/メモを保存して店舗を非表示/);
    assert.deepEqual(ui.calls.map(c=>c.name),['salt_boy_hide_store_admin','salt_boy_restore_store_admin']);
    assert.equal(ui.calls[1].args.p_source_type,source);
    assert.equal(ui.calls[1].args.p_note,'取扱いを再確認したため');
    assert.equal(ui.find('textarea').props.value,'取扱無し');
  }
});
test('blank restore reason and unknown visibility cannot mutate stores',async()=>{
  const hidden=fixture(false);await hidden.click();assert.equal(hidden.calls.length,0);assert.match(hidden.text(),/再表示する理由/);
  const unknown=fixture(undefined);assert.equal(unknown.find('button').props.disabled,true);await unknown.click();assert.equal(unknown.calls.length,0);
});
test('failed restore retains hidden state and typed reason for retry',async()=>{
  let attempts=0;
  const ui=fixture(false,'store_comment',async()=>++attempts===1?{error:{message:'通信エラー'}}:{error:null,data:214});
  ui.fill('確認済みのため再表示');await ui.click();
  assert.match(ui.text(),/店舗: 非表示中/);assert.match(ui.text(),/通信エラー/);assert.equal(ui.find('textarea').props.value,'確認済みのため再表示');
  await ui.click();assert.match(ui.text(),/店舗: 表示中/);
});
test('double click while saving issues a single mutation',async()=>{
  let release;
  const ui=fixture(false,'store_comment',()=>new Promise(resolve=>{release=resolve;}));
  ui.fill('確認済み');await ui.click();await ui.click();assert.equal(ui.calls.length,1);
  release({error:null,data:214});await ui.flush();assert.match(ui.text(),/店舗: 表示中/);
});
