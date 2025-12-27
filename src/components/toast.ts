// Toast Notification Component
export interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export class Toast {
  private static container: HTMLElement | null = null;

  private static ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  public static show(options: ToastOptions): void {
    const container = this.ensureContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type}`;
    
    const icon = this.getIcon(options.type);
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${options.message}</span>
      <button class="toast-close" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => {
      this.dismiss(toast);
    });

    container.appendChild(toast);

    // Auto dismiss
    const duration = options.duration ?? 4000;
    setTimeout(() => {
      this.dismiss(toast);
    }, duration);
  }

  private static dismiss(toast: HTMLElement): void {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  private static getIcon(type: string): string {
    switch (type) {
      case 'success':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`;
      case 'error':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`;
      case 'warning':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`;
      case 'info':
      default:
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`;
    }
  }

  public static success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration });
  }

  public static error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration });
  }

  public static warning(message: string, duration?: number): void {
    this.show({ message, type: 'warning', duration });
  }

  public static info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration });
  }
}
