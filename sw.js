const CACHE = 'lunar-v2';
const ASSETS = ['./LunarShift-prototype.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// 收到 SKIP_WAITING 消息时立即接管（配合前端自动刷新逻辑）
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // 网络优先：保证永远拿到最新文件；离线时才回退缓存
    fetch(e.request).then((res) => {
      const cp = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./LunarShift-prototype.html')))
  );
});
