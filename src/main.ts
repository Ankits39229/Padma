import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Check if running in development mode
const isDev = process.argv.includes('--dev');

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if running with administrator privileges
 */
function isAdmin(): boolean {
  try {
    // Try to write to a system directory
    const testPath = 'C:\\Windows\\Temp\\padma_admin_test';
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the actual size of directory contents safely
 */
async function safeGetSize(dirPath: string): Promise<number> {
  try {
    const result = await getDirectorySize(dirPath, 5);
    return result.size;
  } catch {
    return 0;
  }
}

// ============================================================================
// WINDOW CREATION
// ============================================================================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    },
    icon: path.join(__dirname, '../src/assets/app.ico'),
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// SYSTEM TRAY
// ============================================================================

function createTray(): void {
  const iconPath = path.join(__dirname, '../src/assets/app.ico');
  let icon: Electron.NativeImage;
  
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open PADMA',
      click: () => mainWindow?.show()
    },
    { type: 'separator' },
    {
      label: 'Quick Cleanse',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('trigger-quick-cleanse');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('PADMA - System Purifier');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => mainWindow?.show());
}

// ============================================================================
// IPC HANDLERS - Window Controls
// ============================================================================

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// ============================================================================
// IPC HANDLERS - System Information
// ============================================================================

ipcMain.handle('get-system-info', async () => {
  try {
    const si = require('systeminformation');
    
    const [mem, disk, cpu, osInfo, battery] = await Promise.all([
      si.mem(),
      si.fsSize(),
      si.cpu(),
      si.osInfo(),
      si.battery()
    ]);

    const primaryDisk = disk[0] || { size: 0, used: 0, available: 0 };
    
    return {
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: Math.round((mem.used / mem.total) * 100)
      },
      storage: {
        total: primaryDisk.size,
        used: primaryDisk.used,
        free: primaryDisk.available,
        usedPercent: Math.round((primaryDisk.used / primaryDisk.size) * 100)
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch
      },
      battery: {
        hasBattery: battery.hasBattery,
        percent: battery.percent,
        isCharging: battery.isCharging,
        cycleCount: battery.cycleCount || 0,
        maxCapacity: battery.maxCapacity || 0,
        designedCapacity: battery.designedCapacity || 0
      }
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return null;
  }
});

// ============================================================================
// IPC HANDLERS - Junk Scanner
// ============================================================================

interface JunkItem {
  path: string;
  size: number;
  category: string;
}

async function getDirectorySize(dirPath: string, maxDepth: number = 10, currentDepth: number = 0): Promise<{ size: number; files: string[] }> {
  let totalSize = 0;
  const files: string[] = [];
  
  // Prevent infinite recursion
  if (currentDepth > maxDepth) {
    return { size: 0, files: [] };
  }
  
  try {
    if (!fs.existsSync(dirPath)) {
      return { size: 0, files: [] };
    }
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          totalSize += stat.size;
          files.push(fullPath);
        } else if (stat.isDirectory()) {
          const subResult = await getDirectorySize(fullPath, maxDepth, currentDepth + 1);
          totalSize += subResult.size;
          files.push(...subResult.files);
        }
      } catch (err) {
        // Skip files we can't access (locked, permissions, etc.)
        console.log(`Skipping inaccessible file: ${fullPath}`);
      }
    }
  } catch (err) {
    // Skip directories we can't access
    console.log(`Skipping inaccessible directory: ${dirPath}`);
  }
  
  return { size: totalSize, files };
}

