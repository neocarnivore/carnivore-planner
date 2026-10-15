import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const sources=JSON.parse(fs.readFileSync(path.join(root,'vendor/sources.json'),'utf8'));
let count=0;
for(const [mode,source] of Object.entries(sources)){
  for(const [file,expected] of Object.entries(source.sha256)){
    const bytes=fs.readFileSync(path.join(root,'vendor',mode,file));
    const actual=crypto.createHash('sha256').update(bytes).digest('hex');
    if(actual!==expected)throw Error(`Original source changed: ${mode}/${file}`);
    count++;
  }
}
console.log(`Verified ${count} original files: exact SHA-256 match.`);
