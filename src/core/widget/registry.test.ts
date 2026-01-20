import { describe, it, expect, beforeEach } from 'vitest';
import { widgetRegistry } from './registry.js';
import { BaseWidget } from './BaseWidget.js';

// Test widget class
class TestWidget extends BaseWidget {
  static tag = 'test-widget';
  static properties = {
    label: { type: 'string' as const, default: 'Test' },
    count: { type: 'number' as const, default: 0 },
  };

  render() {
    return `<div>${this.getProperty('label')}: ${this.getProperty('count')}</div>`;
  }
}

// Another test widget
class AnotherWidget extends BaseWidget {
  static tag = 'another-widget';
  static properties = {
    value: { type: 'string' as const },
  };

  render() {
    return `<span>${this.getProperty('value')}</span>`;
  }
}

describe('widgetRegistry', () => {
  beforeEach(() => {
    widgetRegistry.clear();
  });

  describe('register', () => {
    it('should register a widget class', () => {
      widgetRegistry.register(TestWidget, { category: 'Test' });

      expect(widgetRegistry.has('test-widget')).toBe(true);
    });

    it('should create metadata from class', () => {
      widgetRegistry.register(TestWidget, {
        name: 'My Test Widget',
        description: 'A test widget',
        category: 'Testing',
      });

      const widget = widgetRegistry.get('test-widget');
      expect(widget).toBeDefined();
      expect(widget?.metadata.name).toBe('My Test Widget');
      expect(widget?.metadata.description).toBe('A test widget');
      expect(widget?.metadata.category).toBe('Testing');
      expect(widget?.metadata.properties).toBe(TestWidget.properties);
    });

    it('should generate name from tag if not provided', () => {
      widgetRegistry.register(TestWidget);

      const widget = widgetRegistry.get('test-widget');
      expect(widget?.metadata.name).toBe('Test Widget');
    });

    it('should not register duplicate tags', () => {
      widgetRegistry.register(TestWidget);
      widgetRegistry.register(TestWidget); // Should warn but not throw

      expect(widgetRegistry.getAll()).toHaveLength(1);
    });
  });

  describe('get / has', () => {
    it('should return registered widget', () => {
      widgetRegistry.register(TestWidget);

      const widget = widgetRegistry.get('test-widget');
      expect(widget).toBeDefined();
      expect(widget?.ctor).toBe(TestWidget);
    });

    it('should return undefined for unregistered widget', () => {
      expect(widgetRegistry.get('nonexistent')).toBeUndefined();
      expect(widgetRegistry.has('nonexistent')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered widgets', () => {
      widgetRegistry.register(TestWidget);
      widgetRegistry.register(AnotherWidget);

      const all = widgetRegistry.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('getByCategory', () => {
    it('should filter widgets by category', () => {
      widgetRegistry.register(TestWidget, { category: 'Display' });
      widgetRegistry.register(AnotherWidget, { category: 'Input' });

      const display = widgetRegistry.getByCategory('Display');
      expect(display).toHaveLength(1);
      expect(display[0].metadata.tag).toBe('test-widget');
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', () => {
      widgetRegistry.register(TestWidget, { category: 'Display' });
      widgetRegistry.register(AnotherWidget, { category: 'Input' });

      const categories = widgetRegistry.getCategories();
      expect(categories).toContain('Display');
      expect(categories).toContain('Input');
      expect(categories).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should create widget instance', () => {
      widgetRegistry.register(TestWidget);

      const element = widgetRegistry.create('test-widget');
      expect(element).toBeInstanceOf(TestWidget);
    });

    it('should set initial properties', () => {
      widgetRegistry.register(TestWidget);

      const element = widgetRegistry.create('test-widget', {
        label: 'Custom',
        count: 5,
      });

      expect(element?.getProperties()).toEqual({
        label: 'Custom',
        count: 5,
      });
    });

    it('should return null for unregistered widget', () => {
      const element = widgetRegistry.create('nonexistent');
      expect(element).toBeNull();
    });
  });

  describe('unregister / clear', () => {
    it('should unregister a widget', () => {
      widgetRegistry.register(TestWidget);
      expect(widgetRegistry.has('test-widget')).toBe(true);

      widgetRegistry.unregister('test-widget');
      expect(widgetRegistry.has('test-widget')).toBe(false);
    });

    it('should clear all widgets', () => {
      widgetRegistry.register(TestWidget);
      widgetRegistry.register(AnotherWidget);

      widgetRegistry.clear();
      expect(widgetRegistry.getAll()).toHaveLength(0);
    });
  });
});
