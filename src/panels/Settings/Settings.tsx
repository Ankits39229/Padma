import React from 'react';
import { IconPalette, IconCheck } from '@tabler/icons-react';
import { useTheme, ThemeType } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/toast';
import { Tooltip } from '../../components/ui/tooltip';
import './Settings.css';

const themes: { id: ThemeType; name: string; description: string; colors: string[] }[] = [
  { 
    id: 'rose', 
    name: 'Rose', 
    description: 'Elegant rose pink theme',
    colors: ['#be123c', '#fecdd3', '#fff1f2']
  },
  { 
    id: 'material-light', 
    name: 'Material Light', 
    description: 'Soft lavender light theme',
    colors: ['#1e1b4b', '#e0e0f0', '#f5f3ff']
  },
  { 
    id: 'material-dark', 
    name: 'Material Dark', 
    description: 'Pure black dark theme',
    colors: ['#4fc3f7', '#1a1a1a', '#000000']
  },
];

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    addToast({
      type: 'success',
      title: 'Theme Changed',
      message: `Switched to ${themes.find(t => t.id === newTheme)?.name} theme`,
      duration: 3000
    });
  };

  return (
    <div className="settings-panel">
      <h1 className="settings-title">Settings</h1>
      <p className="settings-subtitle">Customize your preferences</p>

      <div className="settings-section">
        <div className="section-title">
          <IconPalette size={20} />
          <span>Theme</span>
        </div>
        <div className="theme-grid">
          {themes.map((t) => (
            <Tooltip key={t.id} content={`Switch to ${t.name} theme`} position="bottom">
              <button
                className={`theme-card ${theme === t.id ? 'active' : ''}`}
                onClick={() => handleThemeChange(t.id)}
                aria-label={`Select ${t.name} theme`}
                aria-pressed={theme === t.id}
              >
                <div className="theme-preview">
                  {t.colors.map((color, idx) => (
                    <div 
                      key={idx} 
                      className="theme-color" 
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="theme-info">
                  <span className="theme-name">{t.name}</span>
                  <span className="theme-desc">{t.description}</span>
                </div>
                {theme === t.id && (
                  <div className="theme-check">
                    <IconCheck size={16} />
                  </div>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
