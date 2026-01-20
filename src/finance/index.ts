/**
 * Finance Module - Public exports
 */

export * from './types.js';
export { FinanceStore, financeStore } from './FinanceStore.js';
export {
  calculateProjection,
  calculateMonthlyExpenses,
  applyMonthlyInterest,
  formatCurrency,
  formatDate,
  type ProjectionInput,
  type ProjectionResult,
} from './projection.js';
