/**
 * Canvas State Manager
 *
 * Manages widget placements, selection, and canvas configuration.
 * Provides undo/redo and snapshot functionality.
 */

import type {
  WidgetPlacement,
  CanvasConfig,
  CanvasSnapshot,
  Position,
  Size,
  CanvasEvent,
  CanvasEventType,
} from './types.js';

const DEFAULT_CONFIG: CanvasConfig = {
  width: 1200,
  height: 800,
  gridSize: 20,
  snapToGrid: true,
  showGrid: true,
};

const DEFAULT_WIDGET_SIZE: Size = {
  width: 200,
  height: 150,
};

export class CanvasState extends EventTarget {
  private _config: CanvasConfig;
  private _widgets: Map<string, WidgetPlacement> = new Map();
  private _selectedId: string | null = null;
  private _nextZIndex = 1;
  private _history: CanvasSnapshot[] = [];
  private _historyIndex = -1;
  private _maxHistory = 50;

  constructor(config?: Partial<CanvasConfig>) {
    super();
    this._config = { ...DEFAULT_CONFIG, ...config };
    // Save initial empty state for undo
    this._history.push(this.createSnapshot('Initial'));
    this._historyIndex = 0;
  }

  /** Current canvas configuration */
  get config(): CanvasConfig {
    return { ...this._config };
  }

  /** All widget placements */
  get widgets(): WidgetPlacement[] {
    return Array.from(this._widgets.values());
  }

  /** Currently selected widget ID */
  get selectedId(): string | null {
    return this._selectedId;
  }

  /** Currently selected widget */
  get selectedWidget(): WidgetPlacement | null {
    return this._selectedId ? this._widgets.get(this._selectedId) || null : null;
  }

  /** Check if can undo */
  get canUndo(): boolean {
    return this._historyIndex > 0;
  }

  /** Check if can redo */
  get canRedo(): boolean {
    return this._historyIndex < this._history.length - 1;
  }

  /**
   * Update canvas configuration
   */
  setConfig(config: Partial<CanvasConfig>): void {
    this._config = { ...this._config, ...config };
    this.emit('canvas-change', { config: this._config });
  }

  /**
   * Add a widget to the canvas
   */
  addWidget(
    tag: string,
    position?: Position,
    size?: Size,
    properties?: Record<string, unknown>
  ): WidgetPlacement {
    const id = this.generateId();
    const placement: WidgetPlacement = {
      id,
      tag,
      position: this.snapPosition(position || { x: 100, y: 100 }),
      size: size || { ...DEFAULT_WIDGET_SIZE },
      properties: properties || {},
      zIndex: this._nextZIndex++,
    };

    this._widgets.set(id, placement);
    this.saveHistory();
    this.emit('widget-add', { widget: placement });

    return placement;
  }

  /**
   * Remove a widget from the canvas
   */
  removeWidget(id: string): boolean {
    const widget = this._widgets.get(id);
    if (!widget) return false;

    this._widgets.delete(id);
    if (this._selectedId === id) {
      this._selectedId = null;
      this.emit('widget-deselect', { widgetId: id });
    }

    this.saveHistory();
    this.emit('widget-remove', { widget });

    return true;
  }

  /**
   * Move a widget to a new position
   */
  moveWidget(id: string, position: Position): boolean {
    const widget = this._widgets.get(id);
    if (!widget) return false;

    const snapped = this.snapPosition(position);
    const oldPosition = widget.position;
    widget.position = snapped;

    this.saveHistory();
    this.emit('widget-move', { widgetId: id, oldPosition, newPosition: snapped });

    return true;
  }

  /**
   * Resize a widget
   */
  resizeWidget(id: string, size: Size): boolean {
    const widget = this._widgets.get(id);
    if (!widget) return false;

    const snapped = this.snapSize(size);
    const oldSize = widget.size;
    widget.size = snapped;

    this.saveHistory();
    this.emit('widget-resize', { widgetId: id, oldSize, newSize: snapped });

    return true;
  }

