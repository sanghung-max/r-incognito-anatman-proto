const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Dynamic base path for extraResources assets
const ASSETS_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, 'assets');

let mainWindow;

// Register 'app' custom scheme as privileged
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'app', 
    privileges: { 
      standard: true, 
      secure: true, 
      supportFetchAPI: true, 
      stream: true,
      corsEnabled: true 
    } 
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  // Load entry point via custom protocol
  mainWindow.loadURL('app://local/index.html');
}

app.whenReady().then(() => {
  // Handle 'app://' protocol requests
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');

    let targetPath;

    // 1. Any request pointing to assets or sub-assets (e.g., assets/data/nodes/7-C__0001.json)
    if (relativePath.includes('assets/')) {
      const assetSubPath = relativePath.substring(relativePath.indexOf('assets/') + 7);
      targetPath = path.join(ASSETS_PATH, assetSubPath);
    } 
    // 2. Direct requests to data/ or nodes/ (e.g., data/nodes/7-C__0001.json)
    else if (relativePath.startsWith('data/') || relativePath.startsWith('nodes/')) {
      targetPath = path.join(ASSETS_PATH, relativePath);
    } 
    // 3. Application core files inside app.asar (index.html, js/archive_data.js, style.css)
    else {
      targetPath = path.join(__dirname, relativePath);
    }

    // Return 404 response if file is missing instead of hanging
    if (!fs.existsSync(targetPath)) {
      console.error(`[404] File not found: ${targetPath} (Request: ${request.url})`);
      return new Response('Not Found', { status: 404 });
    }

    return net.fetch(pathToFileURL(targetPath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
  console.error('Unexpected error in main process:', error);
});