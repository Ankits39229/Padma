import * as React from "react";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}) => {
  if (!open) return null;

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, loading]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return { iconBg: 'var(--danger)', iconColor: 'white' };
      case 'warning':
        return { iconBg: 'var(--warning)', iconColor: 'white' };
      default:
        return { iconBg: 'var(--primary)', iconColor: 'white' };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="confirm-overlay">
      <div className="confirm-backdrop" onClick={loading ? undefined : onClose} />
      <div className="confirm-container">
        <button 
          className="confirm-close-btn" 
          onClick={onClose} 
          disabled={loading}
          aria-label="Close dialog"
        >
          <IconX size={18} />
        </button>
        <div className="confirm-content">
          <div 
            className="confirm-icon" 
            style={{ backgroundColor: styles.iconBg, color: styles.iconColor }}
          >
            <IconAlertTriangle size={24} />
          </div>
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
        </div>
        <div className="confirm-actions">
          <button 
            className="confirm-btn secondary" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-btn ${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};