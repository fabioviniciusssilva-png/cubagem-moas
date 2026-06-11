const CACHE='moas-cubagem-v3';
const ASSETS=['./index.html','./manifest.json','./icon-192.svg','./icon-512.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.url.includes('supabase.co')||e.request.url.includes('api.anthropic.com')||e.request.url.includes('fonts.googleapis')){e.respondWith(fetch(e.request).catch(()=>new Response('')));return;}
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{return caches.open(CACHE).then(c=>{c.put(e.request,res.clone());return res;});})));
});