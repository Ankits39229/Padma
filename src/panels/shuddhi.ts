// Shuddhi Panel - System Cleaner with categorized junk scanning
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { JunkScanResult } from '../types/electron.d.js';

interface CleaningCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  size: number;
  files: string[];
}

export class ShuddhiPanel extends BasePanel {
  private categories: CleaningCategory[] = [];
  private isScanning: boolean = false;
  private isCleaning: boolean = false;
  private totalJunkFound: number = 0;

  constructor() {
    super('shuddhi-panel', 60);
  }

  protected init(): void {
    this.initializeCategories();
    super.init();
  }

  private initializeCategories(): void {
    this.categories = [
      {
        id: 'temp',
        name: 'Temporary Files',
        description: 'Windows and user temp files',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>`,
        enabled: true,
        size: 0,
        files: []
      },
      {
        id: 'prefetch',
        name: 'Prefetch Data',
        description: 'Windows prefetch cache files',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>`,
        enabled: true,
        size: 0,
        files: []
      },
      {
        id: 'logs',
        name: 'Crash Dumps & Logs',
        description: 'System crash dumps and error logs',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>`,
        enabled: true,
        size: 0,
        files: []
      },
      {
        id: 'recycle',
        name: 'Recycle Bin',
        description: 'Empty the Windows recycle bin',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>`,
        enabled: true,
        size: 0,
        files: []
      },
      {
        id: 'browser-chrome',
        name: 'Chrome Cache',
        description: 'Google Chrome browser cache',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="4"/>
          <line x1="21.17" y1="8" x2="12" y2="8"/>
          <line x1="3.95" y1="6.06" x2="8.54" y2="14"/>
          <line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
        </svg>`,
        enabled: false,
        size: 0,
        files: []
      },
      {
        id: 'browser-edge',
        name: 'Edge Cache',
        description: 'Microsoft Edge browser cache',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M12 6v6l4 2"/>
        </svg>`,
        enabled: false,
        size: 0,
        files: []
      },
      {
        id: 'browser-firefox',
        name: 'Firefox Cache',
        description: 'Mozilla Firefox browser cache',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a10 10 0 0 0-7 17"/>
        </svg>`,
        enabled: false,
        size: 0,
        files: []
      }
    ];
  }

  protected async loadData(): Promise<void> {
    // Data is loaded on demand via scan
  }

  protected render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="shuddhi-content">
        <!-- Header Section -->
        <div class="panel-header">
          <div class="header-info">
            <h1 class="panel-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </span>
              Shuddhi
            </h1>
            <p class="panel-subtitle">System Cleaner - Purify your system by removing junk files</p>
          </div>
        </div>

        <!-- Scan Section -->
        <div class="scan-section">
          <div class="glass-card scan-card">
            <div class="scan-info">
              <div class="scan-status" id="scan-status">
                <span class="status-icon">🔍</span>
                <span class="status-text">Ready to scan for junk files</span>
              </div>
              <div class="scan-result" id="scan-result" style="display: none;">
                <span class="result-amount" id="total-junk">0 MB</span>
                <span class="result-label">Total junk found</span>
              </div>
            </div>
            <div class="scan-actions">
              <button class="btn-primary btn-glow" id="scan-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <span>Scan for Junk</span>
              </button>
              <button class="btn-secondary" id="clean-btn" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                <span>Clean Selected</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="scan-progress-container" id="scan-progress-container" style="display: none;">
          <div class="progress-bar large">
            <div class="progress-fill animated" id="scan-progress"></div>
          </div>
          <div class="progress-text" id="progress-text">Scanning...</div>
        </div>

        <!-- Categories Grid -->
        <div class="categories-section">
          <h2 class="section-title">Cleaning Categories</h2>
          <div class="categories-grid" id="categories-grid">
            ${this.renderCategories()}
          </div>
        </div>

        <!-- Tips Section -->
        <div class="tips-section">
          <div class="glass-card tips-card">
            <h3>💡 Cleaning Tips</h3>
            <ul class="tips-list">
              <li>Temporary files are safe to delete and accumulate over time</li>
              <li>Browser cache can be cleared to free significant space</li>
              <li>Empty the Recycle Bin regularly to reclaim storage</li>
              <li>Be cautious with prefetch data - it helps apps start faster</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  private renderCategories(): string {
    return this.categories.map(cat => `
      <div class="glass-card category-card" data-category="${cat.id}">
        <div class="category-header">
          <label class="checkbox-container">
            <input type="checkbox" ${cat.enabled ? 'checked' : ''} data-category-toggle="${cat.id}">
            <span class="checkmark"></span>
          </label>
          <div class="category-icon">${cat.icon}</div>
          <div class="category-info">
            <h3 class="category-name">${cat.name}</h3>
            <p class="category-desc">${cat.description}</p>
          </div>
        </div>
        <div class="category-size" id="size-${cat.id}">
          ${cat.size > 0 ? this.formatBytes(cat.size) : '--'}
        </div>
      </div>
    `).join('');
  }

  protected attachEventHandlers(): void {
    // Scan button
    const scanBtn = this.getElement('#scan-btn');
    scanBtn?.addEventListener('click', () => this.performScan());

    // Clean button
    const cleanBtn = this.getElement('#clean-btn');
    cleanBtn?.addEventListener('click', () => this.performClean());

    // Category toggles
    this.categories.forEach(cat => {
      const checkbox = this.container?.querySelector(`[data-category-toggle="${cat.id}"]`);
      checkbox?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        cat.enabled = target.checked;
      });
    });
  }

  public triggerQuickScan(): void {
    this.performScan();
  }

  private async performScan(): Promise<void> {
    if (this.isScanning) return;

    this.isScanning = true;
    const scanBtn = this.getElement<HTMLButtonElement>('#scan-btn');
    const progressContainer = this.getElement('#scan-progress-container');
    const progressBar = this.getElement<HTMLElement>('#scan-progress');
    const progressText = this.getElement('#progress-text');
    const scanStatus = this.getElement('#scan-status');
    const scanResult = this.getElement('#scan-result');

    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Scanning...</span>
      `;
    }

    if (progressContainer) progressContainer.style.display = 'block';
    if (scanStatus) scanStatus.style.display = 'none';
    if (scanResult) scanResult.style.display = 'none';

    try {
      const categoryIds = this.categories.map(c => c.id);
      let scanned = 0;

      // Scan each category
      for (const catId of categoryIds) {
        if (progressBar) {
          progressBar.style.width = `${(scanned / categoryIds.length) * 100}%`;
        }
        if (progressText) {
          const cat = this.categories.find(c => c.id === catId);
          progressText.textContent = `Scanning ${cat?.name || catId}...`;
        }

        const result = await window.electron.scanJunk([catId]);
        
        if (result[catId]) {
          const category = this.categories.find(c => c.id === catId);
          if (category) {
            category.size = result[catId].size;
            category.files = result[catId].files;
          }
        }

        scanned++;
      }

      // Update UI with results
      this.totalJunkFound = this.categories.reduce((acc, cat) => acc + cat.size, 0);
      
      // Update category sizes
      this.categories.forEach(cat => {
        this.setText(`#size-${cat.id}`, cat.size > 0 ? this.formatBytes(cat.size) : '0 B');
      });

      // Show results
      if (progressContainer) progressContainer.style.display = 'none';
      if (scanResult) {
        scanResult.style.display = 'flex';
        this.setText('#total-junk', this.formatBytes(this.totalJunkFound));
      }

      // Enable clean button
      const cleanBtn = this.getElement<HTMLButtonElement>('#clean-btn');
      if (cleanBtn && this.totalJunkFound > 0) {
        cleanBtn.disabled = false;
      }

      Toast.success(`Scan complete! Found ${this.formatBytes(this.totalJunkFound)} of junk`);

    } catch (error) {
      Toast.error('Failed to complete scan');
      this.handleError(error);
      if (scanStatus) scanStatus.style.display = 'flex';
    } finally {
      this.isScanning = false;
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <span>Scan for Junk</span>
        `;
      }
      if (progressContainer) progressContainer.style.display = 'none';
    }
  }

  private async performClean(): Promise<void> {
    if (this.isCleaning) return;

    const enabledCategories = this.categories.filter(c => c.enabled && c.size > 0);
    if (enabledCategories.length === 0) {
      Toast.warning('No categories selected for cleaning');
      return;
    }

    this.isCleaning = true;
    const cleanBtn = this.getElement<HTMLButtonElement>('#clean-btn');
    const progressContainer = this.getElement('#scan-progress-container');
    const progressBar = this.getElement<HTMLElement>('#scan-progress');
    const progressText = this.getElement('#progress-text');

    if (cleanBtn) {
      cleanBtn.disabled = true;
      cleanBtn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Cleaning...</span>
      `;
    }

    if (progressContainer) progressContainer.style.display = 'block';
    if (progressBar) progressBar.style.width = '0%';

    try {
      const categoryIds = enabledCategories.map(c => c.id);
      let cleaned = 0;
      let totalFreed = 0;

      for (const catId of categoryIds) {
        if (progressBar) {
          progressBar.style.width = `${(cleaned / categoryIds.length) * 100}%`;
        }
        if (progressText) {
          const cat = this.categories.find(c => c.id === catId);
          progressText.textContent = `Cleaning ${cat?.name || catId}...`;
        }

        const result = await window.electron.cleanJunk([catId]);
        
        if (result[catId]?.success) {
          totalFreed += result[catId].freedSpace;
          const category = this.categories.find(c => c.id === catId);
          if (category) {
            category.size = 0;
            category.files = [];
          }
        }

        cleaned++;
      }

      // Update UI
      this.categories.forEach(cat => {
        this.setText(`#size-${cat.id}`, cat.size > 0 ? this.formatBytes(cat.size) : '0 B');
      });

      this.totalJunkFound = this.categories.reduce((acc, cat) => acc + cat.size, 0);
      this.setText('#total-junk', this.formatBytes(this.totalJunkFound));

      if (progressContainer) progressContainer.style.display = 'none';
      
      Toast.success(`Cleaning complete! Freed ${this.formatBytes(totalFreed)}`);

    } catch (error) {
      Toast.error('Failed to complete cleaning');
      this.handleError(error);
    } finally {
      this.isCleaning = false;
      if (cleanBtn) {
        cleanBtn.disabled = this.totalJunkFound === 0;
        cleanBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <span>Clean Selected</span>
        `;
      }
      if (progressContainer) progressContainer.style.display = 'none';
    }
  }
}
