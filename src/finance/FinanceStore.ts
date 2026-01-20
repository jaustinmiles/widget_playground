/**
 * FinanceStore - Centralized state manager for financial data
 *
 * Singleton EventTarget that holds all financial data and emits
 * events when data changes. All widgets subscribe to this store
 * for reactive updates.
 */

import type {
  Asset,
  Liability,
  Income,
  RSUVest,
  Bill,
  Transaction,
  FinanceState,
  FinanceEventType,
} from './types.js';

const STORAGE_KEY = 'finance-state';

function generateId(): string {
  return crypto.randomUUID();
}

function createDefaultState(): FinanceState {
  return {
    assets: [],
    liabilities: [],
    income: { salary: 0, rsuVests: [] },
    bills: [],
    transactions: [],
    quitDate: null,
  };
}

export class FinanceStore extends EventTarget {
  private static instance: FinanceStore;
  private state: FinanceState;

  private constructor() {
    super();
    this.state = this.loadFromStorage() || createDefaultState();
  }

  static getInstance(): FinanceStore {
    if (!FinanceStore.instance) {
      FinanceStore.instance = new FinanceStore();
    }
    return FinanceStore.instance;
  }

  // ─────────────────────────────────────────────────────────────────
  // Assets
  // ─────────────────────────────────────────────────────────────────

  getAssets(): Asset[] {
    return [...this.state.assets];
  }

