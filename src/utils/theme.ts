// Theme Manager - Robust theme system with persistence and Electron sync
export type ThemeType = 'material-light' | 'material-dark' | 'divine';
export type ThemeMode = 'light' | 'dark';

export interface ThemeSettings {
  theme: ThemeType;
  syncWithSystem: boolean;
  useSystemAccent: boolean;
  accentColor: string | null;
}

// Event interface for theme changes
export interface ThemeChangeEvent {
  theme: ThemeType;
  mode: ThemeMode;
  isSystemSync: boolean;
}

type ThemeChangeCallback = (event: ThemeChangeEvent) => void;

const DEFAULT_SETTINGS: ThemeSettings = {
  theme: 'material-dark',
  syncWithSystem: false,
  useSystemAccent: false,
  accentColor: null
};

const STORAGE_KEY = 'padma-appearance';

/**
 * ThemeManager - Singleton class for managing application themes
 * 
 * Features:
 * - Instant theme application (no flash)
 * - localStorage persistence
 * - System theme sync via Electron's nativeTheme
 * - Smooth transition animations
 * - Event callbacks for theme changes
 */
class ThemeManager {
  private settings: ThemeSettings;
  private systemThemeQuery: MediaQueryList;
  private transitionTimeout: number | null = null;
  private listeners: Set<ThemeChangeCallback> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.settings = this.loadSettings();
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.init();
  }

  private init(): void {
    // Apply theme immediately (before DOM ready to prevent flash)
    this.applyTheme(this.getEffectiveTheme(), false);
    
    // Listen for system theme changes (CSS media query)
    this.systemThemeQuery.addEventListener('change', (e) => {
      if (this.settings.syncWithSystem) {
        const newTheme = e.matches ? 'material-dark' : 'material-light';
        this.applyTheme(newTheme, true);
        this.notifyListeners(newTheme);
      }
    });

    // Listen for Electron native theme changes (if available)
    if (window.electron?.onNativeThemeChange) {
      window.electron.onNativeThemeChange((isDark: boolean) => {
        if (this.settings.syncWithSystem) {
          const newTheme: ThemeType = isDark ? 'material-dark' : 'material-light';
          this.applyTheme(newTheme, true);
          this.notifyListeners(newTheme);
        }
      });
    }

    this.initialized = true;
  }

  private loadSettings(): ThemeSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load theme settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      
      // Sync with Electron's native theme (if available)
      if (window.electron?.setNativeTheme) {
        const mode = this.getThemeMode(this.getEffectiveTheme());
        window.electron.setNativeTheme(mode);
      }
    } catch (e) {
      console.warn('Failed to save theme settings:', e);
    }
  }

  private getSystemTheme(): ThemeType {
    // Try Electron's nativeTheme first, fallback to CSS media query
    if (window.electron?.getNativeTheme) {
      try {
        const nativeTheme = window.electron.getNativeTheme();
        return nativeTheme === 'dark' ? 'material-dark' : 'material-light';
      } catch {
        // Fallback to media query
      }
    }
    return this.systemThemeQuery.matches ? 'material-dark' : 'material-light';
  }

  private getEffectiveTheme(): ThemeType {
    if (this.settings.syncWithSystem && this.settings.theme !== 'divine') {
      return this.getSystemTheme();
    }
    return this.settings.theme;
  }

  private getThemeMode(theme: ThemeType): ThemeMode {
    return theme === 'material-light' ? 'light' : 'dark';
  }

  private notifyListeners(theme: ThemeType): void {
    const event: ThemeChangeEvent = {
      theme,
      mode: this.getThemeMode(theme),
      isSystemSync: this.settings.syncWithSystem
    };
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error('Theme change listener error:', e);
      }
    });
  }

  public applyTheme(theme: ThemeType, animate: boolean = true): void {
    const html = document.documentElement;
    const allThemes: ThemeType[] = ['material-light', 'material-dark', 'divine'];
    
    if (animate && this.initialized) {
      // Add transition class for smooth switching
      html.classList.add('theme-transitioning');
      
      // Clear any existing timeout
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
      }
    }

    // Remove all theme classes first, then add new one
    allThemes.forEach(t => html.classList.remove(`theme-${t}`));
    html.classList.add(`theme-${theme}`);

    // Set data attribute for potential CSS selectors
    html.dataset.theme = theme;
    html.dataset.themeMode = this.getThemeMode(theme);

    // Apply system accent if enabled
    if (this.settings.useSystemAccent) {
      html.classList.add('use-system-accent');
    } else {
      html.classList.remove('use-system-accent');
    }

    // Apply custom accent color if set
    if (this.settings.accentColor) {
      html.style.setProperty('--accent-custom', this.settings.accentColor);
      html.classList.add('use-custom-accent');
    } else {
      html.style.removeProperty('--accent-custom');
      html.classList.remove('use-custom-accent');
    }

    // Update meta theme-color for mobile/PWA
    this.updateMetaThemeColor(theme);

    if (animate && this.initialized) {
      // Remove transition class after animation completes
      this.transitionTimeout = window.setTimeout(() => {
        html.classList.remove('theme-transitioning');
      }, 350);
    }
  }

  private updateMetaThemeColor(theme: ThemeType): void {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    
    const colors: Record<ThemeType, string> = {
      'material-light': '#F0F2F5',
      'material-dark': '#121212',
      'divine': '#0d0d1a'
    };
    metaTheme.setAttribute('content', colors[theme]);
  }

  /**
   * Subscribe to theme change events
   */
  public onChange(callback: ThemeChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public setTheme(theme: ThemeType): void {
    this.settings.theme = theme;
    
    // If setting Divine theme, disable system sync
    if (theme === 'divine' && this.settings.syncWithSystem) {
      this.settings.syncWithSystem = false;
    }
    
    this.saveSettings();
    this.applyTheme(this.getEffectiveTheme(), true);
  }

  public setSyncWithSystem(enabled: boolean): void {
    this.settings.syncWithSystem = enabled;
    
    // If enabling sync and currently on Divine, switch to system theme
    if (enabled && this.settings.theme === 'divine') {
      this.settings.theme = this.getSystemTheme();
    }
    
    this.saveSettings();
    this.applyTheme(this.getEffectiveTheme(), true);
  }

  public setUseSystemAccent(enabled: boolean): void {
    this.settings.useSystemAccent = enabled;
    if (enabled) {
      this.settings.accentColor = null;
    }
    this.saveSettings();
    this.applyTheme(this.getEffectiveTheme(), false);
  }

  public setAccentColor(color: string | null): void {
    this.settings.accentColor = color;
    if (color) {
      this.settings.useSystemAccent = false;
    }
    this.saveSettings();
    this.applyTheme(this.getEffectiveTheme(), false);
  }

  public getSettings(): ThemeSettings {
    return { ...this.settings };
  }

  public getCurrentTheme(): ThemeType {
    return this.getEffectiveTheme();
  }

  public isSystemSyncEnabled(): boolean {
    return this.settings.syncWithSystem;
  }

  /**
   * Get the current theme mode (light/dark)
   */
  public getCurrentMode(): ThemeMode {
    return this.getThemeMode(this.getEffectiveTheme());
  }

  /**
   * Check if current theme is dark
   */
  public isDark(): boolean {
    return this.getCurrentMode() === 'dark';
  }

  /**
   * Check if current theme is light
   */
  public isLight(): boolean {
    return this.getCurrentMode() === 'light';
  }
}

// Singleton instance - created immediately to apply theme before render
export const themeManager = new ThemeManager();

/**
 * Inline script for index.html to prevent flash of wrong theme
 * Copy this into a <script> tag in the <head> of index.html
 */
export const INLINE_THEME_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('padma-appearance');
    var settings = stored ? JSON.parse(stored) : { theme: 'material-dark', syncWithSystem: false };
    var theme = settings.theme;
    
    if (settings.syncWithSystem && theme !== 'divine') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'material-dark' 
        : 'material-light';
    }
    
    document.documentElement.classList.add('theme-' + theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = theme === 'material-light' ? 'light' : 'dark';
  } catch (e) {
    document.documentElement.classList.add('theme-material-dark');
  }
})();
`;
