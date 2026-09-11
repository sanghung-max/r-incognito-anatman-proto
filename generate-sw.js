// generate-sw.js
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname);
const IGNORE_DIRS = ['.git', 'node_modules'];

// Set your GitHub repository name
const GH_REPO_NAME = '/r-incognito-anatman-proto/';

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      let relativePath = path.relative(PUBLIC_DIR, fullPath).replace(/\\/g, '/');
      
      // Exclude build tools, hidden files, and sw.js itself from array
      if (
        !relativePath.endsWith('generate-sw.js') &&
        !relativePath.endsWith('sw.js') &&
        !relativePath.endsWith('.DS_Store')
      ) {
        const webPath = (GH_REPO_NAME + relativePath).replace(/\/\//g, '/');
        arrayOfFiles.push(webPath);
      }
    }
  });

  return arrayOfFiles;
}

const allAssets = getAllFiles(PUBLIC_DIR);

// Embedded template for generated sw.js
const swContent = `const CACHE_NAME = 'mudao-archive-v1';
const ASSETS_TO_CACHE = ${JSON.stringify(allAssets, null, 2)};

// Resilient Install Event: Caches individual files so a 404 won't break setup
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('Starting caching process for ${allAssets.length} assets...');
      
      const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          } else {
            console.warn('Failed to cache (HTTP ' + response.status + '): ' + url);
          }
        } catch (err) {
          console.warn('Network error caching asset: ' + url, err);
        }
      });

      await Promise.allSettled(cachePromises);
      console.log('Asset pre-caching finished.');
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch Event: Serve cached content first, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
`;

fs.writeFileSync(path.join(__dirname, 'sw.js'), swContent);
console.log(`Successfully generated sw.js with ${allAssets.length} assets.`);