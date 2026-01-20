/**
 * Financial Dashboard Types
 */

export interface Asset {
  id: string;
  name: string;
  value: number;
  interestRate: number;
}

export interface Liability {
  id: string;
  name: string;
  value: number;
  interestRate: number;
}

export interface RSUVest {
  id: string;
  date: Date;
  amount: number;
}

export interface Income {
  salary: number;
  rsuVests: RSUVest[];
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  excluded: boolean;
}

export interface FinanceState {
  assets: Asset[];
  liabilities: Liability[];
  income: Income;
  bills: Bill[];
  transactions: Transaction[];
  quitDate: Date | null;
}

export interface ProjectionPoint {
  date: Date;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  cumulativeIncome: number;
  cumulativeExpenses: number;
}

export type FinanceEventType =
  | 'assets-changed'
  | 'liabilities-changed'
  | 'income-changed'
  | 'bills-changed'
  | 'transactions-changed'
  | 'quit-date-changed'
  | 'state-changed';
