/**
 * Canvas type definitions
 */

import type { WidgetConfig, Position, Size } from './widget.types';
import type { ProviderConfig, DataQuery } from './data.types';

/**
 * Canvas item representing a placed widget
 */
export interface CanvasItemState {
  id: string;
  widgetType: string;
  config: WidgetConfig;
  dataBinding?: DataBinding;
  zIndex: number;
}

export interface DataBinding {
  providerId: string;
  query?: DataQuery;
}

/**
 * Complete canvas state (serializable)
 */
export interface CanvasState {
  version: string;
  items: CanvasItemState[];
  providers: ProviderConfig[];
  layout: LayoutConfig;
  viewport: ViewportState;
}

export interface LayoutConfig {
  mode: 'free' | 'grid';
  gridSize?: number;
  snapToGrid: boolean;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Canvas events
 */
export interface CanvasEvents {
  'canvas:item-added': { item: CanvasItemState };
  'canvas:item-removed': { itemId: string };
  'canvas:item-moved': { itemId: string; position: Position };
  'canvas:item-resized': { itemId: string; size: Size };
  'canvas:state-change': { state: CanvasState };
  'canvas:save': { state: CanvasState };
  'canvas:load': { state: CanvasState };
}

/**
 * Drag source types for canvas
 */
export type DragSource =
  | { type: 'widget-palette'; widgetType: string }
  | { type: 'canvas-item'; itemId: string }
  | { type: 'provider-palette'; providerType: string };

/**
 * Drop target data
 */
export interface DropTargetData {
  position: Position;
  snapped: boolean;
}
