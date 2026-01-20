/**
 * Property system for widgets with type validation
 */

import type { PropertyDefinition, PropertySchema, PropertyType } from './types.js';

/**
 * Validate a value against a property type
 */
function validateType(value: unknown, type: PropertyType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Coerce a string value to the expected type (for attribute parsing)
 */
export function coerceValue(value: string | null, type: PropertyType): unknown {
  if (value === null) {
    return undefined;
  }

  switch (type) {
    case 'string':
      return value;
    case 'number': {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    case 'boolean':
      return value === '' || value === 'true' || value === '1';
    case 'array':
    case 'object':
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    default:
      return value;
  }
}

/**
 * Convert a property value to a string for attribute serialization
 */
export function serializeValue(value: unknown, type: PropertyType): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  switch (type) {
    case 'string':
      return String(value);
    case 'number':
      return String(value);
    case 'boolean':
      return value ? '' : null;
    case 'array':
    case 'object':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

/**
 * Validate a value against a property definition
 */
export function validateProperty(
  name: string,
  value: unknown,
  definition: PropertyDefinition
): { valid: boolean; error?: string } {
  // Check required
  if (definition.required && (value === undefined || value === null)) {
    return { valid: false, error: `Property "${name}" is required` };
  }

  // Allow undefined/null for optional properties
  if (value === undefined || value === null) {
    return { valid: true };
  }

  // Check type
  if (!validateType(value, definition.type)) {
    return {
      valid: false,
      error: `Property "${name}" must be of type ${definition.type}`,
    };
  }

  // Check custom validator
  if (definition.validator && !definition.validator(value)) {
    return {
      valid: false,
      error: `Property "${name}" failed validation`,
    };
  }

  return { valid: true };
}

/**
 * Get default values for a property schema
 */
export function getDefaultProperties(schema: PropertySchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    if (def.default !== undefined) {
      defaults[key] = def.default;
    }
  }

  return defaults;
}

/**
 * Validate all properties against a schema
 */
export function validateProperties(
  properties: Record<string, unknown>,
  schema: PropertySchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, def] of Object.entries(schema)) {
    const result = validateProperty(key, properties[key], def);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert property name to attribute name (camelCase -> kebab-case)
 */
export function propertyToAttribute(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Convert attribute name to property name (kebab-case -> camelCase)
 */
export function attributeToProperty(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