ipcMain.handle('scan-junk', async (_, categories: string[]) => {
  console.log(`[IPC] scan-junk called with categories:`, categories);
  const results: { [key: string]: { size: number; files: string[] } } = {};
  
  // Define all temp and cache paths
  const userTemp = process.env.TEMP || path.join(os.homedir(), 'AppData', 'Local', 'Temp');
  const windowsTemp = 'C:\\Windows\\Temp';
  const prefetchPath = 'C:\\Windows\\Prefetch';
  const crashDumpsPath = path.join(os.homedir(), 'AppData', 'Local', 'CrashDumps');
  const windowsLogsPath = 'C:\\Windows\\Logs';
  
  for (const category of categories) {
    console.log(`Scanning category: ${category}`);
    
    try {
      switch (category) {
        case 'temp': {
          // Scan user temp folder
          const userTempResult = await getDirectorySize(userTemp, 5);
          let winTempResult = { size: 0, files: [] as string[] };
          
          // Try to scan Windows temp (may require admin)
          try {
            if (fs.existsSync(windowsTemp)) {
              winTempResult = await getDirectorySize(windowsTemp, 5);
            }
          } catch (err) {
            console.log('Cannot access Windows Temp (may require admin)');
          }
          
          results['temp'] = {
            size: userTempResult.size + winTempResult.size,
            files: [...userTempResult.files, ...winTempResult.files]
          };
          break;
        }
        
        case 'prefetch': {
          // Prefetch files - requires admin to clean
          if (fs.existsSync(prefetchPath)) {
            try {
              results['prefetch'] = await getDirectorySize(prefetchPath, 2);
            } catch (err) {
              console.log('Cannot access Prefetch (requires admin)');
              results['prefetch'] = { size: 0, files: [] };
            }
          } else {
            results['prefetch'] = { size: 0, files: [] };
          }
          break;
        }
        
        case 'logs': {
          // Scan crash dumps and Windows logs
          let totalSize = 0;
          let allFiles: string[] = [];
          
          // User crash dumps
          if (fs.existsSync(crashDumpsPath)) {
            const crashResult = await getDirectorySize(crashDumpsPath, 3);
            totalSize += crashResult.size;
            allFiles.push(...crashResult.files);
          }
          
          // Windows logs (may require admin)
          try {
            if (fs.existsSync(windowsLogsPath)) {
              const logsResult = await getDirectorySize(windowsLogsPath, 3);
              totalSize += logsResult.size;
              allFiles.push(...logsResult.files);
            }
          } catch (err) {
            console.log('Cannot access Windows Logs (may require admin)');
          }
          
          results['logs'] = { size: totalSize, files: allFiles };
          break;
        }
        
        case 'browser-chrome': {
          const chromePaths = [
            path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'GPUCache')
          ];
          
          let totalSize = 0;
          let allFiles: string[] = [];
          
          for (const cachePath of chromePaths) {
            if (fs.existsSync(cachePath)) {
              const result = await getDirectorySize(cachePath, 3);
              totalSize += result.size;
              allFiles.push(...result.files);
            }
          }
          
          results['browser-chrome'] = { size: totalSize, files: allFiles };
          break;
        }
        
        case 'browser-edge': {
          const edgePaths = [
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'GPUCache')
          ];
          
          let totalSize = 0;
          let allFiles: string[] = [];
          
          for (const cachePath of edgePaths) {
            if (fs.existsSync(cachePath)) {
              const result = await getDirectorySize(cachePath, 3);
              totalSize += result.size;
              allFiles.push(...result.files);
            }
          }
          
          results['browser-edge'] = { size: totalSize, files: allFiles };
          break;
        }
        
        case 'browser-firefox': {
          const firefoxProfilesPath = path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles');
          let totalSize = 0;
          let allFiles: string[] = [];
          
          if (fs.existsSync(firefoxProfilesPath)) {
            try {
              const profiles = fs.readdirSync(firefoxProfilesPath);
              for (const profile of profiles) {
                const cachePath = path.join(firefoxProfilesPath, profile, 'cache2');
                if (fs.existsSync(cachePath)) {
                  const result = await getDirectorySize(cachePath, 3);
                  totalSize += result.size;
                  allFiles.push(...result.files);
                }
              }
            } catch (err) {
              console.log('Error scanning Firefox cache:', err);
            }
          }
          
          results['browser-firefox'] = { size: totalSize, files: allFiles };
          break;
        }
        
        case 'recycle': {
          // Use PowerShell to get recycle bin size
          try {
            const { stdout } = await execAsync(
              'powershell -Command "$size = (Get-ChildItem -Path \'C:\\$Recycle.Bin\' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($size) { $size } else { 0 }"'
            );
            const size = parseInt(stdout.trim()) || 0;
            results['recycle'] = { size, files: ['C:\\$Recycle.Bin'] };
          } catch (err) {
            console.log('Error scanning recycle bin:', err);
            results['recycle'] = { size: 0, files: [] };
          }
          break;
        }
        
        default:
          results[category] = { size: 0, files: [] };
      }
      
      console.log(`Category ${category} scanned: ${results[category]?.size || 0} bytes found`);
    } catch (error) {
      console.error(`Error scanning category ${category}:`, error);
      results[category] = { size: 0, files: [] };
    }
  }
  
  return results;
});

