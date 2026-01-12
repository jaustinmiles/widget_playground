/**
 * Widget type definitions
 */

/**
 * Metadata describing a widget for registration and canvas display
 */
export interface WidgetMetadata {
  /** Unique identifier for the widget type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description for widget picker */
  description: string;
  /** Icon (SVG string or URL) */
  icon: string;
  /** Category for organization */
  category: WidgetCategory;
  /** Default dimensions */
  defaultSize: Size;
  /** Data schema this widget accepts (JSON Schema) */
  dataSchema?: DataSchema;
  /** Whether widget requires data binding */
  requiresData: boolean;
}

export type WidgetCategory = 'visualization' | 'utility' | 'input' | 'layout';

/**
 * Configuration passed to widget instances
 */
export interface WidgetConfig<TSettings = unknown> {
  /** Unique instance ID */
  instanceId: string;
  /** User-customizable settings */
  settings: TSettings;
  /** Position on canvas */
  position: Position;
  /** Current dimensions */
  size: Size;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * JSON Schema subset for data validation
 */
export interface DataSchema {
  type: 'object' | 'array';
  properties?: Record<string, SchemaProperty>;
  items?: DataSchema;
  required?: string[];
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  default?: unknown;
}

/**
 * Events emitted by widgets
 */
export interface WidgetEvents {
  'widget:ready': { instanceId: string };
  'widget:error': { instanceId: string; error: Error };
  'widget:resize': { instanceId: string; size: Size };
  'widget:settings-change': { instanceId: string; settings: unknown };
  'widget:data-request': { instanceId: string; query?: unknown };
}

/**
 * Widget registration entry
 */
export interface WidgetRegistration {
  metadata: WidgetMetadata;
  tagName: string;
  constructor: CustomElementConstructor;
}
