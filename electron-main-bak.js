const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Dynamic base path for assets
const ASSETS_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, 'assets');

let mainWindow;

// 1. MUST register custom scheme before app is ready
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

  // Load entry point via the app:// protocol
  mainWindow.loadURL('app://local/index.html');
}

app.whenReady().then(() => {
  // 2. Handle 'app://' protocol requests
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');

    let targetPath;

    // Route assets/ requests to ASSETS_PATH (extraResources in production)
    if (relativePath.startsWith('assets/')) {
      const assetSubPath = relativePath.replace(/^assets\/?/, '');
      targetPath = path.join(ASSETS_PATH, assetSubPath);
    } else {
      // Route all other requests (html, css, js) to the app root (app.asar)
      targetPath = path.join(__dirname, relativePath);
    }

    // Serve file cleanly via file:// URL without infinite loops
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