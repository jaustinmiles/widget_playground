/**
 * Widget Playground - App Entry Point
 *
 * Bootstraps the canvas with widget palette for interactive testing.
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
    width: 2000,
    height: 2000,
  });
  app.appendChild(canvas);

  // Add widget palette panel
  const palette = createWidgetPalettePanel({ x: 20, y: 20 });
  document.body.appendChild(palette);

  // Add a demo DataTable with sample data
  canvas.addWidget('data-table-widget', { x: 300, y: 100 }, {
    data: {
      headers: ['Name', 'Value', 'Status'],
      rows: [
        { Name: 'Alpha', Value: 100, Status: true },
        { Name: 'Beta', Value: 250, Status: true },
        { Name: 'Gamma', Value: 75, Status: false },
      ],
    },
  });
}
