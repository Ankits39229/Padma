// Prana Panel - System Optimizer with RAM Boost, Startup Manager, and Battery
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { StartupApp, PowerPlan, SystemInfo } from '../types/electron.d.js';

export class PranaPanel extends BasePanel {
  private startupApps: StartupApp[] = [];
  private powerPlans: PowerPlan[] = [];
  private systemInfo: SystemInfo | null = null;
  private isBoostingRam: boolean = false;

  constructor() {
    super('prana-panel', 30);
  }

  protected async loadData(): Promise<void> {
    try {
      const [startupApps, powerPlans, systemInfo] = await Promise.all([
        window.electron.getStartupApps(),
        window.electron.getPowerPlans(),
        window.electron.getSystemInfo()
      ]);

      this.startupApps = startupApps;
      this.powerPlans = powerPlans;
      this.systemInfo = systemInfo;

      this.updateUI();
    } catch (error) {
      this.handleError(error);
    }
  }

  protected render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="prana-content">
        <!-- Header Section -->
        <div class="panel-header">
          <div class="header-info">
            <h1 class="panel-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </span>
              Prana
            </h1>
            <p class="panel-subtitle">System Optimizer - Boost performance and manage system resources</p>
          </div>
        </div>

        <!-- Optimizer Cards Grid -->
        <div class="optimizer-grid">
          <!-- RAM Booster Card -->
          <div class="glass-card optimizer-card ram-card">
            <div class="card-header">
              <div class="card-icon ram-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <path d="M6 6V4"/>
                  <path d="M10 6V4"/>
                  <path d="M14 6V4"/>
                  <path d="M18 6V4"/>
                  <path d="M6 18v2"/>
                  <path d="M10 18v2"/>
                  <path d="M14 18v2"/>
                  <path d="M18 18v2"/>
                </svg>
              </div>
              <h2>RAM Booster</h2>
            </div>
            <div class="card-body">
              <div class="ram-stats">
                <div class="ram-circle">
                  <svg viewBox="0 0 100 100" class="ram-progress-ring">
                    <circle cx="50" cy="50" r="45" class="ring-bg"/>
                    <circle cx="50" cy="50" r="45" class="ring-fill" id="ram-ring"/>
                  </svg>
                  <div class="ram-percent" id="ram-percent">--%</div>
                </div>
                <div class="ram-details">
                  <div class="ram-detail-item">
                    <span class="label">Used:</span>
                    <span class="value" id="ram-used">--</span>
                  </div>
                  <div class="ram-detail-item">
                    <span class="label">Free:</span>
                    <span class="value" id="ram-free">--</span>
                  </div>
                  <div class="ram-detail-item">
                    <span class="label">Total:</span>
                    <span class="value" id="ram-total">--</span>
                  </div>
                </div>
              </div>
              <button class="btn-primary btn-glow boost-btn" id="boost-ram-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span>Boost Now</span>
              </button>
            </div>
          </div>

          <!-- Battery Card -->
          <div class="glass-card optimizer-card battery-card">
            <div class="card-header">
              <div class="card-icon battery-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/>
                  <line x1="23" y1="13" x2="23" y2="11"/>
                </svg>
              </div>
              <h2>Battery Manager</h2>
            </div>
            <div class="card-body" id="battery-content">
              <div class="no-battery" id="no-battery" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="no-battery-icon">
                  <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/>
                  <line x1="23" y1="13" x2="23" y2="11"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <p>No battery detected</p>
              </div>
              <div class="battery-stats" id="battery-stats">
                <div class="battery-visual">
                  <div class="battery-body">
                    <div class="battery-level" id="battery-level"></div>
                  </div>
                  <div class="battery-tip"></div>
                </div>
                <div class="battery-percent" id="battery-percent">--%</div>
                <div class="battery-status" id="battery-status">--</div>
              </div>
              <div class="battery-details" id="battery-details">
                <div class="battery-detail-item">
                  <span class="label">Cycle Count:</span>
                  <span class="value" id="cycle-count">--</span>
                </div>
                <div class="battery-detail-item">
                  <span class="label">Health:</span>
                  <span class="value" id="battery-health">--</span>
                </div>
              </div>
              <div class="power-saver-toggle">
                <label class="toggle-label">
                  <span>Aggressive Power Saver</span>
                  <div class="toggle-switch">
                    <input type="checkbox" id="power-saver-toggle">
                    <span class="toggle-slider"></span>
                  </div>
                </label>
                <p class="toggle-desc">Enables maximum power saving mode</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Startup Apps Section -->
        <div class="startup-section">
          <div class="section-header">
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Startup Applications
            </h2>
            <button class="btn-secondary refresh-btn" id="refresh-startup-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
              </svg>
              Refresh
            </button>
          </div>
          <div class="startup-apps-list glass-card" id="startup-apps-list">
            <div class="loading-state">
              <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>Loading startup applications...</span>
            </div>
          </div>
        </div>

