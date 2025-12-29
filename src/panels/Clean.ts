// Clean Panel - System Cleaner with categorized junk scanning
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { JunkScanResult, BrowserInfo } from '../types/electron.js';

interface CleaningCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  size: number;
  files: string[];
}

export class CleanPanel extends BasePanel {
  private categories: CleaningCategory[] = [];
  private browsers: BrowserInfo[] = [];
  private isScanning: boolean = false;
  private isCleaning: boolean = false;
  private totalJunkFound: number = 0;

  constructor() {
    super('Clean-panel', 60);
  }

  protected init(): void {
    this.initializeCategories();
    this.scanBrowsers(); // Auto-scan browsers on init
    super.init();
  }

  private initializeCategories(): void {
    console.log('[Clean] Initializing categories...');
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
    console.log('[Clean] Categories initialized:', this.categories.length, 'total');
    console.log('[Clean] Category IDs:', this.categories.map(c => c.id));
  }

  protected async loadData(): Promise<void> {
    // Data is loaded on demand via scan
  }

  protected render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="Clean-content">
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
              Clean
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

        <!-- Browser Cleaner Card -->
        <div class="browser-cleaner-section">
          <h2 class="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            Browser Cleaner
          </h2>
          <div class="browser-grid" id="browser-grid">
            <div class="loading-state">
              <span>Scanning for installed browsers...</span>
            </div>
          </div>
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
    console.log('[Clean] renderCategories called with', this.categories.length, 'categories');
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

    // Browser cleaning buttons
    this.container?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      
      // Clean browser button
      const cleanBtn = target.closest('.clean-browser-btn') as HTMLElement;
      if (cleanBtn) {
        const browserName = cleanBtn.dataset.browser;
        if (browserName) {
          await this.cleanBrowserCache(browserName);
        }
        return;
      }

      // Close browser button
      const closeBtn = target.closest('.close-browser-btn') as HTMLElement;
      if (closeBtn) {
        const browserName = closeBtn.dataset.browser;
        if (browserName) {
          await this.closeBrowserProcess(browserName);
        }
        return;
      }
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
      // Rescan browsers first to get latest browser list
      await this.scanBrowsers();
      
      // Get all category IDs (including dynamic browsers)
      const ALL_CATEGORIES = this.categories.map(c => c.id);
      
      console.log('[Clean] Starting scan with categories:', ALL_CATEGORIES);
      let scanned = 0;
      
      // Store all results
      const scanResults: { [key: string]: { size: number; files: string[] } } = {};

      // Scan each category
      for (const catId of ALL_CATEGORIES) {
        if (progressBar) {
          progressBar.style.width = `${(scanned / ALL_CATEGORIES.length) * 100}%`;
        }
        if (progressText) {
          const cat = this.categories.find(c => c.id === catId);
          progressText.textContent = `Scanning ${cat?.name || catId}...`;
        }

        console.log(`[Clean] Scanning category: ${catId}`);
        const result = await window.electron.scanJunk([catId]);
        console.log(`[Clean] Result for ${catId}:`, result);
        
        if (result[catId]) {
          scanResults[catId] = result[catId];
          console.log(`[Clean] Stored result for ${catId}: ${this.formatBytes(result[catId].size)}`);
        }

        scanned++;
      }

      // Calculate total from scanResults
      let totalSize = 0;
      for (const catId of ALL_CATEGORIES) {
        if (scanResults[catId]) {
          totalSize += scanResults[catId].size;
        }
      }
      
      // Update categories array if they exist
      this.categories.forEach(cat => {
        if (scanResults[cat.id]) {
          cat.size = scanResults[cat.id].size;
          cat.files = scanResults[cat.id].files;
        }
      });

      this.totalJunkFound = totalSize;
      console.log(`[Clean] Total junk found: ${this.formatBytes(this.totalJunkFound)}`);
      
      // Update UI using ALL_CATEGORIES
      for (const catId of ALL_CATEGORIES) {
        const size = scanResults[catId]?.size || 0;
        const sizeText = size > 0 ? this.formatBytes(size) : '0 B';
        const element = this.getElement(`#size-${catId}`);
        if (element) {
          element.textContent = sizeText;
          console.log(`[Clean] Updated UI for ${catId}: ${sizeText}`);
        } else {
          console.log(`[Clean] WARNING: Element #size-${catId} not found in DOM!`);
        }
      }

