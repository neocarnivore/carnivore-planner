(() => {
  const bridge=parent.plannerBridge;
  const mode=location.pathname.includes('/transition/')?'transition':'meat';
  const originalCalc=window.calc;
  let calculated=false;
  const snapshot=()=>({form:getCurrentFormData(),calculated:calculated&&document.getElementById('macroCard')?.style.display==='block',day:document.querySelector('#dayBtns .active')?.dataset.dayGlobal||'0',week:window.weekAdapter?.snapshot()});
  const draft=()=>bridge.draft(mode,snapshot());
  window.calc=function(){
    calculated=false; originalCalc();
    calculated=document.getElementById('macroCard')?.style.display==='block'; draft();
  };
  window.plannerAdapter={
    snapshot,
    restore(data){applyFormData(data.form); if(data.calculated){window.calc();if(mode==='transition')selectDay(Number(data.day)||0,false);if(data.week)window.weekAdapter?.restore(data.week);}else{document.getElementById('macroCard').style.display='none';}draft();},
    summary(){return [['bmi','BMI',''],['bmr','基礎代謝','kcal'],['tdee','推定総消費','kcal'],['kcal','エネルギー','kcal'],['p','タンパク質','g'],['f','脂質','g'],['c','糖質','g'],['k','カリウム','mg'],['na','ナトリウム','mg'],['mg','マグネシウム','mg']].map(([id,label,unit])=>`${label}: ${document.getElementById(id)?.textContent||'—'} ${unit}`).join('\n');},
    theme(value){document.body.classList.toggle('light',value==='light');document.documentElement.classList.toggle('light',value==='light');if(typeof updateThemeBtn==='function')updateThemeBtn();}
  };
  document.addEventListener('input',()=>{calculated=false;draft();});
  document.addEventListener('change',()=>{calculated=false;draft();});
  document.addEventListener('click',()=>setTimeout(draft,0));
  document.addEventListener('focusin',e=>{if(e.target.matches('input,select'))setTimeout(()=>e.target.scrollIntoView({block:'center',behavior:'smooth'}),300);});
  document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&/^https?:/.test(a.href)){e.preventDefault();bridge.external(a.href);}},true);
  // The native bundle intentionally contains no service worker registration.
  if(document.readyState==='complete')bridge.loaded(mode);else window.addEventListener('load',()=>bridge.loaded(mode),{once:true});
})();