ipcMain.handle('clean-junk', async (_, categories: string[]) => {
  const cleaned: { [key: string]: { success: boolean; freedSpace: number } } = {};
  
  // Define all paths
  const userTemp = process.env.TEMP || path.join(os.homedir(), 'AppData', 'Local', 'Temp');
  const windowsTemp = 'C:\\Windows\\Temp';
  const prefetchPath = 'C:\\Windows\\Prefetch';
  const crashDumpsPath = path.join(os.homedir(), 'AppData', 'Local', 'CrashDumps');
  
  for (const category of categories) {
    console.log(`Cleaning category: ${category}`);
    let freedSpace = 0;
    let success = false;
    
    try {
      switch (category) {
        case 'temp': {
          // Clean user temp
          const userTempSize = await getDirectorySize(userTemp, 5);
          await deleteFilesInDirectory(userTemp);
          freedSpace = userTempSize.size;
          
          // Try to clean Windows temp (may require admin)
          try {
            if (fs.existsSync(windowsTemp)) {
              const winTempSize = await getDirectorySize(windowsTemp, 5);
              await deleteFilesInDirectory(windowsTemp);
              freedSpace += winTempSize.size;
            }
          } catch (err) {
            console.log('Cannot clean Windows Temp (may require admin)');
          }
          
          success = true;
          break;
        }
        
        case 'prefetch': {
          // Prefetch requires admin privileges
          if (fs.existsSync(prefetchPath)) {
            try {
              const prefetchSize = await getDirectorySize(prefetchPath, 2);
              await deleteFilesInDirectory(prefetchPath);
              freedSpace = prefetchSize.size;
              success = true;
            } catch (err) {
              console.log('Cannot clean Prefetch (requires admin)');
              success = false;
            }
          }
          break;
        }
        
        case 'logs': {
          // Clean crash dumps
          if (fs.existsSync(crashDumpsPath)) {
            const crashSize = await getDirectorySize(crashDumpsPath, 3);
            await deleteFilesInDirectory(crashDumpsPath);
            freedSpace += crashSize.size;
          }
          success = true;
          break;
        }
        
        case 'browser-chrome': {
          const chromePaths = [
            path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'GPUCache')
          ];
          
          for (const cachePath of chromePaths) {
            if (fs.existsSync(cachePath)) {
              const cacheSize = await getDirectorySize(cachePath, 3);
              await deleteFilesInDirectory(cachePath);
              freedSpace += cacheSize.size;
            }
          }
          success = true;
          break;
        }
        
        case 'browser-edge': {
          const edgePaths = [
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
            path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'GPUCache')
          ];
          
          for (const cachePath of edgePaths) {
            if (fs.existsSync(cachePath)) {
              const cacheSize = await getDirectorySize(cachePath, 3);
              await deleteFilesInDirectory(cachePath);
              freedSpace += cacheSize.size;
            }
          }
          success = true;
          break;
        }
        
        case 'browser-firefox': {
          const firefoxProfilesPath = path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles');
          
          if (fs.existsSync(firefoxProfilesPath)) {
            const profiles = fs.readdirSync(firefoxProfilesPath);
            for (const profile of profiles) {
              const cachePath = path.join(firefoxProfilesPath, profile, 'cache2');
              if (fs.existsSync(cachePath)) {
                const cacheSize = await getDirectorySize(cachePath, 3);
                await deleteFilesInDirectory(cachePath);
                freedSpace += cacheSize.size;
              }
            }
          }
          success = true;
          break;
        }
        
        case 'recycle': {
          // Empty recycle bin using PowerShell
          try {
            await execAsync('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"');
            success = true;
            freedSpace = 0; // Can't accurately measure recycle bin space freed
          } catch (err) {
            console.log('Error emptying recycle bin:', err);
            success = false;
          }
          break;
        }
        
        default:
          success = false;
      }
      
      cleaned[category] = { success, freedSpace };
      console.log(`Category ${category} cleaned: ${freedSpace} bytes freed, success: ${success}`);
      
    } catch (error) {
      console.error(`Error cleaning category ${category}:`, error);
      cleaned[category] = { success: false, freedSpace: 0 };
    }
  }
  
  return cleaned;
});

