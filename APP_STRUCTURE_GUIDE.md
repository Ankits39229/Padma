# Electron Application Structure Guide
## Nemi Inc. Design System & Architecture Blueprint

> **Version:** 1.0.0  
> **Last Updated:** December 2024  
> **Purpose:** This document serves as a comprehensive guide for creating desktop applications with a consistent look, feel, and architecture. Use this as a template for building new applications under the same organization.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Folder Structure](#folder-structure)
4. [Package.json Configuration](#packagejson-configuration)
5. [TypeScript Configuration](#typescript-configuration)
6. [Main Process Setup](#main-process-setup)
7. [Preload Script (IPC Bridge)](#preload-script-ipc-bridge)
8. [Renderer Process Architecture](#renderer-process-architecture)
9. [HTML Structure](#html-structure)
10. [Component System](#component-system)
11. [Panel Architecture](#panel-architecture)
12. [Styling Configuration](#styling-configuration)
13. [CSS Structure](#css-structure)
14. [Electron Builder Configuration](#electron-builder-configuration)
15. [NPM Scripts](#npm-scripts)
16. [Creating a New Application](#creating-a-new-application)

---

## Project Overview

This architecture follows a **modular, component-based design** for Electron applications with:

- **Custom frameless window** with custom title bar
- **Sidebar navigation** with icon + text menu items
- **Panel-based content system** (SPA-like navigation)
- **Multi-theme support** (Light, Dark, Material Design)
- **TypeScript-first development**
- **IPC-based communication** between main and renderer processes

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Electron | ^28.0.0 | Desktop application framework |
| TypeScript | ^5.3.0 | Type-safe JavaScript |
| electron-builder | ^26.0.12 | Application packaging & distribution |
| Node.js | 20.x | Runtime environment |

---

## Folder Structure

```
project-root/
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── electron-builder.json     # Build configuration
├── styling.json              # Centralized styling configuration
├── index.html                # Main HTML entry point
│
├── src/
│   ├── main.ts               # Electron main process
│   ├── preload.ts            # IPC bridge (context bridge)
│   ├── renderer.ts           # Renderer entry point
│   │
│   ├── components/           # Reusable UI components
│   │   ├── titlebar.ts       # Custom window title bar
│   │   └── sidebar.ts        # Navigation sidebar
│   │
│   ├── panels/               # Application panels/pages
│   │   ├── BasePanel.ts      # Abstract base class for panels
│   │   ├── dashboard.ts      # Example panel
│   │   └── settings.ts       # Settings panel
│   │
│   ├── styles/               # CSS stylesheets
│   │   ├── global.css        # Global styles & CSS variables
│   │   └── [panel].css       # Panel-specific styles
│   │
│   ├── types/                # TypeScript type definitions
│   │   ├── electron.d.ts     # Window electron API types
│   │   └── ipc.ts            # IPC message types
│   │
│   ├── utils/                # Utility functions
│   │   ├── dom.ts            # DOM helper functions
│   │   └── formatting.ts     # Data formatting utilities
│   │
│   ├── assets/               # Static assets (icons, images)
│   │   └── app.ico           # Application icon
│   │
│   └── scripts/              # External scripts (PowerShell, etc.)
│
├── dist/                     # Compiled TypeScript output
├── build/                    # Packaged application output
└── msix/                     # MSIX packaging resources
```

---

## Package.json Configuration

### Base Template

```json
{
  "name": "YOUR_APP_NAME",
  "version": "1.0.0",
  "description": "Your application description",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && electron .",
    "dev": "tsc && electron . --dev",
    "watch": "tsc --watch",
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder",
    "dist:msix": "npm run build && electron-builder --win appx"
  },
  "keywords": [
    "electron",
    "desktop-app"
  ],
  "author": "Nemi Inc",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.10.0",
    "electron": "^28.0.0",
    "electron-builder": "^26.0.12",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    // Add your runtime dependencies here
  }
}
```

### Script Breakdown

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `tsc` | Compile TypeScript to JavaScript |
| `start` | `npm run build && electron .` | Build and run the application |
| `dev` | `tsc && electron . --dev` | Development mode with dev flag |
| `watch` | `tsc --watch` | Watch mode for TypeScript compilation |
| `pack` | `npm run build && electron-builder --dir` | Create unpacked build for testing |
| `dist` | `npm run build && electron-builder` | Create distributable package |
| `dist:msix` | `npm run build && electron-builder --win appx` | Create MSIX package for Microsoft Store |

---

## TypeScript Configuration

### tsconfig.json Template

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Key Configuration Options

- **target: ES2020** - Modern JavaScript features
- **module: commonjs** - Node.js module system (required for Electron)
- **strict: true** - Enable all strict type checking
- **outDir: ./dist** - Compiled output directory

---

## Main Process Setup

### Structure: `src/main.ts`

The main process is the entry point of the Electron application. It handles:

1. **Window Creation** - Creating the BrowserWindow
2. **IPC Handlers** - Communication with renderer process
3. **System Tray** - Tray icon and menu
4. **App Lifecycle** - Ready, quit, window events

### Template Code

```typescript
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Check if running in development mode
const isDev = process.argv.includes('--dev');

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// ============================================================================
// WINDOW CREATION
// ============================================================================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,                    // Frameless window (custom title bar)
    transparent: false,
    backgroundColor: '#E6F2FF',      // Matches your theme background
    webPreferences: {
      nodeIntegration: false,        // Security: disable node in renderer
      contextIsolation: true,        // Security: enable context isolation
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false                 // Required for some IPC operations
    },
    icon: path.join(__dirname, '../src/assets/app.ico'),
    show: false                      // Show after ready-to-show event
  });

  // Load the HTML file
  mainWindow.loadFile('index.html');

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Handle window close (minimize to tray instead)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// SYSTEM TRAY
// ============================================================================

function createTray(): void {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../src/assets/app.ico')
  );
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open App',
      click: () => mainWindow?.show()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Your App Name');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => mainWindow?.show());
}

// ============================================================================
// IPC HANDLERS - Window Controls
// ============================================================================

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
```

---

## Preload Script (IPC Bridge)

### Structure: `src/preload.ts`

The preload script creates a secure bridge between main and renderer processes using `contextBridge`.

### Template Code

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the exposed API
interface ElectronAPI {
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  
  // Example IPC methods
  getData: () => Promise<any>;
  saveData: (data: any) => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners
  onDataUpdate: (callback: (data: any) => void) => void;
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimizeWindow: (): void => ipcRenderer.send('window-minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window-maximize'),
  closeWindow: (): void => ipcRenderer.send('window-close'),
  
  // Example invoke (request-response)
  getData: (): Promise<any> => ipcRenderer.invoke('get-data'),
  saveData: (data: any): Promise<{ success: boolean }> => 
    ipcRenderer.invoke('save-data', data),
  
  // Example event listener
  onDataUpdate: (callback: (data: any) => void): void => {
    ipcRenderer.on('data-update', (_, data) => callback(data));
  }
} as ElectronAPI);
```

### Type Declaration: `src/types/electron.d.ts`

```typescript
export interface ElectronAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getData: () => Promise<any>;
  saveData: (data: any) => Promise<{ success: boolean; error?: string }>;
  onDataUpdate: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

---

## Renderer Process Architecture

### Structure: `src/renderer.ts`

The renderer entry point initializes all UI components and panels.

```typescript
// Renderer Process - Main Entry Point
import { TitleBar } from './components/titlebar';
import { Sidebar } from './components/sidebar';

// Import your panels
import { DashboardPanel } from './panels/dashboard';
import { SettingsPanel } from './panels/settings';
// ... other panels

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize core components
  new TitleBar();
  new Sidebar();
  
  // Initialize all panels
  new DashboardPanel();
  new SettingsPanel();
  // ... other panels
  
  console.log('Application initialized successfully');
});
```

---

## HTML Structure

### Base Template: `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your App Name</title>
  
  <!-- Google Fonts (Optional - Atkinson Hyperlegible for accessibility) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
  
  <!-- Global CSS -->
  <link rel="stylesheet" href="src/styles/global.css">
  
  <!-- Panel-specific CSS -->
  <link rel="stylesheet" href="src/styles/dashboard.css">
  <link rel="stylesheet" href="src/styles/settings.css">
  <!-- ... other panel styles -->
</head>
<body>
  <!-- Custom Title Bar -->
  <div class="title-bar">
    <div class="title-bar-left">
      <div class="app-icon">
        <img src="src/assets/app.ico" alt="App Icon" width="32" height="32">
      </div>
      <span class="app-title">YOUR APP NAME</span>
    </div>
    <div class="title-bar-right">
      <button class="title-bar-button" id="minimize-btn" aria-label="Minimize">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button class="title-bar-button" id="maximize-btn" aria-label="Maximize">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      </button>
      <button class="title-bar-button close-btn" id="close-btn" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toast-container" class="toast-container"></div>

  <!-- Main App Container -->
  <div class="app-container">
    <!-- Sidebar -->
    <aside id="sidebar">
      <div class="sidebar-header">
        <h2>APP NAME</h2>
        <button id="sidebar-toggle" aria-label="Toggle Sidebar">
          <img src="src/assets/app.ico" alt="Menu" width="32" height="32">
        </button>
      </div>
      
      <nav class="sidebar-menu">
        <!-- Dashboard -->
        <button class="sidebar-menu-item active" data-panel="dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
          </svg>
          <span>Dashboard</span>
        </button>
        
        <!-- Settings -->
        <button class="sidebar-menu-item" data-panel="settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94..."/>
          </svg>
          <span>Settings</span>
        </button>
        
        <!-- About -->
        <button class="sidebar-menu-item" data-panel="about">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10..."/>
          </svg>
          <span>About</span>
        </button>
      </nav>
    </aside>
    
    <!-- Main Content -->
    <main id="main-content">
      <!-- Panel containers - content rendered by TypeScript -->
      <div id="dashboard-panel" class="panel active"></div>
      <div id="settings-panel" class="panel"></div>
      <div id="about-panel" class="panel"></div>
    </main>
  </div>
  
  <!-- Compiled TypeScript -->
  <script src="dist/renderer.js"></script>
</body>
</html>
```

---

## Component System

### TitleBar Component: `src/components/titlebar.ts`

```typescript
export class TitleBar {
  constructor() {
    this.init();
  }

  private init(): void {
    this.setupWindowControls();
  }

  private setupWindowControls(): void {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    minimizeBtn?.addEventListener('click', () => {
      window.electron.minimizeWindow();
    });

    maximizeBtn?.addEventListener('click', () => {
      window.electron.maximizeWindow();
    });

    closeBtn?.addEventListener('click', () => {
      window.electron.closeWindow();
    });
  }
}
```

### Sidebar Component: `src/components/sidebar.ts`

```typescript
export class Sidebar {
  private currentPanel: string = 'dashboard';

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupMenuItems();
    this.showPanel('dashboard');
  }

  private setupMenuItems(): void {
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const panelId = target.dataset.panel;
        if (panelId) {
          this.switchPanel(panelId);
        }
      });
    });
  }

  private switchPanel(panelId: string): void {
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach((item) => item.classList.remove('active'));

    // Add active class to clicked item
    const activeItem = document.querySelector(`[data-panel="${panelId}"]`);
    activeItem?.classList.add('active');

    // Show the selected panel
    this.showPanel(panelId);
    this.currentPanel = panelId;
  }

  private showPanel(panelId: string): void {
    // Hide all panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach((panel) => {
      (panel as HTMLElement).style.display = 'none';
      panel.classList.remove('active');
    });

    // Show selected panel
    const selectedPanel = document.getElementById(`${panelId}-panel`);
    if (selectedPanel) {
      selectedPanel.style.display = 'block';
      selectedPanel.classList.add('active');
    }
  }

  public getCurrentPanel(): string {
    return this.currentPanel;
  }
}
```

---

## Panel Architecture

### Base Panel Class: `src/panels/BasePanel.ts`

All panels extend this abstract base class for consistent behavior:

```typescript
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
    this.init();
    
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
        this.refresh().catch(error => {
          console.error(`Auto-refresh failed:`, error);
        });
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

  // Helper methods for DOM manipulation
  protected getElement<T extends HTMLElement>(selector: string): T | null {
    return this.container?.querySelector<T>(selector) || null;
  }

  protected getElements<T extends HTMLElement>(selector: string): T[] {
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
}
```

### Example Panel Implementation

```typescript
import { BasePanel } from './BasePanel';

export class DashboardPanel extends BasePanel {
  private data: any = null;

  constructor() {
    super('dashboard-panel', 30); // Container ID, refresh interval in seconds
  }

  protected async loadData(): Promise<void> {
    this.data = await window.electron.getData();
    this.render();
  }

  protected render(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="panel-header">
        <h1>Dashboard</h1>
        <p class="panel-description">Overview of your data</p>
      </div>
      
      <div class="panel-content">
        <div class="card">
          <h3>Statistics</h3>
          <p>${this.data?.stats || 'Loading...'}</p>
        </div>
      </div>
    `;
    
    this.attachEventHandlers();
  }

  protected attachEventHandlers(): void {
    // Add event listeners for interactive elements
  }
}
```

---

## Styling Configuration

### Overview

All styling values (colors, fonts, spacing, shadows, etc.) are centralized in the `styling.json` file at the project root. This allows for:

- **Consistent theming** across all applications
- **Easy customization** without modifying CSS files
- **Single source of truth** for design tokens
- **Programmatic access** to styling values in TypeScript

### `styling.json` Structure

```json
{
  "fonts": {
    "primary": "Font Family Name"
  },
  "colors": {
    "text": { /* Text color variants */ },
    "background": { /* Background color variants */ },
    "border": { /* Border color variants */ },
    "shadow": { /* Shadow definitions */ },
    "scrollbar": { /* Scrollbar colors */ }
  },
  "dimensions": {
    "card": { /* Card dimensions */ },
    "button": { /* Button dimensions */ },
    "scrollbar": { /* Scrollbar dimensions */ }
  },
  "typography": {
    "heading": { /* Heading styles */ },
    "description": { /* Description text styles */ },
    "button": { /* Button text styles */ }
  },
  "spacing": {
    "container": { /* Container spacing */ },
    "grid": { /* Grid spacing */ },
    "card": { /* Card internal spacing */ }
  },
  "borders": {
    "card": { /* Card border styles */ },
    "button": { /* Button border styles */ }
  },
  "transitions": {
    "default": "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "fast": "all 0.2s"
  },
  "states": {
    "hover": { /* Hover state styles */ },
    "active": { /* Active state styles */ }
  },
  "layout": {
    "dashboard": { /* Dashboard grid layout */ }
  }
}
```

### Using styling.json in TypeScript

```typescript
// Load styling configuration
import stylingConfig from '../styling.json';

// Access values
const primaryFont = stylingConfig.fonts.primary;
const cardBorderRadius = stylingConfig.dimensions.card.borderRadius;
const hoverTransform = stylingConfig.states.hover.transform;

// Apply dynamically
element.style.fontFamily = stylingConfig.fonts.primary;
element.style.backgroundColor = stylingConfig.colors.background.card;
```

### Generating CSS from styling.json

You can create a utility to convert `styling.json` to CSS custom properties:

```typescript
function generateCSSVariables(config: typeof stylingConfig): string {
  let css = ':root {\n';
  
  // Text colors
  for (const [key, value] of Object.entries(config.colors.text)) {
    css += `  --text-${key}: ${value};\n`;
  }
  
  // Background colors
  for (const [key, value] of Object.entries(config.colors.background)) {
    css += `  --bg-${key}: ${value};\n`;
  }
  
  // Add more mappings as needed...
  
  css += '}\n';
  return css;
}
```

---

## CSS Structure

### Layout CSS (structural - keep in global.css)

The CSS focuses on **layout and structure** while colors/fonts come from `styling.json`:

```css
/* ============================================================================
   BASE STYLES
   ============================================================================ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

/* ============================================================================
   TITLE BAR STRUCTURE
   ============================================================================ */

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 8px;
  -webkit-app-region: drag; /* Makes title bar draggable */
  user-select: none;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-bar-right {
  display: flex;
  -webkit-app-region: no-drag; /* Buttons are clickable */
}

.title-bar-button {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ============================================================================
   APP CONTAINER STRUCTURE
   ============================================================================ */

.app-container {
  display: flex;
  height: calc(100vh - 40px); /* Subtract title bar height */
}

/* ============================================================================
   SIDEBAR STRUCTURE
   ============================================================================ */

#sidebar {
  width: 240px;
  min-width: 240px;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-menu {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.sidebar-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.sidebar-menu-item svg {
  flex-shrink: 0;
}

/* ============================================================================
   MAIN CONTENT STRUCTURE
   ============================================================================ */

#main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.panel {
  display: none;
}

.panel.active {
  display: block;
}

.panel-header {
  margin-bottom: 24px;
}

/* ============================================================================
   CARD STRUCTURE
   ============================================================================ */

.card {
  border-radius: 12px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

/* ============================================================================
   BUTTON STRUCTURE
   ============================================================================ */

.btn-primary,
.btn-secondary {
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
}

/* ============================================================================
   FORM INPUT STRUCTURE
   ============================================================================ */

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
}

/* ============================================================================
   TOAST NOTIFICATION STRUCTURE
   ============================================================================ */

.toast-container {
  position: fixed;
  top: 56px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### Key Title Bar Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `height` | 40px | Standard Windows title bar height |
| `-webkit-app-region: drag` | - | Makes the title bar draggable |
| `-webkit-app-region: no-drag` | - | Applied to buttons so they're clickable |
| Button width | 46px | Windows standard control button width |
| Button height | 32px | Windows standard control button height |

### Key Sidebar Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `width` | 240px | Standard sidebar width |
| `min-width` | 240px | Prevents sidebar collapse |
| Menu item padding | 12px 16px | Touch-friendly tap targets |
| Menu item border-radius | 8px | Rounded selection indicator |
| Menu item gap | 12px | Space between icon and text |

---

## Electron Builder Configuration

### Template: `electron-builder.json`

```json
{
  "appId": "com.nemi.yourappname",
  "productName": "Your App Name",
  "copyright": "Copyright © 2025 Nemi Inc",
  "directories": {
    "output": "build",
    "buildResources": "msix/assets"
  },
  "files": [
    "dist/**/*",
    "index.html",
    "src/assets/**/*",
    "src/styles/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "src/scripts",
      "to": "scripts",
      "filter": ["**/*"]
    }
  ],
  "win": {
    "target": [
      {
        "target": "appx",
        "arch": ["x64"]
      }
    ],
    "icon": "src/assets/app.ico",
    "signAndEditExecutable": false
  },
  "appx": {
    "applicationId": "Nemi.YourAppName",
    "identityName": "Nemi.YourAppName",
    "publisher": "CN=YOUR-PUBLISHER-ID",
    "publisherDisplayName": "Nemi Inc",
    "displayName": "Your App Name",
    "backgroundColor": "#1a1a2e",
    "showNameOnTiles": true,
    "languages": ["en-US"]
  }
}
```

---

## NPM Scripts

### Development Workflow

```bash
# Install dependencies
npm install

# Development - watch mode
npm run watch  # In terminal 1 - watches TypeScript
npm start      # In terminal 2 - runs the app

# Quick development run
npm run dev

# Build for testing
npm run pack

# Build for distribution
npm run dist

# Build MSIX for Microsoft Store
npm run dist:msix
```

---

## Creating a New Application

### Step-by-Step Guide

1. **Create Project Folder**
   ```bash
   mkdir your-app-name
   cd your-app-name
   ```

2. **Initialize npm**
   ```bash
   npm init -y
   ```

3. **Install Dependencies**
   ```bash
   npm install --save-dev electron electron-builder typescript @types/node
   ```

4. **Copy Configuration Files**
   - `package.json` - Update name, description, scripts
   - `tsconfig.json` - Use as-is
   - `electron-builder.json` - Update app ID, names, publisher

5. **Create Folder Structure**
   ```
   src/
   ├── main.ts
   ├── preload.ts
   ├── renderer.ts
   ├── components/
   │   ├── titlebar.ts
   │   └── sidebar.ts
   ├── panels/
   │   ├── BasePanel.ts
   │   └── dashboard.ts
   ├── styles/
   │   └── global.css
   ├── types/
   │   └── electron.d.ts
   └── assets/
       └── app.ico
   ```
   
   Also copy `styling.json` to the project root.

6. **Create index.html** from template

7. **Build and Run**
   ```bash
   npm run dev
   ```

### Checklist for New Apps

- [ ] Update `package.json` with app name and description
- [ ] Update `electron-builder.json` with app IDs and publisher
- [ ] Copy and customize `styling.json` for your brand
- [ ] Create app icon (`src/assets/app.ico`)
- [ ] Update title bar text in `index.html`
- [ ] Update sidebar menu items for your panels
- [ ] Create panel components for your features

---

## Best Practices

### Security

1. **Never enable `nodeIntegration`** in renderer
2. **Always use `contextIsolation: true`**
3. **Validate all IPC inputs** in main process
4. **Sanitize user inputs** before processing

### Performance

1. **Lazy load panels** - Only render when active
2. **Debounce expensive operations** (file writes, API calls)
3. **Use `requestAnimationFrame`** for smooth animations
4. **Clean up intervals/listeners** in `destroy()` methods

### Code Style

1. **TypeScript strict mode** - Catch errors early
2. **Consistent naming** - PascalCase for classes, camelCase for methods
3. **Document public APIs** - JSDoc comments
4. **Single responsibility** - One panel = one feature

---

## Support & Resources

- **Electron Documentation**: https://www.electronjs.org/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Material Design 3**: https://m3.material.io/

---

*This guide is maintained by Nemi Inc. for internal application development.*
