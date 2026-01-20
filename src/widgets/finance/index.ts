/**
 * Finance Widgets - All financial dashboard widgets
 */

export { AssetsWidget } from './AssetsWidget.js';
export { LiabilitiesWidget } from './LiabilitiesWidget.js';
export { IncomeWidget } from './IncomeWidget.js';
export { BillsWidget } from './BillsWidget.js';
export { TransactionsWidget } from './TransactionsWidget.js';
export { QuitDateWidget } from './QuitDateWidget.js';
export { NetWorthChartWidget } from './NetWorthChartWidget.js';

// Auto-register widgets when this module is imported
import './AssetsWidget.js';
import './LiabilitiesWidget.js';
import './IncomeWidget.js';
import './BillsWidget.js';
import './TransactionsWidget.js';
import './QuitDateWidget.js';
import './NetWorthChartWidget.js';
