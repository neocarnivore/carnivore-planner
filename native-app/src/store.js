export const MODES=['meat','transition'];
export function makeId(){
  if(globalThis.crypto.randomUUID)return crypto.randomUUID();
  const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  return Array.from(b,(n,i)=>([4,6,8,10].includes(i)?'-':'')+n.toString(16).padStart(2,'0')).join('');
}
export const emptyState=()=>({version:1,appearance:'system',mode:'meat',storage:{meat:{},transition:{}},drafts:{},plans:[]});
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
function formValid(form){return plain(form)&&Object.keys(form).length<60&&Object.entries(form).every(([k,v])=>/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)&&k!=='constructor'&&['string','number','boolean'].includes(typeof v)&&String(v).length<300);}
function snapshotValid(s){return plain(s)&&formValid(s.form)&&typeof s.calculated==='boolean'&&(s.day===undefined||/^\d{1,3}$/.test(String(s.day)))&&(s.week===undefined||(Array.isArray(s.week)&&[0,7].includes(s.week.length)&&s.week.every(v=>['train','rest'].includes(v))));}
export function validateState(s){
  if(!plain(s)||s.version!==1||!MODES.includes(s.mode)||!['system','light','dark'].includes(s.appearance)||!plain(s.storage)||!plain(s.drafts)||!Array.isArray(s.plans)||s.plans.length>500)throw Error('対応していない形式、または履歴が500件を超えています。');
  for(const m of MODES){if(!plain(s.storage[m])||Object.entries(s.storage[m]).some(([k,v])=>k==='__proto__'||k==='constructor'||typeof v!=='string'||k.length>100||v.length>200000))throw Error('保存領域の形式が不正です。');if(s.drafts[m]&&!snapshotValid(s.drafts[m]))throw Error('入力形式が不正です。');}
  const ids=new Set();
  for(const p of s.plans){if(!plain(p)||typeof p.id!=='string'||p.id.length>100||ids.has(p.id)||!MODES.includes(p.mode)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(Date.parse(p.date))||!snapshotValid(p.snapshot)||typeof p.summary!=='string'||p.summary.length>2000)throw Error('履歴の形式が不正です。');ids.add(p.id);}
  if(JSON.stringify(s).length>1500000)throw Error('保存容量の上限（約1.5MB）を超えています。');
  return s;
}
export function parseBackup(text){if(text.length>2000000)throw Error('ファイルが大きすぎます。');return validateState(JSON.parse(text));}
export function mergeBackup(current,incoming){
  const next=structuredClone(current);
  for(const p of incoming.plans){if(!next.plans.some(x=>x.id===p.id&&JSON.stringify(x)===JSON.stringify(p)))next.plans.push({...p,id:makeId()});}
  for(const mode of MODES){
    // Recover browser presets and drafts as additional history, never overwrite current input.
    const key=mode==='meat'?'planner_presets_v1':'transition_planner_presets_v1';
    if(incoming.storage[mode][key]){
      const presets=JSON.parse(incoming.storage[mode][key]);
      if(!plain(presets))throw Error('プリセットの形式が不正です。');
      for(const [name,form] of Object.entries(presets)){if(!formValid(form))throw Error('プリセットの入力形式が不正です。');next.plans.push({id:makeId(),mode,date:new Date().toLocaleDateString('sv-SE'),snapshot:{form,calculated:true,day:'0'},summary:`取り込みプリセット: ${name.slice(0,100)}`});}
    }
    if(incoming.drafts[mode])next.plans.push({id:makeId(),mode,date:new Date().toLocaleDateString('sv-SE'),snapshot:incoming.drafts[mode],summary:'取り込み時の入力'});
  }
  return validateState(next);
}
