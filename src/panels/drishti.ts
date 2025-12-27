// Drishti Panel - System Analyzer with Disk Visualization, S.M.A.R.T Health, and Reports
import { BasePanel } from './BasePanel.js';
import { Toast } from '../components/toast.js';
import { DiskItem, LargeFile, DiskHealth } from '../types/electron.d.js';

export class DrishtiPanel extends BasePanel {
  private diskData: DiskItem | null = null;
  private largestFiles: LargeFile[] = [];
  private diskHealth: DiskHealth[] = [];
  private isAnalyzing: boolean = false;

  constructor() {
    super('drishti-panel', 60);
  }

  protected async loadData(): Promise<void> {
    try {
      const [largestFiles, diskHealth] = await Promise.all([
        window.electron.getLargestFiles(),
        window.electron.getDiskHealth()
      ]);

      this.largestFiles = largestFiles;
      this.diskHealth = diskHealth;

      this.updateUI();
    } catch (error) {
      this.handleError(error);
    }
  }

  protected render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="drishti-content">
        <!-- Header Section -->
        <div class="panel-header">
          <div class="header-info">
            <h1 class="panel-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </span>
              Drishti
            </h1>
            <p class="panel-subtitle">System Analyzer - Storage insights and system health</p>
          </div>
        </div>

        <!-- Main Analysis Grid -->
        <div class="analysis-grid">
          <!-- Disk Visualization Card -->
          <div class="glass-card analysis-card disk-viz-card">
            <div class="card-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                  <path d="M12 12l6.5-6.5"/>
                </svg>
                Disk Usage Visualization
              </h2>
              <button class="btn-secondary" id="analyze-disk-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                Analyze
              </button>
            </div>
            <div class="card-body">
              <div class="disk-viz-container" id="disk-viz-container">
                <div class="disk-viz-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="placeholder-icon">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                    <path d="M12 12l6.5-6.5"/>
                  </svg>
                  <p>Click "Analyze" to scan disk usage</p>
                </div>
              </div>
              <div class="disk-legend" id="disk-legend" style="display: none;"></div>
            </div>
          </div>