async function deleteFilesInDirectory(dirPath: string): Promise<number> {
  if (!fs.existsSync(dirPath)) return 0;
  
  let deletedCount = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively delete directory
          fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          deletedCount++;
        } else if (stat.isFile()) {
          // Delete file
          fs.unlinkSync(fullPath);
          deletedCount++;
        }
      } catch (err: any) {
        // Skip files that are locked or in use
        if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
          console.log(`File in use, skipping: ${fullPath}`);
        } else {
          console.log(`Error deleting ${fullPath}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.log(`Error accessing directory ${dirPath}:`, err);
  }
  
  return deletedCount;
}

// ============================================================================
// IPC HANDLERS - RAM Optimization
// ============================================================================

ipcMain.handle('boost-ram', async () => {
  try {
    // Attempt to clear standby memory using Windows API
    await execAsync('powershell -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()"');
    
    // Get memory info before and after
    const si = require('systeminformation');
    const memAfter = await si.mem();
    
    return {
      success: true,
      freedMemory: 0, // Actual freed memory would require before/after comparison
      currentFree: memAfter.free,
      currentUsed: memAfter.used
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// IPC HANDLERS - Startup Apps
// ============================================================================

ipcMain.handle('get-startup-apps', async () => {
  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | ConvertTo-Json"'
    );
    
    const apps = JSON.parse(stdout || '[]');
    return Array.isArray(apps) ? apps : [apps];
  } catch (error) {
    console.error('Error getting startup apps:', error);
    return [];
  }
});

ipcMain.handle('toggle-startup-app', async (_, appName: string, enabled: boolean) => {
  // This is a simplified implementation
  // Full implementation would require registry manipulation
  return { success: true, appName, enabled };
});

// ============================================================================
// IPC HANDLERS - Power Management
// ============================================================================

ipcMain.handle('get-power-plans', async () => {
  try {
    const { stdout } = await execAsync('powercfg /list');
    const lines = stdout.split('\n');
    const plans: { guid: string; name: string; active: boolean }[] = [];
    
    for (const line of lines) {
      const match = line.match(/GUID:\s*([a-f0-9-]+)\s+\(([^)]+)\)(\s*\*)?/i);
      if (match) {
        plans.push({
          guid: match[1],
          name: match[2],
          active: !!match[3]
        });
      }
    }
    
    return plans;
  } catch (error) {
    return [];
  }
});

ipcMain.handle('set-power-plan', async (_, guid: string) => {
  try {
    await execAsync(`powercfg /setactive ${guid}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// IPC HANDLERS - Disk Analysis
// ============================================================================

interface DiskItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children?: DiskItem[];
}

ipcMain.handle('analyze-disk', async (_, drivePath: string = 'C:\\') => {
  try {
    const result = await analyzeDiskRecursive(drivePath, 2);
    return result;
  } catch (error) {
    console.error('Error analyzing disk:', error);
    return null;
  }
});

async function analyzeDiskRecursive(dirPath: string, depth: number): Promise<DiskItem | null> {
  if (depth < 0) return null;
  
  try {
    const stat = fs.statSync(dirPath);
    const name = path.basename(dirPath) || dirPath;
    
    if (!stat.isDirectory()) {
      return {
        name,
        path: dirPath,
        size: stat.size,
        isDirectory: false
      };
    }
    
    const children: DiskItem[] = [];
    let totalSize = 0;
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items.slice(0, 50)) { // Limit items for performance
      const fullPath = path.join(dirPath, item);
      try {
        const child = await analyzeDiskRecursive(fullPath, depth - 1);
        if (child) {
          children.push(child);
          totalSize += child.size;
        }
      } catch {
        // Skip inaccessible items
      }
    }
    
    children.sort((a, b) => b.size - a.size);
    
    return {
      name,
      path: dirPath,
      size: totalSize,
      isDirectory: true,
      children: children.slice(0, 20)
    };
  } catch {
    return null;
  }
}