        <!-- Power Plans Section -->
        <div class="power-plans-section">
          <div class="section-header">
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Power Plans
            </h2>
          </div>
          <div class="power-plans-grid" id="power-plans-grid">
            <div class="loading-state">
              <span>Loading power plans...</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private updateUI(): void {
    this.updateRamStats();
    this.updateBatteryStats();
    this.updateStartupApps();
    this.updatePowerPlans();
  }

  private updateRamStats(): void {
    if (!this.systemInfo) return;

    const memory = this.systemInfo.memory;
    
    this.setText('#ram-percent', `${memory.usedPercent}%`);
    this.setText('#ram-used', this.formatBytes(memory.used));
    this.setText('#ram-free', this.formatBytes(memory.free));
    this.setText('#ram-total', this.formatBytes(memory.total));

    // Update ring
    const ring = this.getElement<SVGCircleElement>('#ram-ring');
    if (ring) {
      const circumference = 2 * Math.PI * 45;
      const offset = circumference - (memory.usedPercent / 100) * circumference;
      ring.style.strokeDasharray = `${circumference}`;
      ring.style.strokeDashoffset = `${offset}`;
      
      // Color based on usage
      if (memory.usedPercent < 50) {
        ring.style.stroke = '#48bb78';
      } else if (memory.usedPercent < 80) {
        ring.style.stroke = '#ed8936';
      } else {
        ring.style.stroke = '#f56565';
      }
    }
  }

  private updateBatteryStats(): void {
    if (!this.systemInfo) return;

    const battery = this.systemInfo.battery;
    const noBattery = this.getElement('#no-battery');
    const batteryStats = this.getElement('#battery-stats');
    const batteryDetails = this.getElement('#battery-details');

    if (!battery.hasBattery) {
      if (noBattery) noBattery.style.display = 'flex';
      if (batteryStats) batteryStats.style.display = 'none';
      if (batteryDetails) batteryDetails.style.display = 'none';
      return;
    }

    if (noBattery) noBattery.style.display = 'none';
    if (batteryStats) batteryStats.style.display = 'flex';
    if (batteryDetails) batteryDetails.style.display = 'flex';

    this.setText('#battery-percent', `${battery.percent}%`);
    this.setText('#battery-status', battery.isCharging ? '⚡ Charging' : '🔋 On Battery');
    this.setText('#cycle-count', battery.cycleCount > 0 ? battery.cycleCount.toString() : 'N/A');

    // Calculate health
    let healthPercent = 100;
    if (battery.designedCapacity > 0 && battery.maxCapacity > 0) {
      healthPercent = Math.round((battery.maxCapacity / battery.designedCapacity) * 100);
    }
    this.setText('#battery-health', `${healthPercent}%`);

    // Update battery level visual
    const batteryLevel = this.getElement<HTMLElement>('#battery-level');
    if (batteryLevel) {
      batteryLevel.style.width = `${battery.percent}%`;
      
      if (battery.percent > 50) {
        batteryLevel.className = 'battery-level good';
      } else if (battery.percent > 20) {
        batteryLevel.className = 'battery-level warning';
      } else {
        batteryLevel.className = 'battery-level critical';
      }
    }
  }

