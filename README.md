# Electron React Tailwind App

A modern desktop application built with **Electron.js**, **React**, and **Tailwind CSS**, featuring **shadcn/ui** components for a beautiful and functional user interface.

## 🚀 Features

- **Electron.js** - Cross-platform desktop application framework
- **React 18** - Modern React with functional components and hooks
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - High-quality, accessible component library built on Radix UI
- **Webpack** - Module bundler for optimized builds
- **Dark Mode** - Built-in theme switching capability
- **IPC Communication** - Secure communication between main and renderer processes

## 📁 Project Structure

```
Padma/
├── electron/
│   ├── main.js           # Electron main process
│   └── preload.js        # Preload script for secure IPC
├── src/
│   ├── components/
│   │   └── ui/           # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── select.jsx
│   │       └── tabs.jsx
│   ├── lib/
│   │   └── utils.js      # Utility functions
│   ├── App.jsx           # Main React component
│   ├── index.jsx         # React entry point
│   ├── index.html        # HTML template
│   └── index.css         # Global styles and Tailwind
├── package.json
├── webpack.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🛠️ Installation

1. **Install Dependencies**

```powershell
npm install
```

This will install all required dependencies including:
- Electron and Electron Builder
- React and React DOM
- Tailwind CSS and PostCSS
- Webpack and Babel
- Radix UI primitives
- shadcn/ui component dependencies

## 💻 Development

**Start the development server:**

```powershell
npm start
```

This command will:
1. Start the Webpack dev server on `http://localhost:3000`
2. Launch the Electron app once the dev server is ready
3. Enable hot module replacement for fast development
4. Open DevTools automatically

## 🏗️ Building

### Build React App

```powershell
npm run build:react
```

### Build Desktop Applications

**Windows:**
```powershell
npm run build:win
```

**macOS:**
```powershell
npm run build:mac
```

**Linux:**
```powershell
npm run build:linux
```

**All Platforms:**
```powershell
npm run build
```

Built applications will be available in the `release/` directory.

## 📦 What's Included

### Electron Configuration

- **Main Process** ([electron/main.js](electron/main.js))
  - Window management
  - IPC handlers for app info and window controls
  - Development and production environment handling
  - Security best practices with context isolation

- **Preload Script** ([electron/preload.js](electron/preload.js))
  - Secure IPC communication bridge
  - Exposed APIs for renderer process
  - Context isolation for security

### React Components

The main application showcases:
- Dashboard with metric cards
- Tabbed interface for different sections
- Form with validation and state management
- Settings panel with interactive controls
- Dialog/modal for app information
- Dark mode toggle

### shadcn/ui Components

All components are customizable and built on Radix UI:

- **Button** - Multiple variants (default, outline, ghost, destructive)
- **Card** - Container components with header, content, and footer
- **Dialog** - Modal dialogs with overlay
- **Input** - Styled text inputs
- **Label** - Form labels with accessibility
- **Select** - Dropdown select with search
- **Tabs** - Tabbed navigation interface

### Tailwind CSS Setup

- Custom color scheme with CSS variables
- Dark mode support
- Responsive design utilities
- Custom animations and transitions

## 🎨 Customization

### Adding New shadcn Components

To add more shadcn components, you can copy the component code from [shadcn/ui](https://ui.shadcn.com/) and place it in `src/components/ui/`.

### Modifying Theme

Edit `src/index.css` to customize colors:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* Add more custom colors */
}
```

### Tailwind Configuration

Modify `tailwind.config.js` to extend or override theme settings:

```javascript
module.exports = {
  theme: {
    extend: {
      // Your customizations
    },
  },
}
```

## 🔒 Security

This project follows Electron security best practices:

- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Preload script for secure IPC
- ✅ Content Security Policy in HTML
- ✅ No remote module usage

## 📚 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Electron | ^28.0.0 | Desktop app framework |
| React | ^18.2.0 | UI library |
| Tailwind CSS | ^3.3.6 | Styling |
| Webpack | ^5.89.0 | Module bundler |
| Radix UI | Latest | Accessible primitives |
| Lucide React | ^0.294.0 | Icon library |

## 🤝 Best Practices Demonstrated

1. **Modular Architecture** - Separation of concerns between Electron and React
2. **Component Composition** - Reusable UI components with shadcn/ui
3. **State Management** - React hooks for local state
4. **Type Safety** - Prepared for TypeScript migration
5. **Performance** - Code splitting and lazy loading ready
6. **Accessibility** - ARIA-compliant components from Radix UI
7. **Security** - Proper IPC communication patterns

## 📝 Scripts Reference

- `npm start` - Start development server
- `npm run start:react` - Start Webpack dev server only
- `npm run start:electron` - Start Electron only
- `npm run build:react` - Build React app for production
- `npm run build` - Build complete desktop application
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS
- `npm run build:linux` - Build for Linux

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is already in use, modify `webpack.config.js`:

```javascript
devServer: {
  port: 3001, // Change to any available port
}
```

And update `electron/main.js`:

```javascript
mainWindow.loadURL('http://localhost:3001');
```

### Build Errors

Clear the dist and node_modules:

```powershell
Remove-Item -Recurse -Force dist, node_modules
npm install
npm run build:react
```

## 📄 License

MIT

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)

---

Built with ❤️ using modern web technologies for desktop applications.
