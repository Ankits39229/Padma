// Prana Panel - System Optimizer with RAM Boost, Startup Manager, and Battery
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { StartupApp, PowerPlan, SystemInfo } from '../types/electron.d.js';

type BoostMode = 'soft' | 'hard';

export class PranaPanel extends BasePanel {
  private startupApps: StartupApp[] = [];
  private powerPlans: PowerPlan[] = [];
  private systemInfo: SystemInfo | null = null;
  private isBoostingRam: boolean = false;
  private selectedBoostMode: BoostMode = 'soft';
  private cooldownInterval: NodeJS.Timeout | null = null;
  private cooldownRemaining: number = 0;
  private batterySaverEnabled: boolean = false;
  private batterySaverStatusInterval: NodeJS.Timeout | null = null;

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
              
              <!-- Boost Mode Selection -->
              <div class="boost-mode-selector">
                <label class="boost-mode-option">
                  <input type="radio" name="boost-mode" value="soft" checked>
                  <div class="boost-mode-card">
                    <div class="mode-icon soft">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v4"/>
                        <path d="M12 18v4"/>
                        <path d="M4.93 4.93l2.83 2.83"/>
                        <path d="M16.24 16.24l2.83 2.83"/>
                        <path d="M2 12h4"/>
                        <path d="M18 12h4"/>
                      </svg>
                    </div>
                    <div class="mode-info">
                      <span class="mode-name">Soft Boost</span>
                      <span class="mode-desc">Safe • Trims working sets</span>
                    </div>
                  </div>
                </label>
                <label class="boost-mode-option">
                  <input type="radio" name="boost-mode" value="hard">
                  <div class="boost-mode-card">
                    <div class="mode-icon hard">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                    <div class="mode-info">
                      <span class="mode-name">Hard Boost</span>
                      <span class="mode-desc">Aggressive • Clears cache</span>
                    </div>
                  </div>
                </label>
              </div>

              <!-- Boost Result Display -->
              <div class="boost-result" id="boost-result" style="display: none;">
                <div class="result-icon">✓</div>
                <div class="result-text">
                  <span class="result-amount" id="freed-amount">0 MB</span>
                  <span class="result-label">freed</span>
                </div>
              </div>

              <!-- Cooldown Display -->
              <div class="cooldown-display" id="cooldown-display" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span id="cooldown-text">Cooldown: 0s</span>
              </div>

              <button class="btn-primary btn-glow boost-btn" id="boost-ram-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <span>Boost Now</span>
              </button>
              
              <p class="boost-info">
                <small>💡 Soft Boost is safe for everyday use. Hard Boost may cause brief lag.</small>
              </p>
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
              <div class="power-saver-section">
                <div class="section-title-small">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v4"/>
                    <path d="M12 18v4"/>
                    <path d="M4.93 4.93l2.83 2.83"/>
                    <path d="M16.24 16.24l2.83 2.83"/>
                  </svg>
                  <span>Battery Saver (Deep Sleep Mode)</span>
                </div>
                <p class="feature-description">Aggressive power saving that throttles background apps, applies Efficiency Mode (EcoQoS), and suspends battery hogs when critical (&lt;20%).</p>
                
                <div class="battery-saver-status" id="battery-saver-status">
                  <div class="status-badge" id="status-badge">
                    <span class="status-indicator"></span>
                    <span class="status-text">Disabled</span>
                  </div>
                  <div class="status-details" id="status-details" style="display: none;">
                    <span class="detail-item">
                      <strong id="throttled-count">0</strong> processes throttled
                    </span>
                    <span class="detail-item">
                      <strong id="suspended-count">0</strong> suspended
                    </span>
                  </div>
                </div>

