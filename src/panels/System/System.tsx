import React, { useState, useEffect } from 'react';
import { 
  IconRocket, 
  IconFile, 
  IconFolder, 
  IconTrash, 
  IconRefresh,
  IconLoader2,
  IconInfoCircle,
  IconCpu,
  IconDeviceDesktop,
  IconShield,
  IconFileCode,
  IconFileDescription,
  IconFileText
} from '@tabler/icons-react';
import { Switch } from '../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { useToast } from '../../components/ui/toast';
import { Tooltip } from '../../components/ui/tooltip';
import { SkeletonTable, SkeletonList, SkeletonCard } from '../../components/ui/skeleton';
import './System.css';

const { ipcRenderer } = window.require('electron');

interface StartupApp {
  id: string;
  name: string;
  path: string;
  scope: string;
  enabled: boolean;
  registryKey?: string;
  registryHive?: any;
  isFile?: boolean;
}

interface LargeFile {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  modified: Date;
  extension: string;
}

interface SystemInfo {
  generatedAt: string;
  system: { manufacturer: string; model: string; serial: string };
  os: { distro: string; release: string; build: string; arch: string; hostname: string };
  cpu: { manufacturer: string; brand: string; speed: string; cores: number; physicalCores: number; socket: string };
  memory: { total: string; used: string; available: string; usagePercent: string; modules: any[] };
  graphics: { vendor: string; model: string; vram: string }[];
  storage: { name: string; size: string; type: string }[];
  security: {
    windowsDefender: { antivirusEnabled: boolean; realTimeProtection: boolean };
    firewall: { Domain: boolean; Private: boolean; Public: boolean };
  };
}

