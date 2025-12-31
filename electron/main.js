const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Check if running in development
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Safely require modules with error handling for MSIX environment
let scanAll, cleanItems, moveToTrash, getCleanupPreview;
let getStartupApps, toggleStartupApp, scanLargestFiles, deleteFile;
let getSystemInfo, exportToJSON, exportToText, exportToPDF;
let scanRegistry, cleanRegistryIssues;
let optimizer;

try {
  const cleanupScanner = require('./cleanupScanner');
  scanAll = cleanupScanner.scanAll;
  cleanItems = cleanupScanner.cleanItems;
  moveToTrash = cleanupScanner.moveToTrash;
  getCleanupPreview = cleanupScanner.getCleanupPreview;
} catch (e) {
  console.error('Failed to load cleanupScanner:', e);
}

try {
  const systemScanner = require('./systemScanner');
  getStartupApps = systemScanner.getStartupApps;
  toggleStartupApp = systemScanner.toggleStartupApp;
  scanLargestFiles = systemScanner.scanLargestFiles;
  deleteFile = systemScanner.deleteFile;
} catch (e) {
  console.error('Failed to load systemScanner:', e);
}

try {
  const systemInfo = require('./systemInfo');
  getSystemInfo = systemInfo.getSystemInfo;
  exportToJSON = systemInfo.exportToJSON;
  exportToText = systemInfo.exportToText;
  exportToPDF = systemInfo.exportToPDF;
} catch (e) {
  console.error('Failed to load systemInfo:', e);
}

try {
  const registryCleaner = require('./registryCleaner');
  scanRegistry = registryCleaner.scanRegistry;
  cleanRegistryIssues = registryCleaner.cleanRegistryIssues;
} catch (e) {
  console.error('Failed to load registryCleaner:', e);
}

try {
  optimizer = require('./optimizer');
} catch (e) {
  console.error('Failed to load optimizer:', e);
}

let mainWindow;

// Get the correct path to index.html
function getIndexPath() {
  // app.getAppPath() returns the path to app.asar in packaged mode
  const appPath = app.getAppPath();
  const indexPath = path.join(appPath, 'dist', 'index.html');
  console.log('App path:', appPath);
  console.log('Index path:', indexPath);
  return indexPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#1e293b',
    show: false,
  });

  // Set app icon for taskbar (Windows)
  if (process.platform === 'win32') {
    app.setAppUserModelId('Nemi.Padma');
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = getIndexPath();
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle load failures - show error in window
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // Notify renderer of window state changes
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-info', async () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  };
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('is-window-maximized', () => {
  if (mainWindow) {
    return mainWindow.isMaximized();
  }
  return false;
});

// Cleanup scanner handlers
ipcMain.handle('scan-system', async () => {
  try {
    if (!scanAll) return { success: false, error: 'Scanner not available' };
    const result = await scanAll();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-items', async (event, items) => {
  try {
    if (!cleanItems) return { success: false, error: 'Cleaner not available' };
    const result = await cleanItems(items);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('move-to-trash', async (event, filePath) => {
  try {
    if (!moveToTrash) return { success: false, error: 'Function not available' };
    const result = await moveToTrash(filePath);
    return { success: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// System scanner handlers
ipcMain.handle('get-startup-apps', async () => {
  try {
    if (!getStartupApps) return { success: false, error: 'Scanner not available' };
    const apps = await getStartupApps();
    return { success: true, data: apps };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-startup-app', async (event, appItem, enabled) => {
  try {
    if (!toggleStartupApp) return { success: false, error: 'Function not available' };
    const result = await toggleStartupApp(appItem, enabled);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-largest-files', async (event, limit = 10) => {
  try {
    if (!scanLargestFiles) return { success: false, error: 'Scanner not available' };
    const files = await scanLargestFiles(null, limit);
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file-location', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (!deleteFile) return { success: false, error: 'Function not available' };
    const result = await deleteFile(filePath);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// System info handlers
ipcMain.handle('get-system-info', async () => {
  try {
    if (!getSystemInfo) return { success: false, error: 'System info not available' };
    const info = await getSystemInfo();
    return { success: true, data: info };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-system-info-json', async (event, systemInfo) => {
  try {
    const result = await exportToJSON(systemInfo, mainWindow);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-system-info-text', async (event, systemInfo) => {
  try {
    const result = await exportToText(systemInfo, mainWindow);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-system-info-pdf', async (event, systemInfo) => {
  try {
    const result = await exportToPDF(systemInfo, mainWindow);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// Registry cleaner handlers
ipcMain.handle('scan-registry', async () => {
  try {
    if (!scanRegistry) return { success: false, error: 'Registry scanner not available' };
    const issues = await scanRegistry();
    return { success: true, data: issues };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-registry', async (event, issues) => {
  try {
    if (!cleanRegistryIssues) return { success: false, error: 'Registry cleaner not available' };
    const result = await cleanRegistryIssues(issues);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cleanup preview handler
ipcMain.handle('get-cleanup-preview', async (event, items) => {
  try {
    if (!getCleanupPreview) return { success: false, error: 'Preview not available' };
    const preview = await getCleanupPreview(items);
    return { success: true, data: preview };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// ==================== OPTIMIZER HANDLERS ====================

// RAM Optimizer
ipcMain.handle('get-ram-usage', async () => {
  try {
    if (!optimizer?.getRamUsage) return { success: false, error: 'Optimizer not available' };
    const usage = await optimizer.getRamUsage();
    return { success: true, data: usage };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-top-memory-processes', async (event, limit = 10) => {
  try {
    if (!optimizer?.getTopMemoryProcesses) return { success: false, error: 'Optimizer not available' };
    const processes = await optimizer.getTopMemoryProcesses(limit);
    return { success: true, data: processes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('optimize-ram', async () => {
  try {
    if (!optimizer?.optimizeRam) return { success: false, error: 'Optimizer not available' };
    const result = await optimizer.optimizeRam();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Battery Saver
ipcMain.handle('get-power-plans', async () => {
  try {
    const plans = await optimizer.getPowerPlans();
    const current = await optimizer.getCurrentPowerPlan();
    return { success: true, data: { plans, current } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-power-plan', async (event, planType) => {
  try {
    const result = await optimizer.setPowerPlan(planType);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-battery-status', async () => {
  try {
    const status = await optimizer.getBatteryStatus();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-background-processes', async () => {
  try {
    const processes = await optimizer.getBackgroundProcesses();
    return { success: true, data: processes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('throttle-background-processes', async () => {
  try {
    const result = await optimizer.throttleBackgroundProcesses();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Network Optimizer
ipcMain.handle('flush-dns', async () => {
  try {
    const result = await optimizer.flushDnsCache();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-winsock', async () => {
  try {
    const result = await optimizer.resetWinsock();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-network-adapter', async () => {
  try {
    const result = await optimizer.resetNetworkAdapter();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-tcp-ip', async () => {
  try {
    const result = await optimizer.resetTcpIp();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-network-status', async () => {
  try {
    const status = await optimizer.getNetworkStatus();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('optimize-network', async () => {
  try {
    const result = await optimizer.optimizeNetwork();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});
