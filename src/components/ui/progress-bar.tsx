import * as React from "react";

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  label,
  size = 'md',
  variant = 'primary',
  animated = true
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`progress-wrapper progress-${size}`}>
      {(showLabel || label) && (
        <div className="progress-label">
          <span>{label || 'Progress'}</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="progress-track">
        <div
          className={`progress-fill progress-${variant} ${animated ? 'animated' : ''}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  showLabel = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="circular-progress-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="circular-progress-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <span className="circular-progress-label">{Math.round(progress)}%</span>
      )}
    </div>
  );
};