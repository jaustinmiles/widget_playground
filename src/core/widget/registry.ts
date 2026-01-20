/**
 * Widget Registry - Central hub for widget registration and discovery
 */

import type { BaseWidget } from './BaseWidget.js';
import type { WidgetMetadata, PropertySchema } from './types.js';
import { initTailwindStyles } from './styles.js';

type WidgetClass = typeof BaseWidget & {
  new (): BaseWidget;
  tag: string;
  properties: PropertySchema;
  styles?: string;
  widgetMeta?: WidgetMetadata;
};

interface RegisteredWidget {
  ctor: WidgetClass;
  metadata: WidgetMetadata;
}

class WidgetRegistry {
  private widgets = new Map<string, RegisteredWidget>();
  private initialized = false;

  /**
   * Initialize the registry - must be called before widgets render
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize Tailwind styles for Shadow DOM
    await initTailwindStyles();

    this.initialized = true;
  }

  /**
   * Register a widget class
   */
  register(
    ctor: WidgetClass,
    metadata?: Partial<Omit<WidgetMetadata, 'tag' | 'properties'>>
  ): void {
    const tag = ctor.tag;

    if (!tag) {
      throw new Error('Widget class must have a static "tag" property');
    }

    if (this.widgets.has(tag)) {
      console.warn(`Widget "${tag}" is already registered, skipping`);
      return;
    }

    // Build full metadata
    const fullMetadata: WidgetMetadata = {
      name: metadata?.name || this.tagToName(tag),
      tag,
      description: metadata?.description,
      icon: metadata?.icon,
      category: metadata?.category || 'General',
      properties: ctor.properties,
    };

    // Set widgetMeta on the constructor for easy access
    (ctor as WidgetClass).widgetMeta = fullMetadata;

    // Register the custom element
    if (!customElements.get(tag)) {
      customElements.define(tag, ctor);
    }

    this.widgets.set(tag, {
      ctor,
      metadata: fullMetadata,
    });
  }

  /**
   * Get a registered widget by tag
   */
  get(tag: string): RegisteredWidget | undefined {
    return this.widgets.get(tag);
  }

  /**
   * Check if a widget is registered
   */
  has(tag: string): boolean {
    return this.widgets.has(tag);
  }

  /**
   * Get all registered widgets
   */
  getAll(): RegisteredWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by category
   */
  getByCategory(category: string): RegisteredWidget[] {
    return this.getAll().filter(w => w.metadata.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const widget of this.widgets.values()) {
      if (widget.metadata.category) {
        categories.add(widget.metadata.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Create a widget instance
   */
  create(tag: string, properties?: Record<string, unknown>): BaseWidget | null {
    const widget = this.get(tag);
    if (!widget) {
      console.error(`Widget "${tag}" not found in registry`);
      return null;
    }

    const element = document.createElement(tag) as BaseWidget;

    if (properties) {
      element.setProperties(properties);
    }

    return element;
  }

  /**
   * Convert tag to display name (e.g., "my-widget" -> "My Widget")
   */
  private tagToName(tag: string): string {
    return tag
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Unregister a widget (mainly for testing)
   */
  unregister(tag: string): boolean {
    return this.widgets.delete(tag);
  }

  /**
   * Clear all registered widgets (mainly for testing)
   */
  clear(): void {
    this.widgets.clear();
  }
}

// Export singleton instance
export const widgetRegistry = new WidgetRegistry();

/**
 * Decorator for registering widget classes
 * Usage: @widget({ name: 'My Widget', category: 'Display' })
 */
export function widget(metadata?: Partial<Omit<WidgetMetadata, 'tag' | 'properties'>>) {
  return function <T extends WidgetClass>(ctor: T): T {
    widgetRegistry.register(ctor, metadata);
    return ctor;
  };
}
