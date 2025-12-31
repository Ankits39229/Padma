const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const Registry = require('winreg');

const homeDir = os.homedir();

// Format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get startup applications from registry
async function getStartupApps() {
  const startupApps = [];
  
  const registryPaths = [
    { hive: Registry.HKCU, key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', scope: 'User' },
    { hive: Registry.HKLM, key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', scope: 'System' },
    { hive: Registry.HKCU, key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce', scope: 'User (Once)' },
  ];

  for (const regPath of registryPaths) {
    try {
      const apps = await new Promise((resolve) => {
        const regKey = new Registry({
          hive: regPath.hive,
          key: regPath.key
        });

        regKey.values((err, items) => {
          if (err || !items) {
            resolve([]);
            return;
          }

          const apps = items.map(item => ({
            id: `${regPath.scope}-${item.name}`.toLowerCase().replace(/\s+/g, '-'),
            name: item.name,
            path: item.value,
            scope: regPath.scope,
            enabled: true,
            registryKey: regPath.key,
            registryHive: regPath.hive
          }));

          resolve(apps);
        });
      });

      startupApps.push(...apps);
    } catch (err) {
      // Skip registry keys we can't access
    }
  }

  // Also check startup folder
  const startupFolder = path.join(homeDir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  
  try {
    if (fs.existsSync(startupFolder)) {
      const files = fs.readdirSync(startupFolder);
      for (const file of files) {
        const filePath = path.join(startupFolder, file);
        startupApps.push({
          id: `startup-folder-${file}`.toLowerCase().replace(/\s+/g, '-'),
          name: file.replace(/\.(lnk|exe)$/i, ''),
          path: filePath,
          scope: 'Startup Folder',
          enabled: true,
          isFile: true
        });
      }
    }
  } catch (err) {
    // Skip if can't access
  }

  return startupApps;
}

// Toggle startup app
async function toggleStartupApp(app, enabled) {
  return new Promise((resolve) => {
    if (app.isFile) {
      // Handle startup folder items
      const disabledFolder = path.join(homeDir, 'AppData', 'Local', 'StartupDisabled');
      
      try {
        if (!fs.existsSync(disabledFolder)) {
          fs.mkdirSync(disabledFolder, { recursive: true });
        }

        const fileName = path.basename(app.path);
        const disabledPath = path.join(disabledFolder, fileName);
        const startupFolder = path.join(homeDir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
        const enabledPath = path.join(startupFolder, fileName);

        if (enabled) {
          // Move back to startup folder
          if (fs.existsSync(disabledPath)) {
            fs.renameSync(disabledPath, enabledPath);
          }
        } else {
          // Move to disabled folder
          if (fs.existsSync(enabledPath)) {
            fs.renameSync(enabledPath, disabledPath);
          }
        }
        resolve({ success: true });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    } else {
      // Handle registry items
      const regKey = new Registry({
        hive: app.registryHive,
        key: app.registryKey
      });

      if (enabled) {
        // Re-enable by adding back to registry
        regKey.set(app.name, Registry.REG_SZ, app.path, (err) => {
          resolve({ success: !err, error: err?.message });
        });
      } else {
        // Disable by removing from registry (store value first)
        regKey.remove(app.name, (err) => {
          resolve({ success: !err, error: err?.message });
        });
      }
    }
  });
}

// Scan for largest files
async function scanLargestFiles(searchPaths = null, limit = 10) {
  const defaultPaths = [
    homeDir,
    path.join(homeDir, 'Downloads'),
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Videos'),
    path.join(homeDir, 'Pictures'),
  ];

  const pathsToScan = searchPaths || defaultPaths;
  const allFiles = [];
  const maxDepth = 4;

  function scanDirectory(dirPath, depth = 0) {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isFile()) {
            const stats = fs.statSync(fullPath);
            if (stats.size > 10 * 1024 * 1024) { // Only files > 10MB
              allFiles.push({
                name: entry.name,
                path: fullPath,
                size: stats.size,
                sizeFormatted: formatSize(stats.size),
                modified: stats.mtime,
                extension: path.extname(entry.name).toLowerCase()
              });
            }
          } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDirectory(fullPath, depth + 1);
          }
        } catch (err) {
          // Skip files we can't access
        }
      }
    } catch (err) {
      // Skip directories we can't access
    }
  }

  for (const scanPath of pathsToScan) {
    if (fs.existsSync(scanPath)) {
      scanDirectory(scanPath);
    }
  }

  // Sort by size and return top N
  allFiles.sort((a, b) => b.size - a.size);
  return allFiles.slice(0, limit);
}

// Open file location in explorer
function openFileLocation(filePath) {
  const dir = path.dirname(filePath);
  require('electron').shell.openPath(dir);
}

// Delete file
async function deleteFile(filePath) {
  try {
    await require('electron').shell.trashItem(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getStartupApps,
  toggleStartupApp,
  scanLargestFiles,
  openFileLocation,
  deleteFile,
  formatSize
};
