/**
 * Base Panel Abstract Class
 * 
 * Provides common functionality for all panel implementations:
 * - Lifecycle management (init, destroy)
 * - Auto-refresh capability
 * - State tracking
 * - Error handling
 */
export abstract class BasePanel {
  protected container: HTMLElement | null;
  protected refreshInterval: NodeJS.Timeout | null = null;
  protected isDestroyed: boolean = false;
  protected isActive: boolean = false;
  protected autoRefreshSeconds: number = 30;

  constructor(containerId: string, autoRefreshSeconds: number = 30) {
    this.container = document.getElementById(containerId);
    this.autoRefreshSeconds = autoRefreshSeconds;
    
    if (!this.container) {
      console.error(`❌ Panel container '${containerId}' not found in DOM`);
    } else {
      console.log(`✅ Panel container '${containerId}' found, initializing...`);
    }
    
    this.init();
    
    // Listen for panel activation
    document.addEventListener('panel-activated', ((e: CustomEvent) => {
      const isThisPanel = e.detail.panelId === containerId.replace('-panel', '');
      this.setActive(isThisPanel);
    }) as EventListener);
    
    // Clean up on window unload
    window.addEventListener('beforeunload', () => this.destroy());
  }

  /**
   * Initialize the panel - override for custom init logic
   */
  protected init(): void {
    if (!this.container) {
      console.warn(`Panel container not found: ${this.constructor.name}`);
      return;
    }
    this.render();
    this.attachEventHandlers();
    this.setupAutoRefresh();
  }

  /**
   * Setup automatic refresh when panel is active
   */
  private setupAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      if (!this.isDestroyed && this.isActive) {
        this.loadData().catch(this.handleError.bind(this));
      }
    }, this.autoRefreshSeconds * 1000);
  }

  /**
   * Load panel data from IPC - MUST implement
   */
  protected abstract loadData(): Promise<void>;

  /**
   * Render panel UI - MUST implement
   */
  protected abstract render(): void;

  /**
   * Attach event handlers - override to add handlers
   */
  protected attachEventHandlers(): void {}

  /**
   * Public API to refresh panel data
   */
  public async refresh(): Promise<void> {
    if (this.isDestroyed) return;
    try {
      await this.loadData();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Mark panel as active (visible)
   */
  public setActive(active: boolean): void {
    this.isActive = active;
    if (active && !this.isDestroyed) {
      this.refresh();
    }
  }

  /**
   * Handle errors gracefully
   */
  protected handleError(error: unknown): void {
    console.error(`Error in ${this.constructor.name}:`, error);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.isActive = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.removeEventHandlers();
  }

  /**
   * Remove event handlers - override to remove handlers
   */
  protected removeEventHandlers(): void {}

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  protected getElement<T extends HTMLElement | SVGElement = HTMLElement>(selector: string): T | null {
    return this.container?.querySelector<T>(selector) || null;
  }

  protected getElements<T extends HTMLElement | SVGElement = HTMLElement>(selector: string): T[] {
    if (!this.container) return [];
    return Array.from(this.container.querySelectorAll<T>(selector));
  }

  protected setText(selector: string, text: string): void {
    const el = this.getElement(selector);
    if (el) el.textContent = text;
  }

  protected setHTML(selector: string, html: string): void {
    const el = this.getElement(selector);
    if (el) el.innerHTML = html;
  }

  /**
   * Format bytes to human readable string
   */
  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format percentage with color class
   */
  protected getPercentageClass(percent: number): string {
    if (percent < 50) return 'percent-good';
    if (percent < 80) return 'percent-warning';
    return 'percent-critical';
  }
}
