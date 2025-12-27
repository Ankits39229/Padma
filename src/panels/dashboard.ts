// Dashboard Panel - Home view with Crystal Lotus and system overview
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { SystemInfo } from '../types/electron.d.js';

export class DashboardPanel extends BasePanel {
  private systemInfo: SystemInfo | null = null;
  private junkFound: number = 0;

  constructor() {
    super('dashboard-panel', 30);
    // Dashboard is active by default
    this.isActive = true;
    this.loadData();
  }

  protected async loadData(): Promise<void> {
    try {
      this.systemInfo = await window.electron.getSystemInfo();
      
      // Quick scan for junk
      const junkResult = await window.electron.scanJunk(['temp', 'recycle']);
      this.junkFound = Object.values(junkResult).reduce((acc, item) => acc + item.size, 0);
      
      this.updateUI();
    } catch (error) {
      this.handleError(error);
    }
  }

  protected render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dashboard-content">
        <!-- Hero Section with Crystal Lotus -->
        <div class="dashboard-hero">
          <div class="lotus-container">
            <div class="lotus-glow"></div>
            <div class="lotus-image">
              <svg viewBox="0 0 200 200" class="lotus-svg">
                <defs>
                  <radialGradient id="lotusGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#e0f2fe;stop-opacity:0.9" />
                    <stop offset="50%" style="stop-color:#bae6fd;stop-opacity:0.7" />
                    <stop offset="100%" style="stop-color:#7dd3fc;stop-opacity:0.5" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <!-- Center Circle -->
                <circle cx="100" cy="100" r="20" fill="url(#lotusGradient)" filter="url(#glow)"/>
                <!-- Lotus Petals -->
                ${this.generateLotusPetals()}
              </svg>
            </div>
          </div>
          
          <div class="status-text">
            <h1 class="purity-title">System Purity</h1>
            <h2 class="purity-status" id="purity-status">Analyzing...</h2>
            <p class="purity-subtitle" id="purity-subtitle">Checking your system health</p>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-grid">
          <!-- Storage Card -->
          <div class="glass-card summary-card">
            <div class="card-icon storage-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
            </div>
            <div class="card-content">
              <h3>Storage</h3>
              <div class="card-value" id="storage-value">--</div>
              <div class="card-subtitle" id="storage-subtitle">Free space available</div>
              <div class="progress-bar">
                <div class="progress-fill storage-progress" id="storage-progress"></div>
              </div>
            </div>
          </div>

          <!-- RAM Card -->
          <div class="glass-card summary-card">
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
            <div class="card-content">
              <h3>RAM Usage</h3>
              <div class="card-value" id="ram-value">--%</div>
              <div class="card-subtitle" id="ram-subtitle">Memory in use</div>
              <div class="progress-bar">
                <div class="progress-fill ram-progress" id="ram-progress"></div>
              </div>
            </div>
          </div>

          <!-- Junk Found Card -->
          <div class="glass-card summary-card">
            <div class="card-icon junk-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
            <div class="card-content">
              <h3>Junk Found</h3>
              <div class="card-value" id="junk-value">--</div>
              <div class="card-subtitle">Recoverable space</div>
            </div>
          </div>
        </div>

        <!-- Quick Action Button -->
        <div class="quick-action-section">
          <button class="btn-primary btn-glow" id="quick-cleanse-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4"/>
              <path d="M12 18v4"/>
              <path d="M4.93 4.93l2.83 2.83"/>
              <path d="M16.24 16.24l2.83 2.83"/>
              <path d="M2 12h4"/>
              <path d="M18 12h4"/>
              <path d="M4.93 19.07l2.83-2.83"/>
              <path d="M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>Perform Quick Cleanse</span>
          </button>
        </div>

