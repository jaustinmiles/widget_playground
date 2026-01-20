/**
 * Tests for Net Worth Projection Algorithm
 */

import { describe, it, expect } from 'vitest';
import {
  calculateProjection,
  calculateMonthlyExpenses,
  applyMonthlyInterest,
  isInMonth,
  shouldReceiveIncome,
  getVestsInMonth,
} from './projection.js';
import type { Asset, Liability, Bill, Income } from './types.js';

describe('applyMonthlyInterest', () => {
  it('applies monthly compound interest correctly', () => {
    // $10,000 at 12% annual = 1% monthly
    const result = applyMonthlyInterest(10000, 12);
    expect(result).toBeCloseTo(10100, 2);
  });

  it('handles 0% interest', () => {
    const result = applyMonthlyInterest(10000, 0);
    expect(result).toBe(10000);
  });

  it('handles high interest rates', () => {
    // $1,000 at 24% annual = 2% monthly
    const result = applyMonthlyInterest(1000, 24);
    expect(result).toBeCloseTo(1020, 2);
  });
});

describe('calculateMonthlyExpenses', () => {
  it('sums monthly bills', () => {
    const bills: Bill[] = [
      { id: '1', name: 'Rent', amount: 2000, frequency: 'monthly' },
      { id: '2', name: 'Utilities', amount: 200, frequency: 'monthly' },
    ];
    expect(calculateMonthlyExpenses(bills)).toBe(2200);
  });

  it('converts yearly bills to monthly', () => {
    const bills: Bill[] = [
      { id: '1', name: 'Insurance', amount: 1200, frequency: 'yearly' },
    ];
    expect(calculateMonthlyExpenses(bills)).toBe(100);
  });

  it('handles mixed frequencies', () => {
    const bills: Bill[] = [
      { id: '1', name: 'Rent', amount: 2000, frequency: 'monthly' },
      { id: '2', name: 'Insurance', amount: 1200, frequency: 'yearly' },
    ];
    expect(calculateMonthlyExpenses(bills)).toBe(2100);
  });

  it('returns 0 for empty bills', () => {
    expect(calculateMonthlyExpenses([])).toBe(0);
  });
});

describe('isInMonth', () => {
  it('returns true when date is in the specified month', () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    expect(isInMonth(date, 2024, 5)).toBe(true);
  });

  it('returns false for different month', () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    expect(isInMonth(date, 2024, 6)).toBe(false);
  });

  it('returns false for different year', () => {
    const date = new Date(2024, 5, 15);
    expect(isInMonth(date, 2025, 5)).toBe(false);
  });
});

describe('shouldReceiveIncome', () => {
  it('returns true when no quit date is set', () => {
    expect(shouldReceiveIncome(new Date(), null)).toBe(true);
  });

  it('returns true when current date is before quit date', () => {
    const current = new Date(2024, 5, 1);
    const quit = new Date(2024, 8, 1);
    expect(shouldReceiveIncome(current, quit)).toBe(true);
  });

  it('returns false when current date is at or after quit date', () => {
    const current = new Date(2024, 8, 1);
    const quit = new Date(2024, 8, 1);
    expect(shouldReceiveIncome(current, quit)).toBe(false);
  });
});

describe('getVestsInMonth', () => {
  it('returns sum of vests in the specified month', () => {
    const vests = [
      { id: '1', date: new Date(2024, 5, 15), amount: 10000 },
      { id: '2', date: new Date(2024, 5, 20), amount: 5000 },
      { id: '3', date: new Date(2024, 6, 15), amount: 8000 },
    ];
    expect(getVestsInMonth(vests, 2024, 5)).toBe(15000);
  });

  it('returns 0 when no vests in month', () => {
    const vests = [
      { id: '1', date: new Date(2024, 5, 15), amount: 10000 },
    ];
    expect(getVestsInMonth(vests, 2024, 6)).toBe(0);
  });

  it('handles empty vests array', () => {
    expect(getVestsInMonth([], 2024, 5)).toBe(0);
  });
});

