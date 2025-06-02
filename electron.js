const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Simple development detection instead of electron-is-dev
const isDev = process.env.ELECTRON_IS_DEV === 'true' || 
              process.env.NODE_ENV === 'development' || 
              !app.isPackaged;

let mainWindow;
let backendProcess;

// Load configuration
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'backend', 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.warn('Could not load config.json:', error.message);
  }
  
  // Return default config
  return {
    notionIntegrationToken: '',
    sessionSecret: 'default-session-secret',
    googleBooksApiKey: '',
    port: 3001
  };
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // You can add an icon later
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, './frontend/build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  if (isDev) {
    // In development, we assume the backend is running separately
    return;
  }
  
  // Load configuration
  const config = loadConfig();
  
  // In production, start the backend process with environment variables
  const backendPath = path.join(__dirname, 'backend');
  
  // Set up environment variables for the backend process
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: config.port.toString(),
    NOTION_INTEGRATION_TOKEN: config.notionIntegrationToken || process.env.NOTION_INTEGRATION_TOKEN || '',
    SESSION_SECRET: config.sessionSecret || process.env.SESSION_SECRET || 'electron-app-session-secret',
    GOOGLE_BOOKS_API_KEY: config.googleBooksApiKey || process.env.GOOGLE_BOOKS_API_KEY || '',
    FRONTEND_URL: 'http://localhost:3000'
  };
  
  backendProcess = spawn('node', ['server.js'], {
    cwd: backendPath,
    stdio: 'inherit',
    env: env
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  startBackend();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Set up menu
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
}); 