        <!-- System Info Footer -->
        <div class="system-info-footer">
          <div class="system-info-item">
            <span class="info-label">OS:</span>
            <span class="info-value" id="os-info">--</span>
          </div>
          <div class="system-info-item">
            <span class="info-label">CPU:</span>
            <span class="info-value" id="cpu-info">--</span>
          </div>
          <div class="system-info-item" id="battery-info-container" style="display: none;">
            <span class="info-label">Battery:</span>
            <span class="info-value" id="battery-info">--</span>
          </div>
        </div>
      </div>
    `;
  }

  private generateLotusPetals(): string {
    const petals: string[] = [];
    const petalCount = 12;
    const innerRadius = 30;
    const outerRadius = 85;
    
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * 360 / petalCount) * (Math.PI / 180);
      const x1 = 100 + innerRadius * Math.cos(angle);
      const y1 = 100 + innerRadius * Math.sin(angle);
      const x2 = 100 + outerRadius * Math.cos(angle);
      const y2 = 100 + outerRadius * Math.sin(angle);
      
      const cp1x = 100 + (outerRadius * 0.6) * Math.cos(angle - 0.3);
      const cp1y = 100 + (outerRadius * 0.6) * Math.sin(angle - 0.3);
      const cp2x = 100 + (outerRadius * 0.6) * Math.cos(angle + 0.3);
      const cp2y = 100 + (outerRadius * 0.6) * Math.sin(angle + 0.3);
      
      const opacity = 0.3 + (i % 3) * 0.15;
      
      petals.push(`
        <path 
          d="M ${x1} ${y1} Q ${cp1x} ${cp1y} ${x2} ${y2} Q ${cp2x} ${cp2y} ${x1} ${y1}" 
          fill="url(#lotusGradient)" 
          opacity="${opacity}"
          filter="url(#glow)"
          class="lotus-petal"
          style="animation-delay: ${i * 0.1}s"
        />
      `);
    }
    
    return petals.join('');
  }

  private updateUI(): void {
    if (!this.systemInfo) return;

    // Update purity status
    const purityStatus = this.getElement('#purity-status');
    const puritySubtitle = this.getElement('#purity-subtitle');
    
    const purityScore = this.calculatePurityScore();
    if (purityStatus) {
      purityStatus.textContent = purityScore.status;
      purityStatus.className = `purity-status purity-${purityScore.level}`;
    }
    if (puritySubtitle) {
      puritySubtitle.textContent = purityScore.message;
    }

    // Update storage card
    const storage = this.systemInfo.storage;
    this.setText('#storage-value', this.formatBytes(storage.free));
    this.setText('#storage-subtitle', `${this.formatBytes(storage.used)} of ${this.formatBytes(storage.total)} used`);
    const storageProgress = this.getElement<HTMLElement>('#storage-progress');
    if (storageProgress) {
      storageProgress.style.width = `${storage.usedPercent}%`;
      storageProgress.className = `progress-fill storage-progress ${this.getPercentageClass(storage.usedPercent)}`;
    }

    // Update RAM card
    const memory = this.systemInfo.memory;
    this.setText('#ram-value', `${memory.usedPercent}%`);
    this.setText('#ram-subtitle', `${this.formatBytes(memory.used)} of ${this.formatBytes(memory.total)}`);
    const ramProgress = this.getElement<HTMLElement>('#ram-progress');
    if (ramProgress) {
      ramProgress.style.width = `${memory.usedPercent}%`;
      ramProgress.className = `progress-fill ram-progress ${this.getPercentageClass(memory.usedPercent)}`;
    }

    // Update junk found
    this.setText('#junk-value', this.formatBytes(this.junkFound));

    // Update system info footer
    this.setText('#os-info', `${this.systemInfo.os.distro} ${this.systemInfo.os.release}`);
    this.setText('#cpu-info', `${this.systemInfo.cpu.manufacturer} ${this.systemInfo.cpu.brand}`);

    // Update battery if available
    if (this.systemInfo.battery.hasBattery) {
      const batteryContainer = this.getElement('#battery-info-container');
      if (batteryContainer) {
        batteryContainer.style.display = 'flex';
      }
      const batteryIcon = this.systemInfo.battery.isCharging ? '⚡' : '🔋';
      this.setText('#battery-info', `${batteryIcon} ${this.systemInfo.battery.percent}%`);
    }
  }

  private calculatePurityScore(): { status: string; level: string; message: string } {
    if (!this.systemInfo) {
      return { status: 'Analyzing...', level: 'neutral', message: 'Please wait...' };
    }

    const memoryScore = 100 - this.systemInfo.memory.usedPercent;
    const storageScore = 100 - this.systemInfo.storage.usedPercent;
    const junkPenalty = this.junkFound > 500 * 1024 * 1024 ? 20 : this.junkFound > 100 * 1024 * 1024 ? 10 : 0;
    
    const overallScore = (memoryScore + storageScore) / 2 - junkPenalty;

    if (overallScore >= 70) {
      return { 
        status: 'Excellent', 
        level: 'excellent', 
        message: 'Your system is running at peak performance' 
      };
    } else if (overallScore >= 50) {
      return { 
        status: 'Good', 
        level: 'good', 
        message: 'Your system is healthy with minor optimization opportunities' 
      };
    } else if (overallScore >= 30) {
      return { 
        status: 'Fair', 
        level: 'fair', 
        message: 'Consider running a cleanse to improve performance' 
      };
    } else {
      return { 
        status: 'Needs Attention', 
        level: 'critical', 
        message: 'Your system would benefit from optimization' 
      };
    }
  }

  protected attachEventHandlers(): void {
    const quickCleanseBtn = this.getElement('#quick-cleanse-btn');
    quickCleanseBtn?.addEventListener('click', () => this.performQuickCleanse());
  }

  private async performQuickCleanse(): Promise<void> {
    const btn = this.getElement<HTMLButtonElement>('#quick-cleanse-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4"/>
          <path d="M12 18v4"/>
          <path d="M4.93 4.93l2.83 2.83"/>
          <path d="M16.24 16.24l2.83 2.83"/>
          <path d="M2 12h4"/>
          <path d="M18 12h4"/>
          <path d="M4.93 19.07l2.83-2.83"/>
          <path d="M16.24 7.76l2.83-2.83"/>
        </svg>
        <span>Cleansing...</span>
      `;
    }

    try {
      const result = await window.electron.cleanJunk(['temp', 'recycle']);
      const totalFreed = Object.values(result).reduce((acc, item) => acc + item.freedSpace, 0);
      
      Toast.success(`Quick cleanse complete! Freed ${this.formatBytes(totalFreed)}`);
      
      // Refresh data
      await this.loadData();
    } catch (error) {
      Toast.error('Failed to complete quick cleanse');
      this.handleError(error);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4"/>
            <path d="M12 18v4"/>
            <path d="M4.93 4.93l2.83 2.83"/>
            <path d="M16.24 16.24l2.83 2.83"/>
            <path d="M2 12h4"/>
            <path d="M18 12h4"/>
            <path d="M4.93 19.07l2.83-2.83"/>
            <path d="M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>Perform Quick Cleanse</span>
        `;
      }
    }
  }
}
