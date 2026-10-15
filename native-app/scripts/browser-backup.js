// Run in the developer console of the ORIGINAL Web planner, then save JSON.
// It reads only the documented planner keys; passwords/cookies are not accessed.
(() => {
  const mode=location.pathname.includes('Pre-Carnivore')?'transition':'meat';
  const prefix=mode==='meat'?'planner':'transition_planner';
  const state={version:1,appearance:'system',mode,storage:{meat:{},transition:{}},drafts:{},plans:[]};
  for(const key of ['theme',`${prefix}_presets_v1`,`${prefix}_last_preset_v1`]){const value=localStorage.getItem(key);if(value!==null)state.storage[mode][key]=value;}
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${mode}-web-backup.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
})();
