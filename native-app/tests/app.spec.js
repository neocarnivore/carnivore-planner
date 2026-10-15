import { test,expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const meat={sex:'M',age:'35',height:'175',weight:'75',habit:'1.2',diet:'Carnivore',pTier:'std',goal:'maintain',fitnessType:'none',onoff:'none',targetWeight:'70',chartMonths:3};
const transition={sex:'F',age:'40',height:'160',weight:'60',habit:'1.2',fitnessType:'none',curCarbSel:'150-200',riceSel:'0',breadSel:'0',rootsSel:'0'};
async function getFrame(page,mode='meat'){if(mode==='transition')await page.locator('[data-mode=transition]').click();const f=page.frameLocator('#plannerFrame');await expect(f.locator('#age')).toBeVisible();await expect.poll(()=>page.evaluate(()=>!!document.querySelector('iframe').contentWindow.plannerAdapter)).toBe(true);return page.frames().find(f=>f.url().includes(`/planners/${mode}/`));}
async function calculate(frame,data){await frame.evaluate(d=>{applyFormData(d);calc();},data);}
const output=frame=>frame.evaluate(()=>Object.fromEntries(['bmi','bmr','tdee','kcal','p','f','c','k','na','mg','gMeat','gFish','gEgg','gDairy','weeksNum','gRoot','gGrain','gFruit'].map(k=>[k,document.getElementById(k)?.textContent])));
test('元版と同梱版の代表入力を比較（各モード4ケース）',async({page,context})=>{
  await page.goto('/');let f=await getFrame(page);const original=await context.newPage(),dialogs=[],results=[];
  original.on('dialog',d=>{dialogs.push(d.message());d.dismiss();});page.on('dialog',d=>{dialogs.push(d.message());d.dismiss();});
  for(const [mode,cases] of [['meat',[meat,{...meat,sex:'F',age:'52',height:'158',weight:'62',diet:'Lion',lionMeat:'beef'}, {...meat,diet:'Ketovore',carb:'30',habit:'1.55',fitnessType:'strength',onoff:'on',goal:'cut'}, {...meat,diet:'TKD',carb:'40',habit:'1.725',fitnessType:'run',onoff:'off',goal:'bulk',targetWeight:'80'}]],['transition',[transition,{...transition,sex:'M',age:'28',height:'180',weight:'80',curCarbSel:'under100'}, {...transition,habit:'1.55',fitnessType:'strength',curCarbSel:'200-250'}, {...transition,curCarbSel:'unknown',riceSel:'2-3',breadSel:'0-1',rootsSel:'0-1'}]]]){
    if(mode==='transition')f=await getFrame(page,mode);await original.goto(`/vendor/${mode}/index.html`);
    for(const data of cases){await calculate(original,data);await calculate(f,data);const before=await output(original),after=await output(f);expect(after).toEqual(before);expect(after.bmr).toMatch(/\d/);results.push({mode,input:data,original:before,integrated:after});}
  }
  expect(dialogs).toEqual([]);fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/calculation-results.json',JSON.stringify(results,null,2));
});
test('保存・再起動・モード切替・再編集・インポート検証・削除',async({page,context})=>{
  await page.goto('/');let f=await getFrame(page);await calculate(f,meat);await page.locator('#savePlan').click();await expect(page.locator('#status')).toContainText('保存しました');
  await page.reload();f=await getFrame(page);await expect(f.locator('#weight')).toHaveValue('75');await expect(f.locator('#kcal')).toContainText(/\d/);
  f=await getFrame(page,'transition');await calculate(f,transition);await page.locator('#savePlan').click();await expect(page.locator('#status')).toContainText('保存しました');
  await page.locator('#settingsButton').click();await expect(page.locator('#history article')).toHaveCount(2);await page.locator('#history article').filter({hasText:'肉食'}).getByText('再編集').click();f=await getFrame(page);await calculate(f,{...meat,weight:'76'});await page.locator('#savePlan').click();await expect(page.locator('#status')).toContainText('保存しました');await page.locator('#settingsButton').click();await expect(page.locator('#history article')).toHaveCount(2);
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportData').click();const download=await downloadPromise;const filepath=await download.path();
  const other=await context.newPage();await other.goto('/');await getFrame(other);await other.locator('#settingsButton').click();other.on('dialog',d=>d.accept());await other.locator('#importData').setInputFiles(filepath);await expect(other.locator('#status')).toContainText('履歴に追加');
  await other.locator('#importData').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});await expect(other.locator('#status')).toContainText('対応していない');
  await other.locator('#deleteData').click();await expect(other.locator('#status')).toContainText('すべて削除');await other.reload();await getFrame(other);await other.locator('#settingsButton').click();await expect(other.locator('#history article')).toHaveCount(0);
});
test('初回から外部通信なし・オフライン再起動・画面幅と表示設定',async({page,context})=>{
  const external=[];await context.route('**/*',route=>{if(!route.request().url().startsWith('http://127.0.0.1:4173')){external.push(route.request().url());return route.abort();}return route.continue();});
  await page.goto('/');let f=await getFrame(page);await calculate(f,meat);await page.reload();f=await getFrame(page);await expect(f.locator('#weight')).toHaveValue('75');expect(external).toEqual([]);
  for(const width of [320,390,440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.locator('#settingsButton').click();await page.locator('#appearance').selectOption('light');await expect(page.locator('body')).toHaveClass('light');await page.locator('#appearance').selectOption('dark');await expect(page.locator('body')).not.toHaveClass('light');
  await page.setViewportSize({width:320,height:844});await page.screenshot({path:'test-results/settings-320.png',fullPage:true});
});
test('ビルド成果物だけを使いネットワークOFFで初回起動・再起動',async({page,context})=>{
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());expect(u.origin).toBe('http://bundled.local');
    const relative=decodeURIComponent(u.pathname).replace(/^\//,'')||'index.html';
    const file=path.resolve('dist',relative);expect(file.startsWith(path.resolve('dist')+path.sep)).toBe(true);
    const contentType=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html';
    await route.fulfill({body:fs.readFileSync(file),contentType});
  });
  await context.setOffline(true);await page.goto('http://bundled.local/');let f=await getFrame(page);await calculate(f,meat);await page.locator('#savePlan').click();await expect(page.locator('#status')).toContainText('保存しました');
  await page.reload();f=await getFrame(page);await expect(f.locator('#weight')).toHaveValue('75');
  await page.screenshot({path:'test-results/meat-offline.png',fullPage:true});
  f=await getFrame(page,'transition');await calculate(f,transition);await page.screenshot({path:'test-results/transition-offline.png',fullPage:true});
});
test('同モードの古い履歴と曜日設定を復元',async({page})=>{
  await page.goto('/');let f=await getFrame(page);await calculate(f,meat);
  await f.evaluate(()=>window.weekAdapter.restore(['train','rest','rest','rest','rest','rest','rest']));
  await page.locator('#savePlan').click();await expect(page.locator('#status')).toContainText('保存しました');
  await calculate(f,{...meat,weight:'90'});await page.locator('#settingsButton').click();await page.getByText('再編集',{exact:true}).click();
  f=await getFrame(page);await expect(f.locator('#weight')).toHaveValue('75');expect(await f.evaluate(()=>weekAdapter.snapshot())).toEqual(['train','rest','rest','rest','rest','rest','rest']);
  await page.reload();f=await getFrame(page);expect(await f.evaluate(()=>weekAdapter.snapshot())).toEqual(['train','rest','rest','rest','rest','rest','rest']);
});
