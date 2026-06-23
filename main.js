/**
 * IPTV Desktop Player — Electron Main Process
 * Handles window lifecycle, IPC, file I/O, and logo caching.
 */

const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

// ------------------------------------------------------------------
// Paths
// ------------------------------------------------------------------
const USER_DATA = app.getPath('userData');
const DATA_DIR  = path.join(USER_DATA, 'data');
const LOGOS_DIR = path.join(USER_DATA, 'logos');
const CACHE_DIR = path.join(USER_DATA, 'cache');

// Ensure required directories exist
[DATA_DIR, LOGOS_DIR, CACHE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Seed default JSON files if they don't exist
const DEFAULT_FILES = {
  'accounts.json':  '[]',
  'favorites.json': '{"channels":[],"movies":[],"series":[]}',
  'settings.json':  JSON.stringify({
    language: 'en',
    theme: 'dark',
    playerBufferSize: 30,
    playerQuality: 'auto',
    autoReconnect: true,
    epgUrl: '',
    logoCache: true
  }, null, 2)
};

Object.entries(DEFAULT_FILES).forEach(([filename, defaultContent]) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, 'utf8');
  }
});

// ------------------------------------------------------------------
// Window management
// ------------------------------------------------------------------
let mainWindow = null;

function createWindow () {
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    title: 'IPTV Desktop Player',
    backgroundColor: '#0d0d0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,   // allow loading local logo files and cross-origin HLS streams
      allowRunningInsecureContent: true
    }
  });

  // Remove default menu in production
  if (!process.argv.includes('--dev')) {
    Menu.setApplicationMenu(null);
  } else {
    // Keep dev tools available in dev mode
    const devMenu = Menu.buildFromTemplate([
      { label: 'File', submenu: [{ role: 'quit' }] },
      { label: 'View', submenu: [
        { role: 'toggleDevTools' },
        { role: 'reload' },
        { role: 'forceReload' }
      ]}
    ]);
    Menu.setApplicationMenu(devMenu);
  }

  mainWindow.loadFile(path.join(__dirname, 'src', 'login.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ------------------------------------------------------------------
// IPC: Storage (read / write JSON files in userData/data/)
// ------------------------------------------------------------------
ipcMain.handle('storage:read', (_event, filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[storage:read]', err.message);
    return null;
  }
});

ipcMain.handle('storage:write', (_event, filename, data) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[storage:write]', err.message);
    return false;
  }
});

ipcMain.handle('storage:delete', (_event, filename) => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    return false;
  }
});

// ------------------------------------------------------------------
// IPC: File dialog & local M3U reading
// ------------------------------------------------------------------
ipcMain.handle('dialog:openFile', async (_event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Playlist File',
    filters: filters || [
      { name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('file:readM3U', (_event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read file: ${err.message}`);
  }
});

// ------------------------------------------------------------------
// IPC: Logo caching
// ------------------------------------------------------------------
ipcMain.handle('logo:cache', (_event, logoUrl, channelId) => {
  return new Promise((resolve) => {
    if (!logoUrl || !channelId) return resolve(null);

    const ext = path.extname(new URL(logoUrl).pathname) || '.png';
    const safeId = String(channelId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeId}${ext}`;
    const destPath = path.join(LOGOS_DIR, filename);

    if (fs.existsSync(destPath)) {
      return resolve('file://' + destPath);
    }

    const proto = logoUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    const req = proto.get(logoUrl, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return resolve(null);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve('file://' + destPath);
      });
    });

    req.on('error', () => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(null);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(null);
    });
  });
});

ipcMain.handle('logo:get', (_event, channelId) => {
  if (!channelId) return null;
  const safeId = String(channelId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const ext of exts) {
    const filePath = path.join(LOGOS_DIR, safeId + ext);
    if (fs.existsSync(filePath)) return 'file://' + filePath;
  }
  return null;
});

ipcMain.handle('logo:clearCache', () => {
  try {
    const files = fs.readdirSync(LOGOS_DIR);
    files.forEach(f => fs.unlinkSync(path.join(LOGOS_DIR, f)));
    return true;
  } catch {
    return false;
  }
});

// ------------------------------------------------------------------
// IPC: Network fetch (for EPG and M3U URL fetching from renderer)
// ------------------------------------------------------------------
ipcMain.handle('net:fetch', async (_event, fetchUrl, options = {}) => {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(fetchUrl);
    } catch {
      return reject(new Error('Invalid URL'));
    }

    const proto = parsedUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'IPTV-Player/1.0',
        ...(options.headers || {})
      },
      timeout: options.timeout || 15000
    };

    const req = proto.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (options.body) req.write(options.body);
    req.end();
  });
});

// ------------------------------------------------------------------
// IPC: App utilities
// ------------------------------------------------------------------
ipcMain.handle('app:getDataPath', () => DATA_DIR);
ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('app:openExternal', (_event, href) => {
  shell.openExternal(href);
});

ipcMain.handle('window:navigate', (_event, page) => {
  const pagePath = path.join(__dirname, 'src', page);
  if (fs.existsSync(pagePath)) {
    mainWindow.loadFile(pagePath);
  }
});