  /**
   * Update widget properties
   */
  updateWidgetProperties(id: string, properties: Record<string, unknown>): boolean {
    const widget = this._widgets.get(id);
    if (!widget) return false;

    widget.properties = { ...widget.properties, ...properties };
    this.emit('canvas-change', { widgetId: id, properties });

    return true;
  }

  /**
   * Select a widget
   */
  selectWidget(id: string | null): void {
    const oldSelected = this._selectedId;

    if (oldSelected && oldSelected !== id) {
      this.emit('widget-deselect', { widgetId: oldSelected });
    }

    this._selectedId = id;

    if (id) {
      // Bring to front
      const widget = this._widgets.get(id);
      if (widget) {
        widget.zIndex = this._nextZIndex++;
      }
      this.emit('widget-select', { widgetId: id });
    }
  }

  /**
   * Get a widget by ID
   */
  getWidget(id: string): WidgetPlacement | undefined {
    return this._widgets.get(id);
  }

  /**
   * Snap position to grid if enabled
   */
  private snapPosition(position: Position): Position {
    if (!this._config.snapToGrid || !this._config.gridSize) {
      return position;
    }

    const grid = this._config.gridSize;
    return {
      x: Math.round(position.x / grid) * grid,
      y: Math.round(position.y / grid) * grid,
    };
  }

  /**
   * Snap size to grid if enabled
   */
  private snapSize(size: Size): Size {
    if (!this._config.snapToGrid || !this._config.gridSize) {
      return size;
    }

    const grid = this._config.gridSize;
    return {
      width: Math.max(grid, Math.round(size.width / grid) * grid),
      height: Math.max(grid, Math.round(size.height / grid) * grid),
    };
  }

  /**
   * Generate a unique widget ID
   */
  private generateId(): string {
    return `widget-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot(name?: string): CanvasSnapshot {
    return {
      id: `snapshot-${Date.now()}`,
      name: name || `Snapshot ${this._history.length + 1}`,
      timestamp: Date.now(),
      config: { ...this._config },
      widgets: this.widgets.map(w => ({ ...w })),
    };
  }

  /**
   * Restore from a snapshot
   */
  restoreSnapshot(snapshot: CanvasSnapshot): void {
    this._config = { ...snapshot.config };
    this._widgets.clear();
    this._selectedId = null;
    this._nextZIndex = 1;

    for (const widget of snapshot.widgets) {
      this._widgets.set(widget.id, { ...widget });
      if (widget.zIndex >= this._nextZIndex) {
        this._nextZIndex = widget.zIndex + 1;
      }
    }

    this.emit('canvas-change', { restored: true });
  }

  /**
   * Save current state to history
   */
  private saveHistory(): void {
    // Remove any future history if we're not at the end
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }

    // Add current state
    this._history.push(this.createSnapshot());
    this._historyIndex = this._history.length - 1;

    // Limit history size
    if (this._history.length > this._maxHistory) {
      this._history.shift();
      this._historyIndex--;
    }
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    if (!this.canUndo) return false;

    this._historyIndex--;
    this.restoreSnapshot(this._history[this._historyIndex]);
    return true;
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    if (!this.canRedo) return false;

    this._historyIndex++;
    this.restoreSnapshot(this._history[this._historyIndex]);
    return true;
  }

  /**
   * Clear all widgets
   */
  clear(): void {
    this._widgets.clear();
    this._selectedId = null;
    this._nextZIndex = 1;
    this.saveHistory();
    this.emit('canvas-change', { cleared: true });
  }

  /**
   * Emit a canvas event
   */
  private emit<T>(type: CanvasEventType, detail: T): void {
    const event: CanvasEvent<T> = {
      type,
      detail,
      timestamp: Date.now(),
    };

    this.dispatchEvent(new CustomEvent(type, { detail: event }));
  }

  /**
   * Export state as JSON
   */
  toJSON(): CanvasSnapshot {
    return this.createSnapshot('Export');
  }

  /**
   * Import state from JSON
   */
  fromJSON(data: CanvasSnapshot): void {
    this.restoreSnapshot(data);
    this.saveHistory();
  }
}
