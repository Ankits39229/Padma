import { contextBridge, ipcRenderer } from 'electron';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SystemInfo {
  memory: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  };
  storage: {
    total: number;
    used: number;
    free: number;
    usedPercent: number;
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    speed: number;
  };
  os: {
    platform: string;
    distro: string;
    release: string;
    arch: string;
  };
  battery: {
    hasBattery: boolean;
    percent: number;
    isCharging: boolean;
    cycleCount: number;
    maxCapacity: number;
    designedCapacity: number;
  };
}

interface JunkScanResult {
  [category: string]: {
    size: number;
    files: string[];
  };
}

interface CleanResult {
  [category: string]: {
    success: boolean;
    freedSpace: number;
  };
}

interface BoostResult {
  success: boolean;
  freedMemory?: number;
  memoryBefore?: number;
  memoryAfter?: number;
  currentFree?: number;
  currentUsed?: number;
  mode?: 'soft' | 'hard';
  error?: string;
  cooldownRemaining?: number;
}

interface CooldownStatus {
  canBoost: boolean;
  remainingSeconds: number;
}

interface StartupApp {
  Name: string;
  Command: string;
  Location: string;
}

interface PowerPlan {
  guid: string;
  name: string;
  active: boolean;
}

interface DiskItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children?: DiskItem[];
}

interface LargeFile {
  name: string;
  path: string;
  size: number;
}

interface DiskHealth {
  name: string;
  type: string;
  size: number;
  vendor: string;
  temperature: number | null;
  smartStatus: string;
}

interface SystemReport {
  success: boolean;
  report?: any;
  path?: string;
  error?: string;
}

// ============================================================================
// ELECTRON API
// ============================================================================

const electronAPI = {
  // Window controls
  minimizeWindow: (): void => ipcRenderer.send('window-minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window-maximize'),
  closeWindow: (): void => ipcRenderer.send('window-close'),
  
  // System Information
  getSystemInfo: (): Promise<SystemInfo | null> => 
    ipcRenderer.invoke('get-system-info'),
  
  // Junk Scanner
  scanJunk: (categories: string[]): Promise<JunkScanResult> => 
    ipcRenderer.invoke('scan-junk', categories),
  cleanJunk: (categories: string[]): Promise<CleanResult> => 
    ipcRenderer.invoke('clean-junk', categories),
  
  // RAM Optimization (Optimize)
  boostRam: (): Promise<BoostResult> => 
    ipcRenderer.invoke('boost-ram'),
  boostRamSoft: (): Promise<BoostResult> => 
    ipcRenderer.invoke('boost-ram-soft'),
  boostRamHard: (): Promise<BoostResult> => 
    ipcRenderer.invoke('boost-ram-hard'),
  getBoostCooldown: (): Promise<CooldownStatus> => 
    ipcRenderer.invoke('get-boost-cooldown'),
  
  // Startup Apps
  getStartupApps: (): Promise<StartupApp[]> => 
    ipcRenderer.invoke('get-startup-apps'),
  toggleStartupApp: (appName: string, enabled: boolean): Promise<{ success: boolean }> => 
    ipcRenderer.invoke('toggle-startup-app', appName, enabled),
  
  // Power Management
  getPowerPlans: (): Promise<PowerPlan[]> => 
    ipcRenderer.invoke('get-power-plans'),
  setPowerPlan: (guid: string): Promise<{ success: boolean; error?: string }> => 
    ipcRenderer.invoke('set-power-plan', guid),
  
  // Battery Saver (Deep Sleep Mode)
  enableBatterySaver: (): Promise<any> => 
    ipcRenderer.invoke('enable-battery-saver'),
  disableBatterySaver: (): Promise<any> => 
    ipcRenderer.invoke('disable-battery-saver'),
  getBatterySaverStatus: (): Promise<any> => 
    ipcRenderer.invoke('get-battery-saver-status'),
  
  // Disk Analysis
  analyzeDisk: (drivePath?: string): Promise<DiskItem | null> => 
    ipcRenderer.invoke('analyze-disk', drivePath),
  getLargestFiles: (drivePath?: string): Promise<LargeFile[]> => 
    ipcRenderer.invoke('get-largest-files', drivePath),
  getDiskHealth: (): Promise<DiskHealth[]> => 
    ipcRenderer.invoke('get-disk-health'),
  
  // System Report
  generateSystemReport: (): Promise<SystemReport> => 
    ipcRenderer.invoke('generate-system-report'),
  openPath: (filePath: string): Promise<{ success: boolean; error?: string }> => 
    ipcRenderer.invoke('open-path', filePath),
  
  // Browser Scanner (Vision)
  scanBrowsers: () => 
    ipcRenderer.invoke('scan-browsers'),
  cleanBrowser: (browserName: string, options: { cache: boolean, cookies: boolean, history: boolean }) => 
    ipcRenderer.invoke('clean-browser', browserName, options),
  closeBrowser: (browserName: string) => 
    ipcRenderer.invoke('close-browser', browserName),
  
  // Native Theme Integration
  getNativeTheme: (): string => 
    ipcRenderer.sendSync('get-native-theme'),
  setNativeTheme: (mode: 'light' | 'dark' | 'system'): void => 
    ipcRenderer.send('set-native-theme', mode),
  onNativeThemeChange: (callback: (isDark: boolean) => void): void => {
    ipcRenderer.on('native-theme-changed', (_event, isDark: boolean) => callback(isDark));
  },
  
  // Event Listeners
  onQuickCleanse: (callback: () => void): void => {
    ipcRenderer.on('trigger-quick-cleanse', callback);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

export type ElectronAPI = typeof electronAPI;