                <div class="toggle-container">
                  <label class="toggle-label-enhanced">
                    <div class="toggle-info">
                      <span class="toggle-title">Enable Aggressive Battery Saver</span>
                      <span class="toggle-subtitle">3-Tier optimization: Priority → EcoQoS → Suspend</span>
                    </div>
                    <div class="toggle-switch">
                      <input type="checkbox" id="battery-saver-toggle">
                      <span class="toggle-slider"></span>
                    </div>
                  </label>
                </div>

                <div class="safety-info">
                  <div class="info-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Safety Guardrails</span>
                  </div>
                  <ul class="info-list">
                    <li>✓ Foreground app & audio never throttled</li>
                    <li>✓ Critical system processes protected</li>
                    <li>✓ Auto-restores when plugged in</li>
                    <li>✓ Brightness reduced to 30% if critical</li>
                  </ul>
                </div>

                <div class="process-list" id="affected-processes" style="display: none;">
                  <div class="process-list-header">
                    <span>Affected Processes</span>
                    <button class="btn-icon" id="refresh-processes-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6"/>
                        <path d="M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
                      </svg>
                    </button>
                  </div>
                  <div class="process-list-content" id="process-list-content">
                    <div class="empty-state-small">No processes affected yet</div>
                  </div>
                </div>
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

