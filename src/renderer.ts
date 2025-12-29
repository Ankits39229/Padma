// Renderer Process - Main Entry Point
import { TitleBar } from './components/titlebar.js';
import { Sidebar } from './components/sidebar.js';
import { themeManager } from './utils/theme.js';

// Import panels
import { DashboardPanel } from './panels/dashboard.js';
import { CleanPanel } from './panels/Clean.js';
import { OptimizePanel } from './panels/Optimize.js';
import { VisionPanel } from './panels/Vision.js';
import { SettingsPanel } from './panels/settings.js';

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

class PadmaApp {
  private titleBar: TitleBar | null = null;
  private sidebar: Sidebar | null = null;
  private panels: Map<string, any> = new Map();

  constructor() {
    // Initialize theme immediately to prevent flash
    this.initTheme();
    this.init();
  }

  private initTheme(): void {
    // Theme manager initializes itself and applies theme on construction
    // This ensures theme is applied before DOM renders
    console.log('🎨 Theme initialized:', themeManager.getCurrentTheme());
  }

  private init(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeComponents();
        this.initializePanels();
        this.setupEventListeners();
        console.log('✨ PADMA Application initialized successfully');
      });
    } else {
      // DOM is already loaded
      this.initializeComponents();
      this.initializePanels();
      this.setupEventListeners();
      console.log('✨ PADMA Application initialized successfully');
    }
  }

  private initializeComponents(): void {
    this.titleBar = new TitleBar();
    this.sidebar = new Sidebar();
  }

  private initializePanels(): void {
    // Initialize all panels
    this.panels.set('dashboard', new DashboardPanel());
    this.panels.set('Clean', new CleanPanel());
    this.panels.set('Optimize', new OptimizePanel());
    this.panels.set('Vision', new VisionPanel());
    this.panels.set('settings', new SettingsPanel());
  }

  private setupEventListeners(): void {
    // Listen for quick cleanse trigger from tray
    window.electron.onQuickCleanse(() => {
      this.sidebar?.switchToPanel('Clean');
      const CleanPanel = this.panels.get('Clean') as CleanPanel;
      if (CleanPanel) {
        CleanPanel.triggerQuickScan();
      }
    });
  }
}

// Initialize the application
new PadmaApp();
