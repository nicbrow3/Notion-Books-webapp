# Notion Books Desktop App

This guide explains how to run and build the desktop version of your Notion Books application using Electron.

## 🚀 Quick Start

### Development Mode
To run the app in development mode (requires backend to be running separately):

```bash
# Start the backend (in one terminal)
npm run dev:backend

# Start the frontend (in another terminal) 
npm run dev:frontend

# Run Electron in development mode (in a third terminal)
npm run electron-dev
```

### Production Mode
To run the built desktop app:

```bash
# Build and run as desktop app
npm run build
npm run electron
```

## 📦 Building Desktop Applications

### Quick Package (for testing)
Creates an unpacked app in `dist/` directory:
```bash
npm run pack
```

### Full Distribution Build
Creates distributable installers:
```bash
npm run dist
```

This creates:
- **Intel Macs**: `Notion Books-1.0.0.dmg`
- **Apple Silicon Macs**: `Notion Books-1.0.0-arm64.dmg`

## 📁 File Structure

```
├── electron.js              # Main Electron process
├── frontend/
│   └── build/               # Built React app (created by npm run build)
├── backend/                 # Express.js backend
└── dist/                    # Built desktop applications
    ├── *.dmg               # macOS installers
    ├── mac/                # Intel Mac app
    └── mac-arm64/          # Apple Silicon Mac app
```

## 🛠 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run electron` | Run the desktop app (production mode) |
| `npm run electron-dev` | Run the desktop app (development mode) |
| `npm run pack` | Package the app (unpacked, for testing) |
| `npm run dist` | Build distributable installers |
| `npm run build:electron` | Build frontend and package the app |

## ⚙️ Configuration

The Electron configuration is in `package.json` under the `"build"` section:

- **App ID**: `com.notionbooks.app`
- **Product Name**: `Notion Books`
- **Output Directory**: `dist/`
- **Supported Platforms**: macOS (Intel & Apple Silicon), Windows, Linux

## 🔧 How It Works

1. **Development**: Electron loads `http://localhost:3000` (your React dev server)
2. **Production**: Electron loads the built React app from `frontend/build/`
3. **Backend**: In production, Electron automatically starts the backend server
4. **Security**: The app uses context isolation and disabled node integration for security

## 🔧 Troubleshooting

### "Cannot find module 'electron-is-dev'" Error
If you see this error when running the packaged app:
```
Error: Cannot find module 'electron-is-dev'
```

**Solution**: This happens when `electron-is-dev` is in devDependencies instead of dependencies. The module is needed at runtime in the packaged app.

**Fix**: Ensure `electron-is-dev` is in the `dependencies` section of `package.json`, then rebuild:
```bash
npm run dist
```

### ES Module Error with electron-is-dev
If you see this error:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module [...]/electron-is-dev/index.js not supported
```

**Solution**: Newer versions of `electron-is-dev` use ES modules which aren't compatible with CommonJS require(). 

**Fix**: Use built-in development detection instead (already implemented):
```javascript
// Simple development detection instead of electron-is-dev
const isDev = process.env.ELECTRON_IS_DEV === 'true' || 
              process.env.NODE_ENV === 'development' || 
              !app.isPackaged;
```

This approach:
- ✅ Avoids external dependencies
- ✅ Works with both CommonJS and ES modules
- ✅ Uses Electron's built-in `app.isPackaged` property
- ✅ Respects environment variables

### Backend Not Starting
If the backend doesn't start automatically in the packaged app, check that:
1. Your backend entry file is named `server.js` (or update the path in `electron.js`)
2. The backend folder is properly included in the build files configuration

## 📝 Notes

- The desktop app will automatically start the backend in production mode
- In development mode, you need to run the backend separately
- The app creates a proper macOS menu and handles window management
- Your app is signed with your Apple Developer certificate
- The ESLint warnings in the build are non-critical and don't affect functionality
- Runtime dependencies (like `electron-is-dev`) must be in `dependencies`, not `devDependencies`

## 🎯 Using Your Desktop App

1. **Install**: Double-click the `.dmg` file and drag to Applications folder
2. **Run**: Launch "Notion Books" from Applications or Spotlight
3. **Features**: All your web app features are available in the desktop version
4. **Backend**: The backend server starts automatically when you launch the app

The desktop app provides a native experience while running your existing React frontend and Express backend! 