console.log("Hello from worker");

self.addEventListener('install', function(e) {
  console.log("Install called");
  e.waitUntil(
   caches.open('boardo-spp-store').then(function(cache) {
     return cache.addAll([
@REPLACE@
     ]);
   })
 );
});

self.addEventListener('fetch', function(e) {
  console.log(e.request.url);
  e.respondWith(
    caches.match(e.request).then(function(response) {
      if (typeof(response)!=="undefined") {
        console.log(" - serving local");
      };
      return response || fetch(e.request);
    })
  );
});

self.addEventListener('activate', event => {
  console.log('Service worker activating...');
});
