const Registry = require('winreg');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Safe registry keys to scan for invalid entries
const safeRegistryScans = [
  {
    name: 'Invalid File Extensions',
    hive: Registry.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts',
    type: 'fileext',
    description: 'File extension associations pointing to non-existent programs'
  },
  {
    name: 'Invalid MUI Cache',
    hive: Registry.HKCU,
    key: '\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache',
    type: 'muicache',
    description: 'Cached application names for deleted programs'
  },
  {
    name: 'Recent Documents',
    hive: Registry.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs',
    type: 'recentdocs',
    description: 'Recent document history entries'
  },
  {
    name: 'Invalid App Paths',
    hive: Registry.HKLM,
    key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths',
    type: 'apppath',
    description: 'Application paths pointing to non-existent executables'
  },
  {
    name: 'Invalid Uninstall Entries',
    hive: Registry.HKLM,
    key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    type: 'uninstall',
    description: 'Uninstall entries for programs that no longer exist'
  },
  {
    name: 'User Uninstall Entries',
    hive: Registry.HKCU,
    key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    type: 'uninstall',
    description: 'User-specific uninstall entries for removed programs'
  }
];

// Check if a file path exists
function pathExists(filePath) {
  if (!filePath) return true; // Don't flag empty paths
  
  // Clean up the path
  let cleanPath = filePath.replace(/"/g, '').trim();
  
  // Handle paths with arguments
  const spaceIndex = cleanPath.indexOf(' ');
  if (spaceIndex > 0 && !fs.existsSync(cleanPath)) {
    cleanPath = cleanPath.substring(0, spaceIndex);
  }
  
  // Expand environment variables
  cleanPath = cleanPath.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');
  
  try {
    return fs.existsSync(cleanPath);
  } catch {
    return true; // Assume exists if we can't check
  }
}

// Scan for invalid registry entries
async function scanRegistry() {
  const issues = [];
  
  for (const scan of safeRegistryScans) {
    try {
      const entries = await scanRegistryKey(scan);
      issues.push(...entries);
    } catch (err) {
      // Skip keys we can't access
    }
  }
  
  return issues;
}

async function scanRegistryKey(scan) {
  return new Promise((resolve) => {
    const issues = [];
    const regKey = new Registry({
      hive: scan.hive,
      key: scan.key
    });

    if (scan.type === 'apppath' || scan.type === 'uninstall') {
      // Scan subkeys
      regKey.keys((err, subkeys) => {
        if (err || !subkeys) {
          resolve([]);
          return;
        }

        let pending = subkeys.length;
        if (pending === 0) {
          resolve([]);
          return;
        }

        subkeys.forEach((subkey) => {
          subkey.values((err, items) => {
            if (!err && items) {
              let exePath = null;
              let displayName = subkey.key.split('\\').pop();

              items.forEach((item) => {
                if (item.name === '' || item.name === '(Default)' || item.name === 'InstallLocation' || item.name === 'UninstallString') {
                  if (item.value && item.value.length > 0) {
                    exePath = item.value;
                  }
                }
                if (item.name === 'DisplayName') {
                  displayName = item.value;
                }
              });

              if (exePath && !pathExists(exePath)) {
                issues.push({
                  id: `${scan.type}-${subkey.key}`,
                  category: scan.name,
                  description: scan.description,
                  name: displayName,
                  path: exePath,
                  registryPath: subkey.path,
                  hive: scan.hive,
                  key: subkey.key,
                  type: 'subkey',
                  checked: true
                });
              }
            }

            pending--;
            if (pending === 0) {
              resolve(issues);
            }
          });
        });
      });
    } else if (scan.type === 'muicache') {
      // Scan values directly
      regKey.values((err, items) => {
        if (err || !items) {
          resolve([]);
          return;
        }

        items.forEach((item) => {
          if (item.name && item.name.includes('\\') && !pathExists(item.name.split('.')[0])) {
            issues.push({
              id: `${scan.type}-${item.name}`,
              category: scan.name,
              description: scan.description,
              name: item.name.split('\\').pop(),
              path: item.name,
              registryPath: regKey.path,
              hive: scan.hive,
              key: scan.key,
              valueName: item.name,
              type: 'value',
              checked: true
            });
          }
        });

        resolve(issues);
      });
    } else {
      // For other types, just count entries (safe to clear)
      regKey.keys((err, subkeys) => {
        if (err || !subkeys || subkeys.length === 0) {
          resolve([]);
          return;
        }

        if (scan.type === 'recentdocs') {
          issues.push({
            id: `${scan.type}-all`,
            category: scan.name,
            description: scan.description,
            name: `${subkeys.length} recent document entries`,
            path: 'Recent document history',
            registryPath: regKey.path,
            hive: scan.hive,
            key: scan.key,
            type: 'clear-subkeys',
            subkeyCount: subkeys.length,
            checked: false // Don't auto-check recent docs
          });
        }

        resolve(issues);
      });
    }
  });
}

// Clean selected registry issues
async function cleanRegistryIssues(issues) {
  const results = [];
  
  // Create backup first
  const backupPath = await createRegistryBackup(issues);
  
  for (const issue of issues) {
    try {
      if (issue.type === 'subkey') {
        await deleteRegistrySubkey(issue);
        results.push({ id: issue.id, success: true });
      } else if (issue.type === 'value') {
        await deleteRegistryValue(issue);
        results.push({ id: issue.id, success: true });
      } else if (issue.type === 'clear-subkeys') {
        await clearRegistrySubkeys(issue);
        results.push({ id: issue.id, success: true });
      }
    } catch (err) {
      results.push({ id: issue.id, success: false, error: err.message });
    }
  }
  
  return { results, backupPath };
}

function deleteRegistrySubkey(issue) {
  return new Promise((resolve, reject) => {
    const regKey = new Registry({
      hive: issue.hive,
      key: issue.key
    });
    
    regKey.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function deleteRegistryValue(issue) {
  return new Promise((resolve, reject) => {
    const regKey = new Registry({
      hive: issue.hive,
      key: issue.key
    });
    
    regKey.remove(issue.valueName, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function clearRegistrySubkeys(issue) {
  return new Promise((resolve, reject) => {
    const regKey = new Registry({
      hive: issue.hive,
      key: issue.key
    });
    
    regKey.keys((err, subkeys) => {
      if (err) {
        reject(err);
        return;
      }
      
      let pending = subkeys.length;
      if (pending === 0) {
        resolve();
        return;
      }
      
      let hasError = false;
      subkeys.forEach((subkey) => {
        subkey.destroy((err) => {
          if (err && !hasError) {
            hasError = true;
            // Continue anyway, some may succeed
          }
          pending--;
          if (pending === 0) {
            resolve();
          }
        });
      });
    });
  });
}

// Create a backup of registry entries before cleaning
async function createRegistryBackup(issues) {
  const backupDir = path.join(os.homedir(), 'Documents', 'SystemUtilityBackups');
  
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `registry-backup-${timestamp}.json`);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      issues: issues.map(i => ({
        category: i.category,
        name: i.name,
        registryPath: i.registryPath,
        type: i.type
      }))
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    return backupFile;
  } catch (err) {
    return null;
  }
}

module.exports = {
  scanRegistry,
  cleanRegistryIssues
};
