// Service Worker 檔案名稱和版本 (用於更新快取)
// 請記得在程式碼更新後，更改版本號以確保用戶端取得最新檔案
const CACHE_NAME = 'av-equipment-cache-v1';

// 需要預先快取的核心檔案列表
// 由於您的應用程式是單一 HTML 檔案，我們只快取核心檔案
const urlsToCache = [
  './', 
  './app.html',
  './manifest.json',
  // 如果 icon-r.png 和 icon.jpg 存在，也應該加入
  // 'icon-r.png',
  // 'icon.jpg'
];

// 安裝 Service Worker 並預先快取資源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安裝中...');
  self.skipWaiting(); // 強制新的 Service Worker 立即啟用

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 預先快取核心資源');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
         console.error('[Service Worker] 預先快取失敗:', error);
      })
  );
});

// 啟動 Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 啟用中...');
  event.waitUntil(
    // 移除舊版本的快取
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 確保 Service Worker 立即接管頁面控制權
  return self.clients.claim();
});

// 攔截網路請求，嘗試從快取回應 (Cache-First 策略)
self.addEventListener('fetch', (event) => {
  // 由於您的核心功能依賴 Google API/Apps Script (即時資料)，我們只快取靜態資源。
  // 對於 Apps Script 和 Google API 的請求，我們略過快取，直接進行網路請求。
  const requestUrl = new URL(event.request.url);
  
  const isGoogleApi = requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('google.com');
  const isPostRequest = event.request.method !== 'GET';

  if (isGoogleApi || isPostRequest) {
    // 對於 API 呼叫或非 GET 請求，直接走網路
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果快取中有資源，則直接回傳
        if (response) {
          // console.log('[Service Worker] 從快取取得:', event.request.url);
          return response;
        }

        // 否則，從網路獲取並加入快取
        return fetch(event.request).then(
          (response) => {
            // 檢查回應是否有效 (HTTP 200 OK)
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆回應，因為 stream 只能讀取一次
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // 僅快取靜態資源 (不包括外部 CDN)
                if (requestUrl.origin === location.origin) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
      .catch((error) => {
        console.error('[Service Worker] Fetch 失敗:', error);
      })
  );
});
