console.log("Hello from worker");

self.addEventListener('install', function(e) {
  console.log("Install called");
  e.waitUntil(
   caches.open('boardo-spp-store').then(function(cache) {
     return cache.addAll([
        'mdjs/markdown.es.js.map',
        'mdjs/markdown.node.js',
        'mdjs/markdown.js.map',
        'mdjs/markdown.node.js.map',
        'mdjs/markdown.wasm',
        'mdjs/markdown.es.js',
        'mdjs/markdown.js',
        'index_11551f49140984263ae371fc07f488eb62399fd0.html',
        'embedmd.css',
        'simplify.js',
        'desc_5d615c1b1cce1909bb088984b42435e3fba27330.html',
        'main.css',
        'README.md',
        'ble_2499d5bc2810b9ddcea4b3c551249facc1b1a22f.js',
        'icons/favicon-16x16.png',
        'icons/safari-pinned-tab.svg',
        'icons/favicon.ico',
        'icons/apple-touch-icon-120x120.png',
        'icons/android-chrome-192x192.png',
        'icons/apple-touch-icon.png',
        'icons/apple-touch-icon-152x152.png',
        'icons/apple-touch-icon-180x180.png',
        'icons/apple-touch-icon-76x76.png',
        'icons/android-chrome-512x512.png',
        'icons/mstile-150x150.png',
        'icons/apple-touch-icon-60x60.png',
        'icons/browserconfig.xml',
        'icons/favicon-32x32.png',
        'github-markdown.css',
        'moment.min.js',
        'bamboo.jpg',
        '.'
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
