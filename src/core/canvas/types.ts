/**
 * Canvas system type definitions
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface WidgetPlacement {
  id: string;
  tag: string;
  position: Position;
  size: Size;
  properties: Record<string, unknown>;
  zIndex: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
  gridSize?: number;
  snapToGrid?: boolean;
  showGrid?: boolean;
}

export interface CanvasSnapshot {
  id: string;
  name: string;
  timestamp: number;
  config: CanvasConfig;
  widgets: WidgetPlacement[];
}

export type CanvasEventType =
  | 'widget-add'
  | 'widget-remove'
  | 'widget-move'
  | 'widget-resize'
  | 'widget-select'
  | 'widget-deselect'
  | 'canvas-change';

export interface CanvasEvent<T = unknown> {
  type: CanvasEventType;
  detail: T;
  timestamp: number;
}

export interface DragData {
  type: 'new-widget' | 'move-widget';
  tag?: string;
  widgetId?: string;
  offset?: Position;
}
