importScripts('version.js');
const C='mogura-'+self.APP_VER,F=['./','version.js','index.html','app.js','match.js','yomi.js','words.js','manifest.json','icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(F.map(u=>fetch(new Request(u,{cache:'no-cache'})).then(r=>{if(!r.ok)throw u;return c.put(u,r)})))))});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// 同じオリジンは再検証（Pagesのmax-ageを通さない）。シートはno-store。オフラインだけキャッシュ
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;const u=new URL(e.request.url);const sheet=u.hostname=='docs.google.com';
 const opt=sheet?{cache:'no-store'}:u.origin==self.location.origin?{cache:'no-cache'}:undefined;
 e.respondWith(fetch(e.request,opt).then(r=>{if(r.ok){const cl=r.clone();caches.open(C).then(c=>c.put(e.request,cl))}return r}).catch(()=>caches.match(e.request)))});
