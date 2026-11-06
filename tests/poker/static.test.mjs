import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('all game links/imports and manifest assets resolve within the static game',()=>{
const html=read('poker/index.html');
for(const [,path] of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))assert.ok(existsSync(new URL('../../poker/'+path,import.meta.url)),path);
for(const file of ['app.mjs','session.mjs'])for(const [,path] of read('poker/'+file).matchAll(/from '\.\/([^']+)'/g))assert.ok(existsSync(new URL('../../poker/'+path,import.meta.url)),path);
const manifest=JSON.parse(read('poker/manifest.webmanifest'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');manifest.icons.forEach(i=>assert.ok(existsSync(new URL('../../poker/'+i.src,import.meta.url))));
assert.ok(!html.startsWith('---')); // A standalone static page, not the academic layout.
assert.ok(!html.includes('https://cdn'));assert.match(html,/script-src 'self'/);
});
test('service worker caches essential assets and ignores other website routes',async()=>{
const handlers={},requests=[],deleted=[];let added=[],skipped=false;
const sandbox={URL,Request,fetch:async req=>({network:req.url}),caches:{open:async()=>({addAll:async paths=>{added=paths;},match:async()=>null}),keys:async()=>['lai-poker-static-old','unrelated-site-cache'],delete:async k=>deleted.push(k)},self:{registration:{scope:'https://thelaiwei.github.io/poker/'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>skipped=true}};
vm.runInNewContext(read('poker/sw.js'),sandbox);
let pending;handlers.install({waitUntil:p=>pending=p});await pending;assert.ok(added.includes('./engine.mjs'));for(const path of added)assert.ok(path==='./'||existsSync(new URL('../../poker/'+path,import.meta.url)),path);
handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['lai-poker-static-old']);
for(const url of ['https://thelaiwei.github.io/','https://thelaiwei.github.io/publications/','https://example.com/poker/','https://thelaiwei.github.io/poker/private-state'])handlers.fetch({request:new Request(url),respondWith:p=>requests.push(p)});
assert.equal(requests.length,0);
handlers.fetch({request:new Request('https://thelaiwei.github.io/poker/engine.mjs'),respondWith:p=>requests.push(p)});assert.equal(requests.length,1);await Promise.all(requests);
assert.equal(skipped,false);handlers.message({data:{type:'ACTIVATE'}});assert.equal(skipped,true);
});
test('Projects integration, exclusions, and CI test gate are present',()=>{
assert.match(read('_projects/poker.md'),/redirect: \/poker\//);
assert.match(read('_config.yml'),/exclude:\n  - tests\//);
const workflow=read('.github/workflows/deploy.yml');assert.equal((workflow.match(/"poker\/\*\*"/g)||[]).length,2);assert.match(workflow,/node --test tests\/poker\/\*\.test\.mjs/);
assert.ok(workflow.indexOf('Test shared-phone poker')<workflow.indexOf('Install and Build'));
assert.equal(JSON.parse(read('package.json')).scripts['test:poker'],'node --test tests/poker/*.test.mjs');
});
