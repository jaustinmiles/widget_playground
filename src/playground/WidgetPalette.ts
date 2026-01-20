/**
 * WidgetPalette - Displays available widgets for drag-and-drop
 *
 * Shows all registered widgets grouped by category.
 * Widgets can be dragged from the palette onto the canvas.
 */

import { widgetRegistry } from '../core/widget/index.js';
import { FloatingPanel } from './FloatingPanel.js';

const PALETTE_STYLES = `
  .palette {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 220px;
  }

  .category {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .category-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
    padding: 0 4px;
  }

  .widget-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .widget-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: grab;
    transition: all 0.15s ease;
  }

  .widget-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .widget-item:active {
    cursor: grabbing;
    transform: translateY(0);
  }

  .widget-item.dragging {
    opacity: 0.5;
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .widget-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: white;
    border-radius: 6px;
    font-size: 16px;
    border: 1px solid #e2e8f0;
  }

  .widget-info {
    flex: 1;
    min-width: 0;
  }

  .widget-name {
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    margin: 0 0 2px;
  }

  .widget-desc {
    font-size: 11px;
    color: #64748b;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-state {
    padding: 20px;
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
  }
`;

// Default icons for categories
const CATEGORY_ICONS: Record<string, string> = {
  Display: '📊',
  Utility: '🔧',
  Input: '📝',
  Layout: '📐',
  Chart: '📈',
  General: '🧩',
};

export class WidgetPalette extends HTMLElement {
  private cleanupFns: (() => void)[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
    this.setupDraggables();
  }

  disconnectedCallback(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }

  private render(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = PALETTE_STYLES;

    const container = document.createElement('div');
    container.className = 'palette';

    const widgets = widgetRegistry.getAll();

    if (widgets.length === 0) {
      container.innerHTML = '<div class="empty-state">No widgets available</div>';
      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(container);
      return;
    }

    // Group by category
    const categories = widgetRegistry.getCategories();

    for (const category of categories) {
      const categoryWidgets = widgetRegistry.getByCategory(category);
      if (categoryWidgets.length === 0) continue;

      const categoryEl = document.createElement('div');
      categoryEl.className = 'category';

      const titleEl = document.createElement('div');
      titleEl.className = 'category-title';
      titleEl.textContent = category;
      categoryEl.appendChild(titleEl);

      const listEl = document.createElement('div');
      listEl.className = 'widget-list';

      for (const widget of categoryWidgets) {
        const itemEl = document.createElement('div');
        itemEl.className = 'widget-item';
        itemEl.dataset.widgetTag = widget.metadata.tag;

        const icon = widget.metadata.icon || CATEGORY_ICONS[category] || CATEGORY_ICONS.General;

        itemEl.innerHTML = `
          <div class="widget-icon">${icon}</div>
          <div class="widget-info">
            <p class="widget-name">${widget.metadata.name}</p>
            <p class="widget-desc">${widget.metadata.description || 'No description'}</p>
          </div>
        `;

        listEl.appendChild(itemEl);
      }

      categoryEl.appendChild(listEl);
      container.appendChild(categoryEl);
    }

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);
  }

  private setupDraggables(): void {
    const items = this.shadowRoot?.querySelectorAll('.widget-item');
    if (!items) return;

    items.forEach(item => {
      const element = item as HTMLElement;
      const tag = element.dataset.widgetTag;
      if (!tag) return;

      // Use native HTML5 drag and drop which works across Shadow DOM
      element.draggable = true;

      element.addEventListener('dragstart', (e) => {
        element.classList.add('dragging');
        e.dataTransfer?.setData('application/widget-tag', tag);
        e.dataTransfer?.setData('text/plain', tag);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'copy';
        }
      });

      element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
      });
    });
  }

  /** Refresh the palette (e.g., after new widgets are registered) */
  refresh(): void {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
    }

    this.render();
    this.setupDraggables();
  }
}

// Register custom element
if (!customElements.get('widget-palette')) {
  customElements.define('widget-palette', WidgetPalette);
}

/**
 * Create a floating widget palette panel
 */
export function createWidgetPalettePanel(options?: { x?: number; y?: number }): FloatingPanel {
  const panel = new FloatingPanel({
    title: 'Widgets',
    x: options?.x ?? 20,
    y: options?.y ?? 20,
    closable: true,
    collapsible: true,
  });

  const palette = new WidgetPalette();
  panel.appendChild(palette);

  return panel;
}
