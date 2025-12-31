const fs = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');

const homeDir = os.homedir();
const tempDir = os.tmpdir();

// Browser cache paths on Windows
const browserPaths = {
  'Google Chrome': {
    check: path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
    cache: [
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache', 'Cache_Data'),
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'GPUCache'),
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Service Worker', 'CacheStorage'),
      path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'ShaderCache'),
    ],
    icon: 'chrome'
  },
  'Microsoft Edge': {
    check: path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
    cache: [
      path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache', 'Cache_Data'),
      path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
      path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'GPUCache'),
      path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'ShaderCache'),
    ],
    icon: 'edge'
  },
  'Mozilla Firefox': {
    check: path.join(homeDir, 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles'),
    cache: [
      path.join(homeDir, 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles'),
    ],
    icon: 'firefox',
    profileBased: true
  },
  'Opera': {
    check: path.join(homeDir, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable'),
    cache: [
      path.join(homeDir, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable', 'Cache'),
      path.join(homeDir, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable', 'GPUCache'),
      path.join(homeDir, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable', 'ShaderCache'),
    ],
    icon: 'opera'
  },
  'Brave': {
    check: path.join(homeDir, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data'),
    cache: [
      path.join(homeDir, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache', 'Cache_Data'),
      path.join(homeDir, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Code Cache'),
      path.join(homeDir, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'GPUCache'),
    ],
    icon: 'brave'
  },
  'Vivaldi': {
    check: path.join(homeDir, 'AppData', 'Local', 'Vivaldi', 'User Data'),
    cache: [
      path.join(homeDir, 'AppData', 'Local', 'Vivaldi', 'User Data', 'Default', 'Cache', 'Cache_Data'),
      path.join(homeDir, 'AppData', 'Local', 'Vivaldi', 'User Data', 'Default', 'Code Cache'),
    ],
    icon: 'vivaldi'
  }
};

// System cleanup paths
const systemPaths = {
  'Windows Temp Files': {
    paths: [
      path.join(homeDir, 'AppData', 'Local', 'Temp'),
    ],
    icon: 'temp',
    description: 'Windows temporary files and application cache'
  },
  'System Temp Files': {
    paths: [tempDir],
    icon: 'temp',
    description: 'System-wide temporary files'
  },
  'Windows Prefetch': {
    paths: ['C:\\Windows\\Prefetch'],
    icon: 'system',
    description: 'Windows prefetch cache files for faster application loading'
  },
  'Thumbnail Cache': {
    paths: [path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Windows', 'Explorer')],
    icon: 'system',
    description: 'Windows thumbnail cache files',
    filter: (filename) => filename.startsWith('thumbcache_') || filename.startsWith('iconcache_')
  },
  'Recent Documents': {
    paths: [path.join(homeDir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent')],
    icon: 'recent',
    description: 'Recent document shortcuts and history'
  },
  'Windows Error Reports': {
    paths: [
      path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Windows', 'WER'),
      path.join(homeDir, 'AppData', 'Local', 'CrashDumps'),
    ],
    icon: 'logs',
    description: 'Windows error reports and crash dumps'
  },
  'Downloads Folder': {
    paths: [path.join(homeDir, 'Downloads')],
    icon: 'downloads',
    description: 'Files in your Downloads folder'
  }
};

// Calculate directory size recursively
function getDirSize(dirPath, filter = null) {
  let size = 0;
  
  try {
    if (!fs.existsSync(dirPath)) return 0;
    
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      return stat.size;
    }
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      try {
        if (filter && !filter(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          size += getDirSize(fullPath);
        } else if (entry.isFile()) {
          const fileStat = fs.statSync(fullPath);
          size += fileStat.size;
        }
      } catch (err) {
        // Skip files/folders we can't access
      }
    }
  } catch (err) {
    // Skip directories we can't access
  }
  
  return size;
}

// Get Firefox profile cache directories
function getFirefoxCachePaths() {
  const profilesPath = path.join(homeDir, 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles');
  const cachePaths = [];
  
  try {
    if (fs.existsSync(profilesPath)) {
      const profiles = fs.readdirSync(profilesPath, { withFileTypes: true });
      for (const profile of profiles) {
        if (profile.isDirectory()) {
          const cachePath = path.join(profilesPath, profile.name, 'cache2');
          if (fs.existsSync(cachePath)) {
            cachePaths.push(cachePath);
          }
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return cachePaths;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function scanInstalledBrowsers() {
  const browsers = [];
  
  for (const [name, config] of Object.entries(browserPaths)) {
    try {
      if (fs.existsSync(config.check)) {
        let totalSize = 0;
        let cachePaths = config.cache;
        
        // Handle Firefox profile-based cache
        if (config.profileBased) {
          cachePaths = getFirefoxCachePaths();
        }
        
        for (const cachePath of cachePaths) {
          totalSize += getDirSize(cachePath);
        }
        
        if (totalSize > 0) {
          browsers.push({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            icon: config.icon,
            size: totalSize,
            sizeFormatted: formatSize(totalSize),
            paths: cachePaths,
            description: 'Browser cache, cookies, and temporary internet files',
            checked: true,
            type: 'browser'
          });
        }
      }
    } catch (err) {
      // Skip browsers we can't access
    }
  }
  
  return browsers;
}

async function scanSystemFiles() {
  const items = [];
  
  for (const [name, config] of Object.entries(systemPaths)) {
    try {
      let totalSize = 0;
      const validPaths = [];
      
      for (const p of config.paths) {
        if (fs.existsSync(p)) {
          const size = getDirSize(p, config.filter);
          totalSize += size;
          validPaths.push(p);
        }
      }
      
      if (totalSize > 0) {
        items.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          icon: config.icon,
          size: totalSize,
          sizeFormatted: formatSize(totalSize),
          paths: validPaths,
          description: config.description,
          checked: name !== 'Downloads Folder',
          type: 'system',
          filter: config.filter ? true : false
        });
      }
    } catch (err) {
      // Skip items we can't access
    }
  }
  
  return items;
}

async function scanAll() {
  const [browsers, systemFiles] = await Promise.all([
    scanInstalledBrowsers(),
    scanSystemFiles()
  ]);
  
  const browserTotal = browsers.reduce((sum, b) => sum + b.size, 0);
  const tempItems = systemFiles.filter(s => s.icon === 'temp');
  const tempTotal = tempItems.reduce((sum, s) => sum + s.size, 0);
  const downloadsTotal = systemFiles.filter(s => s.icon === 'downloads').reduce((sum, s) => sum + s.size, 0);
  const systemTotal = systemFiles.filter(s => s.icon !== 'temp' && s.icon !== 'downloads').reduce((sum, s) => sum + s.size, 0);
  
  return {
    browsers,
    systemFiles,
    stats: {
      system: formatSize(systemTotal),
      browser: formatSize(browserTotal),
      temp: formatSize(tempTotal),
      downloads: formatSize(downloadsTotal),
      total: formatSize(browserTotal + tempTotal + systemTotal + downloadsTotal)
    },
    scanTime: new Date().toLocaleString()
  };
}

// Delete files in a directory
function deleteDirectoryContents(dirPath, filter = null) {
  let deletedSize = 0;
  let errors = [];
  
  try {
    if (!fs.existsSync(dirPath)) return { deletedSize, errors };
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      try {
        if (filter && !filter(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          const stat = fs.statSync(fullPath);
          deletedSize += getDirSize(fullPath);
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          deletedSize += stat.size;
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        errors.push({ path: fullPath, error: err.message });
      }
    }
  } catch (err) {
    errors.push({ path: dirPath, error: err.message });
  }
  
  return { deletedSize, errors };
}

async function cleanItems(items) {
  const results = [];
  
  for (const item of items) {
    let totalDeleted = 0;
    let allErrors = [];
    
    // Get filter function if item has filter
    let filterFn = null;
    if (item.id === 'thumbnail-cache') {
      filterFn = (filename) => filename.startsWith('thumbcache_') || filename.startsWith('iconcache_');
    }
    
    for (const itemPath of item.paths) {
      try {
        if (fs.existsSync(itemPath)) {
          const { deletedSize, errors } = deleteDirectoryContents(itemPath, filterFn);
          totalDeleted += deletedSize;
          allErrors = allErrors.concat(errors);
        }
      } catch (err) {
        allErrors.push({ path: itemPath, error: err.message });
      }
    }
    
    results.push({
      id: item.id,
      success: allErrors.length === 0,
      deletedSize: totalDeleted,
      deletedFormatted: formatSize(totalDeleted),
      errors: allErrors
    });
  }
  
  return results;
}

// Move to recycle bin using Electron shell
async function moveToTrash(filePath) {
  try {
    await shell.trashItem(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

// Get detailed preview of files to be deleted
function getFilesPreview(dirPath, filter = null, maxFiles = 100) {
  const files = [];
  
  try {
    if (!fs.existsSync(dirPath)) return files;
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      
      const fullPath = path.join(dirPath, entry.name);
      
      try {
        if (filter && !filter(entry.name)) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: stat.size,
          sizeFormatted: formatSize(stat.size),
          isDirectory: entry.isDirectory(),
          modified: stat.mtime
        });
      } catch (err) {
        // Skip files we can't access
      }
    }
  } catch (err) {
    // Skip directories we can't access
  }
  
  return files;
}

async function getCleanupPreview(items) {
  const preview = [];
  
  for (const item of items) {
    let filterFn = null;
    if (item.id === 'thumbnail-cache') {
      filterFn = (filename) => filename.startsWith('thumbcache_') || filename.startsWith('iconcache_');
    }
    
    const itemFiles = [];
    for (const itemPath of item.paths) {
      const files = getFilesPreview(itemPath, filterFn, 50);
      itemFiles.push(...files);
    }
    
    preview.push({
      id: item.id,
      name: item.name,
      totalFiles: itemFiles.length,
      files: itemFiles.slice(0, 50), // Limit to 50 files per item
      size: item.size,
      sizeFormatted: item.sizeFormatted
    });
  }
  
  return preview;
}

module.exports = { scanAll, cleanItems, formatSize, moveToTrash, getCleanupPreview };
