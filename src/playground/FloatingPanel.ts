/**
 * FloatingPanel - A draggable panel component
 *
 * Can be positioned anywhere on screen and dragged by its header.
 * Used for widget palette, property editors, etc.
 */

const PANEL_STYLES = `
  :host {
    position: fixed;
    z-index: 1000;
    display: block;
  }

  .panel {
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid #e2e8f0;
    min-width: 200px;
    max-width: 400px;
    max-height: 80vh;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    cursor: grab;
    user-select: none;
  }

  .header:active {
    cursor: grabbing;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: #64748b;
    font-size: 18px;
    line-height: 1;
  }

  .close-btn:hover {
    background: #e2e8f0;
    color: #334155;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .panel.collapsed .content {
    display: none;
  }

  .panel.collapsed {
    max-height: none;
  }
`;

export interface FloatingPanelConfig {
  title: string;
  x?: number;
  y?: number;
  closable?: boolean;
  collapsible?: boolean;
}

export class FloatingPanel extends HTMLElement {
  private config: FloatingPanelConfig;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private isCollapsed = false;

  constructor(config: FloatingPanelConfig) {
    super();
    this.config = {
      x: 20,
      y: 20,
      closable: true,
      collapsible: true,
      ...config,
    };
    this.attachShadow({ mode: 'open' });
    this.render();
    this.setupDragging();
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = PANEL_STYLES;

    const panel = document.createElement('div');
    panel.className = 'panel';

    // Header
    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('h3');
    title.className = 'title';
    title.textContent = this.config.title;

    header.appendChild(title);

    if (this.config.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Close';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      header.appendChild(closeBtn);
    }

    // Content slot
    const content = document.createElement('div');
    content.className = 'content';
    content.appendChild(document.createElement('slot'));

    panel.appendChild(header);
    panel.appendChild(content);

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(panel);

    // Set initial position
    this.style.left = `${this.config.x}px`;
    this.style.top = `${this.config.y}px`;

    // Double-click header to collapse
    if (this.config.collapsible) {
      header.addEventListener('dblclick', () => this.toggleCollapse());
    }
  }

  private setupDragging(): void {
    const header = this.shadowRoot?.querySelector('.header');
    if (!header) return;

    header.addEventListener('mousedown', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      if ((mouseEvent.target as HTMLElement).classList.contains('close-btn')) {
        return;
      }

      this.isDragging = true;
      const rect = this.getBoundingClientRect();
      this.dragOffset = {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top,
      };

      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;

    // Keep panel within viewport
    const maxX = window.innerWidth - this.offsetWidth;
    const maxY = window.innerHeight - this.offsetHeight;

    this.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    this.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
  };

  private handleMouseUp = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    const panel = this.shadowRoot?.querySelector('.panel');
    if (panel) {
      panel.classList.toggle('collapsed', this.isCollapsed);
    }
  }

  close(): void {
    this.dispatchEvent(new CustomEvent('panel-close', { bubbles: true }));
    this.remove();
  }

  /** Update panel title */
  setTitle(title: string): void {
    const titleEl = this.shadowRoot?.querySelector('.title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /** Get current position */
  getPosition(): { x: number; y: number } {
    return {
      x: parseInt(this.style.left) || 0,
      y: parseInt(this.style.top) || 0,
    };
  }

  /** Set position */
  setPosition(x: number, y: number): void {
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }
}

// Register custom element
if (!customElements.get('floating-panel')) {
  customElements.define('floating-panel', FloatingPanel);
}
