// With nodeIntegration enabled and contextIsolation disabled,
// you can access Node.js and Electron APIs directly in the renderer.
// This preload is optional but can still set up globals if needed.

const { ipcRenderer } = require('electron');

// Expose electronAPI on window for convenience
window.electronAPI = {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  platform: process.platform,
};
