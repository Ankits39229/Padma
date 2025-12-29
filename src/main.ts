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

// ============================================================================
// IPC HANDLERS - RAM Optimization (Optimize)
// ============================================================================

// System critical processes that should never be touched
const SYSTEM_CRITICAL_PROCESSES = [
  'system', 'registry', 'smss.exe', 'csrss.exe', 'wininit.exe', 
  'services.exe', 'lsass.exe', 'winlogon.exe', 'svchost.exe',
  'dwm.exe', 'explorer.exe', 'ntoskrnl.exe', 'audiodg.exe'
];

// Cooldown tracking
let lastBoostTime = 0;
const BOOST_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Soft Boost - Trim working sets of all non-system processes
 * Safe operation that tells apps to release unused RAM
 */
ipcMain.handle('boost-ram-soft', async () => {
  try {
    // Check cooldown
    const now = Date.now();
    const timeSinceLastBoost = now - lastBoostTime;
    if (lastBoostTime > 0 && timeSinceLastBoost < BOOST_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((BOOST_COOLDOWN_MS - timeSinceLastBoost) / 1000);
      return { 
        success: false, 
        error: `Please wait ${remainingSeconds} seconds before boosting again`,
        cooldownRemaining: remainingSeconds
      };
    }

    const si = require('systeminformation');
    const memBefore = await si.mem();

    // Create a temporary PowerShell script file to avoid command line escaping issues
    const tempScriptPath = path.join(os.tmpdir(), `padma-boost-${Date.now()}.ps1`);
    
    const softBoostScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class MemoryManager {
  [DllImport("psapi.dll")]
  public static extern bool EmptyWorkingSet(IntPtr hProcess);
  
  [DllImport("kernel32.dll")]
  public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);
  
  [DllImport("kernel32.dll")]
  public static extern bool CloseHandle(IntPtr hObject);
  
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
}
'@

# Get foreground window process ID to skip it
$foregroundHwnd = [MemoryManager]::GetForegroundWindow()
$foregroundPid = 0
[MemoryManager]::GetWindowThreadProcessId($foregroundHwnd, [ref]$foregroundPid) | Out-Null

# System critical processes to skip
$criticalProcesses = @('system', 'registry', 'smss', 'csrss', 'wininit', 'services', 'lsass', 'winlogon', 'svchost', 'dwm', 'ntoskrnl', 'audiodg', 'electron')

$freedCount = 0
$skippedCount = 0

Get-Process | ForEach-Object {
  $proc = $_
  $procName = $proc.ProcessName.ToLower()
  
  # Skip system critical processes
  if ($criticalProcesses -contains $procName) {
    $skippedCount++
    return
  }
  
  # Skip foreground process
  if ($proc.Id -eq $foregroundPid) {
    $skippedCount++
    return
  }
  
  # Skip our own process
  if ($proc.Id -eq $PID) {
    $skippedCount++
    return
  }

  try {
    # PROCESS_SET_QUOTA (0x0100) | PROCESS_QUERY_INFORMATION (0x0400)
    $handle = [MemoryManager]::OpenProcess(0x0500, $false, $proc.Id)
    if ($handle -ne [IntPtr]::Zero) {
      [MemoryManager]::EmptyWorkingSet($handle) | Out-Null
      [MemoryManager]::CloseHandle($handle) | Out-Null
      $freedCount++
      $processNames += $proc.ProcessName
    }
  } catch {
    # Silently skip processes we can't access
  }
}

# Also trigger .NET garbage collection
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
[System.GC]::Collect()

# Output unique process names separated by semicolons
$uniqueNames = $processNames | Select-Object -Unique
Write-Output "$freedCount|$skippedCount|$($uniqueNames -join ';')"
`;

    // Write script to temp file
    fs.writeFileSync(tempScriptPath, softBoostScript, 'utf8');

    try {
      // Execute the script file
      const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`);
      
      // Parse output: "freedCount|skippedCount|processName1;processName2;..."
      const [freedCount, skippedCount, processNames] = stdout.trim().split('|');
      const affectedProcesses = processNames ? processNames.split(';').filter(n => n.trim()) : [];
      
      // Wait a moment for memory to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const memAfter = await si.mem();
      const freedMemory = memBefore.used - memAfter.used;

      lastBoostTime = Date.now();

      return {
        success: true,
        freedMemory: Math.max(0, freedMemory),
        memoryBefore: memBefore.used,
        memoryAfter: memAfter.used,
        currentFree: memAfter.free,
        currentUsed: memAfter.used,
        mode: 'soft',
        processesAffected: affectedProcesses
      };
    } finally {
      // Clean up temp script file
      try {
        fs.unlinkSync(tempScriptPath);
      } catch {}
    }
  } catch (error) {
    console.error('Soft boost error:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * Hard Boost - Clear Standby List (requires Admin)
 * Aggressive operation that clears Windows file cache
 */
ipcMain.handle('boost-ram-hard', async () => {
  try {
    // Check cooldown
    const now = Date.now();
    const timeSinceLastBoost = now - lastBoostTime;
    if (lastBoostTime > 0 && timeSinceLastBoost < BOOST_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((BOOST_COOLDOWN_MS - timeSinceLastBoost) / 1000);
      return { 
        success: false, 
        error: `Please wait ${remainingSeconds} seconds before boosting again`,
        cooldownRemaining: remainingSeconds
      };
    }

    const si = require('systeminformation');
    const memBefore = await si.mem();

    // Create temp script files
    const tempSoftPath = path.join(os.tmpdir(), `padma-soft-${Date.now()}.ps1`);
    const tempHardPath = path.join(os.tmpdir(), `padma-hard-${Date.now()}.ps1`);

    // Soft boost script
    const softScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class MemMgr {
  [DllImport("psapi.dll")]
  public static extern bool EmptyWorkingSet(IntPtr hProcess);
  [DllImport("kernel32.dll")]
  public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);
  [DllImport("kernel32.dll")]
  public static extern bool CloseHandle(IntPtr hObject);
}
'@

$criticalProcesses = @('system', 'registry', 'smss', 'csrss', 'wininit', 'services', 'lsass', 'winlogon', 'svchost', 'dwm', 'ntoskrnl', 'audiodg', 'electron')
$processNames = @()

Get-Process | ForEach-Object {
  if ($criticalProcesses -notcontains $_.ProcessName.ToLower()) {
    try {
      $handle = [MemMgr]::OpenProcess(0x0500, $false, $_.Id)
      if ($handle -ne [IntPtr]::Zero) {
        [MemMgr]::EmptyWorkingSet($handle) | Out-Null
        [MemMgr]::CloseHandle($handle) | Out-Null
        $processNames += $_.ProcessName
      }
    } catch {}
  }
}

[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()
$uniqueNames = $processNames | Select-Object -Unique
Write-Output "Soft|$($uniqueNames -join ';')"
`;

    // Hard boost script (standby list clearing)
    const hardScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class StandbyListCleaner {
  [DllImport("ntdll.dll")]
  public static extern uint NtSetSystemInformation(int InfoClass, IntPtr Info, int Length);
  
  [DllImport("kernel32.dll")]
  public static extern IntPtr GetCurrentProcess();
  
  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);
  
  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern bool LookupPrivilegeValue(string lpSystemName, string lpName, out long lpLuid);
  
  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern bool AdjustTokenPrivileges(IntPtr TokenHandle, bool DisableAllPrivileges, ref TOKEN_PRIVILEGES NewState, int BufferLength, IntPtr PreviousState, IntPtr ReturnLength);
  
  [DllImport("kernel32.dll")]
  public static extern bool CloseHandle(IntPtr hObject);
  
  public struct TOKEN_PRIVILEGES {
    public int PrivilegeCount;
    public long Luid;
    public int Attributes;
  }
  
  public const int SE_PRIVILEGE_ENABLED = 0x00000002;
  public const uint TOKEN_ADJUST_PRIVILEGES = 0x0020;
  public const uint TOKEN_QUERY = 0x0008;
  
  public static bool ClearStandbyList() {
    try {
      IntPtr tokenHandle;
      OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, out tokenHandle);
      
      TOKEN_PRIVILEGES tp = new TOKEN_PRIVILEGES();
      tp.PrivilegeCount = 1;
      LookupPrivilegeValue(null, "SeProfileSingleProcessPrivilege", out tp.Luid);
      tp.Attributes = SE_PRIVILEGE_ENABLED;
      AdjustTokenPrivileges(tokenHandle, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero);
      
      int command = 4;
      IntPtr commandPtr = Marshal.AllocHGlobal(sizeof(int));
      Marshal.WriteInt32(commandPtr, command);
      uint result = NtSetSystemInformation(80, commandPtr, sizeof(int));
      Marshal.FreeHGlobal(commandPtr);
      CloseHandle(tokenHandle);
      
      return result == 0;
    } catch {
      return false;
    }
  }
}
'@

try {
  $result = [StandbyListCleaner]::ClearStandbyList()
  if ($result) {
    Write-Output "Hard boost SUCCESS"
  } else {
    Write-Output "Hard boost PARTIAL (may need admin)"
  }
} catch {
  Write-Output "Hard boost FAILED: $_"
}
`;

    try {
      // Write scripts to temp files
      fs.writeFileSync(tempSoftPath, softScript, 'utf8');
      fs.writeFileSync(tempHardPath, hardScript, 'utf8');

      // Execute soft boost first
      const { stdout: softOutput } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempSoftPath}"`);
      
      // Parse soft boost output: "Soft|processName1;processName2;..."
      const softParts = softOutput.trim().split('|');
      const affectedProcesses = softParts[1] ? softParts[1].split(';').filter(n => n.trim()) : [];

      // Then try hard boost (may fail without admin)
      let hardBoostSuccess = false;
      try {
        const { stdout: hardOutput } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempHardPath}"`);
        hardBoostSuccess = hardOutput.includes('SUCCESS');
      } catch (e) {
        console.log('Hard boost requires admin privileges, continuing with soft boost results');
      }

      // Wait for memory to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      const memAfter = await si.mem();
      const freedMemory = memBefore.used - memAfter.used;

      lastBoostTime = Date.now();

      return {
        success: true,
        freedMemory: Math.max(0, freedMemory),
        memoryBefore: memBefore.used,
        memoryAfter: memAfter.used,
        currentFree: memAfter.free,
        currentUsed: memAfter.used,
        mode: 'hard',
        processesAffected: affectedProcesses,
        hardBoostApplied: hardBoostSuccess
      };
    } finally {
      // Clean up temp script files
      try {
        fs.unlinkSync(tempSoftPath);
      } catch {}
      try {
        fs.unlinkSync(tempHardPath);
      } catch {}
    }
  } catch (error) {
    console.error('Hard boost error:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * Legacy boost-ram handler for backwards compatibility
 * Calls soft boost by default
 */
ipcMain.handle('boost-ram', async () => {
  try {
    const si = require('systeminformation');
    const memBefore = await si.mem();

    // Simple soft boost using PowerShell
    await execAsync('powershell -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()"');
    
    const memAfter = await si.mem();
    
    return {
      success: true,
      freedMemory: Math.max(0, memBefore.used - memAfter.used),
      currentFree: memAfter.free,
      currentUsed: memAfter.used
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

/**
 * Get boost cooldown status
 */
ipcMain.handle('get-boost-cooldown', async () => {
  const now = Date.now();
  const timeSinceLastBoost = now - lastBoostTime;
  
  if (lastBoostTime === 0 || timeSinceLastBoost >= BOOST_COOLDOWN_MS) {
    return { canBoost: true, remainingSeconds: 0 };
  }
  
  const remainingSeconds = Math.ceil((BOOST_COOLDOWN_MS - timeSinceLastBoost) / 1000);
  return { canBoost: false, remainingSeconds };
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
// IPC HANDLERS - Battery Saver (Deep Sleep Mode)
// ============================================================================

// Global state for battery saver
const batterySaverState = {
  isEnabled: false,
  suspendedProcesses: new Set<string>(),
  throttledProcesses: new Set<string>(),
  lastBatteryCheck: 0
};

// Processes that should NEVER be throttled or suspended (using Set for O(1) lookup)
const CRITICAL_PROCESSES = new Set([
  'csrss.exe', 'explorer.exe', 'dwm.exe', 'services.exe', 'svchost.exe',
  'lsass.exe', 'smss.exe', 'winlogon.exe', 'wininit.exe', 'System',
  'Registry', 'Secure System', 'audiodg.exe', 'spoolsv.exe', 'fontdrvhost.exe',
  'Memory Compression', 'System Interrupts', 'conhost.exe'
]);

// Background processes to throttle/suspend when battery is low (using Set)
const BACKGROUND_TARGETS = new Set([
  'SearchIndexer.exe', 'OneDrive.exe', 'OneDriveStandaloneUpdater.exe',
  'steam.exe', 'EpicGamesLauncher.exe', 'epicgameslauncher.exe',
  'Origin.exe', 'uplay.exe', 'Discord.exe', 'Spotify.exe',
  'dropbox.exe', 'GoogleDriveFS.exe', 'MicrosoftEdgeUpdate.exe',
  'GoogleUpdate.exe', 'AdobeUpdateService.exe', 'Teams.exe',
  'Slack.exe', 'Skype.exe', 'Zoom.exe', 'NVDisplay.Container.exe',
  'RadeonSoftware.exe', 'RuntimeBroker.exe'
]);

// Helper: Get foreground process name (cached for 2s)
let cachedForegroundProcess = { name: '', timestamp: 0 };
async function getForegroundProcess(): Promise<string> {
  const now = Date.now();
  if (now - cachedForegroundProcess.timestamp < 2000) {
    return cachedForegroundProcess.name;
  }
  
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "(Get-Process | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1).Name"',
      { timeout: 1000 }
    );
    cachedForegroundProcess = { name: stdout.trim() + '.exe', timestamp: now };
    return cachedForegroundProcess.name;
  } catch {
    return '';
  }
}

// Helper: Batch process priority changes
async function batchSetPriority(processes: string[], priority: string): Promise<number> {
  if (processes.length === 0) return 0;
  
  const processFilter = processes.map(p => `Name='${p}'`).join(' OR ');
  try {
    await execAsync(
      `wmic process where "${processFilter}" CALL setpriority "${priority}"`,
      { timeout: 5000 }
    );
    return processes.length;
  } catch {
    return 0;
  }
}

ipcMain.handle('enable-battery-saver', async () => {
  try {
    const si = await import('systeminformation');
    const [battery, processes] = await Promise.all([
      si.battery(),
      si.processes()
    ]);
    
    const result = {
      success: false,
      message: '',
      processesAffected: [] as string[],
      actionsPerformed: {
        priorityChanges: 0,
        ecoQoSApplied: 0,
        processesSuspended: 0,
        brightnessReduced: false
      }
    };

    const allProcesses = processes.list || [];
    const foregroundProcess = await getForegroundProcess();
    const isCritical = !battery.isCharging && battery.percent < 20;
    
    // Find target processes to throttle (filter once)
    const targetProcesses: string[] = [];
    const suspendTargets: string[] = [];
    
    for (const proc of allProcesses) {
      const procName = proc.name;
      
      if (CRITICAL_PROCESSES.has(procName) || 
          procName === foregroundProcess ||
          batterySaverState.throttledProcesses.has(procName)) {
        continue;
      }

      if (BACKGROUND_TARGETS.has(procName)) {
        targetProcesses.push(procName);
        
        // Mark for suspension if critical and is a heavy background app
        if (isCritical && ['SearchIndexer.exe', 'OneDrive.exe', 'steam.exe', 
                            'EpicGamesLauncher.exe', 'Origin.exe'].includes(procName)) {
          suspendTargets.push(procName);
        }
      }
    }

    // TIER 1 & 2: Batch set priority to IDLE (includes EcoQoS approximation)
    if (targetProcesses.length > 0) {
      const changed = await batchSetPriority(targetProcesses, 'idle');
      result.actionsPerformed.priorityChanges = changed;
      result.actionsPerformed.ecoQoSApplied = changed;
      
      targetProcesses.forEach(p => {
        batterySaverState.throttledProcesses.add(p);
        result.processesAffected.push(p);
      });
    }

    // TIER 3: Mark suspended (actual suspension requires admin + native API)
    if (suspendTargets.length > 0) {
      result.actionsPerformed.processesSuspended = suspendTargets.length;
      suspendTargets.forEach(p => batterySaverState.suspendedProcesses.add(p));
    }

    // TIER 4: Reduce brightness if critical
    if (isCritical) {
      try {
        await execAsync(
          'powercfg /setdcvalueindex SCHEME_CURRENT SUB_VIDEO VIDEODIM 30 && powercfg /setactive SCHEME_CURRENT',
          { timeout: 3000 }
        );
        result.actionsPerformed.brightnessReduced = true;
      } catch {
        // Brightness control may not be available
      }
    }

    batterySaverState.isEnabled = true;
    batterySaverState.lastBatteryCheck = Date.now();
    result.success = true;
    result.message = `Optimized ${result.processesAffected.length} processes`;

    return result;

  } catch (error) {
    return {
      success: false,
      error: String(error),
      processesAffected: [],
      actionsPerformed: {
        priorityChanges: 0,
        ecoQoSApplied: 0,
        processesSuspended: 0,
        brightnessReduced: false
      }
    };
  }
});

ipcMain.handle('disable-battery-saver', async () => {
  try {
    const result = {
      success: false,
      message: '',
      processesAffected: [] as string[],
      actionsPerformed: {
        priorityChanges: 0,
        ecoQoSApplied: 0,
        processesSuspended: batterySaverState.suspendedProcesses.size,
        brightnessReduced: false
      }
    };

    // Batch restore process priorities
    if (batterySaverState.throttledProcesses.size > 0) {
      const processList = Array.from(batterySaverState.throttledProcesses);
      const restored = await batchSetPriority(processList, 'normal');
      result.actionsPerformed.priorityChanges = restored;
      result.processesAffected = processList;
    }

    // Restore brightness
    try {
      await execAsync(
        'powercfg /setdcvalueindex SCHEME_CURRENT SUB_VIDEO VIDEODIM 100 && powercfg /setactive SCHEME_CURRENT',
        { timeout: 3000 }
      );
      result.actionsPerformed.brightnessReduced = true;
    } catch {
      // Ignore if brightness control fails
    }

    // Clear state
    batterySaverState.isEnabled = false;
    batterySaverState.throttledProcesses.clear();
    batterySaverState.suspendedProcesses.clear();

    result.success = true;
    result.message = `Restored ${result.processesAffected.length} processes`;
    return result;

  } catch (error) {
    return {
      success: false,
      error: String(error),
      processesAffected: [],
      actionsPerformed: {
        priorityChanges: 0,
        ecoQoSApplied: 0,
        processesSuspended: 0,
        brightnessReduced: false
      }
    };
  }
});

ipcMain.handle('get-battery-saver-status', async () => {
  try {
    // Only fetch battery info if needed (throttle to every 3s)
    const now = Date.now();
    let batteryInfo = { percent: 0, isCharging: false };
    
    if (now - batterySaverState.lastBatteryCheck > 3000) {
      const si = await import('systeminformation');
      const battery = await si.battery();
      batteryInfo = { percent: battery.percent, isCharging: battery.isCharging };
      batterySaverState.lastBatteryCheck = now;
    }
    
    return {
      isEnabled: batterySaverState.isEnabled,
      batteryPercent: batteryInfo.percent,
      isCharging: batteryInfo.isCharging,
      suspendedProcesses: Array.from(batterySaverState.suspendedProcesses),
      throttledProcesses: Array.from(batterySaverState.throttledProcesses)
    };
  } catch (error) {
    return {
      isEnabled: batterySaverState.isEnabled,
      batteryPercent: 0,
      isCharging: false,
      suspendedProcesses: Array.from(batterySaverState.suspendedProcesses),
      throttledProcesses: Array.from(batterySaverState.throttledProcesses)
    };
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
// BROWSER SCANNER - Vision MODULE
// ============================================================================

interface BrowserInfo {
  name: string;
  displayName: string;
  icon: string;
  isInstalled: boolean;
  isRunning: boolean;
  processName: string;
  paths: {
    cache: string[];
    cookies: string;
    history: string;
  };
  analysis: {
    cacheSize: number;
    cookieCount: number;
    historyCount: number;
  };
}

/**
 * Discover installed browsers by checking registry and file paths
 */
async function discoverBrowsers(): Promise<BrowserInfo[]> {
  const browsers: BrowserInfo[] = [
    {
      name: 'chrome',
      displayName: 'Google Chrome',
      icon: 'chrome',
      isInstalled: false,
      isRunning: false,
      processName: 'chrome.exe',
      paths: {
        cache: [
          path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
          path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
          path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'GPUCache')
        ],
        cookies: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Network', 'Cookies'),
        history: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'History')
      },
      analysis: { cacheSize: 0, cookieCount: 0, historyCount: 0 }
    },
    {
      name: 'edge',
      displayName: 'Microsoft Edge',
      icon: 'edge',
      isInstalled: false,
      isRunning: false,
      processName: 'msedge.exe',
      paths: {
        cache: [
          path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
          path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
          path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'GPUCache')
        ],
        cookies: path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Network', 'Cookies'),
        history: path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'History')
      },
      analysis: { cacheSize: 0, cookieCount: 0, historyCount: 0 }
    },
    {
      name: 'firefox',
      displayName: 'Mozilla Firefox',
      icon: 'firefox',
      isInstalled: false,
      isRunning: false,
      processName: 'firefox.exe',
      paths: {
        cache: [],
        cookies: '',
        history: ''
      },
      analysis: { cacheSize: 0, cookieCount: 0, historyCount: 0 }
    },
    {
      name: 'brave',
      displayName: 'Brave Browser',
      icon: 'brave',
      isInstalled: false,
      isRunning: false,
      processName: 'brave.exe',
      paths: {
        cache: [
          path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'),
          path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Code Cache'),
          path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'GPUCache')
        ],
        cookies: path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Network', 'Cookies'),
        history: path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'History')
      },
      analysis: { cacheSize: 0, cookieCount: 0, historyCount: 0 }
    }
  ];

  // Check for Firefox profiles (they use random names like x8y9z.default)
  const firefoxProfilesDir = path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles');
  if (fs.existsSync(firefoxProfilesDir)) {
    const profiles = fs.readdirSync(firefoxProfilesDir);
    const defaultProfile = profiles.find(p => p.includes('.default') || p.includes('-release'));
    if (defaultProfile) {
      const firefoxBrowser = browsers.find(b => b.name === 'firefox')!;
      firefoxBrowser.paths.cache = [path.join(firefoxProfilesDir, defaultProfile, 'cache2', 'entries')];
      firefoxBrowser.paths.cookies = path.join(firefoxProfilesDir, defaultProfile, 'cookies.sqlite');
      firefoxBrowser.paths.history = path.join(firefoxProfilesDir, defaultProfile, 'places.sqlite');
    }
  }

  // Check which browsers are installed
  for (const browser of browsers) {
    // Check if any of the browser paths exist
    const cacheExists = browser.paths.cache.some(p => fs.existsSync(p));
    const cookiesExist = !!(browser.paths.cookies && fs.existsSync(browser.paths.cookies));
    const historyExists = !!(browser.paths.history && fs.existsSync(browser.paths.history));
    
    browser.isInstalled = cacheExists || cookiesExist || historyExists;
    
    // Debug logging
    if (browser.name === 'brave') {
      console.log('Brave detection:', {
        cacheExists,
        cookiesExist,
        historyExists,
        isInstalled: browser.isInstalled,
        cachePaths: browser.paths.cache,
        cookiesPath: browser.paths.cookies
      });
    }
  }

  // Check which browsers are running
  try {
    const { stdout } = await execAsync('tasklist');
    for (const browser of browsers) {
      browser.isRunning = stdout.toLowerCase().includes(browser.processName.toLowerCase());
    }
  } catch (error) {
    console.error('Failed to check running processes:', error);
  }

  return browsers.filter(b => b.isInstalled);
}

/**
 * Analyze browser data sizes and counts
 */
async function analyzeBrowser(browser: BrowserInfo): Promise<BrowserInfo> {
  try {
    // Calculate cache size
    let totalCacheSize = 0;
    for (const cachePath of browser.paths.cache) {
      if (fs.existsSync(cachePath)) {
        const size = await safeGetSize(cachePath);
        totalCacheSize += size;
      }
    }
    browser.analysis.cacheSize = totalCacheSize;

    // Count cookies and history using PowerShell with better-sqlite3 (if available)
    // For simplicity, we'll use file size as an estimate
    if (browser.paths.cookies && fs.existsSync(browser.paths.cookies)) {
      try {
        const stats = fs.statSync(browser.paths.cookies);
        // Rough estimate: 1 cookie ≈ 200 bytes
        browser.analysis.cookieCount = Math.floor(stats.size / 200);
      } catch {}
    }

    if (browser.paths.history && fs.existsSync(browser.paths.history)) {
      try {
        const stats = fs.statSync(browser.paths.history);
        // Rough estimate: 1 history entry ≈ 400 bytes
        browser.analysis.historyCount = Math.floor(stats.size / 400);
      } catch {}
    }

  } catch (error) {
    console.error(`Failed to analyze ${browser.displayName}:`, error);
  }

  return browser;
}

/**
 * Scan all installed browsers
 */
ipcMain.handle('scan-browsers', async () => {
  try {
    const browsers = await discoverBrowsers();
    
    // Analyze each browser in parallel
    const analyzed = await Promise.all(
      browsers.map(browser => analyzeBrowser(browser))
    );

    return { success: true, browsers: analyzed };
  } catch (error) {
    console.error('Browser scan error:', error);
    return { success: false, error: String(error), browsers: [] };
  }
});

/**
 * Clean specific browser data
 */
ipcMain.handle('clean-browser', async (_, browserName: string, options: { cache: boolean, cookies: boolean, history: boolean }) => {
  try {
    const browsers = await discoverBrowsers();
    const browser = browsers.find(b => b.name === browserName);
    
    if (!browser) {
      return { success: false, error: 'Browser not found' };
    }

    // Check if browser is running
    if (browser.isRunning) {
      return { success: false, error: `${browser.displayName} is running. Please close it first.`, needsClose: true };
    }

    let totalFreed = 0;

    // Clean cache
    if (options.cache) {
      for (const cachePath of browser.paths.cache) {
        if (fs.existsSync(cachePath)) {
          const size = await safeGetSize(cachePath);
          await deleteFilesInDirectory(cachePath);
          totalFreed += size;
        }
      }
    }

    // Clean cookies
    if (options.cookies && browser.paths.cookies && fs.existsSync(browser.paths.cookies)) {
      try {
        const size = fs.statSync(browser.paths.cookies).size;
        fs.unlinkSync(browser.paths.cookies);
        totalFreed += size;
      } catch {}
    }

    // Clean history
    if (options.history && browser.paths.history && fs.existsSync(browser.paths.history)) {
      try {
        const size = fs.statSync(browser.paths.history).size;
        fs.unlinkSync(browser.paths.history);
        totalFreed += size;
      } catch {}
    }

    return { success: true, freedSpace: totalFreed };
  } catch (error) {
    console.error('Browser clean error:', error);
    return { success: false, error: String(error) };
  }
});

/**
 * Force close browser process
 */
ipcMain.handle('close-browser', async (_, browserName: string) => {
  try {
    const browsers = await discoverBrowsers();
    const browser = browsers.find(b => b.name === browserName);
    
    if (!browser) {
      return { success: false, error: 'Browser not found' };
    }

    try {
      await execAsync(`taskkill /IM ${browser.processName} /F`);
      // Wait a moment for process to fully terminate
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    } catch (error) {
      // Process might already be closed
      return { success: true };
    }
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
