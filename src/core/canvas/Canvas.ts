/**
 * Canvas Component
 *
 * Main canvas area where widgets are placed and arranged.
 * Handles drop zones and coordinates with CanvasState.
 */

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { CanvasState } from './CanvasState.js';
import { WidgetContainer } from './WidgetContainer.js';
import { widgetRegistry } from '../widget/registry.js';
import type { Position, CanvasConfig, DragData } from './types.js';

const CANVAS_STYLES = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
  }

  .canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: #f8fafc;
  }

  .canvas-inner {
    position: relative;
    min-width: 100%;
    min-height: 100%;
  }

  .canvas.show-grid .canvas-inner {
    background-image:
      linear-gradient(to right, #e2e8f0 1px, transparent 1px),
      linear-gradient(to bottom, #e2e8f0 1px, transparent 1px);
    background-size: var(--grid-size, 20px) var(--grid-size, 20px);
  }

  .canvas.drag-over .canvas-inner {
    background-color: #eff6ff;
  }

  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #94a3b8;
    pointer-events: none;
  }

  .empty-state h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 500;
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }
`;

export class Canvas extends HTMLElement {
  private state: CanvasState;
  private containers: Map<string, WidgetContainer> = new Map();
  private cleanupDropTarget?: () => void;

  constructor(config?: Partial<CanvasConfig>) {
    super();
    this.state = new CanvasState(config);
    this.attachShadow({ mode: 'open' });
    this.render();
    this.setupDropTarget();
    this.bindStateEvents();
  }

  /** Access the canvas state */
  getState(): CanvasState {
    return this.state;
  }

  /** Add a widget to the canvas */
  addWidget(tag: string, position?: Position, properties?: Record<string, unknown>): string {
    const placement = this.state.addWidget(tag, position, undefined, properties);
    return placement.id;
  }

  /** Remove a widget from the canvas */
  removeWidget(id: string): boolean {
    return this.state.removeWidget(id);
  }

  /** Select a widget */
  selectWidget(id: string | null): void {
    this.state.selectWidget(id);
  }

  /** Clear all widgets */
  clear(): void {
    this.state.clear();
  }

  /** Undo last action */
  undo(): boolean {
    return this.state.undo();
  }

  /** Redo last undone action */
  redo(): boolean {
    return this.state.redo();
  }

  /** Export canvas state as JSON */
  exportState(): string {
    return JSON.stringify(this.state.toJSON());
  }

  /** Import canvas state from JSON */
  importState(json: string): void {
    const data = JSON.parse(json);
    this.state.fromJSON(data);
    this.syncContainers();
  }

  /** Render the canvas */
  private render(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = CANVAS_STYLES;

    const canvas = document.createElement('div');
    canvas.className = 'canvas';
    if (this.state.config.showGrid) {
      canvas.classList.add('show-grid');
    }

    const inner = document.createElement('div');
    inner.className = 'canvas-inner';
    inner.style.width = `${this.state.config.width}px`;
    inner.style.height = `${this.state.config.height}px`;
    inner.style.setProperty('--grid-size', `${this.state.config.gridSize || 20}px`);

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <h3>Drop widgets here</h3>
      <p>Drag widgets from the palette to add them to the canvas</p>
    `;

    inner.appendChild(emptyState);
    canvas.appendChild(inner);

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(canvas);

    // Click on canvas background to deselect
    inner.addEventListener('click', (e) => {
      if (e.target === inner) {
        this.state.selectWidget(null);
      }
    });
  }

  /** Setup drop target for new widgets */
  private setupDropTarget(): void {
    const canvas = this.shadowRoot?.querySelector('.canvas');
    const inner = this.shadowRoot?.querySelector('.canvas-inner');
    if (!canvas || !inner) return;

    this.cleanupDropTarget = dropTargetForElements({
      element: inner as HTMLElement,
      getData: () => ({ type: 'canvas' }),
      canDrop: ({ source }) => {
        const data = source.data as DragData;
        return data.type === 'new-widget' || data.type === 'move-widget';
      },
      onDragEnter: () => {
        canvas.classList.add('drag-over');
      },
      onDragLeave: () => {
        canvas.classList.remove('drag-over');
      },
      onDrop: ({ source, location }) => {
        canvas.classList.remove('drag-over');
        const data = source.data as DragData & { startX?: number; startY?: number };

        // Calculate drop position relative to canvas
        const rect = inner.getBoundingClientRect();
        const dropX = location.current.input.clientX - rect.left;
        const dropY = location.current.input.clientY - rect.top;

        if (data.type === 'new-widget' && data.tag) {
          // Add new widget at drop position
          this.state.addWidget(data.tag, { x: dropX, y: dropY });
        } else if (data.type === 'move-widget' && data.widgetId) {
          // Move existing widget
          const dx = dropX - (data.startX || 0);
          const dy = dropY - (data.startY || 0);
          const widget = this.state.getWidget(data.widgetId);
          if (widget) {
            this.state.moveWidget(data.widgetId, {
              x: widget.position.x + dx,
              y: widget.position.y + dy,
            });
          }
        }
      },
    });
  }

  /** Bind state events to update UI */
  private bindStateEvents(): void {
    this.state.addEventListener('widget-add', (e) => {
      const { widget } = (e as CustomEvent).detail.detail;
      this.createContainer(widget);
      this.updateEmptyState();
    });

    this.state.addEventListener('widget-remove', (e) => {
      const { widget } = (e as CustomEvent).detail.detail;
      this.removeContainer(widget.id);
      this.updateEmptyState();
    });

    this.state.addEventListener('widget-move', (e) => {
      const { widgetId } = (e as CustomEvent).detail.detail;
      const widget = this.state.getWidget(widgetId);
      const container = this.containers.get(widgetId);
      if (widget && container) {
        container.updatePlacement(widget);
      }
    });

    this.state.addEventListener('widget-resize', (e) => {
      const { widgetId } = (e as CustomEvent).detail.detail;
      const widget = this.state.getWidget(widgetId);
      const container = this.containers.get(widgetId);
      if (widget && container) {
        container.updatePlacement(widget);
      }
    });

    this.state.addEventListener('widget-select', (e) => {
      const { widgetId } = (e as CustomEvent).detail.detail;
      this.updateSelection(widgetId);
    });

    this.state.addEventListener('widget-deselect', (e) => {
      const { widgetId } = (e as CustomEvent).detail.detail;
      const container = this.containers.get(widgetId);
      if (container) {
        container.updateSelection(false);
      }
    });

    this.state.addEventListener('canvas-change', () => {
      // Full refresh on canvas change (e.g., restore)
      this.syncContainers();
    });
  }

  /** Create a widget container */
  private createContainer(placement: ReturnType<CanvasState['addWidget']>): void {
    const inner = this.shadowRoot?.querySelector('.canvas-inner');
    if (!inner) return;

    const container = new WidgetContainer(placement, {
      onMove: (id, pos) => this.state.moveWidget(id, pos),
      onResize: (id, size) => this.state.resizeWidget(id, size),
      onSelect: (id) => this.state.selectWidget(id),
      onRemove: (id) => this.state.removeWidget(id),
    });

    // Create the actual widget element
    const widgetElement = widgetRegistry.create(placement.tag, placement.properties);
    if (widgetElement) {
      container.appendChild(widgetElement);
    }

    this.containers.set(placement.id, container);
    inner.appendChild(container);
  }

  /** Remove a widget container */
  private removeContainer(id: string): void {
    const container = this.containers.get(id);
    if (container) {
      container.remove();
      this.containers.delete(id);
    }
  }

  /** Sync containers with state (for restore operations) */
  private syncContainers(): void {
    // Remove all existing containers
    for (const container of this.containers.values()) {
      container.remove();
    }
    this.containers.clear();

    // Recreate from state
    for (const widget of this.state.widgets) {
      this.createContainer(widget);
    }

    this.updateEmptyState();
  }

  /** Update selection visual state */
  private updateSelection(selectedId: string): void {
    for (const [id, container] of this.containers) {
      container.updateSelection(id === selectedId);
    }
  }

  /** Show/hide empty state message */
  private updateEmptyState(): void {
    const emptyState = this.shadowRoot?.querySelector('.empty-state') as HTMLElement;
    if (emptyState) {
      emptyState.style.display = this.containers.size === 0 ? 'block' : 'none';
    }
  }

  /** Cleanup on disconnect */
  disconnectedCallback(): void {
    if (this.cleanupDropTarget) {
      this.cleanupDropTarget();
    }
  }
}

// Register custom element
if (!customElements.get('widget-canvas')) {
  customElements.define('widget-canvas', Canvas);
}
