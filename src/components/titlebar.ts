// TitleBar Component - Custom Window Title Bar with Glassmorphism
export class TitleBar {
  constructor() {
    this.init();
  }

  private init(): void {
    this.setupWindowControls();
  }

  private setupWindowControls(): void {
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    minimizeBtn?.addEventListener('click', () => {
      window.electron.minimizeWindow();
    });

    maximizeBtn?.addEventListener('click', () => {
      window.electron.maximizeWindow();
    });

    closeBtn?.addEventListener('click', () => {
      window.electron.closeWindow();
    });

    // Add hover effects
    [minimizeBtn, maximizeBtn, closeBtn].forEach(btn => {
      btn?.addEventListener('mouseenter', () => {
        btn.classList.add('hovered');
      });
      btn?.addEventListener('mouseleave', () => {
        btn.classList.remove('hovered');
      });
    });

    // Special effect for close button
    closeBtn?.addEventListener('mouseenter', () => {
      closeBtn.classList.add('close-hover');
    });
    closeBtn?.addEventListener('mouseleave', () => {
      closeBtn.classList.remove('close-hover');
    });
  }
}
