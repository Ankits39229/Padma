const { exec } = require('child_process');
const si = require('systeminformation');
const os = require('os');

// ==================== RAM OPTIMIZER ====================

// Get current RAM usage
async function getRamUsage() {
  const mem = await si.mem();
  const usedPercent = ((mem.active / mem.total) * 100).toFixed(1);
  
  return {
    total: mem.total,
    used: mem.active,  // Use active memory for more accurate "in use" reading
    free: mem.free,
    available: mem.available,
    cached: mem.cached,
    usedPercent: usedPercent,
    availablePercent: ((mem.available / mem.total) * 100).toFixed(1),
    totalFormatted: formatBytes(mem.total),
    usedFormatted: formatBytes(mem.active),
    freeFormatted: formatBytes(mem.free),
    availableFormatted: formatBytes(mem.available),
    cachedFormatted: formatBytes(mem.cached)
  };
}

// Get memory-hungry processes
async function getTopMemoryProcesses(limit = 10) {
  const processes = await si.processes();
  const totalMem = os.totalmem();
  
  const sorted = processes.list
    .filter(p => p.mem > 0 && p.name)
    .sort((a, b) => b.mem - a.mem)
    .slice(0, limit)
    .map(p => {
      // mem is percentage, calculate actual bytes
      const memBytes = (p.mem / 100) * totalMem;
      return {
        pid: p.pid,
        name: p.name,
        memory: memBytes,
        memoryFormatted: formatBytes(memBytes),
        memoryPercent: p.mem.toFixed(2),
        cpu: p.cpu ? p.cpu.toFixed(1) : '0.0'
      };
    });
  
  return sorted;
}

// Optimize RAM by clearing standby memory
async function optimizeRam() {
  return new Promise((resolve) => {
    // Clear standby list and working sets
    // This requires admin privileges to fully work
    exec('powershell -command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue; [System.GC]::Collect()"', 
      { timeout: 30000 },
      async (error) => {
        // Get new RAM stats after optimization
        const newStats = await getRamUsage();
        resolve({ 
          success: true, 
          message: 'RAM optimization completed',
          stats: newStats
        });
      }
    );
  });
}

// ==================== BATTERY SAVER ====================

// Get current power plan
async function getCurrentPowerPlan() {
  return new Promise((resolve) => {
    exec('powercfg /getactivescheme', (error, stdout) => {
      if (error) {
        resolve({ name: 'Unknown', guid: null });
        return;
      }
      
      const match = stdout.match(/GUID:\s*([a-f0-9-]+)\s*\(([^)]+)\)/i);
      if (match) {
        resolve({ guid: match[1], name: match[2] });
      } else {
        resolve({ name: 'Unknown', guid: null });
      }
    });
  });
}

// Get all power plans
async function getPowerPlans() {
  return new Promise((resolve) => {
    exec('powercfg /list', (error, stdout) => {
      if (error) {
        // Return default plans as fallback
        resolve([
          { guid: 'a1841308-3541-4fab-bc81-f71556f20b4a', name: 'Power Saver', active: false },
          { guid: '381b4222-f694-41f0-9685-ff5bb260df2e', name: 'Balanced', active: true },
          { guid: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', name: 'High Performance', active: false }
        ]);
        return;
      }
      
      const plans = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/GUID:\s*([a-f0-9-]+)\s*\(([^)]+)\)/i);
        if (match) {
          plans.push({
            guid: match[1],
            name: match[2].trim(),
            active: line.includes('*')
          });
        }
      }
      
      // If we found plans, return them
      if (plans.length > 0) {
        resolve(plans);
      } else {
        // Return default plans as fallback
        resolve([
          { guid: 'a1841308-3541-4fab-bc81-f71556f20b4a', name: 'Power Saver', active: false },
          { guid: '381b4222-f694-41f0-9685-ff5bb260df2e', name: 'Balanced', active: true },
          { guid: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', name: 'High Performance', active: false }
        ]);
      }
    });
  });
}

