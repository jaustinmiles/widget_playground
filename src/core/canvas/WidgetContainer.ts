/**
 * Widget Container
 *
 * Wraps widgets on the canvas with drag and resize functionality.
 * Uses @atlaskit/pragmatic-drag-and-drop for drag operations.
 */

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { Position, Size, WidgetPlacement } from './types.js';

export interface WidgetContainerCallbacks {
  onMove: (id: string, position: Position) => void;
  onResize: (id: string, size: Size) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const CONTAINER_STYLES = `
  :host {
    position: absolute;
    display: block;
    box-sizing: border-box;
  }

  .container {
    width: 100%;
    height: 100%;
    position: relative;
    border: 2px solid transparent;
    border-radius: 4px;
    transition: border-color 0.15s ease;
  }

  .container:hover {
    border-color: #cbd5e1;
  }

  .container.selected {
    border-color: #3b82f6;
  }

  .container.dragging {
    opacity: 0.7;
    cursor: grabbing;
  }

  .widget-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .resize-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
    z-index: 10;
  }

  .container.selected .resize-handle,
  .container:hover .resize-handle {
    opacity: 1;
  }

  .resize-handle.se {
    bottom: -6px;
    right: -6px;
    cursor: se-resize;
  }

  .resize-handle.sw {
    bottom: -6px;
    left: -6px;
    cursor: sw-resize;
  }

  .resize-handle.ne {
    top: -6px;
    right: -6px;
    cursor: ne-resize;
  }

  .resize-handle.nw {
    top: -6px;
    left: -6px;
    cursor: nw-resize;
  }

  .drag-handle {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 2px 8px;
    background: #3b82f6;
    color: white;
    font-size: 11px;
    border-radius: 4px 4px 0 0;
    cursor: grab;
    opacity: 0;
    transition: opacity 0.15s ease;
    white-space: nowrap;
  }

  .container.selected .drag-handle,
  .container:hover .drag-handle {
    opacity: 1;
  }

  .remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    background: #ef4444;
    color: white;
    border: 2px solid white;
    border-radius: 50%;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .container.selected .remove-btn,
  .container:hover .remove-btn {
    opacity: 1;
  }

  .remove-btn:hover {
    background: #dc2626;
  }
`;

export class WidgetContainer extends HTMLElement {
  private placement: WidgetPlacement;
  private callbacks: WidgetContainerCallbacks;
  private cleanupDrag?: () => void;
  private isResizing = false;
  private resizeStartPos?: Position;
  private resizeStartSize?: Size;

  constructor(placement: WidgetPlacement, callbacks: WidgetContainerCallbacks) {
    super();
    this.placement = placement;
    this.callbacks = callbacks;

    this.attachShadow({ mode: 'open' });
    this.render();
    this.setupDragAndDrop();
    this.updatePosition();
  }

  get widgetId(): string {
    return this.placement.id;
  }

  /** Update the placement data */
  updatePlacement(placement: WidgetPlacement): void {
    this.placement = placement;
    this.updatePosition();
    this.updateSelection(false); // Reset selection state
  }

  /** Update visual position/size from placement */
  private updatePosition(): void {
    this.style.left = `${this.placement.position.x}px`;
    this.style.top = `${this.placement.position.y}px`;
    this.style.width = `${this.placement.size.width}px`;
    this.style.height = `${this.placement.size.height}px`;
    this.style.zIndex = String(this.placement.zIndex);
  }

  /** Update selection visual state */
  updateSelection(selected: boolean): void {
    const container = this.shadowRoot?.querySelector('.container');
    if (container) {
      container.classList.toggle('selected', selected);
    }
  }

  /** Render the container */
  private render(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.textContent = CONTAINER_STYLES;

    const container = document.createElement('div');
    container.className = 'container';

    // Drag handle with widget type
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = this.placement.tag;

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onRemove(this.placement.id);
    });

    // Widget content slot
    const content = document.createElement('div');
    content.className = 'widget-content';
    content.appendChild(document.createElement('slot'));

    // Resize handles
    const handles = ['se', 'sw', 'ne', 'nw'];
    for (const pos of handles) {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.addEventListener('mousedown', (e) => this.startResize(e, pos));
      container.appendChild(handle);
    }

    container.appendChild(dragHandle);
    container.appendChild(removeBtn);
    container.appendChild(content);

    // Click to select
    container.addEventListener('mousedown', (e) => {
      if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
        this.callbacks.onSelect(this.placement.id);
      }
    });

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);
  }

  /** Set up drag and drop */
  private setupDragAndDrop(): void {
    const container = this.shadowRoot?.querySelector('.container');
    if (!container) return;

    this.cleanupDrag = draggable({
      element: this,
      dragHandle: container.querySelector('.drag-handle') as HTMLElement,
      getInitialData: () => ({
        type: 'move-widget',
        widgetId: this.placement.id,
        startX: this.placement.position.x,
        startY: this.placement.position.y,
      }),
      onDragStart: () => {
        container.classList.add('dragging');
      },
      onDrop: () => {
        container.classList.remove('dragging');
      },
    });
  }

  /** Handle resize start */
  private startResize(e: MouseEvent, corner: string): void {
    e.preventDefault();
    e.stopPropagation();

    this.isResizing = true;
    this.resizeStartPos = { x: e.clientX, y: e.clientY };
    this.resizeStartSize = { ...this.placement.size };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizing || !this.resizeStartPos || !this.resizeStartSize) return;

      const dx = moveEvent.clientX - this.resizeStartPos.x;
      const dy = moveEvent.clientY - this.resizeStartPos.y;

      let newWidth = this.resizeStartSize.width;
      let newHeight = this.resizeStartSize.height;

      if (corner.includes('e')) newWidth += dx;
      if (corner.includes('w')) newWidth -= dx;
      if (corner.includes('s')) newHeight += dy;
      if (corner.includes('n')) newHeight -= dy;

      // Minimum size
      newWidth = Math.max(80, newWidth);
      newHeight = Math.max(60, newHeight);

      this.style.width = `${newWidth}px`;
      this.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      if (this.isResizing) {
        const newSize: Size = {
          width: parseInt(this.style.width),
          height: parseInt(this.style.height),
        };
        this.callbacks.onResize(this.placement.id, newSize);
      }

      this.isResizing = false;
      this.resizeStartPos = undefined;
      this.resizeStartSize = undefined;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /** Cleanup on disconnect */
  disconnectedCallback(): void {
    if (this.cleanupDrag) {
      this.cleanupDrag();
    }
  }
}

// Register custom element
if (!customElements.get('widget-container')) {
  customElements.define('widget-container', WidgetContainer);
}
