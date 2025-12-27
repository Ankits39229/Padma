# Project Definition: PADMA - System Purifier & Optimizer

Act as a Senior Desktop Application Architect and Frontend Engineer. We are building "PADMA," a premium Windows system optimization and purity suite.

## 1. Visual Design & UI Specifications (Strict Adherence)
You must replicate the exact visual style and layout provided in the reference images (Image 25, 26, 27, and 28).

* **Overall Theme:** Clean, Light Mode, Premium Windows 11 aesthetic.
* **Core Styling:** Heavy use of **Glassmorphism** (translucent backgrounds with background blur), soft shadows for depth, and rounded corners on all cards and buttons.
* **Color Palette:** Soft whites, light blues, and gradient backgrounds (light blue to white). Accent color is a muted slate-blue for primary buttons.
* **Layout Structure:** A persistent, translucent left Sidebar for navigation, and a main content area on the right that changes based on the active route.

## 2. Technical Stack & Architecture
* **Core Framework:** **Electron** (latest stable).
* **Frontend:** **React.js** (Created using standard `create-react-app` or manual Webpack setup. **DO NOT use Vite or Vue**).
* **Styling:** Tailwind CSS (recommended for achieving the custom glassmorphism easily) or Styled Components.
* **System Integration:** Node.js native modules for system-level operations (filesystem, process management, hardware info).
* **Architecture Model:** Strict separation of concerns using Electron's **IPC (Inter-Process Communication)** pattern.
    * **Main Process (`/src/main`):** Handles all heavy lifting—file deletion, registry access, S.M.A.R.T checks, battery throttling, and system command execution.
    * **Renderer Process (`/src/renderer`):** Handles only the React UI and state management. It asks the Main process to perform tasks via the Context Bridge.
    * **Preload Script (`/src/preload`):** Securely exposes specific IPC channels from Main to Renderer. **Node Integration must be disabled in the Renderer.**

## 3. Feature Implementation & UI Mapping

### A. Home Dashboard (Reference Image 25)
* **Hero Element:** A large, glowing, translucent "Crystal Lotus" image in the center.
* **Status Text:** Large text indicating current system state (e.g., "System Purity: Excellent").
* **Summary Cards:** Three glass cards showing live data:
    * **Storage:** Free/Total space.
    * **RAM:** Current usage percentage.
    * **Junk Found:** Result of the last quick scan.
* **Quick Action:** A primary button "Perform Quick Cleanse".

### B. Module 1: "Shuddhi" (Cleaner) (Reference Image 26)
* **UI Layout:** A prominent "Scan for Junk" button at the top. Below it, a list of glass-card checkboxes for different cleaning categories.
* **Features to Implement:**
    1.  **System Junk:** Delete Temp files (`%TEMP%`), Prefetch, Windows logs.
    2.  **Browser Cleaner:** Clear cookies, history, and cache for Chrome, Edge, and Firefox (requires accessing their respective local data folders).
    3.  **App Residue:** Identify empty folders or leftover config files in `AppData` from uninstalled programs.

### C. Module 2: "Prana" (Optimizer) (Reference Image 27)
* **UI Layout:** Split into sections using glass cards.
* **Features to Implement:**
    1.  **RAM Booster:** A "Boost Now" button. On click, the Main process should attempt to clear standby lists or force garbage collection to free up RAM instantly.
    2.  **Startup App Manager:** List apps set to run on boot (querying Registry Run keys or Startup folder). Provide toggle switches to enable/disable them.
    3.  **Battery Saver & Cycle Checker (New UI elements needed here):** Add a new card for Battery.
        * **Aggressive Saver:** A toggle switch that, when active, changes the Windows Power Plan to "Power Saver" and potentially throttles background process CPU affinity.
        * **Cycle Checker:** Display current battery health percentage and cycle count (using `powercfg /batteryreport` or a Node library like `systeminformation`).

### D. Module 3: "Drishti" (Analyzer) (Reference Image 28)
* **UI Layout:** A large Sunburst Chart visualizations for disk usage (use a library like Nivo or Recharts). Side cards for summary stats.
* **Features to Implement:**
    1.  **Disk Visualization:** Scan the drive recursively to build the sunburst data structure.
    2.  **Largest Files:** List top 10 largest files with paths.
    3.  **SSD/HDD S.M.A.R.T Health (New UI element needed here):** Add a new card displaying drive health status (Good/Caution/Bad) and temperature, utilizing smartmontools (via `node-cmd` or similar wrapper) to read S.M.A.R.T data.
    4.  **System Info Report:** Add a button "Generate Full Report" that compiles CPU, RAM, GPU, Storage, and Security status (Antivirus/Firewall status) into a neatly formatted text or JSON file for IT support.

## 4. Initial Setup Instructions for Copilot
**Start by scaffolding the project.**
1.  Set up the basic Electron + React (CRA) file structure separating Main, Renderer, and Preload.
2.  Install necessary dependencies: `electron`, `react`, `tailwindcss` (and configure it), `concurrently` (to run electron and react dev server together).
3.  Create the main `BrowserWindow` in the background process with secure settings (`contextIsolation: true`, `nodeIntegration: false`, `frame: false` for custom title bar).
4.  Create the basic Layout component in React featuring the glassmorphism Sidebar and a content area for routing.