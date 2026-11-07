const cacheName='lai-poker-practice-assets-v3';
const urls=['./','./index.html','./practice.css','./practice.mjs','./strategy.mjs',
  '../../poker/style.css','../../poker/engine.mjs','../../poker/chips.mjs',
  '../../poker/table-view.mjs','../../poker/icon.svg'].map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(cacheName).then(c=>c.addAll(urls))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys
  .filter(key=>key.startsWith('lai-poker-practice-assets-') && key!==cacheName).map(key=>caches.delete(key))))));
self.addEventListener('fetch',e=>{
  if(e.request.method==='GET' && urls.includes(e.request.url))
    e.respondWith(caches.open(cacheName).then(async cache=>await cache.match(e.request)||fetch(e.request)));
});
