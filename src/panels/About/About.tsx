import React from 'react';
import { Info, Heart } from 'lucide-react';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="about-panel">
      <div className="about-header">
        <div className="about-logo">S</div>
        <h1 className="about-title">Padma</h1>
        <p className="about-version">Version 1.0.0</p>
      </div>

      <div className="about-content">
        <div className="about-card">
          <Info className="about-icon" />
          <h3>About</h3>
          <p>A powerful Padma application built with Electron and React. Clean, optimize, and monitor your system with ease.</p>
        </div>

        <div className="about-footer">
          <p>Made with <Heart size={14} className="heart-icon" /> by Your Team</p>
          <p className="copyright">© 2024 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default About;
