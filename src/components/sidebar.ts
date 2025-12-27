// Sidebar Component - Navigation with Glassmorphism
export class Sidebar {
  private currentPanel: string = 'dashboard';
  private menuItems: NodeListOf<Element> | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.menuItems = document.querySelectorAll('.sidebar-menu-item');
    this.setupMenuItems();
    this.showPanel('dashboard');
  }

  private setupMenuItems(): void {
    this.menuItems?.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const panelId = (item as HTMLElement).dataset.panel;
        if (panelId) {
          this.switchPanel(panelId);
        }
      });
    });
  }

  private switchPanel(panelId: string): void {
    if (panelId === this.currentPanel) return;

    // Remove active class from all menu items
    this.menuItems?.forEach((item) => {
      item.classList.remove('active');
    });

    // Add active class to clicked item
    const activeItem = document.querySelector(`[data-panel="${panelId}"]`);
    activeItem?.classList.add('active');

    // Show the selected panel with animation
    this.showPanel(panelId);
    this.currentPanel = panelId;
  }

  private showPanel(panelId: string): void {
    // Hide all panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach((panel) => {
      const panelElement = panel as HTMLElement;
      panelElement.classList.remove('active');
      panelElement.classList.add('hidden');
    });

    // Show selected panel with fade-in animation
    const selectedPanel = document.getElementById(`${panelId}-panel`);
    if (selectedPanel) {
      selectedPanel.classList.remove('hidden');
      // Trigger reflow for animation
      void selectedPanel.offsetWidth;
      selectedPanel.classList.add('active');

      // Dispatch custom event for panel activation
      const event = new CustomEvent('panel-activated', { detail: { panelId } });
      document.dispatchEvent(event);
    }
  }

  public getCurrentPanel(): string {
    return this.currentPanel;
  }

  public switchToPanel(panelId: string): void {
    this.switchPanel(panelId);
  }
}
