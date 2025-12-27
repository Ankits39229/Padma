// Settings Panel - Application settings and preferences
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';

export class SettingsPanel extends BasePanel {
  constructor() {
    super('settings-panel', 0); // No auto-refresh for settings
  }

  protected async loadData(): Promise<void> {
    // Settings are loaded from local storage
    this.loadSettings();
  }

  protected render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="settings-content">
        <!-- Header Section -->
        <div class="panel-header">
          <div class="header-info">
            <h1 class="panel-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </span>
              Settings
            </h1>
            <p class="panel-subtitle">Configure PADMA preferences and behavior</p>
          </div>
        </div>

        <!-- Settings Grid -->
        <div class="settings-grid">
          <!-- General Settings -->
          <div class="glass-card settings-card">
            <div class="card-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6"/>
                  <path d="M12 17v6"/>
                </svg>
                General
              </h2>
            </div>
            <div class="card-body">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Start with Windows</span>
                  <span class="setting-desc">Launch PADMA when Windows starts</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-startup">
                  <span class="toggle-slider"></span>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Minimize to System Tray</span>
                  <span class="setting-desc">Keep running in the background when closed</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-tray" checked>
                  <span class="toggle-slider"></span>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Show Notifications</span>
                  <span class="setting-desc">Display system notifications for important events</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-notifications" checked>
                  <span class="toggle-slider"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Cleaning Settings -->
          <div class="glass-card settings-card">
            <div class="card-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Cleaning
              </h2>
            </div>
            <div class="card-body">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Auto-clean on Schedule</span>
                  <span class="setting-desc">Automatically clean junk files daily</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-autoclean">
                  <span class="toggle-slider"></span>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Include Browser Data</span>
                  <span class="setting-desc">Clean browser caches and cookies</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-browser">
                  <span class="toggle-slider"></span>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Empty Recycle Bin</span>
                  <span class="setting-desc">Include recycle bin in cleaning operations</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-recycle" checked>
                  <span class="toggle-slider"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Privacy Settings -->
          <div class="glass-card settings-card">
            <div class="card-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Privacy
              </h2>
            </div>
            <div class="card-body">
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Send Usage Statistics</span>
                  <span class="setting-desc">Help improve PADMA by sharing anonymous usage data</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-analytics">
                  <span class="toggle-slider"></span>
                </div>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">Check for Updates</span>
                  <span class="setting-desc">Automatically check for new versions</span>
                </div>
                <div class="toggle-switch">
                  <input type="checkbox" id="setting-updates" checked>
                  <span class="toggle-slider"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- About Section -->
          <div class="glass-card settings-card about-card">
            <div class="card-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                About PADMA
              </h2>
            </div>
            <div class="card-body about-content">
              <div class="about-logo">
                <svg viewBox="0 0 100 100" class="lotus-mini">
                  <defs>
                    <radialGradient id="logoGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" style="stop-color:#e0f2fe;stop-opacity:0.9" />
                      <stop offset="100%" style="stop-color:#7dd3fc;stop-opacity:0.5" />
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="45" fill="url(#logoGradient)"/>
                  <text x="50" y="60" text-anchor="middle" font-size="24" fill="#1a365d">🪷</text>
                </svg>
              </div>
              <div class="about-info">
                <h3>PADMA</h3>
                <p class="version">Version 1.0.0</p>
                <p class="tagline">System Purifier & Optimizer</p>
                <p class="copyright">© 2025 Nemi Inc. All rights reserved.</p>
              </div>
              <div class="about-links">
                <button class="btn-secondary" id="check-updates-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6"/>
                    <path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
                  </svg>
                  Check for Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private loadSettings(): void {
    // Load settings from localStorage (placeholder implementation)
    const settings = {
      startup: localStorage.getItem('padma-startup') === 'true',
      tray: localStorage.getItem('padma-tray') !== 'false',
      notifications: localStorage.getItem('padma-notifications') !== 'false',
      autoclean: localStorage.getItem('padma-autoclean') === 'true',
      browser: localStorage.getItem('padma-browser') === 'true',
      recycle: localStorage.getItem('padma-recycle') !== 'false',
      analytics: localStorage.getItem('padma-analytics') === 'true',
      updates: localStorage.getItem('padma-updates') !== 'false'
    };

    // Apply settings to toggles
    Object.entries(settings).forEach(([key, value]) => {
      const toggle = this.getElement<HTMLInputElement>(`#setting-${key}`);
      if (toggle) {
        toggle.checked = value;
      }
    });
  }

  private saveSetting(key: string, value: boolean): void {
    localStorage.setItem(`padma-${key}`, String(value));
    Toast.success('Setting saved');
  }

  protected attachEventHandlers(): void {
    // Setting toggles
    const toggles = ['startup', 'tray', 'notifications', 'autoclean', 'browser', 'recycle', 'analytics', 'updates'];
    
    toggles.forEach(key => {
      const toggle = this.getElement<HTMLInputElement>(`#setting-${key}`);
      toggle?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.saveSetting(key, target.checked);
      });
    });

    // Check for updates button
    const updateBtn = this.getElement('#check-updates-btn');
    updateBtn?.addEventListener('click', () => {
      Toast.info('You are running the latest version!');
    });
  }
}