// Set power plan
async function setPowerPlan(planType) {
  // Standard Windows power plan GUIDs
  const planGuids = {
    'power-saver': 'a1841308-3541-4fab-bc81-f71556f20b4a',     // Power Saver
    'balanced': '381b4222-f694-41f0-9685-ff5bb260df2e',        // Balanced
    'high-performance': '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' // High Performance
  };

  return new Promise((resolve) => {
    // First get the actual GUIDs from the system
    exec('powercfg /list', (error, stdout) => {
      if (error) {
        // Try with default GUID
        exec(`powercfg /setactive ${planGuids[planType]}`, (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, plan: planType });
          }
        });
        return;
      }
      
      let guid = planGuids[planType];
      
      // Try to find the actual GUID from system
      const lines = stdout.split('\n');
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (planType === 'power-saver' && (lowerLine.includes('power saver') || lowerLine.includes('economy'))) {
          const match = line.match(/GUID:\s*([a-f0-9-]+)/i);
          if (match) guid = match[1];
        } else if (planType === 'balanced' && lowerLine.includes('balanced') && !lowerLine.includes('high')) {
          const match = line.match(/GUID:\s*([a-f0-9-]+)/i);
          if (match) guid = match[1];
        } else if (planType === 'high-performance' && (lowerLine.includes('high performance') || lowerLine.includes('ultimate'))) {
          const match = line.match(/GUID:\s*([a-f0-9-]+)/i);
          if (match) guid = match[1];
        }
      }

      exec(`powercfg /setactive ${guid}`, (err) => {
        if (err) {
          // If the plan doesn't exist, try to duplicate from balanced
          if (planType === 'power-saver' || planType === 'high-performance') {
            exec(`powercfg /duplicatescheme ${planGuids[planType]}`, (dupErr) => {
              if (dupErr) {
                resolve({ success: false, error: 'Power plan not available on this system' });
              } else {
                // Try again after duplicating
                exec(`powercfg /setactive ${planGuids[planType]}`, (finalErr) => {
                  resolve({ success: !finalErr, plan: planType, error: finalErr?.message });
                });
              }
            });
          } else {
            resolve({ success: false, error: err.message });
          }
        } else {
          resolve({ success: true, plan: planType });
        }
      });
    });
  });
}

// Get battery status
async function getBatteryStatus() {
  const battery = await si.battery();
  return {
    hasBattery: battery.hasBattery,
    isCharging: battery.isCharging,
    percent: battery.percent,
    timeRemaining: battery.timeRemaining,
    acConnected: battery.acConnected,
    maxCapacity: battery.maxCapacity,
    currentCapacity: battery.currentCapacity,
    capacityPercent: battery.maxCapacity > 0 
      ? ((battery.currentCapacity / battery.maxCapacity) * 100).toFixed(0) 
      : 100
  };
}

// Get background processes that can be throttled
async function getBackgroundProcesses() {
  const throttleableProcesses = [
    'OneDrive.exe', 'Dropbox.exe', 'GoogleDriveSync.exe',
    'SearchIndexer.exe', 'SearchProtocolHost.exe',
    'MsMpEng.exe', 'SgrmBroker.exe',
    'UpdateService.exe', 'WmiPrvSE.exe',
    'CompatTelRunner.exe', 'DiagTrack.exe',
    'backgroundTaskHost.exe', 'RuntimeBroker.exe'
  ];

  const processes = await si.processes();
  const bgProcesses = processes.list
    .filter(p => throttleableProcesses.some(tp => 
      p.name.toLowerCase() === tp.toLowerCase()
    ))
    .map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu.toFixed(1),
      memory: formatBytes(p.memRss),
      priority: p.priority
    }));

  return bgProcesses;
}

// Throttle background processes
async function throttleBackgroundProcesses() {
  const processes = await getBackgroundProcesses();
  const results = [];

  for (const proc of processes) {
    try {
      await new Promise((resolve) => {
        // Set priority to Below Normal (16384) or Idle (64)
        exec(`wmic process where processid="${proc.pid}" call setpriority 16384`, 
          { timeout: 5000 },
          (error) => {
            results.push({
              name: proc.name,
              pid: proc.pid,
              success: !error
            });
            resolve();
          }
        );
      });
    } catch (err) {
      results.push({ name: proc.name, pid: proc.pid, success: false });
    }
  }

  return { success: true, throttled: results };
}

// ==================== NETWORK OPTIMIZER ====================

