/**
 * Widget Playground - App Entry Point
 *
 * Bootstraps the canvas with widget palette for interactive testing.
 * Now featuring a personal finance dashboard demo.
 */

// Import Tailwind styles
import './styles/tailwind.css';

// Auto-register widgets (side-effect import)
import './widgets/index.js';

// Import canvas and playground components
import { Canvas } from './core/canvas/index.js';
import { createWidgetPalettePanel } from './playground/index.js';

// Bootstrap app
const app = document.getElementById('app');
if (app) {
  // Create canvas
  const canvas = new Canvas({
    showGrid: true,
    width: 2400,
    height: 2000,
  });
  app.appendChild(canvas);

  // Add widget palette panel
  const palette = createWidgetPalettePanel({ x: 20, y: 20 });
  document.body.appendChild(palette);

  // Finance Dashboard Layout
  // Row 1: Assets, Liabilities, Income
  canvas.addWidget('assets-widget', { x: 300, y: 20 }, {}, { width: 300, height: 280 });
  canvas.addWidget('liabilities-widget', { x: 620, y: 20 }, {}, { width: 300, height: 280 });
  canvas.addWidget('income-widget', { x: 940, y: 20 }, {}, { width: 320, height: 280 });

  // Row 2: Bills, Quit Date Slider
  canvas.addWidget('bills-widget', { x: 300, y: 320 }, {}, { width: 300, height: 280 });
  canvas.addWidget('quit-date-widget', { x: 620, y: 320 }, {}, { width: 320, height: 260 });

  // Row 3: Net Worth Chart (wide)
  canvas.addWidget('net-worth-chart-widget', { x: 300, y: 620 }, {}, { width: 660, height: 380 });

  // Row 4: Transactions (wide)
  canvas.addWidget('transactions-widget', { x: 300, y: 1020 }, {}, { width: 660, height: 360 });
}
