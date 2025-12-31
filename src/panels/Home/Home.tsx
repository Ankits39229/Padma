import React from 'react';
import { IconHome, IconFolder, IconActivity } from '@tabler/icons-react';
import './Home.css';

const Home: React.FC = () => {
  // Generate random sparkles
  const sparkles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 1.5 + Math.random() * 2,
    size: 2 + Math.random() * 4
  }));

  return (
    <div className="home-panel">
      {/* Lotus Section */}
      <div className="lotus-container">
        <div className="lotus-glow"></div>
        <div className="lotus-glow-secondary"></div>
        
        {/* Sparkles */}
        <div className="sparkles-container">
          {sparkles.map((sparkle) => (
            <div
              key={sparkle.id}
              className="sparkle"
              style={{
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                animationDelay: `${sparkle.delay}s`,
                animationDuration: `${sparkle.duration}s`,
                width: `${sparkle.size}px`,
                height: `${sparkle.size}px`
              }}
            />
          ))}
        </div>

        {/* Lotus SVG */}
        <svg className="lotus-svg" viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Petal gradients */}
            <radialGradient id="petalGradientOuter" cx="50%" cy="100%" r="100%" fx="50%" fy="90%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="30%" stopColor="#fef8fb"/>
              <stop offset="60%" stopColor="#fce4ec"/>
              <stop offset="100%" stopColor="#c5a3cf"/>
            </radialGradient>
            <radialGradient id="petalGradientMid" cx="50%" cy="100%" r="100%" fx="50%" fy="90%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="40%" stopColor="#fff5f8"/>
              <stop offset="70%" stopColor="#f8bbd0"/>
              <stop offset="100%" stopColor="#ce93d8"/>
            </radialGradient>
            <radialGradient id="petalGradientInner" cx="50%" cy="100%" r="100%" fx="50%" fy="85%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="30%" stopColor="#fce4ec"/>
              <stop offset="60%" stopColor="#f48fb1"/>
              <stop offset="100%" stopColor="#ab47bc"/>
            </radialGradient>
            <radialGradient id="petalGradientCenter" cx="50%" cy="100%" r="100%" fx="50%" fy="80%">
              <stop offset="0%" stopColor="#fff8e1"/>
              <stop offset="50%" stopColor="#ffecb3"/>
              <stop offset="100%" stopColor="#ffc107"/>
            </radialGradient>
            <linearGradient id="stamenGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff59d"/>
              <stop offset="50%" stopColor="#ffeb3b"/>
              <stop offset="100%" stopColor="#ff8f00"/>
            </linearGradient>
            
            {/* Glow filters */}
            <filter id="petalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
              <feFlood floodColor="#ffffff" floodOpacity="0.8"/>
              <feComposite in2="blur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="glow"/>
              <feMerge>
                <feMergeNode in="glow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outermost back petals */}
          <g className="lotus-layer-1" opacity="0.5">
            <path d="M200 220 C180 180, 140 120, 100 40 C95 100, 110 160, 160 210 C175 220, 190 222, 200 220" fill="url(#petalGradientOuter)" filter="url(#petalGlow)"/>
            <path d="M200 220 C220 180, 260 120, 300 40 C305 100, 290 160, 240 210 C225 220, 210 222, 200 220" fill="url(#petalGradientOuter)" filter="url(#petalGlow)"/>
            <path d="M200 220 C165 185, 100 140, 40 80 C60 130, 100 175, 165 212 C180 220, 195 222, 200 220" fill="url(#petalGradientOuter)" filter="url(#petalGlow)"/>
            <path d="M200 220 C235 185, 300 140, 360 80 C340 130, 300 175, 235 212 C220 220, 205 222, 200 220" fill="url(#petalGradientOuter)" filter="url(#petalGlow)"/>
          </g>
          
          {/* Second layer petals */}
          <g className="lotus-layer-2" opacity="0.7">
            <path d="M200 225 C175 185, 145 130, 115 55 C108 120, 130 175, 170 215 C185 225, 195 227, 200 225" fill="url(#petalGradientMid)" filter="url(#petalGlow)"/>
            <path d="M200 225 C225 185, 255 130, 285 55 C292 120, 270 175, 230 215 C215 225, 205 227, 200 225" fill="url(#petalGradientMid)" filter="url(#petalGlow)"/>
            <path d="M200 225 C160 190, 110 150, 60 95 C80 145, 125 185, 175 218 C188 226, 198 227, 200 225" fill="url(#petalGradientMid)" filter="url(#petalGlow)"/>
            <path d="M200 225 C240 190, 290 150, 340 95 C320 145, 275 185, 225 218 C212 226, 202 227, 200 225" fill="url(#petalGradientMid)" filter="url(#petalGlow)"/>
          </g>
          
          {/* Third layer petals */}
          <g className="lotus-layer-3" opacity="0.85">
            <path d="M200 228 C180 190, 155 140, 130 70 C122 135, 145 185, 178 220 C190 228, 198 230, 200 228" fill="url(#petalGradientInner)" filter="url(#innerGlow)"/>
            <path d="M200 228 C220 190, 245 140, 270 70 C278 135, 255 185, 222 220 C210 228, 202 230, 200 228" fill="url(#petalGradientInner)" filter="url(#innerGlow)"/>
            <path d="M200 228 C168 195, 130 160, 90 115 C108 155, 145 192, 182 222 C192 228, 199 230, 200 228" fill="url(#petalGradientInner)" filter="url(#innerGlow)"/>
            <path d="M200 228 C232 195, 270 160, 310 115 C292 155, 255 192, 218 222 C208 228, 201 230, 200 228" fill="url(#petalGradientInner)" filter="url(#innerGlow)"/>
          </g>
          
          {/* Innermost petals */}
          <g className="lotus-layer-4" opacity="0.95">
            <path d="M200 232 C185 200, 165 155, 150 90 C142 150, 162 195, 185 225 C194 232, 199 234, 200 232" fill="url(#petalGradientInner)" filter="url(#innerGlow)"/>
            <path d="M200 232 C215 200, 235 155, 250 90 C258 150, 238 195, 215 225 C206 232, 201 234, 200 232" fill="url(#petalGradientInner)" filter="url(#innerGlow)"/>
            {/* Center petal */}
            <path d="M200 235 C195 195, 190 145, 190 85 C185 145, 192 195, 200 235" fill="url(#petalGradientCenter)" filter="url(#innerGlow)"/>
            <path d="M200 235 C205 195, 210 145, 210 85 C215 145, 208 195, 200 235" fill="url(#petalGradientCenter)" filter="url(#innerGlow)"/>
          </g>
          
          {/* Lotus center - golden stamens */}
          <g className="lotus-center" filter="url(#softGlow)">
            <ellipse cx="200" cy="238" rx="25" ry="12" fill="url(#stamenGold)"/>
            {/* Individual stamens */}
            <circle cx="188" cy="234" r="4" fill="#ffeb3b"/>
            <circle cx="200" cy="232" r="5" fill="#ffc107"/>
            <circle cx="212" cy="234" r="4" fill="#ffeb3b"/>
            <circle cx="193" cy="240" r="3.5" fill="#ff9800"/>
            <circle cx="207" cy="240" r="3.5" fill="#ff9800"/>
            <circle cx="200" cy="238" r="3" fill="#ff6f00"/>
            <circle cx="183" cy="238" r="2.5" fill="#ffd54f"/>
            <circle cx="217" cy="238" r="2.5" fill="#ffd54f"/>
          </g>
        </svg>

        {/* Water reflection */}
        <div className="water-surface">
          <div className="water-ripple"></div>
          <div className="water-ripple delay-1"></div>
          <div className="water-ripple delay-2"></div>
        </div>
      </div>

      <h1 className="home-title">Welcome to Padma</h1>
      <p className="home-subtitle">Your system's wellness companion</p>
      
      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <IconHome size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">128 GB</span>
            <span className="stat-label">Total Storage</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <IconFolder size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">2,451</span>
            <span className="stat-label">Files</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <IconActivity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">Good</span>
            <span className="stat-label">System Health</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