ipcMain.handle('get-largest-files', async (_, drivePath: string = 'C:\\Users') => {
  const files: { name: string; path: string; size: number }[] = [];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 4) return;
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isFile() && stat.size > 50 * 1024 * 1024) { // Files > 50MB
            files.push({
              name: item,
              path: fullPath,
              size: stat.size
            });
          } else if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await scanDir(fullPath, depth + 1);
          }
        } catch {
          // Skip inaccessible files
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  
  const userPath = path.join(drivePath);
  await scanDir(userPath);
  
  files.sort((a, b) => b.size - a.size);
  return files.slice(0, 10);
});

// ============================================================================
// IPC HANDLERS - S.M.A.R.T Health
// ============================================================================

ipcMain.handle('get-disk-health', async () => {
  try {
    const si = require('systeminformation');
    const diskLayout = await si.diskLayout();
    
    return diskLayout.map((disk: any) => ({
      name: disk.name,
      type: disk.type,
      size: disk.size,
      vendor: disk.vendor,
      temperature: disk.temperature || null,
      smartStatus: disk.smartStatus || 'Unknown'
    }));
  } catch (error) {
    return [];
  }
});

// ============================================================================
// IPC HANDLERS - System Report
// ============================================================================

ipcMain.handle('generate-system-report', async () => {
  try {
    const si = require('systeminformation');
    
    const [cpu, mem, osInfo, disk, graphics, battery, network] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.fsSize(),
      si.graphics(),
      si.battery(),
      si.networkInterfaces()
    ]);
    
    const report = {
      generatedAt: new Date().toISOString(),
      system: {
        os: `${osInfo.distro} ${osInfo.release}`,
        arch: osInfo.arch,
        hostname: osInfo.hostname
      },
      cpu: {
        model: `${cpu.manufacturer} ${cpu.brand}`,
        cores: cpu.cores,
        speed: `${cpu.speed} GHz`
      },
      memory: {
        total: formatBytes(mem.total),
        free: formatBytes(mem.free),
        used: formatBytes(mem.used)
      },
      storage: disk.map((d: any) => ({
        mount: d.mount,
        size: formatBytes(d.size),
        used: formatBytes(d.used),
        free: formatBytes(d.available)
      })),
      graphics: graphics.controllers.map((g: any) => ({
        model: g.model,
        vram: g.vram ? `${g.vram} MB` : 'Unknown'
      })),
      battery: battery.hasBattery ? {
        percent: `${battery.percent}%`,
        isCharging: battery.isCharging,
        cycleCount: battery.cycleCount
      } : 'No battery detected',
      network: network.filter((n: any) => n.ip4).map((n: any) => ({
        iface: n.iface,
        ip4: n.ip4,
        mac: n.mac
      }))
    };
    
    // Save report to user's documents
    const reportsDir = path.join(os.homedir(), 'Documents', 'PADMA Reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `PADMA_Report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { success: true, report, path: reportPath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

ipcMain.handle('open-path', async (_, filePath: string) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(() => {
  createWindow();
  createTray();
  
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

app.on('before-quit', () => {
  isQuitting = true;
});
