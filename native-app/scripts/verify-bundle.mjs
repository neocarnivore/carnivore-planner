import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const scripts=html=>[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>! /\bsrc\s*=/i.test(m[1])).map(m=>m[2].replace(/\r\n/g,'\n'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const report={verification:'Original inline JavaScript matches after reversing only storage API references and the weekday-state bridge.',modes:{}};
for(const mode of ['meat','transition']){
  const original=scripts(fs.readFileSync(path.join(root,'vendor',mode,'index.html'),'utf8'));
  const bundled=scripts(fs.readFileSync(path.join(root,'public/planners',mode,'index.html'),'utf8'));
  const shim=bundled.shift();
  if(shim!==`window.appStorage=parent.plannerBridge.storage('${mode}');window.appSession=parent.plannerBridge.session('${mode}');`)throw Error(`Unexpected bootstrap: ${mode}`);
  if(original.length!==bundled.length)throw Error(`Script count changed: ${mode}`);
  report.modes[mode]=original.map((source,i)=>{
    const restored=bundled[i].replace(/window\.appStorage/g,'localStorage').replace(/window\.appSession/g,'sessionStorage').replace(/^  window\.weekAdapter=\{snapshot:.*;\n/gm,'');
    if(source!==restored)throw Error(`Unexpected original JavaScript change: ${mode}, script ${i+1}`);
    return {script:i+1,originalSha256:sha(source),restoredBundleSha256:sha(restored),identical:true};
  });
  console.log(`${mode}: all ${original.length} original inline scripts match; calculations and data unchanged.`);
}
fs.writeFileSync(path.join(root,'docs/code-equivalence.json'),JSON.stringify(report,null,2)+'\n');
