import { describe, it, expect, beforeAll, vi } from 'vitest';
import { BaseWidget } from './BaseWidget.js';
import { initTailwindStyles } from './styles.js';

// Initialize Tailwind before tests
beforeAll(async () => {
  await initTailwindStyles();
});

// Test widget implementation
class CounterWidget extends BaseWidget {
  static tag = 'counter-widget';
  static properties = {
    count: { type: 'number' as const, default: 0 },
    label: { type: 'string' as const, default: 'Count' },
    disabled: { type: 'boolean' as const, default: false },
  };
  static styles = `
    .counter { padding: 1rem; }
    .value { font-size: 2rem; }
  `;

  render() {
    const count = this.getProperty<number>('count');
    const label = this.getProperty<string>('label');
    return `
      <div class="counter">
        <span class="label">${label}:</span>
        <span class="value">${count}</span>
      </div>
    `;
  }
}

// Register the test widget
if (!customElements.get('counter-widget')) {
  customElements.define('counter-widget', CounterWidget);
}

describe('BaseWidget', () => {
  describe('Shadow DOM', () => {
    it('should create shadow DOM on instantiation', () => {
      const widget = document.createElement('counter-widget') as CounterWidget;
      expect(widget.shadowRoot).toBeDefined();
      expect(widget.shadowRoot?.mode).toBe('open');
    });

    it('should render content into shadow DOM', async () => {
      const widget = document.createElement('counter-widget') as CounterWidget;
      document.body.appendChild(widget);

      // Wait for render
      await new Promise(resolve => requestAnimationFrame(resolve));

      const content = widget.shadowRoot?.querySelector('.widget-content');
      expect(content).toBeDefined();
      expect(content?.innerHTML).toContain('Count:');
      expect(content?.innerHTML).toContain('0');
    });
  });

  describe('Properties', () => {
    it('should have default property values', () => {
      const widget = document.createElement('counter-widget') as CounterWidget;

      const props = widget.getProperties();
      expect(props.count).toBe(0);
      expect(props.label).toBe('Count');
      expect(props.disabled).toBe(false);
    });

    it('should parse attributes into properties', async () => {
      const widget = document.createElement('counter-widget') as CounterWidget;
      widget.setAttribute('count', '10');
      widget.setAttribute('label', 'Items');
      widget.setAttribute('disabled', '');

      document.body.appendChild(widget);
      await new Promise(resolve => requestAnimationFrame(resolve));

      const props = widget.getProperties();
      expect(props.count).toBe(10);
      expect(props.label).toBe('Items');
      expect(props.disabled).toBe(true);
    });

    it('should set multiple properties at once', () => {
      const widget = document.createElement('counter-widget') as CounterWidget;

      widget.setProperties({
        count: 5,
        label: 'Test',
      });

      expect(widget.getProperties().count).toBe(5);
      expect(widget.getProperties().label).toBe('Test');
    });

    it('should reflect properties to attributes', () => {
      const widget = document.createElement('counter-widget') as CounterWidget;

      widget.setProperties({ count: 42 });

      expect(widget.getAttribute('count')).toBe('42');
    });
  });

  describe('Events', () => {
    it('should emit property-change event', async () => {
      const widget = document.createElement('counter-widget') as CounterWidget;
      document.body.appendChild(widget);

      const handler = vi.fn();
      widget.addEventListener('property-change', handler);

      widget.setProperties({ count: 5 });

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.detail.property).toBe('count');
      expect(event.detail.detail.newValue).toBe(5);
    });

    it('should emit ready event on connect', async () => {
      const handler = vi.fn();
      const widget = document.createElement('counter-widget') as CounterWidget;
      widget.addEventListener('ready', handler);

      document.body.appendChild(widget);
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should re-render on property change', async () => {
      const widget = document.createElement('counter-widget') as CounterWidget;
      document.body.appendChild(widget);
      await new Promise(resolve => requestAnimationFrame(resolve));

      widget.setProperties({ count: 99 });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const content = widget.shadowRoot?.querySelector('.widget-content');
      expect(content?.innerHTML).toContain('99');
    });
  });

  describe('Attribute observation', () => {
    it('should observe declared attributes', () => {
      const observed = CounterWidget.observedAttributes;

      expect(observed).toContain('count');
      expect(observed).toContain('label');
      expect(observed).toContain('disabled');
    });

    it('should update property when attribute changes', async () => {
      const widget = document.createElement('counter-widget') as CounterWidget;
      document.body.appendChild(widget);

      widget.setAttribute('count', '25');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(widget.getProperties().count).toBe(25);
    });
  });
});
