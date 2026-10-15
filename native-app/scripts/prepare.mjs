import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
for (const [mode,icon] of [['meat','icon-meat-194.png'],['transition','icon-avocado-194.png']]) {
  const dir=path.join(root,'public/planners',mode); fs.mkdirSync(dir,{recursive:true});
  let html=fs.readFileSync(path.join(root,'vendor',mode,'index.html'),'utf8');
  html=html.replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]*>/g,'');
  html=html.replace(/localStorage/g,'window.appStorage').replace(/sessionStorage/g,'window.appSession');
  if(mode==='meat')html=html.replace('  function render(){',`  window.weekAdapter={snapshot:()=>state.days.map(d=>d.type),restore:days=>{if(Array.isArray(days)&&days.length===7){state.days=buildDefaultDays().map((d,i)=>({...d,type:days[i]==='train'?'train':'rest'}));render();}}};\n  function render(){`);
  html=html.replace(/<head>/i,`<head><script>window.appStorage=parent.plannerBridge.storage('${mode}');window.appSession=parent.plannerBridge.session('${mode}');<\/script>`);
  html=html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
  // Retain calculations, but remove unsupported claims of medical validation.
  html=html.replace(/各プランはカーニボア食[\s\S]*?参考: Virta Health[\s\S]*?<\/p>/, 'この計算は既存Web版の独自モデルによる参考値です。個別の医学的根拠や安全性は検証されていません。詳細はアプリの設定をご覧ください。</p>');
  html += `<style>html{font:-apple-system-body}html,body{max-width:100%;overflow-x:hidden}input,select,button{font-size:max(16px,1em)!important;min-height:44px}input,select{scroll-margin:70px}.goals button{white-space:nowrap;padding:10px 4px}label,.small{font-size:.85em}#neoOpening{display:none!important}body{padding-bottom:32px!important} @media(max-width:360px){.formGrid>.pair{grid-template-columns:minmax(0,1fr)!important}.row6{grid-template-columns:repeat(2,minmax(0,1fr))!important}} @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style><script src="../adapter.js"></script>`;
  fs.writeFileSync(path.join(dir,'index.html'),html); fs.copyFileSync(path.join(root,'vendor',mode,icon),path.join(dir,icon));
}
fs.copyFileSync(path.join(root,'src/adapter.js'),path.join(root,'public/planners/adapter.js'));
await import('./verify-bundle.mjs');