  private updateStartupApps(): void {
    const container = this.getElement('#startup-apps-list');
    if (!container) return;

    if (this.startupApps.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>No startup applications found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.startupApps.map((app, index) => `
      <div class="startup-app-item">
        <div class="app-info">
          <div class="app-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 9h6v6H9z"/>
            </svg>
          </div>
          <div class="app-details">
            <span class="app-name">${app.Name || 'Unknown App'}</span>
            <span class="app-location">${app.Location || ''}</span>
          </div>
        </div>
        <div class="app-toggle">
          <div class="toggle-switch">
            <input type="checkbox" checked data-startup-app="${index}">
            <span class="toggle-slider"></span>
          </div>
        </div>
      </div>
    `).join('');
  }

  private updatePowerPlans(): void {
    const container = this.getElement('#power-plans-grid');
    if (!container) return;

    if (this.powerPlans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No power plans available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.powerPlans.map(plan => `
      <div class="glass-card power-plan-card ${plan.active ? 'active' : ''}" data-plan-guid="${plan.guid}">
        <div class="plan-icon">
          ${this.getPlanIcon(plan.name)}
        </div>
        <div class="plan-info">
          <h3 class="plan-name">${plan.name}</h3>
          <span class="plan-status">${plan.active ? 'Active' : 'Click to activate'}</span>
        </div>
        ${plan.active ? '<div class="active-indicator">✓</div>' : ''}
      </div>
    `).join('');
  }

  private getPlanIcon(planName: string): string {
    const name = planName.toLowerCase();
    
    if (name.includes('power saver') || name.includes('battery')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4"/>
        <path d="M12 18v4"/>
        <path d="M4.93 4.93l2.83 2.83"/>
        <path d="M16.24 16.24l2.83 2.83"/>
        <path d="M2 12h4"/>
        <path d="M18 12h4"/>
      </svg>`;
    } else if (name.includes('high performance') || name.includes('ultimate')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>`;
    } else {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>`;
    }
  }

  protected attachEventHandlers(): void {
    // RAM Boost button
    const boostBtn = this.getElement('#boost-ram-btn');
    boostBtn?.addEventListener('click', () => this.boostRam());

    // Refresh startup apps
    const refreshBtn = this.getElement('#refresh-startup-btn');
    refreshBtn?.addEventListener('click', () => this.loadData());

    // Power saver toggle
    const powerSaverToggle = this.getElement<HTMLInputElement>('#power-saver-toggle');
    powerSaverToggle?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.togglePowerSaver(target.checked);
    });

    // Power plan selection
    this.container?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const planCard = target.closest('[data-plan-guid]') as HTMLElement;
      if (planCard) {
        const guid = planCard.dataset.planGuid;
        if (guid) {
          await this.selectPowerPlan(guid);
        }
      }
    });

    // Startup app toggles
    this.container?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.dataset.startupApp) {
        const index = parseInt(target.dataset.startupApp);
        const app = this.startupApps[index];
        if (app) {
          await this.toggleStartupApp(app.Name, target.checked);
        }
      }
    });
  }

  private async boostRam(): Promise<void> {
    if (this.isBoostingRam) return;

    this.isBoostingRam = true;
    const btn = this.getElement<HTMLButtonElement>('#boost-ram-btn');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Boosting...</span>
      `;
    }

    try {
      const result = await window.electron.boostRam();
      
      if (result.success) {
        Toast.success('RAM boost complete!');
        // Refresh system info
        this.systemInfo = await window.electron.getSystemInfo();
        this.updateRamStats();
      } else {
        Toast.error('Failed to boost RAM');
      }
    } catch (error) {
      Toast.error('Error during RAM boost');
      this.handleError(error);
    } finally {
      this.isBoostingRam = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span>Boost Now</span>
        `;
      }
    }
  }

  private async togglePowerSaver(enabled: boolean): Promise<void> {
    const powerSaverPlan = this.powerPlans.find(p => 
      p.name.toLowerCase().includes('power saver') || 
      p.name.toLowerCase().includes('battery')
    );

    if (powerSaverPlan && enabled) {
      await this.selectPowerPlan(powerSaverPlan.guid);
      Toast.success('Power Saver mode enabled');
    } else if (!enabled) {
      const balancedPlan = this.powerPlans.find(p => 
        p.name.toLowerCase().includes('balanced')
      );
      if (balancedPlan) {
        await this.selectPowerPlan(balancedPlan.guid);
        Toast.info('Switched to Balanced power plan');
      }
    }
  }

  private async selectPowerPlan(guid: string): Promise<void> {
    try {
      const result = await window.electron.setPowerPlan(guid);
      
      if (result.success) {
        // Refresh power plans
        this.powerPlans = await window.electron.getPowerPlans();
        this.updatePowerPlans();
        Toast.success('Power plan changed');
      } else {
        Toast.error('Failed to change power plan');
      }
    } catch (error) {
      Toast.error('Error changing power plan');
      this.handleError(error);
    }
  }

  private async toggleStartupApp(appName: string, enabled: boolean): Promise<void> {
    try {
      const result = await window.electron.toggleStartupApp(appName, enabled);
      
      if (result.success) {
        Toast.success(`${appName} ${enabled ? 'enabled' : 'disabled'} at startup`);
      } else {
        Toast.error('Failed to update startup setting');
      }
    } catch (error) {
      Toast.error('Error updating startup app');
      this.handleError(error);
    }
  }
}