      // Show results
      if (progressContainer) progressContainer.style.display = 'none';
      if (scanResult) {
        scanResult.style.display = 'flex';
        const totalJunkElement = this.getElement('#total-junk');
        if (totalJunkElement) {
          totalJunkElement.textContent = this.formatBytes(this.totalJunkFound);
          console.log(`[Clean] Updated total display: ${this.formatBytes(this.totalJunkFound)}`);
        }
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

        // Check if this is a browser category
        if (catId.startsWith('browser-')) {
          const browserName = catId.replace('browser-', '');
          const browser = this.browsers.find(b => b.name === browserName);
          
          if (browser && browser.isRunning) {
            // Close the browser first
            if (progressText) {
              progressText.textContent = `Closing ${browser.displayName}...`;
            }
            await window.electron.closeBrowser(browserName);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for full shutdown
          }
          
          // Clean browser cache
          const browserResult = await window.electron.cleanBrowser(browserName, {
            cache: true,
            cookies: false,
            history: false
          });
          
          if (browserResult.success) {
            totalFreed += browserResult.freedSpace || 0;
            const category = this.categories.find(c => c.id === catId);
            if (category) {
              category.size = 0;
              category.files = [];
            }
          }
        } else {
          // Regular junk cleaning
          const result = await window.electron.cleanJunk([catId]);
          
          if (result[catId]?.success) {
            totalFreed += result[catId].freedSpace;
            const category = this.categories.find(c => c.id === catId);
            if (category) {
              category.size = 0;
              category.files = [];
            }
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

  private async scanBrowsers(): Promise<void> {
    try {
      const result = await window.electron.scanBrowsers();
      
      if (result.success && result.browsers.length > 0) {
        this.browsers = result.browsers;
        this.updateBrowserGrid();
        
        // Remove old browser categories
        this.categories = this.categories.filter(c => !c.id.startsWith('browser-'));
        
        // Add detected browsers as categories
        for (const browser of this.browsers) {
          const category: CleaningCategory = {
            id: `browser-${browser.name}`,
            name: `${browser.displayName}${browser.isRunning ? ' ⚠️' : ''}`,
            description: browser.isRunning ? `${browser.displayName} (Running - will be closed)` : `${browser.displayName} browser cache`,
            icon: this.getBrowserIcon(browser.name),
            enabled: false,
            size: browser.analysis.cacheSize,
            files: []
          };
          this.categories.push(category);
        }
        
        // Categories updated, will be rendered on next scan
      }
    } catch (error) {
      console.error('Failed to scan browsers:', error);
    }
  }

  private updateBrowserGrid(): void {
    const grid = this.getElement('#browser-grid');
    if (!grid) return;

    if (this.browsers.length === 0) {
      grid.innerHTML = `
        <div class="no-browsers-found">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>No browsers detected</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.browsers.map(browser => {
      const cacheSizeMB = (browser.analysis.cacheSize / (1024 * 1024)).toFixed(1);
      const statusClass = browser.isRunning ? 'status-running' : 'status-ready';
      const statusText = browser.isRunning ? 'Running' : 'Ready to Clean';

      return `
        <div class="glass-card browser-card" data-browser="${browser.name}">
          <div class="browser-header">
            <div class="browser-icon ${browser.icon}">
              ${this.getBrowserIcon(browser.name)}
            </div>
            <div class="browser-info">
              <h3>${browser.displayName}</h3>
              <span class="browser-status ${statusClass}">${statusText}</span>
            </div>
          </div>
          
          <div class="browser-stats">
            <div class="stat-item">
              <span class="stat-label">Cache</span>
              <span class="stat-value">${cacheSizeMB} MB</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Cookies</span>
              <span class="stat-value">${browser.analysis.cookieCount}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">History</span>
              <span class="stat-value">${browser.analysis.historyCount}</span>
            </div>
          </div>

          <div class="browser-actions">
            ${browser.isRunning ? `
              <button class="btn-secondary close-browser-btn" data-browser="${browser.name}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Close Browser
              </button>
            ` : `
              <button class="btn-primary clean-browser-btn" data-browser="${browser.name}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Clean Cache
              </button>
            `}
          </div>

          <div class="browser-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Cache only • Cookies & History preserved</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private async cleanBrowserCache(browserName: string): Promise<void> {
    const browser = this.browsers.find(b => b.name === browserName);
    if (!browser) return;

    if (browser.isRunning) {
      const confirmed = confirm(`${browser.displayName} is currently running. Would you like to close it and continue cleaning?`);
      if (confirmed) {
        await this.closeBrowserProcess(browserName);
        // Wait for process to fully terminate
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        return;
      }
    }

    try {
      const result = await window.electron.cleanBrowser(browserName, {
        cache: true,
        cookies: false,
        history: false
      });

      if (result.success) {
        const freedMB = ((result.freedSpace || 0) / (1024 * 1024)).toFixed(1);
        Toast.success(`Cleaned ${browser.displayName}: ${freedMB} MB freed`);
        // Rescan to update the UI
        await this.scanBrowsers();
      } else if (result.needsClose) {
        Toast.warning(result.error || 'Browser needs to be closed first');
      } else {
        Toast.error(result.error || 'Failed to clean browser');
      }
    } catch (error) {
      Toast.error(`Error cleaning ${browser.displayName}`);
      console.error(error);
    }
  }

  private async closeBrowserProcess(browserName: string): Promise<void> {
    const browser = this.browsers.find(b => b.name === browserName);
    if (!browser) return;

    try {
      const result = await window.electron.closeBrowser(browserName);
      
      if (result.success) {
        Toast.success(`${browser.displayName} closed`);
        browser.isRunning = false;
        this.updateBrowserGrid();
        await this.scanBrowsers();
      } else {
        Toast.error(result.error || 'Failed to close browser');
      }
    } catch (error) {
      Toast.error(`Error closing ${browser.displayName}`);
      console.error(error);
    }
  }

  private getBrowserIcon(name: string): string {
    const icons: Record<string, string> = {
      chrome: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <line x1="21.17" y1="8" x2="12" y2="8"/>
      </svg>`,
      edge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      </svg>`,
      firefox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a10 10 0 0 0-7 17"/>
      </svg>`,
      brave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l10 5v5c0 6-4 10-10 14-6-4-10-8-10-14V7z"/>
      </svg>`
    };
    return icons[name] || icons.chrome;
  }
}

