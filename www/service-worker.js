// service-worker.js - SmartStore PWA Service Worker
const CACHE_NAME = 'smartstore-cache-v1';

// الأصول الثابتة الأساسية التي سيتم تخزينها مؤقتاً لتسريع التحميل والعمل بدون إنترنت
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'
];

// تثبيت Service Worker وتخزين الأصول الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] تم فتح كاش التطبيق وتخزين الملفات الأساسية');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] بعض الأصول تعذر تخزينها أثناء التثبيت:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// تفعيل Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] حذف الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// التعامل مع طلبات الشبكة (استراتيجية Stale-While-Revalidate للملفات الثابتة، و Network-First للبيانات)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // استبعاد طلبات Supabase والـ APIs الخارجية لتجنب تجميد البيانات الحية أو تعليقها
  if (url.origin.includes('supabase.co') || request.method !== 'GET') {
    return; // دع المتصفح ينفذ الطلب مباشرة عبر الشبكة
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // إرجاع الملف من الكاش مع تحديث الكاش في الخلفية (Stale-While-Revalidate)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // في حال انقطاع النت تماماً ولم يكن الملف في الكاش، نرجع الصفحة الرئيسية للطلبات الملاحية
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
