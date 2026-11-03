const C='mogura-v4',F=['./','index.html','app.js','match.js','words.js','manifest.json','icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// すべてネット優先（シートもゲーム本体も）、つながらないときだけキャッシュ
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;const u=new URL(e.request.url);const sheet=u.hostname=='docs.google.com';
 e.respondWith(fetch(e.request,sheet?{cache:'no-store'}:undefined).then(r=>{if(r.ok){const cl=r.clone();caches.open(C).then(c=>c.put(e.request,cl))}return r}).catch(()=>caches.match(e.request)))});
