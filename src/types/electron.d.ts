export interface ElectronAPI {
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  
  // System Information
  getSystemInfo: () => Promise<SystemInfo | null>;
  
  // Junk Scanner
  scanJunk: (categories: string[]) => Promise<JunkScanResult>;
  cleanJunk: (categories: string[]) => Promise<CleanResult>;
  
  // RAM Optimization (Prana)
  boostRam: () => Promise<BoostResult>;
  boostRamSoft: () => Promise<BoostResult>;
  boostRamHard: () => Promise<BoostResult>;
  getBoostCooldown: () => Promise<CooldownStatus>;
  
  // Startup Apps
  getStartupApps: () => Promise<StartupApp[]>;
  toggleStartupApp: (appName: string, enabled: boolean) => Promise<{ success: boolean }>;
  
  // Power Management
  getPowerPlans: () => Promise<PowerPlan[]>;
  setPowerPlan: (guid: string) => Promise<{ success: boolean; error?: string }>;
  
  // Disk Analysis
  analyzeDisk: (drivePath?: string) => Promise<DiskItem | null>;
  getLargestFiles: (drivePath?: string) => Promise<LargeFile[]>;
  getDiskHealth: () => Promise<DiskHealth[]>;
  
  // System Report
  generateSystemReport: () => Promise<SystemReport>;
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  
  // Browser Scanner (Drishti)
  scanBrowsers: () => Promise<BrowserScanResult>;
  cleanBrowser: (browserName: string, options: { cache: boolean, cookies: boolean, history: boolean }) => Promise<BrowserCleanResult>;
  closeBrowser: (browserName: string) => Promise<{ success: boolean; error?: string }>;
  
  // Event Listeners
  onQuickCleanse: (callback: () => void) => void;
}

export interface BoostResult {
  success: boolean;
  freedMemory?: number;
  memoryBefore?: number;
  memoryAfter?: number;
  currentFree?: number;
  currentUsed?: number;
  mode?: 'soft' | 'hard';
  error?: string;
  cooldownRemaining?: number;
  processesAffected?: string[];
  hardBoostApplied?: boolean;
}

export interface CooldownStatus {
  canBoost: boolean;
  remainingSeconds: number;
}

export interface SystemInfo {
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

export interface JunkScanResult {
  [category: string]: {
    size: number;
    files: string[];
  };
}

export interface CleanResult {
  [category: string]: {
    success: boolean;
    freedSpace: number;
  };
}

export interface StartupApp {
  Name: string;
  Command: string;
  Location: string;
}

export interface PowerPlan {
  guid: string;
  name: string;
  active: boolean;
}

export interface BrowserInfo {
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

export interface BrowserScanResult {
  success: boolean;
  browsers: BrowserInfo[];
  error?: string;
}

export interface BrowserCleanResult {
  success: boolean;
  freedSpace?: number;
  error?: string;
  needsClose?: boolean;
}

export interface DiskItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  children?: DiskItem[];
}

export interface LargeFile {
  name: string;
  path: string;
  size: number;
}

export interface DiskHealth {
  name: string;
  type: string;
  size: number;
  vendor: string;
  temperature: number | null;
  smartStatus: string;
}

export interface SystemReport {
  success: boolean;
  report?: any;
  path?: string;
  error?: string;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
