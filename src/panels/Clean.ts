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
  private lastScanTime: string = '';

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
        name: 'Prefetch Files',
        description: 'Windows prefetch cache files for faster application loading',
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
      <div class="clean-content">
        <!-- Action Buttons -->
        <div class="clean-actions-header">
          <button class="btn-scan" id="scan-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Scan System</span>
          </button>
          <button class="btn-clean-all" id="clean-all-btn" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span id="clean-all-text">Clean Selected (0 B)</span>
          </button>
        </div>

        <!-- Last Scan Info -->
        <div class="last-scan-info" id="last-scan-info" style="display: none;">
          <span>Last scan: <span id="last-scan-time"></span></span>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards" id="summary-cards">
          <div class="summary-card">
            <div class="summary-icon system-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div class="summary-info">
              <div class="summary-label">System Files</div>
              <div class="summary-value" id="summary-system">--</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon browser-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4"/>
                <line x1="21.17" y1="8" x2="12" y2="8"/>
              </svg>
            </div>
            <div class="summary-info">
              <div class="summary-label">Browser Files</div>
              <div class="summary-value" id="summary-browser">--</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon temp-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="summary-info">
              <div class="summary-label">Temp Files</div>
              <div class="summary-value" id="summary-temp">--</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon downloads-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div class="summary-info">
              <div class="summary-label">Downloads Files</div>
              <div class="summary-value" id="summary-downloads">--</div>
            </div>
          </div>
        </div>

        <!-- Cleanup Items -->
        <div class="cleanup-section">
          <h2 class="section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            </svg>
            Cleanup Items
          </h2>
          <div class="cleanup-list" id="cleanup-list">
            ${this.renderCleanupItems()}
          </div>
        </div>
      </div>
    `;
  }

  private renderCleanupItems(): string {
    if (this.categories.length === 0) {
      return '<div class="no-items">Click "Scan System" to find junk files</div>';
    }

    return this.categories.map(cat => `
      <div class="cleanup-item" data-category="${cat.id}">
        <div class="cleanup-item-left">
          <label class="cleanup-checkbox">
            <input type="checkbox" ${cat.enabled ? 'checked' : ''} data-category-toggle="${cat.id}">
            <span class="checkmark"></span>
          </label>
          <div class="cleanup-icon">${cat.icon}</div>
          <div class="cleanup-info">
            <div class="cleanup-name">${cat.name}</div>
            <div class="cleanup-desc">${cat.description}</div>
          </div>
        </div>
        <div class="cleanup-item-right">
          <div class="cleanup-size" id="size-${cat.id}">${cat.size > 0 ? this.formatBytes(cat.size) : '--'}</div>
          <button class="btn-clean-item" data-clean-item="${cat.id}" ${cat.size === 0 ? 'disabled' : ''}>
            Clean
          </button>
        </div>
      </div>
    `).join('');
  }

  protected attachEventHandlers(): void {
    // Scan button
    const scanBtn = this.getElement('#scan-btn');
    scanBtn?.addEventListener('click', () => this.performScan());

    // Clean all button
    const cleanAllBtn = this.getElement('#clean-all-btn');
    cleanAllBtn?.addEventListener('click', () => this.performCleanAll());

    // Category toggles
    this.categories.forEach(cat => {
      const checkbox = this.container?.querySelector(`[data-category-toggle="${cat.id}"]`);
      checkbox?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        cat.enabled = target.checked;
        this.updateCleanAllButton();
      });
    });

    // Individual clean buttons
    this.container?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const cleanItemBtn = target.closest('[data-clean-item]') as HTMLElement;
      
      if (cleanItemBtn) {
        const categoryId = cleanItemBtn.dataset.cleanItem;
        if (categoryId) {
          await this.performCleanItem(categoryId);
        }
      }
    });
  }

  private updateCleanAllButton(): void {
    const cleanAllBtn = this.getElement<HTMLButtonElement>('#clean-all-btn');
    const cleanAllText = this.getElement('#clean-all-text');
    
    const selectedCategories = this.categories.filter(c => c.enabled && c.size > 0);
    const totalSelected = selectedCategories.reduce((acc, cat) => acc + cat.size, 0);
    
    if (cleanAllBtn) {
      cleanAllBtn.disabled = totalSelected === 0;
    }
    
    if (cleanAllText) {
      cleanAllText.textContent = `Clean Selected (${this.formatBytes(totalSelected)})`;
    }
  }

  public triggerQuickScan(): void {
    this.performScan();
  }

  private async performScan(): Promise<void> {
    if (this.isScanning) return;

    this.isScanning = true;
    const scanBtn = this.getElement<HTMLButtonElement>('#scan-btn');

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

    try {
      // Rescan browsers first to get latest browser list
      await this.scanBrowsers();
      
      // Get all category IDs (including dynamic browsers)
      const ALL_CATEGORIES = this.categories.map(c => c.id);
      
      console.log('[Clean] Starting scan with categories:', ALL_CATEGORIES);
      
      // Store all results
      const scanResults: { [key: string]: { size: number; files: string[] } } = {};

      // Scan each category
      for (const catId of ALL_CATEGORIES) {
        console.log(`[Clean] Scanning category: ${catId}`);
        const result = await window.electron.scanJunk([catId]);
        console.log(`[Clean] Result for ${catId}:`, result);
        
        if (result[catId]) {
          scanResults[catId] = result[catId];
          console.log(`[Clean] Stored result for ${catId}: ${this.formatBytes(result[catId].size)}`);
        }
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
      this.lastScanTime = new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      console.log(`[Clean] Total junk found: ${this.formatBytes(this.totalJunkFound)}`);
      
      // Re-render cleanup items list
      const cleanupList = this.getElement('#cleanup-list');
      if (cleanupList) {
        cleanupList.innerHTML = this.renderCleanupItems();
        this.reattachCategoryHandlers();
      }
      
      // Update summary cards
      this.updateSummaryCards();
      
      // Show last scan time
      const lastScanInfo = this.getElement('#last-scan-info');
      const lastScanTimeEl = this.getElement('#last-scan-time');
      if (lastScanInfo && lastScanTimeEl) {
        lastScanTimeEl.textContent = this.lastScanTime;
        lastScanInfo.style.display = 'block';
      }
      
      // Update clean all button
      this.updateCleanAllButton();

      Toast.success(`Scan complete! Found ${this.formatBytes(this.totalJunkFound)} of junk`);

    } catch (error) {
      Toast.error('Failed to complete scan');
      this.handleError(error);
    } finally {
      this.isScanning = false;
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>Scan System</span>
        `;
      }
    }
  }

  private updateSummaryCards(): void {
    // Calculate system files (prefetch, logs, recycle)
    const systemCategories = ['prefetch', 'logs', 'recycle'];
    const systemSize = this.categories
      .filter(c => systemCategories.includes(c.id))
      .reduce((acc, cat) => acc + cat.size, 0);
    
    // Calculate browser files
    const browserSize = this.categories
      .filter(c => c.id.startsWith('browser-'))
      .reduce((acc, cat) => acc + cat.size, 0);
    
    // Get temp files
    const tempCat = this.categories.find(c => c.id === 'temp');
    const tempSize = tempCat?.size || 0;
    
    // Downloads (placeholder - set to 0 for now)
    const downloadsSize = 0;
    
    this.setText('#summary-system', this.formatBytes(systemSize));
    this.setText('#summary-browser', this.formatBytes(browserSize));
    this.setText('#summary-temp', this.formatBytes(tempSize));
    this.setText('#summary-downloads', this.formatBytes(downloadsSize));
  }

  private async performCleanAll(): Promise<void> {
    if (this.isCleaning) return;

    const enabledCategories = this.categories.filter(c => c.enabled && c.size > 0);
    if (enabledCategories.length === 0) {
      Toast.warning('No categories selected for cleaning');
      return;
    }

    this.isCleaning = true;
    const cleanAllBtn = this.getElement<HTMLButtonElement>('#clean-all-btn');

    if (cleanAllBtn) {
      cleanAllBtn.disabled = true;
      const originalText = cleanAllBtn.innerHTML;
      cleanAllBtn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Cleaning...</span>
      `;
    }

    try {
      const categoryIds = enabledCategories.map(c => c.id);
      let totalFreed = 0;

      for (const catId of categoryIds) {
        // Check if this is a browser category
        if (catId.startsWith('browser-')) {
          const browserName = catId.replace('browser-', '');
          const browser = this.browsers.find(b => b.name === browserName);
          
          if (browser && browser.isRunning) {
            await window.electron.closeBrowser(browserName);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
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
      }

      // Re-render cleanup list
      const cleanupList = this.getElement('#cleanup-list');
      if (cleanupList) {
        cleanupList.innerHTML = this.renderCleanupItems();
        this.reattachCategoryHandlers();
      }

      this.totalJunkFound = this.categories.reduce((acc, cat) => acc + cat.size, 0);
      this.updateSummaryCards();
      this.updateCleanAllButton();
      
      Toast.success(`Cleaning complete! Freed ${this.formatBytes(totalFreed)}`);

    } catch (error) {
      Toast.error('Failed to complete cleaning');
      this.handleError(error);
    } finally {
      this.isCleaning = false;
      this.updateCleanAllButton();
    }
  }

  private async performCleanItem(categoryId: string): Promise<void> {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category || category.size === 0) return;

    try {
      let totalFreed = 0;

      // Check if this is a browser category
      if (categoryId.startsWith('browser-')) {
        const browserName = categoryId.replace('browser-', '');
        const browser = this.browsers.find(b => b.name === browserName);
        
        if (browser && browser.isRunning) {
          await window.electron.closeBrowser(browserName);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const browserResult = await window.electron.cleanBrowser(browserName, {
          cache: true,
          cookies: false,
          history: false
        });
        
        if (browserResult.success) {
          totalFreed = browserResult.freedSpace || 0;
          category.size = 0;
          category.files = [];
        }
      } else {
        const result = await window.electron.cleanJunk([categoryId]);
        
        if (result[categoryId]?.success) {
          totalFreed = result[categoryId].freedSpace;
          category.size = 0;
          category.files = [];
        }
      }

      // Update the specific item in UI
      const sizeElement = this.getElement(`#size-${categoryId}`);
      const cleanBtn = this.container?.querySelector(`[data-clean-item="${categoryId}"]`) as HTMLButtonElement;
      
      if (sizeElement) sizeElement.textContent = '0 B';
      if (cleanBtn) cleanBtn.disabled = true;

      this.totalJunkFound = this.categories.reduce((acc, cat) => acc + cat.size, 0);
      this.updateSummaryCards();
      this.updateCleanAllButton();
      
      Toast.success(`Cleaned ${category.name}: ${this.formatBytes(totalFreed)} freed`);

    } catch (error) {
      Toast.error(`Failed to clean ${category.name}`);
      this.handleError(error);
    }
  }

  private async scanBrowsers(): Promise<void> {
    try {
      const result = await window.electron.scanBrowsers();
      
      if (result.success && result.browsers.length > 0) {
        this.browsers = result.browsers;
        
        // Remove old browser categories but KEEP system categories
        const systemCategoryIds = ['temp', 'prefetch', 'logs', 'recycle'];
        console.log('[Clean] Before filtering browsers, categories:', this.categories.map(c => c.id));
        
        // Only remove browser categories, preserve system ones
        this.categories = this.categories.filter(c => systemCategoryIds.includes(c.id));
        
        // If system categories were somehow lost, reinitialize them
        if (this.categories.length === 0) {
          console.log('[Clean] System categories lost, reinitializing...');
          this.initializeCategories();
        }
        
        console.log('[Clean] After filtering browsers, categories:', this.categories.map(c => c.id));
        
        // Add detected browsers as categories
        for (const browser of this.browsers) {
          const category: CleaningCategory = {
            id: `browser-${browser.name}`,
            name: `${browser.displayName} Cache`,
            description: `Browser cache, cookies, and temporary internet files`,
            icon: this.getBrowserIcon(browser.name),
            enabled: false,
            size: browser.analysis.cacheSize,
            files: []
          };
          this.categories.push(category);
        }
        console.log('[Clean] After adding browsers, categories:', this.categories.map(c => c.id));
        
        // Re-render the cleanup list to show all categories
        const cleanupList = this.getElement('#cleanup-list');
        if (cleanupList) {
          cleanupList.innerHTML = this.renderCleanupItems();
          this.reattachCategoryHandlers();
        }
      }
    } catch (error) {
      console.error('Failed to scan browsers:', error);
    }
  }
  
  private reattachCategoryHandlers(): void {
    this.categories.forEach(cat => {
      const checkbox = this.container?.querySelector(`[data-category-toggle="${cat.id}"]`);
      checkbox?.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        cat.enabled = target.checked;
        this.updateCleanAllButton();
      });
    });
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