          <!-- S.M.A.R.T Health Card -->
          <div class="glass-card analysis-card health-card">
            <div class="card-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Drive Health (S.M.A.R.T)
              </h2>
            </div>
            <div class="card-body">
              <div class="health-list" id="health-list">
                <div class="loading-state">
                  <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>Loading drive health...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Largest Files Section -->
        <div class="largest-files-section">
          <div class="section-header">
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Largest Files
            </h2>
            <button class="btn-secondary" id="refresh-files-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/>
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>
              </svg>
              Refresh
            </button>
          </div>
          <div class="glass-card files-card">
            <div class="files-list" id="files-list">
              <div class="loading-state">
                <span>Loading largest files...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- System Report Section -->
        <div class="report-section">
          <div class="glass-card report-card">
            <div class="report-info">
              <div class="report-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div class="report-text">
                <h3>System Information Report</h3>
                <p>Generate a comprehensive report of your system's hardware and software configuration for IT support or personal records.</p>
              </div>
            </div>
            <button class="btn-primary btn-glow" id="generate-report-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Generate Full Report</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private updateUI(): void {
    this.updateDiskHealth();
    this.updateLargestFiles();
  }

  private updateDiskHealth(): void {
    const container = this.getElement('#health-list');
    if (!container) return;

    if (this.diskHealth.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>No drive health information available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.diskHealth.map(disk => {
      const healthClass = this.getHealthClass(disk.smartStatus);
      const healthIcon = this.getHealthIcon(disk.smartStatus);
      
      return `
        <div class="health-item ${healthClass}">
          <div class="health-icon">${healthIcon}</div>
          <div class="health-info">
            <div class="health-name">${disk.name || disk.vendor || 'Unknown Drive'}</div>
            <div class="health-details">
              <span class="health-type">${disk.type || 'Unknown Type'}</span>
              <span class="health-size">${this.formatBytes(disk.size)}</span>
              ${disk.temperature ? `<span class="health-temp">🌡️ ${disk.temperature}°C</span>` : ''}
            </div>
          </div>
          <div class="health-status">
            <span class="status-badge ${healthClass}">${disk.smartStatus || 'Unknown'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private getHealthClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('ok') || s.includes('good') || s.includes('healthy')) {
      return 'health-good';
    } else if (s.includes('caution') || s.includes('warning')) {
      return 'health-warning';
    } else if (s.includes('bad') || s.includes('critical') || s.includes('fail')) {
      return 'health-critical';
    }
    return 'health-unknown';
  }

  private getHealthIcon(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('ok') || s.includes('good') || s.includes('healthy')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`;
    } else if (s.includes('caution') || s.includes('warning')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`;
    } else if (s.includes('bad') || s.includes('critical') || s.includes('fail')) {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`;
  }

  private updateLargestFiles(): void {
    const container = this.getElement('#files-list');
    if (!container) return;

    if (this.largestFiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No large files found (files > 50MB)</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="files-header">
        <span class="col-name">File Name</span>
        <span class="col-path">Path</span>
        <span class="col-size">Size</span>
        <span class="col-action">Action</span>
      </div>
      ${this.largestFiles.map((file, index) => `
        <div class="file-item" data-index="${index}">
          <div class="file-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-path" title="${file.path}">${this.truncatePath(file.path)}</div>
          <div class="file-size">${this.formatBytes(file.size)}</div>
          <button class="btn-icon open-file-btn" data-path="${file.path}" title="Open file location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
        </div>
      `).join('')}
    `;
  }

  private truncatePath(path: string): string {
    if (path.length <= 50) return path;
    const parts = path.split('\\');
    if (parts.length <= 3) return path;
    return `${parts[0]}\\...\\${parts.slice(-2).join('\\')}`;
  }

  private async analyzeDisk(): Promise<void> {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    const btn = this.getElement<HTMLButtonElement>('#analyze-disk-btn');
    const container = this.getElement('#disk-viz-container');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Analyzing...
      `;
    }

    if (container) {
      container.innerHTML = `
        <div class="analyzing-state">
          <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <p>Analyzing disk structure...</p>
          <p class="analyzing-note">This may take a moment</p>
        </div>
      `;
    }

    try {
      this.diskData = await window.electron.analyzeDisk('C:\\Users');
      
      if (this.diskData && container) {
        this.renderSunburstChart();
      }
    } catch (error) {
      Toast.error('Failed to analyze disk');
      this.handleError(error);
      if (container) {
        container.innerHTML = `
          <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <p>Failed to analyze disk</p>
          </div>
        `;
      }
    } finally {
      this.isAnalyzing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Analyze
        `;
      }
    }
  }

  private renderSunburstChart(): void {
    const container = this.getElement('#disk-viz-container');
    const legend = this.getElement('#disk-legend');
    
    if (!container || !this.diskData) return;

    // Generate colors for visualization
    const colors = [
      '#5a7fa8', '#7c9fc2', '#48bb78', '#4299e1',
      '#ed8936', '#9f7aea', '#f56565', '#38b2ac'
    ];

    // Build sunburst data
    const items = this.diskData.children || [];
    const total = items.reduce((acc, item) => acc + item.size, 0);

    // Create SVG sunburst
    let svgContent = '';
    let legendContent = '';
    let startAngle = 0;

    items.slice(0, 8).forEach((item, index) => {
      const percent = (item.size / total) * 100;
      const angle = (percent / 100) * 360;
      const endAngle = startAngle + angle;
      
      const color = colors[index % colors.length];
      
      // Create arc path
      const path = this.createArcPath(150, 150, 60, 120, startAngle, endAngle);
      svgContent += `
        <path 
          d="${path}" 
          fill="${color}" 
          class="sunburst-segment"
          data-name="${item.name}"
          data-size="${this.formatBytes(item.size)}"
        >
          <title>${item.name}: ${this.formatBytes(item.size)} (${percent.toFixed(1)}%)</title>
        </path>
      `;

      legendContent += `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${color}"></span>
          <span class="legend-name">${item.name}</span>
          <span class="legend-size">${this.formatBytes(item.size)}</span>
        </div>
      `;

      startAngle = endAngle;
    });

    container.innerHTML = `
      <svg viewBox="0 0 300 300" class="sunburst-chart">
        <circle cx="150" cy="150" r="55" fill="rgba(255,255,255,0.8)"/>
        ${svgContent}
        <circle cx="150" cy="150" r="50" fill="rgba(255,255,255,0.9)"/>
        <text x="150" y="145" text-anchor="middle" class="sunburst-center-text">Total</text>
        <text x="150" y="165" text-anchor="middle" class="sunburst-center-value">${this.formatBytes(total)}</text>
      </svg>
    `;

    if (legend) {
      legend.style.display = 'flex';
      legend.innerHTML = legendContent;
    }
  }

  private createArcPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number): string {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const x3 = cx + innerR * Math.cos(endRad);
    const y3 = cy + innerR * Math.sin(endRad);
    const x4 = cx + innerR * Math.cos(startRad);
    const y4 = cy + innerR * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  }

  protected attachEventHandlers(): void {
    // Analyze disk button
    const analyzeBtn = this.getElement('#analyze-disk-btn');
    analyzeBtn?.addEventListener('click', () => this.analyzeDisk());

    // Refresh files button
    const refreshBtn = this.getElement('#refresh-files-btn');
    refreshBtn?.addEventListener('click', () => this.loadData());

    // Generate report button
    const reportBtn = this.getElement('#generate-report-btn');
    reportBtn?.addEventListener('click', () => this.generateReport());

    // Open file buttons
    this.container?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const openBtn = target.closest('.open-file-btn') as HTMLElement;
      if (openBtn) {
        const path = openBtn.dataset.path;
        if (path) {
          // Open the folder containing the file
          const folderPath = path.substring(0, path.lastIndexOf('\\'));
          await window.electron.openPath(folderPath);
        }
      }
    });
  }

  private async generateReport(): Promise<void> {
    const btn = this.getElement<HTMLButtonElement>('#generate-report-btn');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>Generating...</span>
      `;
    }

    try {
      const result = await window.electron.generateSystemReport();
      
      if (result.success) {
        Toast.success(`Report saved to ${result.path}`);
        
        // Ask to open the report
        if (result.path) {
          const openReport = confirm('Report saved! Would you like to open it?');
          if (openReport) {
            await window.electron.openPath(result.path);
          }
        }
      } else {
        Toast.error('Failed to generate report');
      }
    } catch (error) {
      Toast.error('Error generating report');
      this.handleError(error);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Generate Full Report</span>
        `;
      }
    }
  }
}
