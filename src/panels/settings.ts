// Settings Panel
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { themeManager, ThemeType } from '../utils/theme.js';

export class SettingsPanel extends BasePanel {
  constructor() { super('settings-panel', 0); }
  protected async loadData(): Promise<void> { this.loadSettings(); this.loadThemeSettings(); }
  protected render(): void {
    if (!this.container) return;
    const ts = themeManager.getSettings();
    const ct = themeManager.getCurrentTheme();
    this.container.innerHTML = `
      <div class="settings-content">
        <div class="panel-header"><h1 class="panel-title"><span class="title-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg></span>Settings</h1><p class="panel-subtitle">Configure PADMA preferences</p></div>
        <div class="settings-grid">
          <div class="glass-card settings-card appearance-card">
            <div class="card-header"><h2><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>Appearance</h2></div>
            <div class="card-body">
              <div class="appearance-section">
                <h3 class="section-label">Theme</h3>
                <div class="theme-selector">
                  <label class="theme-card ${ct === 'material-light' ? 'selected' : ''}" data-theme="material-light"><input type="radio" name="theme" value="material-light" ${ct === 'material-light' ? 'checked' : ''}><div class="theme-preview theme-preview-light"><div class="preview-sidebar"></div><div class="preview-content"><div class="preview-line"></div><div class="preview-line short"></div></div></div><span class="theme-name">Material Light</span><span class="theme-radio"></span></label>
                  <label class="theme-card ${ct === 'material-dark' ? 'selected' : ''}" data-theme="material-dark"><input type="radio" name="theme" value="material-dark" ${ct === 'material-dark' ? 'checked' : ''}><div class="theme-preview theme-preview-dark"><div class="preview-sidebar"></div><div class="preview-content"><div class="preview-line"></div><div class="preview-line short"></div></div></div><span class="theme-name">Material Dark</span><span class="theme-radio"></span></label>
                  <label class="theme-card ${ct === 'divine' ? 'selected' : ''} ${ts.syncWithSystem ? 'disabled' : ''}" data-theme="divine"><input type="radio" name="theme" value="divine" ${ct === 'divine' ? 'checked' : ''} ${ts.syncWithSystem ? 'disabled' : ''}><div class="theme-preview theme-preview-divine"><div class="preview-sidebar"></div><div class="preview-content"><div class="preview-lotus"></div></div></div><span class="theme-name">Divine</span><span class="theme-radio"></span></label>
                </div>
                <div class="setting-item system-sync-setting"><div class="setting-info"><span class="setting-label">Sync with system</span><span class="setting-desc">Auto switch light/dark</span></div><div class="toggle-switch"><input type="checkbox" id="setting-sync-system" ${ts.syncWithSystem ? 'checked' : ''}><span class="toggle-slider"></span></div></div>
              </div>
            </div>
          </div>
          <div class="glass-card settings-card"><div class="card-header"><h2>General</h2></div><div class="card-body"><div class="setting-item"><div class="setting-info"><span class="setting-label">Start with Windows</span></div><div class="toggle-switch"><input type="checkbox" id="setting-startup"><span class="toggle-slider"></span></div></div><div class="setting-item"><div class="setting-info"><span class="setting-label">Minimize to Tray</span></div><div class="toggle-switch"><input type="checkbox" id="setting-tray" checked><span class="toggle-slider"></span></div></div></div></div>
          <div class="glass-card settings-card"><div class="card-header"><h2>Cleaning</h2></div><div class="card-body"><div class="setting-item"><div class="setting-info"><span class="setting-label">Auto-clean</span></div><div class="toggle-switch"><input type="checkbox" id="setting-autoclean"><span class="toggle-slider"></span></div></div><div class="setting-item"><div class="setting-info"><span class="setting-label">Empty Recycle Bin</span></div><div class="toggle-switch"><input type="checkbox" id="setting-recycle" checked><span class="toggle-slider"></span></div></div></div></div>
          <div class="glass-card settings-card about-card"><div class="card-header"><h2>About PADMA</h2></div><div class="card-body about-content"><div class="about-info"><h3>PADMA</h3><p class="version">Version 1.0.0</p></div></div></div>
        </div>
      </div>
    `;
  }
  private loadThemeSettings(): void { this.updateThemeUI(); }
  private updateThemeUI(): void { const s = themeManager.getSettings(); const c = themeManager.getCurrentTheme(); this.container?.querySelectorAll('.theme-card').forEach(card => { const t = (card as HTMLElement).dataset.theme; card.classList.toggle('selected', t === c); if (t === 'divine') { card.classList.toggle('disabled', s.syncWithSystem); const i = card.querySelector('input') as HTMLInputElement; if (i) i.disabled = s.syncWithSystem; } }); }
  private loadSettings(): void { const s = { startup: localStorage.getItem('padma-startup') === 'true', tray: localStorage.getItem('padma-tray') !== 'false', autoclean: localStorage.getItem('padma-autoclean') === 'true', recycle: localStorage.getItem('padma-recycle') !== 'false' }; Object.entries(s).forEach(([k, v]) => { const t = this.getElement<HTMLInputElement>(`#setting-${k}`); if (t) t.checked = v; }); }
  private saveSetting(k: string, v: boolean): void { localStorage.setItem(`padma-${k}`, String(v)); }
  protected attachEventHandlers(): void { this.container?.querySelectorAll('input[name="theme"]').forEach(i => { i.addEventListener('change', (e) => { const t = e.target as HTMLInputElement; if (t.checked) { themeManager.setTheme(t.value as ThemeType); this.updateThemeUI(); Toast.success(`Theme: ${t.value}`); } }); }); this.getElement<HTMLInputElement>('#setting-sync-system')?.addEventListener('change', (e) => { themeManager.setSyncWithSystem((e.target as HTMLInputElement).checked); this.updateThemeUI(); }); ['startup', 'tray', 'autoclean', 'recycle'].forEach(k => { this.getElement<HTMLInputElement>(`#setting-${k}`)?.addEventListener('change', (e) => { this.saveSetting(k, (e.target as HTMLInputElement).checked); }); }); }
}