    // Boost mode selection
    const modeRadios = this.container?.querySelectorAll('input[name="boost-mode"]');
    modeRadios?.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.selectedBoostMode = target.value as BoostMode;
        console.log('[Prana] Boost mode changed to:', this.selectedBoostMode);
      });
    });

    // Refresh startup apps
    const refreshBtn = this.getElement('#refresh-startup-btn');
    refreshBtn?.addEventListener('click', () => this.loadData());

    // Battery Saver toggle
    const batterySaverToggle = this.getElement<HTMLInputElement>('#battery-saver-toggle');
    batterySaverToggle?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.toggleBatterySaver(target.checked);
    });

    // Refresh affected processes
    const refreshProcessesBtn = this.getElement('#refresh-processes-btn');
    refreshProcessesBtn?.addEventListener('click', () => this.updateBatterySaverStatus());

    // Check initial battery saver status
    this.updateBatterySaverStatus();

    // Check cooldown on load
    this.checkCooldown();

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

  private async checkCooldown(): Promise<void> {
    try {
      const result = await window.electron.getBoostCooldown();
      if (!result.canBoost && result.remainingSeconds > 0) {
        this.startCooldownTimer(result.remainingSeconds);
      }
    } catch (error) {
      console.log('[Prana] Cooldown check failed, boost available');
    }
  }

  private startCooldownTimer(seconds: number): void {
    this.cooldownRemaining = seconds;
    const btn = this.getElement<HTMLButtonElement>('#boost-ram-btn');
    const cooldownDisplay = this.getElement('#cooldown-display');
    const cooldownText = this.getElement('#cooldown-text');

    if (btn) btn.disabled = true;
    if (cooldownDisplay) cooldownDisplay.style.display = 'flex';

    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    this.cooldownInterval = setInterval(() => {
      this.cooldownRemaining--;
      
      if (cooldownText) {
        const mins = Math.floor(this.cooldownRemaining / 60);
        const secs = this.cooldownRemaining % 60;
        cooldownText.textContent = mins > 0 
          ? `Cooldown: ${mins}m ${secs}s` 
          : `Cooldown: ${secs}s`;
      }

      if (this.cooldownRemaining <= 0) {
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }
        if (btn) btn.disabled = false;
        if (cooldownDisplay) cooldownDisplay.style.display = 'none';
      }
    }, 1000);
  }

  private async boostRam(): Promise<void> {
    if (this.isBoostingRam) return;

    this.isBoostingRam = true;
    const btn = this.getElement<HTMLButtonElement>('#boost-ram-btn');
    const boostResult = this.getElement('#boost-result');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>${this.selectedBoostMode === 'hard' ? 'Deep Cleaning...' : 'Boosting...'}</span>
      `;
    }

    // Hide previous result
    if (boostResult) boostResult.style.display = 'none';

    try {
      let result;
      
      if (this.selectedBoostMode === 'hard') {
        result = await window.electron.boostRamHard();
      } else {
        result = await window.electron.boostRamSoft();
      }
      
      if (result.success) {
        const freedMB = result.freedMemory ? (result.freedMemory / (1024 * 1024)).toFixed(1) : '0';
        const processCount = result.processesAffected?.length || 0;
        // Show up to 12 unique process names
        const uniqueProcesses = [...new Set(result.processesAffected || [])];
        const displayList = uniqueProcesses.slice(0, 12);
        const moreCount = Math.max(0, uniqueProcesses.length - 12);
        
        // Show result with process info
        if (boostResult) {
          boostResult.style.display = 'flex';
          const freedAmountEl = this.getElement('#freed-amount');
          if (freedAmountEl) {
            const boostTypeLabel = result.mode === 'hard' && result.hardBoostApplied ? ' + Cache Cleared' : '';
            freedAmountEl.innerHTML = `
              <span style="font-size: 1.2em; font-weight: 600;">${freedMB} MB</span> freed<br>
              <small style="font-size: 0.65em; opacity: 0.85; display: block; margin-top: 6px; line-height: 1.4;">
                <strong>✓ ${uniqueProcesses.length} apps optimized${boostTypeLabel}</strong><br>
                <span style="color: #8b9dc3;">${displayList.join(' • ')}${moreCount > 0 ? ` (+${moreCount} more)` : ''}</span>
              </small>
              <small style="font-size: 0.55em; opacity: 0.6; display: block; margin-top: 4px;">ℹ Processes still running, memory trimmed</small>
            `;
          }
        }

        const modeText = this.selectedBoostMode === 'hard' ? 'Deep boost' : 'Boost';
        Toast.success(`${modeText} complete! Freed ${freedMB} MB from ${uniqueProcesses.length} apps`);
        
        // Refresh system info
        this.systemInfo = await window.electron.getSystemInfo();
        this.updateRamStats();
        
        // Start cooldown timer (5 minutes)
        this.startCooldownTimer(300);
      } else {
        if (result.cooldownRemaining) {
          Toast.warning(`Please wait ${result.cooldownRemaining}s before boosting again`);
          this.startCooldownTimer(result.cooldownRemaining);
        } else {
          Toast.error(result.error || 'Failed to boost RAM');
        }
      }
    } catch (error) {
      Toast.error('Error during RAM boost');
      this.handleError(error);
    } finally {
      this.isBoostingRam = false;
      if (btn && !btn.disabled) {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span>Boost Now</span>
        `;
      } else if (btn) {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>On Cooldown</span>
        `;
      }
    }
  }

  private async toggleBatterySaver(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        // Enable battery saver
        const result = await window.electron.enableBatterySaver();
        
        if (result.success) {
          this.batterySaverEnabled = true;
          const processCount = result.processesAffected?.length || 0;
          const actions = result.actionsPerformed;
          
          Toast.success(
            `Battery Saver enabled! ${processCount} processes optimized ` +
            `(Priority: ${actions?.priorityChanges || 0}, EcoQoS: ${actions?.ecoQoSApplied || 0}, ` +
            `Suspended: ${actions?.processesSuspended || 0})`
          );
          
          // Update status display
          this.updateBatterySaverStatus();
          
          // Start monitoring for auto-disable on AC power
          if (!this.batterySaverStatusInterval) {
            this.batterySaverStatusInterval = setInterval(() => {
              this.checkAutoDisable();
            }, 5000);
          }
        } else {
          Toast.error(result.error || 'Failed to enable Battery Saver');
          const toggle = this.getElement<HTMLInputElement>('#battery-saver-toggle');
          if (toggle) toggle.checked = false;
        }
      } else {
        // Disable battery saver
        const result = await window.electron.disableBatterySaver();
        
        if (result.success) {
          this.batterySaverEnabled = false;
          const processCount = result.processesAffected?.length || 0;
          
          Toast.info(`Battery Saver disabled. ${processCount} processes restored to normal.`);
          
          // Update status display
          this.updateBatterySaverStatus();
          
          // Stop monitoring
          if (this.batterySaverStatusInterval) {
            clearInterval(this.batterySaverStatusInterval);
            this.batterySaverStatusInterval = null;
          }
        } else {
          Toast.error(result.error || 'Failed to disable Battery Saver');
          const toggle = this.getElement<HTMLInputElement>('#battery-saver-toggle');
          if (toggle) toggle.checked = true;
        }
      }
    } catch (error) {
      Toast.error('Error toggling Battery Saver');
      this.handleError(error);
      const toggle = this.getElement<HTMLInputElement>('#battery-saver-toggle');
      if (toggle) toggle.checked = !enabled;
    }
  }

  private async updateBatterySaverStatus(): Promise<void> {
    try {
      const status = await window.electron.getBatterySaverStatus();
      const { isEnabled, throttledProcesses, suspendedProcesses } = status;
      const hasProcesses = throttledProcesses.length > 0 || suspendedProcesses.length > 0;
      
      // Batch DOM updates
      const toggle = this.getElement<HTMLInputElement>('#battery-saver-toggle');
      const statusBadge = this.getElement('#status-badge');
      const statusDetails = this.getElement('#status-details');
      const affectedProcesses = this.getElement('#affected-processes');
      const processListContent = this.getElement('#process-list-content');
      
      if (toggle) toggle.checked = isEnabled;
      
      if (statusBadge) {
        statusBadge.className = `status-badge ${isEnabled ? 'active' : ''}`;
        const statusText = statusBadge.querySelector('.status-text');
        if (statusText) statusText.textContent = isEnabled ? 'Active' : 'Disabled';
      }

      if (statusDetails) {
        statusDetails.style.display = isEnabled ? 'flex' : 'none';
        if (isEnabled) {
          this.setText('#throttled-count', throttledProcesses.length.toString());
          this.setText('#suspended-count', suspendedProcesses.length.toString());
        }
      }

      if (affectedProcesses && processListContent) {
        if (isEnabled && hasProcesses) {
          affectedProcesses.style.display = 'block';
          
          const allProcesses = [
            ...throttledProcesses.map(p => ({ name: p, type: 'throttled' as const })),
            ...suspendedProcesses.map(p => ({ name: p, type: 'suspended' as const }))
          ];
          
          processListContent.innerHTML = allProcesses.map(({ name, type }) => `
            <div class="process-item">
              <div class="process-icon ${type}">
                ${type === 'suspended' ? '⏸' : '🔽'}
              </div>
              <div class="process-info">
                <span class="process-name">${name}</span>
                <span class="process-type">${type === 'suspended' ? 'Suspended' : 'Throttled'}</span>
              </div>
            </div>
          `).join('');
        } else {
          affectedProcesses.style.display = 'none';
        }
      }

      this.batterySaverEnabled = isEnabled;
    } catch (error) {
      // Silent fail - status will be updated on next check
    }
  }

  private async checkAutoDisable(): Promise<void> {
    if (!this.batterySaverEnabled) {
      if (this.batterySaverStatusInterval) {
        clearInterval(this.batterySaverStatusInterval);
        this.batterySaverStatusInterval = null;
      }
      return;
    }

    try {
      const status = await window.electron.getBatterySaverStatus();
      
      // Auto-disable if charging detected
      if (status.isCharging && status.isEnabled) {
        Toast.info('⚡ AC power detected! Restoring processes...');
        
        const toggle = this.getElement<HTMLInputElement>('#battery-saver-toggle');
        if (toggle && toggle.checked) {
          toggle.checked = false;
          await this.toggleBatterySaver(false);
        }
      }
    } catch (error) {
      // Silent fail on auto-disable check
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
