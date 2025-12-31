import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Trash2, HardDrive, Globe, FileBox, Download, 
  Chrome, Compass, Flame, Monitor, FileText, Clock, FolderOpen,
  Database, Eye, AlertTriangle, CheckCircle, File
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { useToast } from '../../components/ui/toast';
import { Tooltip } from '../../components/ui/tooltip';
import { ProgressBar } from '../../components/ui/progress-bar';
import { SkeletonList, SkeletonCard } from '../../components/ui/skeleton';
import './Clean.css';

const { ipcRenderer } = window.require('electron');

interface CleanupItem {
  id: string;
  name: string;
  icon: string;
  size: number;
  sizeFormatted: string;
  paths: string[];
  description: string;
  checked: boolean;
  type: 'browser' | 'system';
  special?: string;
}

interface RegistryIssue {
  id: string;
  category: string;
  description: string;
  name: string;
  path: string;
  registryPath: string;
  checked: boolean;
}

interface PreviewFile {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  isDirectory: boolean;
}

interface PreviewItem {
  id: string;
  name: string;
  totalFiles: number;
  files: PreviewFile[];
  sizeFormatted: string;
}

interface ScanResult {
  browsers: CleanupItem[];
  systemFiles: CleanupItem[];
  stats: {
    system: string;
    browser: string;
    temp: string;
    downloads: string;
    total: string;
  };
  scanTime: string;
}

const getIcon = (iconType: string, className: string) => {
  const size = 20;
  switch (iconType) {
    case 'chrome': return <Chrome size={size} className={className} />;
    case 'edge': return <Compass size={size} className={className} />;
    case 'firefox': return <Globe size={size} className={className} />;
    case 'brave': return <Flame size={size} className={className} />;
    case 'opera': return <Globe size={size} className={className} />;
    case 'vivaldi': return <Globe size={size} className={className} />;
    case 'system': return <HardDrive size={size} className={className} />;
    case 'temp': return <FileBox size={size} className={className} />;
    case 'downloads': return <Download size={size} className={className} />;
    case 'trash': return <Trash2 size={size} className={className} />;
    case 'recent': return <Clock size={size} className={className} />;
    case 'logs': return <FileText size={size} className={className} />;
    default: return <FolderOpen size={size} className={className} />;
  }
};

