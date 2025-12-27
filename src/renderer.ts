// Renderer Process - Main Entry Point
import { TitleBar } from './components/titlebar.js';
import { Sidebar } from './components/sidebar.js';

// Import panels
import { DashboardPanel } from './panels/dashboard.js';
import { ShuddhiPanel } from './panels/shuddhi.js';
import { PranaPanel } from './panels/prana.js';
import { DrishtiPanel } from './panels/drishti.js';
import { SettingsPanel } from './panels/settings.js';

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

class PadmaApp {
  private titleBar: TitleBar | null = null;
  private sidebar: Sidebar | null = null;
  private panels: Map<string, any> = new Map();

  constructor() {
    this.init();
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
    this.panels.set('shuddhi', new ShuddhiPanel());
    this.panels.set('prana', new PranaPanel());
    this.panels.set('drishti', new DrishtiPanel());
    this.panels.set('settings', new SettingsPanel());
  }

  private setupEventListeners(): void {
    // Listen for quick cleanse trigger from tray
    window.electron.onQuickCleanse(() => {
      this.sidebar?.switchToPanel('shuddhi');
      const shuddhiPanel = this.panels.get('shuddhi') as ShuddhiPanel;
      if (shuddhiPanel) {
        shuddhiPanel.triggerQuickScan();
      }
    });
  }
}

// Initialize the application
new PadmaApp();