const System: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'startup' | 'files' | 'info'>('startup');
  const [startupApps, setStartupApps] = useState<StartupApp[]>([]);
  const [largeFiles, setLargeFiles] = useState<LargeFile[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loadingStartup, setLoadingStartup] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [togglingApp, setTogglingApp] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  
  // Confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; file: LargeFile | null }>({
    open: false,
    file: null
  });
  const [deleting, setDeleting] = useState(false);
  
  const { addToast } = useToast();

  const loadStartupApps = async () => {
    setLoadingStartup(true);
    try {
      const result = await ipcRenderer.invoke('get-startup-apps');
      if (result.success) {
        setStartupApps(result.data);
      } else {
        addToast({
          type: 'error',
          title: 'Failed to load startup apps',
          message: result.error || 'An unexpected error occurred'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load startup applications'
      });
    }
    setLoadingStartup(false);
  };


  const loadLargeFiles = async () => {
    setLoadingFiles(true);
    try {
      const result = await ipcRenderer.invoke('scan-largest-files', 20);
      if (result.success) {
        setLargeFiles(result.data);
        addToast({
          type: 'success',
          title: 'Scan Complete',
          message: `Found ${result.data.length} large files`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Scan Failed',
          message: result.error || 'Failed to scan for large files'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to scan for large files'
      });
    }
    setLoadingFiles(false);
  };

  const loadSystemInfo = async () => {
    setLoadingInfo(true);
    try {
      const result = await ipcRenderer.invoke('get-system-info');
      if (result.success) {
        setSystemInfo(result.data);
      } else {
        addToast({
          type: 'error',
          title: 'Failed to load system info',
          message: result.error || 'An unexpected error occurred'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to gather system information'
      });
    }
    setLoadingInfo(false);
  };

  useEffect(() => {
    if (activeTab === 'startup' && startupApps.length === 0) {
      loadStartupApps();
    } else if (activeTab === 'files' && largeFiles.length === 0) {
      loadLargeFiles();
    } else if (activeTab === 'info' && !systemInfo) {
      loadSystemInfo();
    }
  }, [activeTab]);

  const handleToggleStartup = async (app: StartupApp) => {
    setTogglingApp(app.id);
    try {
      const result = await ipcRenderer.invoke('toggle-startup-app', app, !app.enabled);
      if (result.success) {
        setStartupApps(apps => 
          apps.map(a => a.id === app.id ? { ...a, enabled: !a.enabled } : a)
        );
        addToast({
          type: 'success',
          title: 'Startup App Updated',
          message: `${app.name} will ${!app.enabled ? 'now' : 'no longer'} start with Windows`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to update',
          message: result.error || 'Could not update startup app'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to toggle startup app'
      });
    }
    setTogglingApp(null);
  };

  const handleOpenLocation = async (filePath: string) => {
    try {
      await ipcRenderer.invoke('open-file-location', filePath);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not open file location'
      });
    }
  };

  const confirmDeleteFile = (file: LargeFile) => {
    setDeleteConfirm({ open: true, file });
  };

  const handleDeleteFile = async () => {
    if (!deleteConfirm.file) return;
    
    setDeleting(true);
    try {
      const result = await ipcRenderer.invoke('delete-file', deleteConfirm.file.path);
      if (result.success) {
        setLargeFiles(files => files.filter(f => f.path !== deleteConfirm.file!.path));
        addToast({
          type: 'success',
          title: 'File Deleted',
          message: `${deleteConfirm.file.name} has been moved to trash`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Delete Failed',
          message: result.error || 'Could not delete the file'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete file'
      });
    }
    setDeleting(false);
    setDeleteConfirm({ open: false, file: null });
  };


  const handleExport = async (format: 'json' | 'text' | 'pdf') => {
    if (!systemInfo) return;
    setExporting(format);
    try {
      const channel = `export-system-info-${format}`;
      const result = await ipcRenderer.invoke(channel, systemInfo);
      if (result?.success !== false) {
        addToast({
          type: 'success',
          title: 'Export Complete',
          message: `System info exported as ${format.toUpperCase()}`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Export Failed',
          message: result.error || 'Could not export system info'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Export Error',
        message: error.message || 'Failed to export system information'
      });
    }
    setExporting(null);
  };

  const getFileIcon = (extension: string) => {
    const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
    
    if (videoExts.includes(extension)) return '🎬';
    if (imageExts.includes(extension)) return '🖼️';
    if (archiveExts.includes(extension)) return '📦';
    return '📄';
  };

  return (
    <div className="system-panel">
      <div className="system-header">
        <h1 className="system-title">System Management</h1>
        <p className="system-subtitle">Manage startup applications, find large files, and view system info</p>
      </div>

      <div className="system-tabs">
        <Tooltip content="Manage apps that start with Windows">
          <button
            className={`system-tab ${activeTab === 'startup' ? 'active' : ''}`}
            onClick={() => setActiveTab('startup')}
            aria-selected={activeTab === 'startup'}
          >
            <IconRocket size={18} />
            Startup Apps
          </button>
        </Tooltip>
        <Tooltip content="Find and manage large files">
          <button
            className={`system-tab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
            aria-selected={activeTab === 'files'}
          >
            <IconFile size={18} />
            Large Files
          </button>
        </Tooltip>
        <Tooltip content="View detailed system information">
          <button
            className={`system-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            aria-selected={activeTab === 'info'}
          >
            <IconInfoCircle size={18} />
            System Info
          </button>
        </Tooltip>
      </div>

      {activeTab === 'startup' && (
        <div className="system-section">
          <div className="section-header">
            <h2>Startup Applications</h2>
            <Tooltip content="Refresh startup apps list">
              <button className="refresh-btn" onClick={loadStartupApps} disabled={loadingStartup} aria-label="Refresh">
                <IconRefresh size={16} className={loadingStartup ? 'spinning' : ''} />
                Refresh
              </button>
            </Tooltip>
          </div>

          {loadingStartup ? (
            <SkeletonTable rows={6} cols={4} />
          ) : startupApps.length === 0 ? (
            <div className="empty-state">
              <IconRocket size={48} />
              <p>No startup applications found</p>
            </div>
          ) : (
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {startupApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.name}</TableCell>
                      <TableCell className="text-gray-500 text-xs max-w-xs truncate" title={app.path}>
                        {app.path}
                      </TableCell>
                      <TableCell>
                        <span className="scope-badge">{app.scope}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip content={app.enabled ? 'Disable startup' : 'Enable startup'}>
                          <Switch
                            checked={app.enabled}
                            onCheckedChange={() => handleToggleStartup(app)}
                            disabled={togglingApp === app.id}
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}


      {activeTab === 'files' && (
        <div className="system-section">
          <div className="section-header">
            <h2>20 Largest Files</h2>
            <Tooltip content="Scan for large files (>10MB)">
              <button className="refresh-btn" onClick={loadLargeFiles} disabled={loadingFiles} aria-label="Scan">
                <IconRefresh size={16} className={loadingFiles ? 'spinning' : ''} />
                Scan
              </button>
            </Tooltip>
          </div>

          {loadingFiles ? (
            <SkeletonTable rows={8} cols={3} />
          ) : largeFiles.length === 0 ? (
            <div className="empty-state">
              <IconFile size={48} />
              <p>No large files found (files &gt; 10MB)</p>
            </div>
          ) : (
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {largeFiles.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="file-info">
                          <span className="file-icon">{getFileIcon(file.extension)}</span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-path" title={file.path}>{file.path}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="file-size">{file.sizeFormatted}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="file-actions">
                          <Tooltip content="Open file location">
                            <button 
                              className="action-btn" 
                              onClick={() => handleOpenLocation(file.path)} 
                              aria-label="Open location"
                            >
                              <IconFolder size={16} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Move to trash">
                            <button 
                              className="action-btn delete" 
                              onClick={() => confirmDeleteFile(file)} 
                              aria-label="Delete file"
                            >
                              <IconTrash size={16} />
                            </button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'info' && (
        <div className="system-section">
          <div className="section-header">
            <h2>System Information</h2>
            <div className="export-buttons">
              <Tooltip content="Export as JSON file">
                <button className="export-btn" onClick={() => handleExport('json')} disabled={!systemInfo || exporting !== null} aria-label="Export JSON">
                  <IconFileCode size={16} />
                  {exporting === 'json' ? 'Exporting...' : 'JSON'}
                </button>
              </Tooltip>
              <Tooltip content="Export as text file">
                <button className="export-btn" onClick={() => handleExport('text')} disabled={!systemInfo || exporting !== null} aria-label="Export Text">
                  <IconFileText size={16} />
                  {exporting === 'text' ? 'Exporting...' : 'Text'}
                </button>
              </Tooltip>
              <Tooltip content="Export as PDF document">
                <button className="export-btn" onClick={() => handleExport('pdf')} disabled={!systemInfo || exporting !== null} aria-label="Export PDF">
                  <IconFileDescription size={16} />
                  {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                </button>
              </Tooltip>
              <Tooltip content="Refresh system info">
                <button className="refresh-btn" onClick={loadSystemInfo} disabled={loadingInfo} aria-label="Refresh">
                  <IconRefresh size={16} className={loadingInfo ? 'spinning' : ''} />
                </button>
              </Tooltip>
            </div>
          </div>

          {loadingInfo ? (
            <div className="info-grid">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={5} />)}
            </div>
          ) : !systemInfo ? (
            <div className="empty-state">
              <IconInfoCircle size={48} />
              <p>Click refresh to load system information</p>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-card">
                <div className="info-card-header">
                  <IconDeviceDesktop size={20} />
                  <h3>System</h3>
                </div>
                <div className="info-card-content">
                  <div className="info-row">
                    <span className="info-label">Manufacturer</span>
                    <span className="info-value">{systemInfo.system.manufacturer}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Model</span>
                    <span className="info-value">{systemInfo.system.model}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">OS</span>
                    <span className="info-value">{systemInfo.os.distro}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Version</span>
                    <span className="info-value">{systemInfo.os.release} (Build {systemInfo.os.build})</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Architecture</span>
                    <span className="info-value">{systemInfo.os.arch}</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <IconCpu size={20} />
                  <h3>Processor</h3>
                </div>
                <div className="info-card-content">
                  <div className="info-row">
                    <span className="info-label">CPU</span>
                    <span className="info-value">{systemInfo.cpu.manufacturer} {systemInfo.cpu.brand}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Speed</span>
                    <span className="info-value">{systemInfo.cpu.speed}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Cores</span>
                    <span className="info-value">{systemInfo.cpu.physicalCores} Physical / {systemInfo.cpu.cores} Logical</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Socket</span>
                    <span className="info-value">{systemInfo.cpu.socket}</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <IconFile size={20} />
                  <h3>Memory</h3>
                </div>
                <div className="info-card-content">
                  <div className="info-row">
                    <span className="info-label">Total</span>
                    <span className="info-value">{systemInfo.memory.total}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Used</span>
                    <span className="info-value">{systemInfo.memory.used}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Available</span>
                    <span className="info-value">{systemInfo.memory.available}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Usage</span>
                    <span className="info-value">{systemInfo.memory.usagePercent}</span>
                  </div>
                  {systemInfo.memory.modules.map((m, i) => (
                    <div className="info-row" key={i}>
                      <span className="info-label">Slot {i + 1}</span>
                      <span className="info-value">{m.size} {m.type} @ {m.clockSpeed}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <IconShield size={20} />
                  <h3>Security</h3>
                </div>
                <div className="info-card-content">
                  <div className="info-row">
                    <span className="info-label">Windows Defender</span>
                    <span className={`info-badge ${systemInfo.security.windowsDefender.antivirusEnabled ? 'success' : 'danger'}`}>
                      {systemInfo.security.windowsDefender.antivirusEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Real-time Protection</span>
                    <span className={`info-badge ${systemInfo.security.windowsDefender.realTimeProtection ? 'success' : 'danger'}`}>
                      {systemInfo.security.windowsDefender.realTimeProtection ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Domain Firewall</span>
                    <span className={`info-badge ${systemInfo.security.firewall.Domain ? 'success' : 'danger'}`}>
                      {systemInfo.security.firewall.Domain ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Private Firewall</span>
                    <span className={`info-badge ${systemInfo.security.firewall.Private ? 'success' : 'danger'}`}>
                      {systemInfo.security.firewall.Private ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Public Firewall</span>
                    <span className={`info-badge ${systemInfo.security.firewall.Public ? 'success' : 'danger'}`}>
                      {systemInfo.security.firewall.Public ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {systemInfo.graphics.length > 0 && (
                <div className="info-card">
                  <div className="info-card-header">
                    <IconDeviceDesktop size={20} />
                    <h3>Graphics</h3>
                  </div>
                  <div className="info-card-content">
                    {systemInfo.graphics.map((g, i) => (
                      <div className="info-row" key={i}>
                        <span className="info-label">GPU {i + 1}</span>
                        <span className="info-value">{g.vendor} {g.model} ({g.vram})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {systemInfo.storage.length > 0 && (
                <div className="info-card">
                  <div className="info-card-header">
                    <IconFile size={20} />
                    <h3>Storage</h3>
                  </div>
                  <div className="info-card-content">
                    {systemInfo.storage.map((d, i) => (
                      <div className="info-row" key={i}>
                        <span className="info-label">Drive {i + 1}</span>
                        <span className="info-value">{d.name} - {d.size} ({d.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, file: null })}
        onConfirm={handleDeleteFile}
        title="Delete File?"
        message={`Are you sure you want to delete "${deleteConfirm.file?.name}"? This will move the file to the Recycle Bin.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default System;