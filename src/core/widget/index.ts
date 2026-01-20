/**
 * Widget System - Public API
 */

export { BaseWidget } from './BaseWidget.js';
export { widgetRegistry, widget } from './registry.js';
export {
  initTailwindStyles,
  getTailwindSheet,
  createWidgetStylesheet,
  applyStylesToShadow,
  supportsAdoptedStyleSheets,
  BASE_WIDGET_STYLES,
} from './styles.js';
export {
  coerceValue,
  serializeValue,
  validateProperty,
  validateProperties,
  getDefaultProperties,
  propertyToAttribute,
  attributeToProperty,
} from './properties.js';
export type {
  PropertyType,
  PropertyDefinition,
  PropertySchema,
  WidgetMetadata,
  WidgetInstance,
  DataBinding,
  WidgetEvent,
  WidgetEventType,
} from './types.js';
