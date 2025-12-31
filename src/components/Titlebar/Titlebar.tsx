import React, { useState, useEffect } from 'react';
import { IconMinus, IconSquare, IconX, IconSquares } from '@tabler/icons-react';
import { Tooltip } from '../ui/tooltip';
import './Titlebar.css';

// Import app logo
import appLogo from '../../assets/logo.png';

const { ipcRenderer } = window.require('electron');

interface TitlebarProps {
  title?: string;
}

const Titlebar: React.FC<TitlebarProps> = ({ title = 'Padma' }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial window state
    ipcRenderer.invoke('is-window-maximized').then((maximized: boolean) => {
      setIsMaximized(maximized);
    });

    // Listen for window state changes
    const handleMaximizeChange = (_event: any, maximized: boolean) => {
      setIsMaximized(maximized);
    };

    ipcRenderer.on('window-maximized-changed', handleMaximizeChange);
    
    return () => {
      ipcRenderer.removeListener('window-maximized-changed', handleMaximizeChange);
    };
  }, []);

  const handleMinimize = () => {
    ipcRenderer.invoke('minimize-window');
  };

  const handleMaximize = () => {
    ipcRenderer.invoke('maximize-window');
  };

  const handleClose = () => {
    ipcRenderer.invoke('close-window');
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-icon">
          <img src={appLogo} alt="Padma" className="app-logo-img" />
        </div>
        <span className="titlebar-title">{title}</span>
      </div>
      <div className="titlebar-controls">
        <Tooltip content="Minimize" position="bottom">
          <button 
            className="titlebar-btn minimize" 
            onClick={handleMinimize} 
            aria-label="Minimize window"
          >
            <IconMinus size={16} />
          </button>
        </Tooltip>
        <Tooltip content={isMaximized ? "Restore" : "Maximize"} position="bottom">
          <button 
            className="titlebar-btn maximize" 
            onClick={handleMaximize} 
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
          >
            {isMaximized ? <IconSquares size={14} /> : <IconSquare size={14} />}
          </button>
        </Tooltip>
        <Tooltip content="Close" position="bottom">
          <button 
            className="titlebar-btn close" 
            onClick={handleClose} 
            aria-label="Close window"
          >
            <IconX size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Titlebar;
