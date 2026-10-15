import './style.css';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { Filesystem,Directory,Encoding } from '@capacitor/filesystem';
import { emptyState,validateState,parseBackup,mergeBackup,makeId } from './store.js';
const $=id=>document.getElementById(id), KEY='neocarnivore.planner.v1';
let state, queue=Promise.resolve(), editing=null, readyMode=null, broken=false,raw=null;
const notice=text=>$('status').textContent=text;
const label=m=>m==='meat'?'肉食':'移行食';
async function persist(){
  if(broken)throw Error('保存データの復旧が必要です。');
  const value=JSON.stringify(validateState(state));
  const write=queue.catch(()=>{}).then(()=>Preferences.set({key:KEY,value}));
  queue=write; write.catch(()=>notice('保存できませんでした。バックアップを書き出し、空き容量を確認してください。'));
  return write;
}
function autosave(){persist().catch(()=>{});}
const media=matchMedia('(prefers-color-scheme: light)');
function theme(){const v=state.appearance==='system'?(media.matches?'light':'dark'):state.appearance;document.body.classList.toggle('light',v==='light');$('plannerFrame').contentWindow?.plannerAdapter?.theme(v);}
function frame(){return $('plannerFrame').contentWindow?.plannerAdapter;}
async function external(url){try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))return;if(Capacitor.isNativePlatform())await Browser.open({url:parsed.href});else window.open(parsed.href,'_blank','noopener,noreferrer');}catch{notice('リンクを開けませんでした。');}}
window.plannerBridge={
  storage(mode){return {getItem:k=>Object.hasOwn(state.storage[mode],k)?state.storage[mode][k]:null,setItem(k,v){if(['__proto__','constructor'].includes(k))return;state.storage[mode][k]=String(v);autosave();},removeItem(k){delete state.storage[mode][k];autosave();}};},
  session(mode){return {getItem:k=>sessionStorage.getItem(`${mode}:${k}`),setItem:(k,v)=>sessionStorage.setItem(`${mode}:${k}`,v),removeItem:k=>sessionStorage.removeItem(`${mode}:${k}`)};},
  draft(mode,data){if(!broken){state.drafts[mode]=structuredClone(data);autosave();}},
  loaded(mode){readyMode=mode;const d=state.drafts[mode];if(d)frame().restore(d);theme();},external
};
async function switchMode(mode,restore){
  if(frame()&&readyMode){state.drafts[readyMode]=frame().snapshot();}
  if(restore)state.drafts[mode]=structuredClone(restore);
  state.mode=mode;editing=null;readyMode=null;await persist();
  $('settings').hidden=true;$('planner').hidden=false;$('editing').textContent='';
  $('plannerFrame').src=`planners/${mode}/index.html`;
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
}
function history(){
  $('history').replaceChildren();
  for(const p of [...state.plans].sort((a,b)=>b.date.localeCompare(a.date))){
    const article=document.createElement('article'),title=document.createElement('strong'),summary=document.createElement('p');title.textContent=`${p.date} · ${label(p.mode)}`;summary.textContent=p.summary;
    const edit=document.createElement('button');edit.textContent='再編集';edit.onclick=async()=>{await switchMode(p.mode,p.snapshot);editing=p.id;$('planDate').value=p.date;$('editing').textContent='保存済みプランを編集中（保存で上書き）';};
    const del=document.createElement('button');del.textContent='削除';del.onclick=async()=>{if(confirm('このプランを削除しますか？')){state.plans=state.plans.filter(x=>x.id!==p.id);await persist();history();}};
    article.append(title,summary,edit,del);$('history').append(article);
  }
  if(!state.plans.length)$('history').textContent='保存されたプランはありません。';
}
function guarded(fn){return async(...args)=>{try{await fn(...args);}catch(e){notice(e.message||'処理に失敗しました。');}};}
$('savePlan').onclick=guarded(async()=>{
  if(!frame()||!readyMode)throw Error('計算機の読み込み中です。');
  const snapshot=frame().snapshot();if(!snapshot.calculated)throw Error('先に計算を実行してください。');
  const date=$('planDate').value;if(!date)throw Error('日付を選択してください。');
  const p={id:editing||makeId(),date,mode:state.mode,snapshot,summary:frame().summary()};
  const next=structuredClone(state),i=next.plans.findIndex(x=>x.id===p.id);if(i<0)next.plans.push(p);else next.plans[i]=p;validateState(next);state=next;await persist();editing=p.id;$('editing').textContent='このプランを編集中（保存で上書き）';notice('プランを保存しました。');
});
$('newPlan').onclick=()=>{editing=null;$('editing').textContent='新しい履歴として保存します。';};
$('sharePlan').onclick=guarded(async()=>{if(!frame()?.snapshot().calculated)throw Error('先に計算してください。');await Share.share({title:'肉食プランナー',text:`${$('planDate').value} ${label(state.mode)}\n${frame().summary()}\n独自モデルによる参考値です。`});notice('共有画面を閉じました。');});
$('settingsButton').onclick=()=>{$('planner').hidden=true;$('settings').hidden=false;history();};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=guarded(()=>switchMode(b.dataset.mode));
$('appearance').onchange=guarded(async()=>{state.appearance=$('appearance').value;theme();await persist();});media.addEventListener('change',theme);
$('exportData').onclick=guarded(async()=>{
  const data=broken&&raw?raw:JSON.stringify(state,null,2),filename=`carnivore-backup-${new Date().toISOString().slice(0,10)}.json`;
  if(Capacitor.isNativePlatform()){
    const file=await Filesystem.writeFile({path:filename,data,directory:Directory.Cache,encoding:Encoding.UTF8});
    try{await Share.share({title:'プランのバックアップ',files:[file.uri]});}finally{await Filesystem.deleteFile({path:filename,directory:Directory.Cache});}
  }else{const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  notice('バックアップの書き出しを実行しました。');
});
$('importData').onchange=guarded(async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>2000000)throw Error('ファイルが大きすぎます。');const incoming=parseBackup(await f.text());const next=mergeBackup(state,incoming);if(!confirm(`履歴を${next.plans.length-state.plans.length}件追加します。よろしいですか？`))return;state=next;await persist();history();notice('履歴に追加しました。再編集で開けます。');});
$('deleteData').onclick=guarded(async()=>{if(!confirm('入力・プリセット・履歴・設定をすべて削除します。元に戻せません。続けますか？'))return;await queue.catch(()=>{});state=emptyState();broken=false;sessionStorage.clear();await persist();$('appearance').value='system';await switchMode('meat');theme();notice('すべて削除しました。');});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state&&!broken)autosave();});
function resizeFrame(){const el=$('plannerFrame');if(!$('planner').hidden){const h=window.visualViewport?.height||innerHeight;el.style.height=`${Math.max(180,h-el.getBoundingClientRect().top-$('status').offsetHeight-24)}px`;}}
window.visualViewport?.addEventListener('resize',resizeFrame);window.addEventListener('resize',resizeFrame);$('plannerFrame').addEventListener('load',resizeFrame);
try{
  const {value}=await Preferences.get({key:KEY});raw=value;state=value?validateState(JSON.parse(value)):emptyState();
  $('planDate').value=new Date().toLocaleDateString('sv-SE');$('appearance').value=state.appearance;theme();await switchMode(state.mode);notice('端末内で計算・保存できます。');
}catch{broken=true;state=emptyState();$('planner').hidden=true;$('settings').hidden=false;notice('保存データを読み込めません。既存データは上書きしません。再起動をお試しください。復旧できない場合は削除が必要です。');}
