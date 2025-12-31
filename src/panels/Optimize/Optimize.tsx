import React, { useState, useEffect, useRef } from 'react';
import {
  IconCpu,
  IconBattery,
  IconWifi,
  IconRefresh,
  IconBolt,
  IconLeaf,
  IconFlame,
  IconTrash,
  IconNetwork,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
  IconRocket
} from '@tabler/icons-react';
import { useToast } from '../../components/ui/toast';
import { Tooltip } from '../../components/ui/tooltip';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import './Optimize.css';

const { ipcRenderer } = window.require('electron');

interface RamUsage {
  total: number;
  used: number;
  free: number;
  available: number;
  usedPercent: string;
  totalFormatted: string;
  usedFormatted: string;
  availableFormatted: string;
}

interface MemoryProcess {
  pid: number;
  name: string;
  memoryFormatted: string;
  memoryPercent: string;
  cpu: string;
}

interface PowerPlan {
  guid: string;
  name: string;
  active: boolean;
}

interface BatteryStatus {
  hasBattery: boolean;
  isCharging: boolean;
  percent: number;
  acConnected: boolean;
  capacityPercent: string;
}

const Optimize: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ram' | 'battery' | 'network'>('ram');
  
  // RAM state
  const [ramUsage, setRamUsage] = useState<RamUsage | null>(null);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [topProcesses, setTopProcesses] = useState<MemoryProcess[]>([]);
  const [optimizingRam, setOptimizingRam] = useState(false);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  
  // Battery state
  const [powerPlans, setPowerPlans] = useState<PowerPlan[]>([]);
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [bgProcesses, setBgProcesses] = useState<any[]>([]);
  const [throttling, setThrottling] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  
  // Network state
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [networkAction, setNetworkAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [optimizingNetwork, setOptimizingNetwork] = useState(false);
  
  // Confirmation dialogs
  const [confirmNetworkReset, setConfirmNetworkReset] = useState<string | null>(null);

  const ramIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();

  // RAM monitoring
  const fetchRamUsage = async () => {
    try {
      const result = await ipcRenderer.invoke('get-ram-usage');
      if (result.success) {
        setRamUsage(result.data);
        setRamHistory(prev => {
          const newHistory = [...prev, parseFloat(result.data.usedPercent)];
          return newHistory.slice(-30);
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch RAM usage:', error);
    }
  };

  const fetchTopProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const result = await ipcRenderer.invoke('get-top-memory-processes', 8);
      if (result.success) {
        setTopProcesses(result.data);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load process list'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load processes'
      });
    }
    setLoadingProcesses(false);
  };

  const handleOptimizeRam = async () => {
    setOptimizingRam(true);
    try {
      const result = await ipcRenderer.invoke('optimize-ram');
      if (result?.success !== false) {
        addToast({
          type: 'success',
          title: 'RAM Optimized',
          message: 'Memory has been freed up successfully',
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Optimization Failed',
          message: result.error || 'Could not optimize RAM'
        });
      }
      await fetchRamUsage();
      await fetchTopProcesses();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to optimize RAM'
      });
    }
    setOptimizingRam(false);
  };

  // Battery functions
  const fetchPowerPlans = async () => {
    try {
      const result = await ipcRenderer.invoke('get-power-plans');
      if (result.success) {
        setPowerPlans(result.data.plans);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load power plans'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load power plans'
      });
    }
  };

  const fetchBatteryStatus = async () => {
    try {
      const result = await ipcRenderer.invoke('get-battery-status');
      if (result.success) {
        setBatteryStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch battery status:', error);
    }
  };

  const fetchBgProcesses = async () => {
    try {
      const result = await ipcRenderer.invoke('get-background-processes');
      if (result.success) {
        setBgProcesses(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch background processes:', error);
    }
  };

  const handleSetPowerPlan = async (planType: string) => {
    setChangingPlan(true);
    try {
      const result = await ipcRenderer.invoke('set-power-plan', planType);
      if (result?.success !== false) {
        addToast({
          type: 'success',
          title: 'Power Plan Changed',
          message: `Switched to ${planType.replace('-', ' ')} mode`,
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error || 'Could not change power plan'
        });
      }
      await fetchPowerPlans();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to change power plan'
      });
    }
    setChangingPlan(false);
  };

  const handleThrottleProcesses = async () => {
    setThrottling(true);
    try {
      const result = await ipcRenderer.invoke('throttle-background-processes');
      if (result?.success !== false) {
        addToast({
          type: 'success',
          title: 'Processes Throttled',
          message: 'Background processes have been throttled',
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed',
          message: result.error || 'Could not throttle processes'
        });
      }
      await fetchBgProcesses();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to throttle processes'
      });
    }
    setThrottling(false);
  };

  // Network functions
  const fetchNetworkStatus = async () => {
    try {
      const result = await ipcRenderer.invoke('get-network-status');
      if (result.success) {
        setNetworkStatus(result.data);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load network status'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to load network status'
      });
    }
  };

  const executeNetworkAction = async (action: string) => {
    setNetworkAction(action);
    setActionResult(null);
    setConfirmNetworkReset(null);
    
    let result;
    try {
      switch (action) {
        case 'flush-dns':
          result = await ipcRenderer.invoke('flush-dns');
          break;
        case 'reset-winsock':
          result = await ipcRenderer.invoke('reset-winsock');
          break;
        case 'reset-adapter':
          result = await ipcRenderer.invoke('reset-network-adapter');
          break;
        case 'reset-tcp':
          result = await ipcRenderer.invoke('reset-tcp-ip');
          break;
      }
      
      setActionResult(result);
      
      if (result?.success) {
        addToast({
          type: 'success',
          title: 'Network Action Complete',
          message: result.message || 'Operation completed successfully',
          duration: 4000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Action Failed',
          message: result?.error || 'Operation failed'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Network action failed'
      });
    }
    
    setNetworkAction(null);
    await fetchNetworkStatus();
  };

  const handleNetworkAction = (action: string) => {
    // Show confirmation for potentially disruptive actions
    if (['reset-winsock', 'reset-adapter', 'reset-tcp'].includes(action)) {
      setConfirmNetworkReset(action);
    } else {
      executeNetworkAction(action);
    }
  };

  const handleOptimizeNetwork = async () => {
    setOptimizingNetwork(true);
    setActionResult(null);
    
    try {
      const result = await ipcRenderer.invoke('optimize-network');
      
      if (result?.success) {
        setActionResult({
          success: true,
          message: result.message || 'Network optimized successfully'
        });
        addToast({
          type: 'success',
          title: 'Network Optimized',
          message: result.message || 'All network optimizations completed',
          duration: 4000
        });
      } else {
        setActionResult({
          success: false,
          message: result?.error || 'Optimization failed'
        });
        addToast({
          type: 'error',
          title: 'Optimization Failed',
          message: result?.error || 'Could not optimize network'
        });
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Network optimization failed'
      });
    }
    
    setOptimizingNetwork(false);
    await fetchNetworkStatus();
  };

  // Effects
  useEffect(() => {
    if (activeTab === 'ram') {
      fetchRamUsage();
      fetchTopProcesses();
      ramIntervalRef.current = setInterval(fetchRamUsage, 2000);
    } else if (activeTab === 'battery') {
      fetchPowerPlans();
      fetchBatteryStatus();
      fetchBgProcesses();
    } else if (activeTab === 'network') {
      fetchNetworkStatus();
    }

    return () => {
      if (ramIntervalRef.current) {
        clearInterval(ramIntervalRef.current);
      }
    };
  }, [activeTab]);

  const getPlanIcon = (planName: string) => {
    const lower = planName.toLowerCase();
    if (lower.includes('power saver') || lower.includes('saver')) return <IconLeaf size={20} />;
    if (lower.includes('high') || lower.includes('ultimate')) return <IconFlame size={20} />;
    return <IconBolt size={20} />;
  };

  const getPlanType = (planName: string) => {
    const lower = planName.toLowerCase();
    if (lower.includes('power saver') || lower.includes('saver')) return 'power-saver';
    if (lower.includes('high') || lower.includes('ultimate')) return 'high-performance';
    return 'balanced';
  };

  return (
    <div className="optimize-panel">
      <div className="optimize-header">
        <h1 className="optimize-title">System Optimization</h1>
        <p className="optimize-subtitle">Optimize performance, save battery, and optimize network</p>
      </div>

      <div className="optimize-tabs">
        <Tooltip content="Monitor and optimize RAM usage">
          <button
            className={`optimize-tab ${activeTab === 'ram' ? 'active' : ''}`}
            onClick={() => setActiveTab('ram')}
            aria-selected={activeTab === 'ram'}
          >
            <IconCpu size={18} />
            RAM Optimizer
          </button>
        </Tooltip>
        <Tooltip content="Manage power plans and battery">
          <button
            className={`optimize-tab ${activeTab === 'battery' ? 'active' : ''}`}
            onClick={() => setActiveTab('battery')}
            aria-selected={activeTab === 'battery'}
          >
            <IconBattery size={18} />
            Battery Saver
          </button>
        </Tooltip>
        <Tooltip content="Network optimization tools">
          <button
            className={`optimize-tab ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
            aria-selected={activeTab === 'network'}
          >
            <IconWifi size={18} />
            Network
          </button>
        </Tooltip>
      </div>

      {/* RAM Optimizer Tab */}
      {activeTab === 'ram' && (
        <div className="tab-content">
          <div className="ram-overview">
            <div className="ram-stats">
              <div className="ram-circle">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="ram-circle-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="ram-circle-fill"
                    strokeDasharray={`${(parseFloat(ramUsage?.usedPercent || '0') / 100) * 283} 283`}
                  />
                </svg>
                <div className="ram-circle-text">
                  <span className="ram-percent">{ramUsage?.usedPercent || 0}%</span>
                  <span className="ram-label">Used</span>
                </div>
              </div>
              <div className="ram-details">
                <div className="ram-detail-row">
                  <span>Total</span>
                  <span>{ramUsage?.totalFormatted || '0 B'}</span>
                </div>
                <div className="ram-detail-row">
                  <span>Used</span>
                  <span>{ramUsage?.usedFormatted || '0 B'}</span>
                </div>
                <div className="ram-detail-row">
                  <span>Available</span>
                  <span>{ramUsage?.availableFormatted || '0 B'}</span>
                </div>
              </div>
            </div>

            <div className="ram-graph">
              <div className="graph-header">
                <span>RAM Usage History</span>
                <Tooltip content="Free up memory by clearing caches">
                  <button className="optimize-btn" onClick={handleOptimizeRam} disabled={optimizingRam} aria-label="Optimize RAM">
                    {optimizingRam ? <IconLoader2 size={16} className="spinning" /> : <IconTrash size={16} />}
                    {optimizingRam ? 'Optimizing...' : 'Optimize RAM'}
                  </button>
                </Tooltip>
              </div>
              <div className="graph-container">
                <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ramGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {ramHistory.length > 1 && (
                    <>
                      <path
                        d={`M 0 ${100 - ramHistory[0]} ${ramHistory.map((v, i) => `L ${(i / (ramHistory.length - 1)) * 300} ${100 - v}`).join(' ')} L 300 100 L 0 100 Z`}
                        fill="url(#ramGradient)"
                      />
                      <path
                        d={`M 0 ${100 - ramHistory[0]} ${ramHistory.map((v, i) => `L ${(i / (ramHistory.length - 1)) * 300} ${100 - v}`).join(' ')}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>

          <div className="processes-section">
            <div className="section-header">
              <h3>Top Memory Consumers</h3>
              <Tooltip content="Refresh process list">
                <button className="refresh-btn" onClick={fetchTopProcesses} aria-label="Refresh">
                  <IconRefresh size={16} className={loadingProcesses ? 'spinning' : ''} />
                </button>
              </Tooltip>
            </div>
            <div className="processes-list">
              {topProcesses.length === 0 ? (
                <div className="empty-state small">
                  <p>No processes found</p>
                </div>
              ) : (
                topProcesses.map((proc) => {
                  // Scale the bar relative to the highest memory process
                  const maxPercent = Math.max(...topProcesses.map(p => parseFloat(p.memoryPercent)));
                  const barWidth = maxPercent > 0 ? (parseFloat(proc.memoryPercent) / maxPercent) * 100 : 0;
                  
                  return (
                    <div key={proc.pid} className="process-item">
                      <div className="process-info">
                        <span className="process-name">{proc.name}</span>
                        <span className="process-pid">PID: {proc.pid}</span>
                      </div>
                      <div className="process-stats">
                        <span className="process-memory">{proc.memoryFormatted}</span>
                        <div className="process-bar">
                          <div 
                            className="process-bar-fill" 
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Battery Saver Tab */}
      {activeTab === 'battery' && (
        <div className="tab-content">
          {batteryStatus && (
            <div className="battery-status">
              <div className="battery-indicator">
                <div className="battery-icon">
                  <div className="battery-level" style={{ width: `${batteryStatus.percent}%` }} />
                </div>
                <span className="battery-percent">{batteryStatus.percent}%</span>
                {batteryStatus.isCharging && <IconBolt size={16} className="charging-icon" />}
              </div>
              <span className="battery-label">
                {batteryStatus.isCharging ? 'Charging' : batteryStatus.acConnected ? 'Plugged in' : 'On Battery'}
              </span>
            </div>
          )}

          <div className="power-plans-section">
            <h3>Power Plans</h3>
            <p className="section-desc">Select a power plan to optimize battery life or performance</p>
            <div className="power-plans">
              <Tooltip content="Maximum battery life - reduces performance to save power">
                <button
                  className={`power-plan-btn ${powerPlans.some(p => p.active && getPlanType(p.name) === 'power-saver') ? 'active' : ''}`}
                  onClick={() => handleSetPowerPlan('power-saver')}
                  disabled={changingPlan}
                >
                  <IconLeaf size={20} />
                  <span>Power Saver</span>
                  {powerPlans.some(p => p.active && getPlanType(p.name) === 'power-saver') && <IconCheck size={16} className="check-icon" />}
                </button>
              </Tooltip>
              <Tooltip content="Balance between performance and battery">
                <button
                  className={`power-plan-btn ${powerPlans.some(p => p.active && getPlanType(p.name) === 'balanced') ? 'active' : ''}`}
                  onClick={() => handleSetPowerPlan('balanced')}
                  disabled={changingPlan}
                >
                  <IconBolt size={20} />
                  <span>Balanced</span>
                  {powerPlans.some(p => p.active && getPlanType(p.name) === 'balanced') && <IconCheck size={16} className="check-icon" />}
                </button>
              </Tooltip>
              <Tooltip content="Maximum performance - uses more power">
                <button
                  className={`power-plan-btn ${powerPlans.some(p => p.active && getPlanType(p.name) === 'high-performance') ? 'active' : ''}`}
                  onClick={() => handleSetPowerPlan('high-performance')}
                  disabled={changingPlan}
                >
                  <IconFlame size={20} />
                  <span>High Performance</span>
                  {powerPlans.some(p => p.active && getPlanType(p.name) === 'high-performance') && <IconCheck size={16} className="check-icon" />}
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="throttle-section">
            <div className="section-header">
              <div>
                <h3>Background Process Throttling</h3>
                <p className="section-desc">Reduce priority of background apps to save energy</p>
              </div>
              <Tooltip content="Reduce priority of background apps">
                <button className="optimize-btn" onClick={handleThrottleProcesses} disabled={throttling} aria-label="Throttle processes">
                  {throttling ? <IconLoader2 size={16} className="spinning" /> : <IconLeaf size={16} />}
                  {throttling ? 'Throttling...' : 'Throttle All'}
                </button>
              </Tooltip>
            </div>
            <div className="bg-processes">
              {bgProcesses.length === 0 ? (
                <div className="empty-state small">
                  <p>No throttleable background processes found</p>
                </div>
              ) : (
                bgProcesses.map((proc) => (
                  <div key={proc.pid} className="bg-process-item">
                    <span className="process-name">{proc.name}</span>
                    <span className="process-cpu">CPU: {proc.cpu}%</span>
                    <span className="process-memory">{proc.memory}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Tab */}
      {activeTab === 'network' && (
        <div className="tab-content">
          {actionResult && (
            <div className={`action-result ${actionResult.success ? 'success' : 'error'}`}>
              {actionResult.success ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
              <span>{actionResult.message || (actionResult.success ? 'Operation completed' : 'Operation failed')}</span>
            </div>
          )}

          <div className="network-actions">
            <div className="network-actions-header">
              <h3>Network Optimization Tools</h3>
              <Tooltip content="Run all safe network optimizations">
                <button 
                  className="optimize-btn"
                  onClick={handleOptimizeNetwork}
                  disabled={optimizingNetwork || networkAction !== null}
                  aria-label="Optimize network"
                >
                  {optimizingNetwork ? <IconLoader2 size={16} className="spinning" /> : <IconRocket size={16} />}
                  {optimizingNetwork ? 'Optimizing...' : 'Optimize All'}
                </button>
              </Tooltip>
            </div>
            <div className="action-grid">
              <button 
                className="action-card"
                onClick={() => handleNetworkAction('flush-dns')}
                disabled={networkAction !== null}
              >
                <IconTrash size={24} />
                <span className="action-title">Flush DNS Cache</span>
                <span className="action-desc">Clear DNS resolver cache</span>
                {networkAction === 'flush-dns' && <IconLoader2 size={16} className="spinning action-loader" />}
              </button>

              <button 
                className="action-card"
                onClick={() => handleNetworkAction('reset-winsock')}
                disabled={networkAction !== null}
              >
                <IconNetwork size={24} />
                <span className="action-title">Reset Winsock</span>
                <span className="action-desc">Reset Windows Sockets API</span>
                {networkAction === 'reset-winsock' && <IconLoader2 size={16} className="spinning action-loader" />}
              </button>

              <button 
                className="action-card"
                onClick={() => handleNetworkAction('reset-adapter')}
                disabled={networkAction !== null}
              >
                <IconWifi size={24} />
                <span className="action-title">Reset Adapter</span>
                <span className="action-desc">Refresh network adapters</span>
                {networkAction === 'reset-adapter' && <IconLoader2 size={16} className="spinning action-loader" />}
              </button>

              <button 
                className="action-card"
                onClick={() => handleNetworkAction('reset-tcp')}
                disabled={networkAction !== null}
              >
                <IconRefresh size={24} />
                <span className="action-title">Reset TCP/IP</span>
                <span className="action-desc">Reset TCP/IP stack</span>
                {networkAction === 'reset-tcp' && <IconLoader2 size={16} className="spinning action-loader" />}
              </button>
            </div>
          </div>

          {networkStatus && networkStatus.interfaces.length > 0 && (
            <div className="network-info">
              <h3>Active Network Interfaces</h3>
              <div className="interfaces-list">
                {networkStatus.interfaces.map((iface: any, idx: number) => (
                  <div key={idx} className="interface-card">
                    <div className="interface-header">
                      <IconWifi size={18} />
                      <span>{iface.name}</span>
                      <span className="interface-type">{iface.type}</span>
                    </div>
                    <div className="interface-details">
                      <div className="detail-row">
                        <span>IP Address</span>
                        <span>{iface.ip4 || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span>MAC Address</span>
                        <span>{iface.mac}</span>
                      </div>
                      <div className="detail-row">
                        <span>Speed</span>
                        <span>{iface.speed ? `${iface.speed} Mbps` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Network Reset Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmNetworkReset}
        onClose={() => setConfirmNetworkReset(null)}
        onConfirm={() => confirmNetworkReset && executeNetworkAction(confirmNetworkReset)}
        title="Reset Network?"
        message="This action may temporarily disconnect your network. Make sure to save any work before proceeding. A system restart may be required for changes to take full effect."
        confirmText="Reset"
        cancelText="Cancel"
        variant="warning"
        loading={networkAction !== null}
      />
    </div>
  );
};

export default Optimize;
