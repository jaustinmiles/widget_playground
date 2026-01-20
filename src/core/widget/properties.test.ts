import { describe, it, expect } from 'vitest';
import {
  coerceValue,
  serializeValue,
  validateProperty,
  validateProperties,
  getDefaultProperties,
  propertyToAttribute,
  attributeToProperty,
} from './properties.js';
import type { PropertyDefinition, PropertySchema } from './types.js';

describe('properties', () => {
  describe('coerceValue', () => {
    it('should coerce string values', () => {
      expect(coerceValue('hello', 'string')).toBe('hello');
      expect(coerceValue(null, 'string')).toBe(undefined);
    });

    it('should coerce number values', () => {
      expect(coerceValue('42', 'number')).toBe(42);
      expect(coerceValue('3.14', 'number')).toBe(3.14);
      expect(coerceValue('invalid', 'number')).toBe(undefined);
    });

    it('should coerce boolean values', () => {
      expect(coerceValue('true', 'boolean')).toBe(true);
      expect(coerceValue('', 'boolean')).toBe(true);
      expect(coerceValue('1', 'boolean')).toBe(true);
      expect(coerceValue('false', 'boolean')).toBe(false);
    });

    it('should coerce array values', () => {
      expect(coerceValue('[1, 2, 3]', 'array')).toEqual([1, 2, 3]);
      expect(coerceValue('invalid', 'array')).toBe(undefined);
    });

    it('should coerce object values', () => {
      expect(coerceValue('{"a": 1}', 'object')).toEqual({ a: 1 });
      expect(coerceValue('invalid', 'object')).toBe(undefined);
    });
  });

  describe('serializeValue', () => {
    it('should serialize string values', () => {
      expect(serializeValue('hello', 'string')).toBe('hello');
    });

    it('should serialize number values', () => {
      expect(serializeValue(42, 'number')).toBe('42');
    });

    it('should serialize boolean values', () => {
      expect(serializeValue(true, 'boolean')).toBe('');
      expect(serializeValue(false, 'boolean')).toBe(null);
    });

    it('should serialize array values', () => {
      expect(serializeValue([1, 2], 'array')).toBe('[1,2]');
    });

    it('should serialize object values', () => {
      expect(serializeValue({ a: 1 }, 'object')).toBe('{"a":1}');
    });

    it('should handle null/undefined', () => {
      expect(serializeValue(null, 'string')).toBe(null);
      expect(serializeValue(undefined, 'string')).toBe(null);
    });
  });

  describe('validateProperty', () => {
    it('should validate required properties', () => {
      const def: PropertyDefinition = { type: 'string', required: true };
      expect(validateProperty('name', undefined, def).valid).toBe(false);
      expect(validateProperty('name', 'value', def).valid).toBe(true);
    });

    it('should validate property types', () => {
      const stringDef: PropertyDefinition = { type: 'string' };
      expect(validateProperty('test', 'hello', stringDef).valid).toBe(true);
      expect(validateProperty('test', 42, stringDef).valid).toBe(false);

      const numberDef: PropertyDefinition = { type: 'number' };
      expect(validateProperty('test', 42, numberDef).valid).toBe(true);
      expect(validateProperty('test', 'hello', numberDef).valid).toBe(false);
    });

    it('should use custom validators', () => {
      const def: PropertyDefinition = {
        type: 'number',
        validator: (v) => (v as number) > 0,
      };
      expect(validateProperty('test', 5, def).valid).toBe(true);
      expect(validateProperty('test', -1, def).valid).toBe(false);
    });
  });

  describe('validateProperties', () => {
    it('should validate all properties in schema', () => {
      const schema: PropertySchema = {
        name: { type: 'string', required: true },
        count: { type: 'number' },
      };

      const valid = validateProperties({ name: 'test', count: 5 }, schema);
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);

      const invalid = validateProperties({ count: 'wrong' }, schema);
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultProperties', () => {
    it('should return default values', () => {
      const schema: PropertySchema = {
        name: { type: 'string', default: 'default' },
        count: { type: 'number', default: 0 },
        optional: { type: 'boolean' },
      };

      const defaults = getDefaultProperties(schema);
      expect(defaults).toEqual({ name: 'default', count: 0 });
    });
  });

  describe('propertyToAttribute / attributeToProperty', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(propertyToAttribute('myProperty')).toBe('my-property');
      expect(propertyToAttribute('aBC')).toBe('a-b-c');
    });

    it('should convert kebab-case to camelCase', () => {
      expect(attributeToProperty('my-property')).toBe('myProperty');
      expect(attributeToProperty('a-b-c')).toBe('aBC');
    });
  });
});
