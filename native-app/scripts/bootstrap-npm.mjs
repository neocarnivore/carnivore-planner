import fs from 'node:fs';
import crypto from 'node:crypto';
const r=await fetch('https://registry.npmjs.org/npm/12.2.0');
if(!r.ok)throw Error('npm metadata unavailable');
const p=await r.json(), t=await fetch(p.dist.tarball);
if(!t.ok)throw Error('npm download failed');
const b=Buffer.from(await t.arrayBuffer());
if('sha512-'+crypto.createHash('sha512').update(b).digest('base64')!==p.dist.integrity)throw Error('npm integrity mismatch');
fs.writeFileSync(process.env.PLANNER_NPM_CACHE+'/npm.tgz',b);
