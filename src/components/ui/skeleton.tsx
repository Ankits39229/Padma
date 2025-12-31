import * as React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '0.375rem',
  className = ''
}) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      borderRadius
    }}
  />
);

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="skeleton-card">
    <div className="skeleton-card-header">
      <Skeleton width={40} height={40} borderRadius="0.5rem" />
      <div className="skeleton-card-title">
        <Skeleton width="60%" height="1rem" />
        <Skeleton width="40%" height="0.75rem" />
      </div>
    </div>
    <div className="skeleton-card-body">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height="0.875rem" />
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="0.875rem" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="skeleton-table-row">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton key={colIdx} height="0.875rem" width={colIdx === 0 ? '80%' : '60%'} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="skeleton-list">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="skeleton-list-item">
        <Skeleton width={36} height={36} borderRadius="0.5rem" />
        <div className="skeleton-list-content">
          <Skeleton width="70%" height="0.875rem" />
          <Skeleton width="50%" height="0.75rem" />
        </div>
        <Skeleton width={60} height="1.5rem" borderRadius="0.25rem" />
      </div>
    ))}
  </div>
);