describe('calculateProjection', () => {
  const baseDate = new Date(2024, 0, 1); // Jan 1, 2024

  it('returns correct number of projection points', () => {
    const result = calculateProjection({
      assets: [],
      liabilities: [],
      income: { salary: 0, rsuVests: [] },
      bills: [],
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });
    // monthsAhead + 1 (includes starting point)
    expect(result.points).toHaveLength(13);
  });

  it('calculates compound interest on assets', () => {
    const assets: Asset[] = [
      { id: '1', name: 'Savings', value: 10000, interestRate: 12 }, // 1% monthly
    ];

    const result = calculateProjection({
      assets,
      liabilities: [],
      income: { salary: 0, rsuVests: [] },
      bills: [],
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });

    // After 12 months at 12% annual (~1% monthly)
    // 10000 * (1.01)^12 ≈ 11268
    const finalAssets = result.points[12].totalAssets;
    expect(finalAssets).toBeGreaterThan(11200);
    expect(finalAssets).toBeLessThan(11300);
  });

  it('calculates compound interest on liabilities', () => {
    const liabilities: Liability[] = [
      { id: '1', name: 'Loan', value: 10000, interestRate: 12 },
    ];

    const result = calculateProjection({
      assets: [],
      liabilities,
      income: { salary: 0, rsuVests: [] },
      bills: [],
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });

    // Liabilities also grow with interest
    const finalLiabilities = result.points[12].totalLiabilities;
    expect(finalLiabilities).toBeGreaterThan(11200);
    expect(finalLiabilities).toBeLessThan(11300);
  });

  it('adds monthly salary to income', () => {
    const income: Income = {
      salary: 5000,
      rsuVests: [],
    };

    const result = calculateProjection({
      assets: [],
      liabilities: [],
      income,
      bills: [],
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });

    // 12 months of $5000 salary
    expect(result.totalIncomeEarned).toBe(60000);
  });

  it('includes RSU vests in income', () => {
    const income: Income = {
      salary: 0,
      rsuVests: [
        { id: '1', date: new Date(2024, 3, 15), amount: 10000 }, // April
        { id: '2', date: new Date(2024, 6, 15), amount: 15000 }, // July
      ],
    };

    const result = calculateProjection({
      assets: [],
      liabilities: [],
      income,
      bills: [],
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });

    expect(result.totalIncomeEarned).toBe(25000);
  });

  it('subtracts monthly expenses', () => {
    const bills: Bill[] = [
      { id: '1', name: 'Rent', amount: 2000, frequency: 'monthly' },
    ];

    const result = calculateProjection({
      assets: [],
      liabilities: [],
      income: { salary: 0, rsuVests: [] },
      bills,
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });

    expect(result.totalExpensesPaid).toBe(24000);
  });

  it('stops income at quit date', () => {
    const income: Income = {
      salary: 5000,
      rsuVests: [],
    };
    const quitDate = new Date(2024, 5, 1); // June 1 - income stops

    const result = calculateProjection({
      assets: [],
      liabilities: [],
      income,
      bills: [],
      quitDate,
      monthsAhead: 12,
      startDate: baseDate,
    });

    // Income is received for months before quit date
    // Jan(start, no income), Feb, Mar, Apr, May = 4 months before June
    expect(result.totalIncomeEarned).toBe(20000);
  });

  it('calculates correct net worth with all factors', () => {
    const assets: Asset[] = [
      { id: '1', name: 'Savings', value: 50000, interestRate: 4 },
    ];
    const liabilities: Liability[] = [
      { id: '1', name: 'Loan', value: 30000, interestRate: 6 },
    ];
    const income: Income = {
      salary: 8000,
      rsuVests: [{ id: '1', date: new Date(2024, 6, 15), amount: 10000 }],
    };
    const bills: Bill[] = [
      { id: '1', name: 'Rent', amount: 2500, frequency: 'monthly' },
    ];

    const result = calculateProjection({
      assets,
      liabilities,
      income,
      bills,
      quitDate: null,
      monthsAhead: 24,
      startDate: baseDate,
    });

    // Starting net worth: 50000 - 30000 = 20000
    expect(result.points[0].netWorth).toBeCloseTo(20000, 0);

    // Final net worth should be positive with income exceeding expenses
    expect(result.finalNetWorth).toBeGreaterThan(100000);
  });

  it('handles scenario where net worth goes negative', () => {
    const liabilities: Liability[] = [
      { id: '1', name: 'Loan', value: 100000, interestRate: 18 },
    ];
    const bills: Bill[] = [
      { id: '1', name: 'Living', amount: 5000, frequency: 'monthly' },
    ];

    const result = calculateProjection({
      assets: [],
      liabilities,
      income: { salary: 0, rsuVests: [] },
      bills,
      quitDate: null,
      monthsAhead: 12,
      startDate: baseDate,
    });

    // With high interest debt and expenses, no income, net worth should be very negative
    expect(result.finalNetWorth).toBeLessThan(-150000);
  });
});
