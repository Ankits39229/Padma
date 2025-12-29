// Theme Manager - Handles theme switching and persistence
export type ThemeType = 'material-light' | 'material-dark' | 'divine';

export interface ThemeSettings {
  theme: ThemeType;
  syncWithSystem: boolean;
  useSystemAccent: boolean;
  accentColor: string | null;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  theme: 'material-dark',
  syncWithSystem: false,
  useSystemAccent: false,
  accentColor: null
};

const STORAGE_KEY = 'padma-appearance';

class ThemeManager {
  private settings: ThemeSettings;
  private systemThemeQuery: MediaQueryList;
  private transitionTimeout: number | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.init();
  }

  private init(): void {
    // Apply theme immediately (before DOM ready to prevent flash)
    this.applyTheme(this.getEffectiveTheme(), false);
    
    // Listen for system theme changes
    this.systemThemeQuery.addEventListener('change', () => {
      if (this.settings.syncWithSystem) {
        this.applyTheme(this.getSystemTheme(), true);
      }
    });
  }

  private loadSettings(): ThemeSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load theme settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save theme settings:', e);
    }
  }

  private getSystemTheme(): ThemeType {
    return this.systemThemeQuery.matches ? 'material-dark' : 'material-light';
  }

  private getEffectiveTheme(): ThemeType {
    if (this.settings.syncWithSystem && this.settings.theme !== 'divine') {
      return this.getSystemTheme();
    }
    return this.settings.theme;
  }

  public applyTheme(theme: ThemeType, animate: boolean = true): void {
    const html = document.documentElement;
    const allThemes: ThemeType[] = ['material-light', 'material-dark', 'divine'];
    
    if (animate) {
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

    if (animate) {
      // Remove transition class after animation completes
      this.transitionTimeout = window.setTimeout(() => {
        html.classList.remove('theme-transitioning');
      }, 350);
    }
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
}

// Singleton instance
export const themeManager = new ThemeManager();
