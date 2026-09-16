const fs = require('fs');
const path = require('path');

// Extensions allowed in the offline cache
const ALLOWED_EXTENSIONS = new Set([
  '.html', '.js', '.css', '.json', 
  '.webp', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.ico',
  '.pdf', '.woff', '.woff2', '.ttf'
]);

// Explicit directories or prefixes to ignore entirely
const IGNORE_DIR_PATTERNS = [
  /^\./,               // Hidden folders (.git, .obsidian)
  /^node_modules$/
];

// Specific files to skip
const IGNORE_FILES = new Set([
  'generate-sw.js',
  'package.json',
  'package-lock.json',
  'CNAME'
]);

function getFilesRecursively(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);

    if (stat && stat.isDirectory()) {
      // Skip ignored directories
      const isIgnored = IGNORE_DIR_PATTERNS.some(pattern => pattern.test(fileName));
      if (!isIgnored) {
        results = results.concat(getFilesRecursively(filePath, baseDir));
      }
    } else {
      const ext = path.extname(fileName).toLowerCase();

      // Check if file is explicit skip or not in allowed extensions
      if (IGNORE_FILES.has(fileName) || !ALLOWED_EXTENSIONS.has(ext)) {
        return;
      }

      // Convert local OS path to web URL path relative to root
      let relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
      
      // Ensure space encoding for files with spaces in names
      relativePath = encodeURI(relativePath);

      results.push('/' + relativePath);
    }
  });

  return results;
}

// Generate the asset list
const rootDir = __dirname;
const assetsToCache = getFilesRecursively(rootDir);

const BUILD_TIMESTAMP = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 12);
const CACHE_NAME = `archive-cache-${BUILD_TIMESTAMP}`;

const swContent = `
const CACHE_NAME = '${CACHE_NAME}';
const ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { cache: 'reload' }).then((response) => {
            if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
            return cache.put(url, response);
          }).catch((err) => console.warn('Failed to cache:', url, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting obsolete cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
`;

fs.writeFileSync(path.join(rootDir, 'sw.js'), swContent);
console.log(`Service worker generated with ${assetsToCache.length} assets.`);