  setAssets(assets: Asset[]): void {
    this.state.assets = assets;
    this.emit('assets-changed', assets);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  addAsset(asset: Omit<Asset, 'id'>): Asset {
    const newAsset: Asset = { ...asset, id: generateId() };
    this.state.assets.push(newAsset);
    this.emit('assets-changed', this.state.assets);
    this.emit('state-changed', this.state);
    this.persistToStorage();
    return newAsset;
  }

  updateAsset(id: string, updates: Partial<Omit<Asset, 'id'>>): void {
    const index = this.state.assets.findIndex(a => a.id === id);
    if (index !== -1) {
      this.state.assets[index] = { ...this.state.assets[index], ...updates };
      this.emit('assets-changed', this.state.assets);
      this.emit('state-changed', this.state);
      this.persistToStorage();
    }
  }

  removeAsset(id: string): void {
    this.state.assets = this.state.assets.filter(a => a.id !== id);
    this.emit('assets-changed', this.state.assets);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Liabilities
  // ─────────────────────────────────────────────────────────────────

  getLiabilities(): Liability[] {
    return [...this.state.liabilities];
  }

  setLiabilities(liabilities: Liability[]): void {
    this.state.liabilities = liabilities;
    this.emit('liabilities-changed', liabilities);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  addLiability(liability: Omit<Liability, 'id'>): Liability {
    const newLiability: Liability = { ...liability, id: generateId() };
    this.state.liabilities.push(newLiability);
    this.emit('liabilities-changed', this.state.liabilities);
    this.emit('state-changed', this.state);
    this.persistToStorage();
    return newLiability;
  }

  updateLiability(id: string, updates: Partial<Omit<Liability, 'id'>>): void {
    const index = this.state.liabilities.findIndex(l => l.id === id);
    if (index !== -1) {
      this.state.liabilities[index] = { ...this.state.liabilities[index], ...updates };
      this.emit('liabilities-changed', this.state.liabilities);
      this.emit('state-changed', this.state);
      this.persistToStorage();
    }
  }

  removeLiability(id: string): void {
    this.state.liabilities = this.state.liabilities.filter(l => l.id !== id);
    this.emit('liabilities-changed', this.state.liabilities);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Income
  // ─────────────────────────────────────────────────────────────────

  getIncome(): Income {
    return {
      salary: this.state.income.salary,
      rsuVests: [...this.state.income.rsuVests],
    };
  }

  setSalary(salary: number): void {
    this.state.income.salary = salary;
    this.emit('income-changed', this.state.income);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  addRSUVest(vest: Omit<RSUVest, 'id'>): RSUVest {
    const newVest: RSUVest = { ...vest, id: generateId() };
    this.state.income.rsuVests.push(newVest);
    this.emit('income-changed', this.state.income);
    this.emit('state-changed', this.state);
    this.persistToStorage();
    return newVest;
  }

  updateRSUVest(id: string, updates: Partial<Omit<RSUVest, 'id'>>): void {
    const index = this.state.income.rsuVests.findIndex(v => v.id === id);
    if (index !== -1) {
      this.state.income.rsuVests[index] = { ...this.state.income.rsuVests[index], ...updates };
      this.emit('income-changed', this.state.income);
      this.emit('state-changed', this.state);
      this.persistToStorage();
    }
  }

  removeRSUVest(id: string): void {
    this.state.income.rsuVests = this.state.income.rsuVests.filter(v => v.id !== id);
    this.emit('income-changed', this.state.income);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Bills
  // ─────────────────────────────────────────────────────────────────

  getBills(): Bill[] {
    return [...this.state.bills];
  }

  setBills(bills: Bill[]): void {
    this.state.bills = bills;
    this.emit('bills-changed', bills);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  addBill(bill: Omit<Bill, 'id'>): Bill {
    const newBill: Bill = { ...bill, id: generateId() };
    this.state.bills.push(newBill);
    this.emit('bills-changed', this.state.bills);
    this.emit('state-changed', this.state);
    this.persistToStorage();
    return newBill;
  }

  updateBill(id: string, updates: Partial<Omit<Bill, 'id'>>): void {
    const index = this.state.bills.findIndex(b => b.id === id);
    if (index !== -1) {
      this.state.bills[index] = { ...this.state.bills[index], ...updates };
      this.emit('bills-changed', this.state.bills);
      this.emit('state-changed', this.state);
      this.persistToStorage();
    }
  }

  removeBill(id: string): void {
    this.state.bills = this.state.bills.filter(b => b.id !== id);
    this.emit('bills-changed', this.state.bills);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Transactions
  // ─────────────────────────────────────────────────────────────────

  getTransactions(): Transaction[] {
    return [...this.state.transactions];
  }

  setTransactions(transactions: Transaction[]): void {
    this.state.transactions = transactions;
    this.emit('transactions-changed', transactions);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
    const newTransaction: Transaction = { ...transaction, id: generateId() };
    this.state.transactions.push(newTransaction);
    this.emit('transactions-changed', this.state.transactions);
    this.emit('state-changed', this.state);
    this.persistToStorage();
    return newTransaction;
  }

  toggleTransactionExcluded(id: string): void {
    const index = this.state.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      this.state.transactions[index].excluded = !this.state.transactions[index].excluded;
      this.emit('transactions-changed', this.state.transactions);
      this.emit('state-changed', this.state);
      this.persistToStorage();
    }
  }

  removeTransaction(id: string): void {
    this.state.transactions = this.state.transactions.filter(t => t.id !== id);
    this.emit('transactions-changed', this.state.transactions);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  importTransactionsFromCSV(csvData: { headers: string[]; rows: Array<Record<string, unknown>> }): void {
    const newTransactions: Transaction[] = csvData.rows.map(row => {
      const dateValue = row['date'] || row['Date'] || row['DATE'];
      const descValue = row['description'] || row['Description'] || row['DESC'] || row['memo'] || row['Memo'];
      const amountValue = row['amount'] || row['Amount'] || row['AMOUNT'];

      return {
        id: generateId(),
        date: dateValue ? new Date(String(dateValue)) : new Date(),
        description: String(descValue || ''),
        amount: Number(amountValue) || 0,
        excluded: false,
      };
    });

    this.state.transactions = [...this.state.transactions, ...newTransactions];
    this.emit('transactions-changed', this.state.transactions);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Quit Date
  // ─────────────────────────────────────────────────────────────────

  getQuitDate(): Date | null {
    return this.state.quitDate;
  }

  setQuitDate(date: Date | null): void {
    this.state.quitDate = date;
    this.emit('quit-date-changed', date);
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Full State
  // ─────────────────────────────────────────────────────────────────

  getState(): FinanceState {
    return {
      assets: this.getAssets(),
      liabilities: this.getLiabilities(),
      income: this.getIncome(),
      bills: this.getBills(),
      transactions: this.getTransactions(),
      quitDate: this.state.quitDate,
    };
  }

  clearAll(): void {
    this.state = createDefaultState();
    this.emit('state-changed', this.state);
    this.persistToStorage();
  }

  // ─────────────────────────────────────────────────────────────────
  // Event Helpers
  // ─────────────────────────────────────────────────────────────────

  private emit(type: FinanceEventType, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // ─────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────

  private persistToStorage(): void {
    try {
      const serializable = {
        ...this.state,
        income: {
          ...this.state.income,
          rsuVests: this.state.income.rsuVests.map(v => ({
            ...v,
            date: v.date.toISOString(),
          })),
        },
        transactions: this.state.transactions.map(t => ({
          ...t,
          date: t.date.toISOString(),
        })),
        quitDate: this.state.quitDate?.toISOString() || null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to persist finance state:', error);
    }
  }

  private loadFromStorage(): FinanceState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        income: {
          ...parsed.income,
          rsuVests: (parsed.income.rsuVests || []).map((v: { date: string; id: string; amount: number }) => ({
            ...v,
            date: new Date(v.date),
          })),
        },
        transactions: (parsed.transactions || []).map((t: { date: string; id: string; description: string; amount: number; excluded: boolean }) => ({
          ...t,
          date: new Date(t.date),
        })),
        quitDate: parsed.quitDate ? new Date(parsed.quitDate) : null,
      };
    } catch (error) {
      console.error('Failed to load finance state:', error);
      return null;
    }
  }
}

export const financeStore = FinanceStore.getInstance();
