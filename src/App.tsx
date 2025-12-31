import React, { useState } from 'react';
import { Sidebar, SidebarBody, SidebarLink } from './components/ui/sidebar';
import { 
  IconHome, 
  IconTrash, 
  IconRocket, 
  IconDeviceDesktop, 
  IconSettings, 
  IconInfoCircle 
} from '@tabler/icons-react';
import Titlebar from './components/Titlebar/Titlebar';
import Home from './panels/Home/Home';
import Clean from './panels/Clean/Clean';
import Optimize from './panels/Optimize/Optimize';
import System from './panels/System/System';
import Settings from './panels/Settings/Settings';
import About from './panels/About/About';
import './App.css';

const panels: Record<string, React.FC> = {
  home: Home,
  clean: Clean,
  optimize: Optimize,
  system: System,
  settings: Settings,
  about: About,
};

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState('home');
  const [open, setOpen] = useState(false);
  const ActivePanelComponent = panels[activePanel];

  const links = [
    { id: 'home', label: 'Home', icon: <IconHome className="h-5 w-5" style={{ color: 'inherit' }} /> },
    { id: 'clean', label: 'Clean', icon: <IconTrash className="h-5 w-5" style={{ color: 'inherit' }} /> },
    { id: 'optimize', label: 'Optimize', icon: <IconRocket className="h-5 w-5" style={{ color: 'inherit' }} /> },
    { id: 'system', label: 'System', icon: <IconDeviceDesktop className="h-5 w-5" style={{ color: 'inherit' }} /> },
    { id: 'settings', label: 'Settings', icon: <IconSettings className="h-5 w-5" style={{ color: 'inherit' }} /> },
    { id: 'about', label: 'About', icon: <IconInfoCircle className="h-5 w-5" style={{ color: 'inherit' }} /> },
  ];

  return (
    <div className="app-container">
      <Titlebar title="Padma" />
      <div className="app-content">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              <div className="flex flex-col gap-1 mt-4">
                {links.map((link) => (
                  <SidebarLink
                    key={link.id}
                    link={{ label: link.label, href: '#', icon: link.icon }}
                    onClick={() => setActivePanel(link.id)}
                    active={activePanel === link.id}
                  />
                ))}
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
        <main className="main-content">
          <ActivePanelComponent />
        </main>
      </div>
    </div>
  );
};

export default App;
