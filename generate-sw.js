// generate-sw.js
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname);
const IGNORE_DIRS = ['.git', 'node_modules'];

// Set this to your GitHub repository name, e.g., '/r-incognito-anatman-proto/'
// Set to '/' if using a custom domain or user site (username.github.io)
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
      
      if (!relativePath.endsWith('generate-sw.js') && !relativePath.endsWith('.DS_Store')) {
        // Prepend repository name for GitHub Pages URL structure
        const webPath = (GH_REPO_NAME + relativePath).replace(/\/\//g, '/');
        arrayOfFiles.push(webPath);
      }
    }
  });

  return arrayOfFiles;
}

const allAssets = getAllFiles(PUBLIC_DIR);

const swContent = `const CACHE_NAME = 'mudao-archive-v1';
const ASSETS_TO_CACHE = ${JSON.stringify(allAssets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching ${allAssets.length} assets from GitHub Pages...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
`;

fs.writeFileSync(path.join(__dirname, 'sw.js'), swContent);
console.log(`Generated sw.js for GitHub Pages with ${allAssets.length} items.`);