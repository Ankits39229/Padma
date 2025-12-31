import * as React from "react";
import { cn } from "../../lib/utils";
import { IconX } from "@tabler/icons-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, children, className }) => {
  if (!open) return null;

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="dialog-overlay">
      <div className="dialog-backdrop" onClick={onClose} />
      <div className={cn("dialog-container", className)}>
        <button className="dialog-close-x" onClick={onClose} aria-label="Close dialog">
          <IconX size={22} />
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{ children: React.ReactNode; onClose?: () => void }> = ({ children, onClose }) => (
  <div className="dialog-header">
    <div className="dialog-title">{children}</div>
    {onClose && (
      <button onClick={onClose} className="dialog-close-btn">
        <IconX size={20} />
      </button>
    )}
  </div>
);

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("dialog-content", className)}>
    {children}
  </div>
);

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="dialog-footer">
    {children}
  </div>
);
