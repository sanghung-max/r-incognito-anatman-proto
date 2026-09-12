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
const rootDir = __dirname; // or path to project root
const assetsToCache = getFilesRecursively(rootDir);

// Generate sw.js file
const swContent = `
const CACHE_NAME = 'archive-cache-v1';
const ASSETS_TO_CACHE = ${JSON.stringify(assetsToCache, null, 2)};

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS_TO_CACHE) {
        // Check if item was already stored in a previous session
        const existingResponse = await cache.match(url);
        if (!existingResponse) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('Failed to cache on this run:', url);
          }
        }
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
`;

fs.writeFileSync(path.join(rootDir, 'sw.js'), swContent);
console.log(`Service worker generated with ${assetsToCache.length} assets.`);