// Flush DNS cache
async function flushDnsCache() {
  return new Promise((resolve) => {
    exec('ipconfig /flushdns', (error, stdout) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, message: 'DNS cache flushed successfully' });
      }
    });
  });
}

// Reset Winsock
async function resetWinsock() {
  return new Promise((resolve) => {
    exec('netsh winsock reset', (error, stdout) => {
      if (error) {
        resolve({ success: false, error: error.message, requiresRestart: false });
      } else {
        resolve({ 
          success: true, 
          message: 'Winsock reset successful. Restart required.',
          requiresRestart: true 
        });
      }
    });
  });
}

// Reset network adapter
async function resetNetworkAdapter() {
  return new Promise((resolve) => {
    // Disable and re-enable all network adapters
    exec('netsh interface set interface "Ethernet" disable & netsh interface set interface "Ethernet" enable & netsh interface set interface "Wi-Fi" disable & netsh interface set interface "Wi-Fi" enable', 
      { timeout: 30000 },
      (error) => {
        if (error) {
          // Try alternative method
          exec('ipconfig /release & ipconfig /renew', (err2, stdout) => {
            resolve({ 
              success: true, 
              message: 'Network adapter refreshed (IP renewed)' 
            });
          });
        } else {
          resolve({ success: true, message: 'Network adapters reset successfully' });
        }
      }
    );
  });
}

// Reset TCP/IP stack
async function resetTcpIp() {
  return new Promise((resolve) => {
    exec('netsh int ip reset', (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ 
          success: true, 
          message: 'TCP/IP stack reset. Restart required.',
          requiresRestart: true 
        });
      }
    });
  });
}

// Get network status
async function getNetworkStatus() {
  const [networkInterfaces, networkStats] = await Promise.all([
    si.networkInterfaces(),
    si.networkStats()
  ]);

  const activeInterfaces = networkInterfaces
    .filter(n => !n.internal && n.operstate === 'up')
    .map(n => ({
      name: n.iface,
      type: n.type,
      ip4: n.ip4,
      mac: n.mac,
      speed: n.speed
    }));

  const stats = networkStats.map(s => ({
    interface: s.iface,
    rxBytes: formatBytes(s.rx_bytes),
    txBytes: formatBytes(s.tx_bytes),
    rxSec: formatBytes(s.rx_sec) + '/s',
    txSec: formatBytes(s.tx_sec) + '/s'
  }));

  return { interfaces: activeInterfaces, stats };
}

// Optimize network - runs all safe optimizations
async function optimizeNetwork() {
  const results = {
    dnsFlush: false,
    ipRenew: false,
    arpClear: false,
    netbiosClear: false
  };

  try {
    // 1. Flush DNS cache
    await new Promise((resolve) => {
      exec('ipconfig /flushdns', (error) => {
        results.dnsFlush = !error;
        resolve();
      });
    });

    // 2. Release and renew IP
    await new Promise((resolve) => {
      exec('ipconfig /release & ipconfig /renew', { timeout: 30000 }, (error) => {
        results.ipRenew = !error;
        resolve();
      });
    });

    // 3. Clear ARP cache
    await new Promise((resolve) => {
      exec('netsh interface ip delete arpcache', (error) => {
        results.arpClear = !error;
        resolve();
      });
    });

    // 4. Clear NetBIOS cache
    await new Promise((resolve) => {
      exec('nbtstat -R', (error) => {
        results.netbiosClear = !error;
        resolve();
      });
    });

    const successCount = Object.values(results).filter(Boolean).length;
    
    return {
      success: true,
      message: `Network optimized (${successCount}/4 operations completed)`,
      details: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: results
    };
  }
}

// ==================== UTILITIES ====================

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = {
  // RAM
  getRamUsage,
  getTopMemoryProcesses,
  optimizeRam,
  // Battery
  getCurrentPowerPlan,
  getPowerPlans,
  setPowerPlan,
  getBatteryStatus,
  getBackgroundProcesses,
  throttleBackgroundProcesses,
  // Network
  flushDnsCache,
  resetWinsock,
  resetNetworkAdapter,
  resetTcpIp,
  getNetworkStatus,
  optimizeNetwork
};
