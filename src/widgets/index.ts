/**
 * Widget Library - All available widgets
 */

export { TimerWidget } from './TimerWidget.js';
export { DataTableWidget } from './DataTableWidget.js';

// Finance widgets
export * from './finance/index.js';

// Auto-register widgets when this module is imported
import './TimerWidget.js';
import './DataTableWidget.js';
import './finance/index.js';
