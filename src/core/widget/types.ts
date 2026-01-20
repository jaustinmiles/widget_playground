/**
 * Core type definitions for the widget system
 */

export type PropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface PropertyDefinition {
  type: PropertyType;
  default?: unknown;
  required?: boolean;
  validator?: (value: unknown) => boolean;
  description?: string;
}

export interface PropertySchema {
  [key: string]: PropertyDefinition;
}

export interface WidgetMetadata {
  name: string;
  tag: string;
  description?: string;
  icon?: string;
  category?: string;
  properties: PropertySchema;
}

export interface WidgetInstance {
  id: string;
  tag: string;
  properties: Record<string, unknown>;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface DataBinding {
  widgetId: string;
  property: string;
  providerId: string;
  path: string;
}

export type WidgetEventType =
  | 'property-change'
  | 'data-update'
  | 'resize'
  | 'ready'
  | 'error';

export interface WidgetEvent<T = unknown> {
  type: WidgetEventType;
  detail: T;
  timestamp: number;
}