const Clean: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'files' | 'registry'>('files');
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [browsers, setBrowsers] = useState<CleanupItem[]>([]);
  const [systemFiles, setSystemFiles] = useState<CleanupItem[]>([]);
  const [stats, setStats] = useState({ system: '0 B', browser: '0 B', temp: '0 B', downloads: '0 B' });
  
  // Registry state
  const [registryIssues, setRegistryIssues] = useState<RegistryIssue[]>([]);
  const [scanningRegistry, setScanningRegistry] = useState(false);
  const [cleaningRegistry, setCleaningRegistry] = useState(false);
  
  // Preview dialog state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Confirmation dialog state
  const [confirmClean, setConfirmClean] = useState(false);
  const [confirmRegistry, setConfirmRegistry] = useState(false);
  const [singleItemClean, setSingleItemClean] = useState<CleanupItem | null>(null);
  
  const { addToast } = useToast();

  // Handle escape key for preview dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPreview) {
        setShowPreview(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showPreview]);


  const scanSystem = async () => {
    setScanning(true);
    try {
      const result = await ipcRenderer.invoke('scan-system');
      if (result.success) {
        const data: ScanResult = result.data;
        setBrowsers(data.browsers);
        setSystemFiles(data.systemFiles);
        setStats(data.stats);
        setLastScan(data.scanTime);
        addToast({
          type: 'success',
          title: 'Scan Complete',
          message: `Found ${data.browsers.length + data.systemFiles.length} cleanable items`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Scan Failed',
          message: result.error || 'Could not scan system'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to scan system'
      });
    }
    setScanning(false);
  };

  const scanRegistryIssues = async () => {
    setScanningRegistry(true);
    try {
      const result = await ipcRenderer.invoke('scan-registry');
      if (result.success) {
        setRegistryIssues(result.data);
        addToast({
          type: 'success',
          title: 'Registry Scan Complete',
          message: `Found ${result.data.length} registry issues`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Registry Scan Failed',
          message: result.error || 'Could not scan registry'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to scan registry'
      });
    }
    setScanningRegistry(false);
  };

  useEffect(() => {
    scanSystem();
  }, []);

  const toggleItem = (id: string, type: 'browser' | 'system') => {
    if (type === 'browser') {
      setBrowsers(browsers.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      ));
    } else {
      setSystemFiles(systemFiles.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      ));
    }
  };

  const toggleRegistryIssue = (id: string) => {
    setRegistryIssues(registryIssues.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const getSelectedItems = () => {
    return [
      ...browsers.filter(b => b.checked),
      ...systemFiles.filter(s => s.checked)
    ];
  };

  const getSelectedSize = () => {
    const selectedBrowsers = browsers.filter(b => b.checked).reduce((sum, b) => sum + b.size, 0);
    const selectedSystem = systemFiles.filter(s => s.checked).reduce((sum, s) => sum + s.size, 0);
    const total = selectedBrowsers + selectedSystem;
    
    if (total === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(total) / Math.log(k));
    return parseFloat((total / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const showCleanupPreview = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;

    setLoadingPreview(true);
    setShowPreview(true);
    
    try {
      const result = await ipcRenderer.invoke('get-cleanup-preview', selectedItems);
      if (result.success) {
        setPreviewData(result.data);
      } else {
        addToast({
          type: 'error',
          title: 'Preview Failed',
          message: result.error || 'Could not load preview'
        });
        setShowPreview(false);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load preview'
      });
      setShowPreview(false);
    }
    setLoadingPreview(false);
  };


  const cleanSelected = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) return;
    
    setShowPreview(false);
    setConfirmClean(false);
    setCleaning(true);
    setCleanProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setCleanProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const result = await ipcRenderer.invoke('clean-items', selectedItems);
      
      clearInterval(progressInterval);
      setCleanProgress(100);
      
      if (result?.success !== false) {
        addToast({
          type: 'success',
          title: 'Cleanup Complete',
          message: `Successfully cleaned ${selectedItems.length} items`,
          duration: 4000
        });
        await scanSystem();
      } else {
        addToast({
          type: 'error',
          title: 'Cleanup Failed',
          message: result.error || 'Some items could not be cleaned'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to clean items'
      });
    }
    
    setTimeout(() => {
      setCleaning(false);
      setCleanProgress(0);
    }, 500);
  };

  const cleanSingleItem = async () => {
    if (!singleItemClean) return;
    
    setSingleItemClean(null);
    setCleaning(true);
    setCleanProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setCleanProgress(prev => Math.min(prev + 15, 90));
      }, 150);
      
      const result = await ipcRenderer.invoke('clean-items', [singleItemClean]);
      
      clearInterval(progressInterval);
      setCleanProgress(100);
      
      if (result?.success !== false) {
        addToast({
          type: 'success',
          title: 'Item Cleaned',
          message: `${singleItemClean.name} has been cleaned`,
          duration: 3000
        });
        await scanSystem();
      } else {
        addToast({
          type: 'error',
          title: 'Cleanup Failed',
          message: result.error || 'Could not clean item'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to clean item'
      });
    }
    
    setTimeout(() => {
      setCleaning(false);
      setCleanProgress(0);
    }, 500);
  };

  const cleanSelectedRegistry = async () => {
    const selectedIssues = registryIssues.filter(i => i.checked);
    if (selectedIssues.length === 0) return;

    setConfirmRegistry(false);
    setCleaningRegistry(true);
    
    try {
      const result = await ipcRenderer.invoke('clean-registry', selectedIssues);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Registry Cleaned',
          message: `Fixed ${selectedIssues.length} registry issues`,
          duration: 4000
        });
        await scanRegistryIssues();
      } else {
        addToast({
          type: 'error',
          title: 'Registry Cleanup Failed',
          message: result.error || 'Some issues could not be fixed'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to clean registry'
      });
    }
    setCleaningRegistry(false);
  };


  const renderItem = (item: CleanupItem) => (
    <div key={item.id} className="cleanup-item">
      <div className="item-left">
        <Tooltip content={item.checked ? 'Deselect item' : 'Select item'}>
          <label className="checkbox-wrapper">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id, item.type)}
              aria-label={`Select ${item.name}`}
            />
            <span className="checkmark"></span>
          </label>
        </Tooltip>
        {getIcon(item.icon, `item-icon ${item.icon}`)}
        <div className="item-info">
          <span className="item-title">{item.name}</span>
          <span className="item-description">{item.description}</span>
        </div>
      </div>
      <div className="item-right">
        <span className="item-size">{item.sizeFormatted}</span>
        <Tooltip content={`Clean ${item.name}`}>
          <button 
            className="item-clean-btn" 
            onClick={() => setSingleItemClean(item)}
            disabled={cleaning}
            aria-label={`Clean ${item.name}`}
          >
            Clean
          </button>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className="clean-panel">
      <div className="clean-tabs">
        <Tooltip content="Clean temporary files and browser cache">
          <button
            className={`clean-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            aria-selected={activeTab === 'files'}
          >
            <Trash2 size={18} />
            File Cleanup
          </button>
        </Tooltip>
        <Tooltip content="Fix invalid registry entries">
          <button
            className={`clean-tab ${activeTab === 'registry' ? 'active' : ''}`}
            onClick={() => { setActiveTab('registry'); if (registryIssues.length === 0) scanRegistryIssues(); }}
            aria-selected={activeTab === 'registry'}
          >
            <Database size={18} />
            Registry Cleaner
          </button>
        </Tooltip>
      </div>

      {/* Progress indicator during cleaning */}
      {cleaning && (
        <div className="clean-progress">
          <ProgressBar 
            progress={cleanProgress} 
            label="Cleaning in progress..." 
            variant="primary"
            animated
          />
        </div>
      )}

      {activeTab === 'files' && (
        <>
          <div className="clean-header">
            <Tooltip content="Scan for cleanable files">
              <button className="scan-btn" onClick={scanSystem} disabled={scanning || cleaning} aria-label="Scan system">
                <RefreshCw size={16} className={scanning ? 'spinning' : ''} />
                {scanning ? 'Scanning...' : 'Scan System'}
              </button>
            </Tooltip>
            <div className="header-actions">
              <Tooltip content="Preview files before deletion">
                <button 
                  className="preview-btn" 
                  onClick={showCleanupPreview}
                  disabled={cleaning || scanning || getSelectedItems().length === 0}
                  aria-label="Preview cleanup"
                >
                  <Eye size={16} />
                  Preview
                </button>
              </Tooltip>
              <Tooltip content="Delete selected items">
                <button 
                  className="clean-btn-primary" 
                  onClick={() => setConfirmClean(true)}
                  disabled={cleaning || scanning || getSelectedItems().length === 0}
                  aria-label="Clean selected items"
                >
                  <Trash2 size={16} />
                  {cleaning ? 'Cleaning...' : `Clean Selected (${getSelectedSize()})`}
                </button>
              </Tooltip>
            </div>
          </div>

          {lastScan && (
            <div className="last-scan-bar">
              Last scan: {lastScan}
            </div>
          )}

          {scanning ? (
            <>
              <div className="stats-grid">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="stat-card">
                    <SkeletonCard lines={1} />
                  </div>
                ))}
              </div>
              <SkeletonList items={5} />
            </>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <HardDrive size={24} className="stat-icon system" />
                  <div className="stat-info">
                    <span className="stat-label">System Files</span>
                    <span className="stat-value">{stats.system}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <Globe size={24} className="stat-icon browser" />
                  <div className="stat-info">
                    <span className="stat-label">Browser Files</span>
                    <span className="stat-value">{stats.browser}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <FileBox size={24} className="stat-icon temp" />
                  <div className="stat-info">
                    <span className="stat-label">Temp Files</span>
                    <span className="stat-value">{stats.temp}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <Download size={24} className="stat-icon downloads" />
                  <div className="stat-info">
                    <span className="stat-label">Downloads Files</span>
                    <span className="stat-value">{stats.downloads}</span>
                  </div>
                </div>
              </div>

              {browsers.length > 0 && (
                <div className="cleanup-section">
                  <div className="cleanup-header">
                    <Globe size={18} />
                    <span>Browser Cache ({browsers.length} browsers detected)</span>
                  </div>
                  <div className="cleanup-list">
                    {browsers.map(renderItem)}
                  </div>
                </div>
              )}

              {systemFiles.length > 0 && (
                <div className="cleanup-section">
                  <div className="cleanup-header">
                    <Trash2 size={18} />
                    <span>System Cleanup Items</span>
                  </div>
                  <div className="cleanup-list">
                    {systemFiles.map(renderItem)}
                  </div>
                </div>
              )}

              {browsers.length === 0 && systemFiles.length === 0 && (
                <div className="empty-state">
                  <Monitor size={48} />
                  <p>Click "Scan System" to detect cleanable files</p>
                </div>
              )}
            </>
          )}
        </>
      )}


      {activeTab === 'registry' && (
        <>
          <div className="clean-header">
            <Tooltip content="Scan registry for issues">
              <button className="scan-btn" onClick={scanRegistryIssues} disabled={scanningRegistry || cleaningRegistry} aria-label="Scan registry">
                <RefreshCw size={16} className={scanningRegistry ? 'spinning' : ''} />
                {scanningRegistry ? 'Scanning...' : 'Scan Registry'}
              </button>
            </Tooltip>
            <Tooltip content="Fix selected registry issues">
              <button 
                className="clean-btn-primary" 
                onClick={() => setConfirmRegistry(true)}
                disabled={cleaningRegistry || scanningRegistry || registryIssues.filter(i => i.checked).length === 0}
                aria-label="Clean registry"
              >
                <Trash2 size={16} />
                {cleaningRegistry ? 'Cleaning...' : `Clean Selected (${registryIssues.filter(i => i.checked).length})`}
              </button>
            </Tooltip>
          </div>

          <div className="registry-warning">
            <AlertTriangle size={18} />
            <span>Registry cleaning is safe but a backup will be created before any changes.</span>
          </div>

          {scanningRegistry ? (
            <SkeletonList items={6} />
          ) : registryIssues.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <p>No registry issues found. Your registry is clean!</p>
            </div>
          ) : (
            <div className="cleanup-section">
              <div className="cleanup-header">
                <Database size={18} />
                <span>Registry Issues ({registryIssues.length} found)</span>
              </div>
              <div className="cleanup-list">
                {registryIssues.map((issue) => (
                  <div key={issue.id} className="cleanup-item">
                    <div className="item-left">
                      <Tooltip content={issue.checked ? 'Deselect issue' : 'Select issue'}>
                        <label className="checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={issue.checked}
                            onChange={() => toggleRegistryIssue(issue.id)}
                            aria-label={`Select ${issue.name}`}
                          />
                          <span className="checkmark"></span>
                        </label>
                      </Tooltip>
                      <Database size={20} className="item-icon registry" />
                      <div className="item-info">
                        <span className="item-title">{issue.name}</span>
                        <span className="item-description">{issue.category} - {issue.description}</span>
                        <span className="item-path">{issue.path}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview Dialog */}
      {showPreview && (
        <div className="preview-dialog-overlay">
          <div className="preview-dialog-backdrop" onClick={() => setShowPreview(false)} />
          <div className="preview-dialog-container">
            <button 
              className="preview-dialog-close" 
              onClick={() => setShowPreview(false)}
              aria-label="Close preview"
            >
              ✕
            </button>
            <div className="preview-dialog-header">
              <h2>Pre-Clean Preview</h2>
            </div>
            <div className="preview-dialog-content">
              {loadingPreview ? (
                <div className="loading-state">
                  <RefreshCw size={32} className="spinning" />
                  <p>Loading preview...</p>
                </div>
              ) : (
                <div className="preview-content">
                  <div className="preview-summary">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span>The following files will be permanently deleted:</span>
                  </div>
                  {previewData.map((item) => (
                    <div key={item.id} className="preview-category">
                      <div className="preview-category-header">
                        <span className="preview-category-name">{item.name}</span>
                        <span className="preview-category-info">
                          {item.totalFiles} files • {item.sizeFormatted}
                        </span>
                      </div>
                      <div className="preview-files">
                        {item.files.slice(0, 20).map((file, idx) => (
                          <div key={idx} className="preview-file">
                            <File size={14} />
                            <span className="preview-file-name" title={file.path}>{file.name}</span>
                            <span className="preview-file-size">{file.sizeFormatted}</span>
                          </div>
                        ))}
                        {item.files.length > 20 && (
                          <div className="preview-more">
                            ...and {item.files.length - 20} more files
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="preview-dialog-footer">
              <span className="preview-dialog-hint">Press Esc or click outside to close</span>
              <button className="btn-secondary" onClick={() => setShowPreview(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={cleanSelected} disabled={loadingPreview}>
                <Trash2 size={16} />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmClean}
        onClose={() => setConfirmClean(false)}
        onConfirm={cleanSelected}
        title="Clean Selected Items?"
        message={`This will permanently delete ${getSelectedItems().length} items (${getSelectedSize()}). This action cannot be undone.`}
        confirmText="Clean Now"
        cancelText="Cancel"
        variant="warning"
      />

      <ConfirmDialog
        open={confirmRegistry}
        onClose={() => setConfirmRegistry(false)}
        onConfirm={cleanSelectedRegistry}
        title="Clean Registry?"
        message={`This will fix ${registryIssues.filter(i => i.checked).length} registry issues. A backup will be created before making changes.`}
        confirmText="Clean Registry"
        cancelText="Cancel"
        variant="warning"
      />

      <ConfirmDialog
        open={!!singleItemClean}
        onClose={() => setSingleItemClean(null)}
        onConfirm={cleanSingleItem}
        title={`Clean ${singleItemClean?.name}?`}
        message={`This will delete ${singleItemClean?.sizeFormatted} of ${singleItemClean?.description.toLowerCase()}. This action cannot be undone.`}
        confirmText="Clean"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default Clean;