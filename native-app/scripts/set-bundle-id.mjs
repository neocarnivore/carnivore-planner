import fs from 'node:fs';
const id=process.env.IOS_BUNDLE_ID;
if(!id||!/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+){2,}$/.test(id))throw Error('IOS_BUNDLE_ID must be a registered reverse-domain identifier');
const config=JSON.parse(fs.readFileSync('capacitor.config.json'));config.appId=id;fs.writeFileSync('capacitor.config.json',JSON.stringify(config,null,2));
const path='ios/App/App.xcodeproj/project.pbxproj';let p=fs.readFileSync(path,'utf8').replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,`PRODUCT_BUNDLE_IDENTIFIER = ${id};`);fs.writeFileSync(path,p);
