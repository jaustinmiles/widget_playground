/**
 * BaseWidget - Foundation class for all widgets
 *
 * Features:
 * - Shadow DOM encapsulation
 * - Tailwind CSS injection via Constructable Stylesheets
 * - Type-safe property system
 * - Lifecycle hooks
 */

import type { PropertySchema, WidgetEvent, WidgetEventType } from './types.js';
import {
  coerceValue,
  serializeValue,
  validateProperty,
  getDefaultProperties,
  propertyToAttribute,
  attributeToProperty,
} from './properties.js';
import {
  getTailwindSheet,
  createWidgetStylesheet,
  applyStylesToShadow,
  BASE_WIDGET_STYLES,
} from './styles.js';

export abstract class BaseWidget extends HTMLElement {
  /** Property schema - override in subclasses */
  static properties: PropertySchema = {};

  /** Widget tag name */
  static tag: string = 'base-widget';

  /** Custom CSS for this widget */
  static styles: string = '';

  private _properties: Record<string, unknown> = {};
  private _initialized = false;
  private _baseStylesheet: CSSStyleSheet;
  private _customStylesheet: CSSStyleSheet | null = null;

  constructor() {
    super();

    // Create Shadow DOM
    this.attachShadow({ mode: 'open' });

    // Initialize base stylesheet
    this._baseStylesheet = new CSSStyleSheet();
    this._baseStylesheet.replaceSync(BASE_WIDGET_STYLES);

    // Set default property values
    const ctor = this.constructor as typeof BaseWidget;
    this._properties = getDefaultProperties(ctor.properties);
  }

  /**
   * Web Component lifecycle - element added to DOM
   */
  connectedCallback(): void {
    if (!this._initialized) {
      this._initialize();
    }
    this.onConnect();
  }

  /**
   * Web Component lifecycle - element removed from DOM
   */
  disconnectedCallback(): void {
    this.onDisconnect();
  }

  /**
   * Web Component lifecycle - attribute changed
   */
  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;

    const propName = attributeToProperty(name);
    const ctor = this.constructor as typeof BaseWidget;
    const propDef = ctor.properties[propName];

    if (propDef) {
      const coerced = coerceValue(newValue, propDef.type);
      this._setProperty(propName, coerced, false);
    }
  }

  /**
   * Observed attributes - derived from property schema
   */
  static get observedAttributes(): string[] {
    return Object.keys(this.properties).map(propertyToAttribute);
  }

  /**
   * Initialize the widget
   */
  private _initialize(): void {
    this._initialized = true;

    // Apply stylesheets to Shadow DOM
    const sheets: CSSStyleSheet[] = [this._baseStylesheet];

    // Add Tailwind if available
    const tailwind = getTailwindSheet();
    if (tailwind) {
      sheets.push(tailwind);
    }

    // Add custom widget styles
    const ctor = this.constructor as typeof BaseWidget;
    if (ctor.styles) {
      this._customStylesheet = createWidgetStylesheet(ctor.styles);
      sheets.push(this._customStylesheet);
    }

    applyStylesToShadow(this.shadowRoot!, ...sheets);

    // Parse initial attributes
    this._parseAttributes();

    // Call lifecycle hook
    this.onInit();

    // Initial render
    this.requestRender();

    // Emit ready event
    this.emit('ready', {});
  }

  /**
   * Parse attributes into properties
   */
  private _parseAttributes(): void {
    const ctor = this.constructor as typeof BaseWidget;

    for (const [propName, propDef] of Object.entries(ctor.properties)) {
      const attrName = propertyToAttribute(propName);
      const attrValue = this.getAttribute(attrName);

      if (attrValue !== null) {
        const coerced = coerceValue(attrValue, propDef.type);
        if (coerced !== undefined) {
          this._properties[propName] = coerced;
        }
      }
    }
  }

  /**
   * Internal property setter
   */
  private _setProperty(
    name: string,
    value: unknown,
    reflectToAttribute = true
  ): void {
    const ctor = this.constructor as typeof BaseWidget;
    const propDef = ctor.properties[name];

    if (!propDef) {
      console.warn(`Unknown property "${name}" on ${ctor.tag}`);
      return;
    }

    // Validate
    const validation = validateProperty(name, value, propDef);
    if (!validation.valid) {
      console.error(validation.error);
      this.emit('error', { message: validation.error });
      return;
    }

    const oldValue = this._properties[name];
    if (oldValue === value) return;

    this._properties[name] = value;

    // Reflect to attribute if needed
    if (reflectToAttribute) {
      const attrName = propertyToAttribute(name);
      const serialized = serializeValue(value, propDef.type);

      if (serialized === null) {
        this.removeAttribute(attrName);
      } else {
        this.setAttribute(attrName, serialized);
      }
    }

    // Emit change event
    this.emit('property-change', { property: name, oldValue, newValue: value });

    // Trigger re-render
    if (this._initialized) {
      this.onPropertyChange(name, oldValue, value);
      this.requestRender();
    }
  }

  /**
   * Get a property value
   */
  protected getProperty<T>(name: string): T | undefined {
    return this._properties[name] as T | undefined;
  }

  /**
   * Set a property value
   */
  protected setProperty(name: string, value: unknown): void {
    this._setProperty(name, value, true);
  }

  /**
   * Get all properties
   */
  getProperties(): Record<string, unknown> {
    return { ...this._properties };
  }

  /**
   * Set multiple properties at once
   */
  setProperties(props: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(props)) {
      this.setProperty(key, value);
    }
  }

  /**
   * Emit a widget event
   */
  protected emit<T>(type: WidgetEventType, detail: T): void {
    const event: WidgetEvent<T> = {
      type,
      detail,
      timestamp: Date.now(),
    };

    this.dispatchEvent(
      new CustomEvent(type, {
        detail: event,
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Request a render on the next animation frame
   */
  private _renderPending = false;
  protected requestRender(): void {
    if (this._renderPending) return;

    this._renderPending = true;
    requestAnimationFrame(() => {
      this._renderPending = false;
      this._doRender();
    });
  }

  /**
   * Perform the render
   */
  private _doRender(): void {
    const content = this.render();
    if (this.shadowRoot) {
      // Preserve stylesheets, only update content
      const container =
        this.shadowRoot.querySelector('.widget-content') ||
        document.createElement('div');

      if (!container.parentNode) {
        container.className = 'widget-content';
        this.shadowRoot.appendChild(container);
      }

      if (typeof content === 'string') {
        container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        container.innerHTML = '';
        container.appendChild(content);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle hooks - override in subclasses
  // ─────────────────────────────────────────────────────────────────

  /** Called once when widget is first initialized */
  protected onInit(): void {}

  /** Called when widget is added to DOM */
  protected onConnect(): void {}

  /** Called when widget is removed from DOM */
  protected onDisconnect(): void {}

  /** Called when a property changes */
  protected onPropertyChange(
    _name: string,
    _oldValue: unknown,
    _newValue: unknown
  ): void {}

  /** Render the widget content - must be implemented by subclasses */
  protected abstract render(): string | HTMLElement;
}
