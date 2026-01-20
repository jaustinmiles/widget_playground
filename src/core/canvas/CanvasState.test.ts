import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasState } from './CanvasState.js';

describe('CanvasState', () => {
  let state: CanvasState;

  beforeEach(() => {
    state = new CanvasState();
  });

  describe('configuration', () => {
    it('should have default config', () => {
      expect(state.config.width).toBe(1200);
      expect(state.config.height).toBe(800);
      expect(state.config.gridSize).toBe(20);
      expect(state.config.snapToGrid).toBe(true);
    });

    it('should accept custom config', () => {
      const custom = new CanvasState({ width: 800, height: 600 });
      expect(custom.config.width).toBe(800);
      expect(custom.config.height).toBe(600);
    });

    it('should update config', () => {
      state.setConfig({ showGrid: false });
      expect(state.config.showGrid).toBe(false);
      expect(state.config.width).toBe(1200); // Others unchanged
    });
  });

  describe('widget management', () => {
    it('should add widget', () => {
      const widget = state.addWidget('test-widget');

      expect(widget.tag).toBe('test-widget');
      expect(widget.id).toBeDefined();
      expect(state.widgets).toHaveLength(1);
    });

    it('should add widget with custom position', () => {
      const widget = state.addWidget('test-widget', { x: 100, y: 200 });

      expect(widget.position.x).toBe(100);
      expect(widget.position.y).toBe(200);
    });

    it('should snap position to grid', () => {
      const widget = state.addWidget('test-widget', { x: 105, y: 213 });

      // Should snap to nearest 20px
      expect(widget.position.x).toBe(100);
      expect(widget.position.y).toBe(220);
    });

    it('should not snap when disabled', () => {
      state.setConfig({ snapToGrid: false });
      const widget = state.addWidget('test-widget', { x: 105, y: 213 });

      expect(widget.position.x).toBe(105);
      expect(widget.position.y).toBe(213);
    });

    it('should remove widget', () => {
      const widget = state.addWidget('test-widget');
      expect(state.widgets).toHaveLength(1);

      const removed = state.removeWidget(widget.id);
      expect(removed).toBe(true);
      expect(state.widgets).toHaveLength(0);
    });

    it('should return false when removing non-existent widget', () => {
      const removed = state.removeWidget('nonexistent');
      expect(removed).toBe(false);
    });

    it('should move widget', () => {
      const widget = state.addWidget('test-widget', { x: 0, y: 0 });

      state.moveWidget(widget.id, { x: 200, y: 300 });

      const updated = state.getWidget(widget.id);
      expect(updated?.position.x).toBe(200);
      expect(updated?.position.y).toBe(300);
    });

    it('should resize widget', () => {
      const widget = state.addWidget('test-widget');

      state.resizeWidget(widget.id, { width: 400, height: 300 });

      const updated = state.getWidget(widget.id);
      expect(updated?.size.width).toBe(400);
      expect(updated?.size.height).toBe(300);
    });

    it('should update widget properties', () => {
      const widget = state.addWidget('test-widget', undefined, undefined, { count: 0 });

      state.updateWidgetProperties(widget.id, { count: 5, label: 'test' });

      const updated = state.getWidget(widget.id);
      expect(updated?.properties.count).toBe(5);
      expect(updated?.properties.label).toBe('test');
    });
  });

  describe('selection', () => {
    it('should select widget', () => {
      const widget = state.addWidget('test-widget');

      state.selectWidget(widget.id);

      expect(state.selectedId).toBe(widget.id);
      expect(state.selectedWidget).toEqual(state.getWidget(widget.id));
    });

    it('should deselect when selecting null', () => {
      const widget = state.addWidget('test-widget');
      state.selectWidget(widget.id);

      state.selectWidget(null);

      expect(state.selectedId).toBeNull();
      expect(state.selectedWidget).toBeNull();
    });

    it('should deselect when widget is removed', () => {
      const widget = state.addWidget('test-widget');
      state.selectWidget(widget.id);

      state.removeWidget(widget.id);

      expect(state.selectedId).toBeNull();
    });

    it('should bring selected widget to front', () => {
      const w1 = state.addWidget('widget-1');
      const w2 = state.addWidget('widget-2');

      expect(w2.zIndex).toBeGreaterThan(w1.zIndex);

      state.selectWidget(w1.id);
      const updated = state.getWidget(w1.id);

      expect(updated?.zIndex).toBeGreaterThan(w2.zIndex);
    });
  });

  describe('undo/redo', () => {
    it('should undo widget addition', () => {
      state.addWidget('test-widget');
      expect(state.widgets).toHaveLength(1);

      state.undo();
      expect(state.widgets).toHaveLength(0);
    });

    it('should redo undone action', () => {
      state.addWidget('test-widget');
      state.undo();
      expect(state.widgets).toHaveLength(0);

      state.redo();
      expect(state.widgets).toHaveLength(1);
    });

    it('should track canUndo/canRedo', () => {
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);

      state.addWidget('test-widget');
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);

      state.undo();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
    });

    it('should clear future history on new action after undo', () => {
      state.addWidget('widget-1');
      state.addWidget('widget-2');
      state.undo(); // Back to just widget-1

      state.addWidget('widget-3'); // New action

      expect(state.canRedo).toBe(false);
    });
  });

  describe('snapshots', () => {
    it('should create snapshot', () => {
      state.addWidget('widget-1');
      state.addWidget('widget-2');

      const snapshot = state.createSnapshot('Test Snapshot');

      expect(snapshot.name).toBe('Test Snapshot');
      expect(snapshot.widgets).toHaveLength(2);
      expect(snapshot.config).toEqual(state.config);
    });

    it('should restore from snapshot', () => {
      state.addWidget('widget-1');
      const snapshot = state.createSnapshot();

      state.addWidget('widget-2');
      state.addWidget('widget-3');
      expect(state.widgets).toHaveLength(3);

      state.restoreSnapshot(snapshot);
      expect(state.widgets).toHaveLength(1);
    });

    it('should export and import JSON', () => {
      state.addWidget('widget-1', { x: 100, y: 100 });
      state.addWidget('widget-2', { x: 200, y: 200 });

      const json = state.toJSON();

      const newState = new CanvasState();
      newState.fromJSON(json);

      expect(newState.widgets).toHaveLength(2);
      expect(newState.widgets[0].position.x).toBe(100);
    });
  });

  describe('clear', () => {
    it('should clear all widgets', () => {
      state.addWidget('widget-1');
      state.addWidget('widget-2');

      state.clear();

      expect(state.widgets).toHaveLength(0);
      expect(state.selectedId).toBeNull();
    });
  });

  describe('events', () => {
    it('should emit widget-add event', () => {
      let emitted = false;
      state.addEventListener('widget-add', () => {
        emitted = true;
      });

      state.addWidget('test-widget');

      expect(emitted).toBe(true);
    });

    it('should emit widget-remove event', () => {
      const widget = state.addWidget('test-widget');
      let emitted = false;
      state.addEventListener('widget-remove', () => {
        emitted = true;
      });

      state.removeWidget(widget.id);

      expect(emitted).toBe(true);
    });

    it('should emit widget-select event', () => {
      const widget = state.addWidget('test-widget');
      let selectedId: string | null = null;
      state.addEventListener('widget-select', (e) => {
        selectedId = (e as CustomEvent).detail.detail.widgetId;
      });

      state.selectWidget(widget.id);

      expect(selectedId).toBe(widget.id);
    });
  });
});
