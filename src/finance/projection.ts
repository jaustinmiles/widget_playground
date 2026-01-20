/**
 * Net Worth Projection Algorithm
 *
 * Calculates projected net worth over time based on:
 * - Assets with compound interest
 * - Liabilities with interest
 * - Income (salary + RSU vests)
 * - Monthly bills/expenses
 * - Optional quit date (stops income after quit)
 */

import type {
  Asset,
  Liability,
  Income,
  Bill,
  ProjectionPoint,
} from './types.js';

export interface ProjectionInput {
  assets: Asset[];
  liabilities: Liability[];
  income: Income;
  bills: Bill[];
  quitDate: Date | null;
  monthsAhead: number;
  startDate?: Date;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  finalNetWorth: number;
  totalIncomeEarned: number;
  totalExpensesPaid: number;
}

/**
 * Calculate monthly bill total
 */
export function calculateMonthlyExpenses(bills: Bill[]): number {
  return bills.reduce((total, bill) => {
    if (bill.frequency === 'monthly') {
      return total + bill.amount;
    } else {
      // Yearly bills divided by 12
      return total + bill.amount / 12;
    }
  }, 0);
}

/**
 * Apply monthly compound interest to a value
 */
export function applyMonthlyInterest(value: number, annualRate: number): number {
  const monthlyRate = annualRate / 100 / 12;
  return value * (1 + monthlyRate);
}

/**
 * Check if a date falls within a specific month
 */
export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

/**
 * Check if income should be received (before quit date)
 */
export function shouldReceiveIncome(currentDate: Date, quitDate: Date | null): boolean {
  if (!quitDate) return true;
  return currentDate < quitDate;
}

/**
 * Get RSU vests that occur in a specific month
 */
export function getVestsInMonth(
  vests: Income['rsuVests'],
  year: number,
  month: number
): number {
  return vests
    .filter(vest => isInMonth(vest.date, year, month))
    .reduce((sum, vest) => sum + vest.amount, 0);
}

/**
 * Calculate net worth projection over time
 */
export function calculateProjection(input: ProjectionInput): ProjectionResult {
  const {
    assets,
    liabilities,
    income,
    bills,
    quitDate,
    monthsAhead,
    startDate = new Date(),
  } = input;

  const points: ProjectionPoint[] = [];
  const monthlyExpenses = calculateMonthlyExpenses(bills);

  // Initialize running totals
  let assetValues = assets.map(a => ({ ...a, currentValue: a.value }));
  let liabilityValues = liabilities.map(l => ({ ...l, currentValue: l.value }));
  let cumulativeIncome = 0;
  let cumulativeExpenses = 0;

  // Project for each month
  for (let i = 0; i <= monthsAhead; i++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + i);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // For months after the first, apply interest and income/expenses
    if (i > 0) {
      // Apply compound interest to assets
      assetValues = assetValues.map(asset => ({
        ...asset,
        currentValue: applyMonthlyInterest(asset.currentValue, asset.interestRate),
      }));

      // Apply interest to liabilities
      liabilityValues = liabilityValues.map(liability => ({
        ...liability,
        currentValue: applyMonthlyInterest(liability.currentValue, liability.interestRate),
      }));

      // Add income if before quit date
      if (shouldReceiveIncome(currentDate, quitDate)) {
        // Monthly salary
        cumulativeIncome += income.salary;

        // RSU vests
        const vestsThisMonth = getVestsInMonth(income.rsuVests, year, month);
        cumulativeIncome += vestsThisMonth;
      }

      // Subtract expenses
      cumulativeExpenses += monthlyExpenses;
    }

    // Calculate totals for this point
    const totalAssets = assetValues.reduce((sum, a) => sum + a.currentValue, 0);
    const totalLiabilities = liabilityValues.reduce((sum, l) => sum + l.currentValue, 0);

    // Net worth = assets - liabilities + (income earned - expenses paid)
    const netWorth = totalAssets - totalLiabilities + cumulativeIncome - cumulativeExpenses;

    points.push({
      date: new Date(currentDate),
      netWorth,
      totalAssets,
      totalLiabilities,
      cumulativeIncome,
      cumulativeExpenses,
    });
  }

  const finalPoint = points[points.length - 1];

  return {
    points,
    finalNetWorth: finalPoint?.netWorth || 0,
    totalIncomeEarned: cumulativeIncome,
    totalExpensesPaid: cumulativeExpenses,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(date);
}
