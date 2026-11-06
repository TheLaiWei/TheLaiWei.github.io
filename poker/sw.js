// Bump this version whenever any cached game asset changes.
const CACHE='lai-poker-static-v6';
const ASSETS=['./','./index.html','./style.css','./app.mjs','./engine.mjs','./session.mjs','./table-view.mjs','./chips.mjs','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('lai-poker-static-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),base=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  const allowed=ASSETS.map(path=>new URL(path,base).pathname);
  if(!allowed.includes(url.pathname))return;
  // Only static files are cached. Saved cards are managed separately by the page.
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new Request(url.origin+url.pathname)))||fetch(event.request)));
});
