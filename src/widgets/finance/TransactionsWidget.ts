/**
 * Transactions Widget
 *
 * CSV upload, sortable table, trash icon to exclude transactions.
 * Excluded transactions shown with strikethrough and don't affect calculations.
 */

import { BaseWidget, widgetRegistry } from '../../core/widget/index.js';
import { financeStore, formatCurrency } from '../../finance/index.js';
import type { Transaction } from '../../finance/index.js';

const TRANSACTIONS_STYLES = `
  .transactions-widget {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .title {
    font-weight: 600;
    color: #1e293b;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .upload-btn {
    padding: 6px 12px;
    background: #3b82f6;
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    cursor: pointer;
  }

  .upload-btn:hover {
    background: #2563eb;
  }

  .clear-btn {
    padding: 6px 12px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    color: #64748b;
    font-size: 12px;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: #e2e8f0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
  }

  .search {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 13px;
  }

  .search:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .count {
    font-size: 12px;
    color: #64748b;
  }

  .table-container {
    flex: 1;
    overflow: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    position: sticky;
    top: 0;
    background: #f1f5f9;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    user-select: none;
    font-size: 12px;
  }

  th:hover {
    background: #e2e8f0;
  }

  th.sorted-asc::after {
    content: ' ▲';
    font-size: 10px;
  }

  th.sorted-desc::after {
    content: ' ▼';
    font-size: 10px;
  }

  tr:hover td {
    background: #f8fafc;
  }

  tr.excluded {
    opacity: 0.5;
  }

  tr.excluded td {
    text-decoration: line-through;
  }

  td.amount {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  td.amount.positive {
    color: #059669;
  }

  td.amount.negative {
    color: #dc2626;
  }

  .exclude-btn {
    padding: 4px 6px;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;
  }

  .exclude-btn:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  tr.excluded .exclude-btn {
    color: #059669;
  }

  tr.excluded .exclude-btn:hover {
    background: #dcfce7;
    color: #059669;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #94a3b8;
    gap: 12px;
  }

  .empty-state-icon {
    font-size: 32px;
  }

  .drop-zone {
    border: 2px dashed #3b82f6;
    background: #eff6ff;
    border-radius: 8px;
    margin: 12px;
    padding: 24px;
    text-align: center;
  }

  .drop-zone.dragover {
    background: #dbeafe;
    border-color: #2563eb;
  }

  .summary {
    display: flex;
    justify-content: space-around;
    padding: 8px 12px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
  }

  .summary-item {
    text-align: center;
  }

  .summary-label {
    color: #64748b;
    margin-bottom: 2px;
  }

  .summary-value {
    font-weight: 600;
  }

  .summary-value.positive {
    color: #059669;
  }

  .summary-value.negative {
    color: #dc2626;
  }

  input[type="file"] {
    display: none;
  }
`;

type SortField = 'date' | 'description' | 'amount';

export class TransactionsWidget extends BaseWidget {
  static tag = 'transactions-widget';
  static properties = {};
  static styles = TRANSACTIONS_STYLES;

  private transactions: Transaction[] = [];
  private searchTerm = '';
  private sortField: SortField = 'date';
  private sortDirection: 'asc' | 'desc' = 'desc';

  protected onInit(): void {
    this.transactions = financeStore.getTransactions();

    financeStore.addEventListener('transactions-changed', (e) => {
      this.transactions = (e as CustomEvent).detail;
      this.requestRender();
    });
  }

  private getFilteredTransactions(): Transaction[] {
    let filtered = [...this.transactions];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (this.sortField === 'date') {
        return (a.date.getTime() - b.date.getTime()) * dir;
      } else if (this.sortField === 'amount') {
        return (a.amount - b.amount) * dir;
      } else {
        return a.description.localeCompare(b.description) * dir;
      }
    });

    return filtered;
  }

  private getSummary() {
    const included = this.transactions.filter(t => !t.excluded);
    const income = included.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = included.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
    const net = income + expenses;
    return { income, expenses, net };
  }

  private handleSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'date' ? 'desc' : 'asc';
    }
    this.requestRender();
  }

  private handleSearch(term: string): void {
    this.searchTerm = term;
    this.requestRender();
  }

  private handleToggleExclude(id: string): void {
    financeStore.toggleTransactionExcluded(id);
  }

  private handleClearAll(): void {
    financeStore.setTransactions([]);
  }

  private parseCSV(content: string): { headers: string[]; rows: Array<Record<string, unknown>> } {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const delimiter = content.includes('\t') ? '\t' : ',';
    const parseRow = (line: string) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const values = parseRow(line);
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });
      return row;
    });

    return { headers, rows };
  }

  private handleFileUpload(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const csvData = this.parseCSV(content);
      financeStore.importTransactionsFromCSV(csvData);
    };
    reader.readAsText(file);
  }

  private formatTransactionDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected render(): string {
    const filtered = this.getFilteredTransactions();
    const summary = this.getSummary();
    const hasTransactions = this.transactions.length > 0;

    const getSortClass = (field: SortField) => {
      if (this.sortField !== field) return '';
      return `sorted-${this.sortDirection}`;
    };

    if (!hasTransactions) {
      return `
        <div class="transactions-widget">
          <div class="header">
            <span class="title">Transactions</span>
          </div>
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <div>Import transactions from CSV</div>
            <button class="upload-btn" data-action="upload">Upload CSV</button>
            <input type="file" accept=".csv,.tsv" data-input="file" />
          </div>
        </div>
      `;
    }

    return `
      <div class="transactions-widget">
        <div class="header">
          <span class="title">Transactions</span>
          <div class="header-actions">
            <button class="upload-btn" data-action="upload">Import CSV</button>
            <button class="clear-btn" data-action="clear">Clear All</button>
            <input type="file" accept=".csv,.tsv" data-input="file" />
          </div>
        </div>
        <div class="toolbar">
          <input
            type="text"
            class="search"
            placeholder="Search transactions..."
            value="${this.searchTerm}"
            data-action="search"
          />
          <span class="count">${filtered.length} of ${this.transactions.length}</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th class="${getSortClass('date')}" data-sort="date" style="width: 100px">Date</th>
                <th class="${getSortClass('description')}" data-sort="description">Description</th>
                <th class="${getSortClass('amount')}" data-sort="amount" style="width: 100px; text-align: right">Amount</th>
                <th style="width: 40px"></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.slice(0, 100).map(t => `
                <tr class="${t.excluded ? 'excluded' : ''}" data-id="${t.id}">
                  <td>${this.formatTransactionDate(t.date)}</td>
                  <td>${t.description}</td>
                  <td class="amount ${t.amount >= 0 ? 'positive' : 'negative'}">
                    ${t.amount >= 0 ? '+' : ''}${formatCurrency(t.amount)}
                  </td>
                  <td>
                    <button class="exclude-btn" data-action="toggle" title="${t.excluded ? 'Include' : 'Exclude'}">
                      ${t.excluded ? '↩' : '🗑'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${filtered.length > 100 ? `
            <div style="padding: 12px; text-align: center; color: #64748b; font-size: 12px;">
              Showing 100 of ${filtered.length} transactions
            </div>
          ` : ''}
        </div>
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Income</div>
            <div class="summary-value positive">${formatCurrency(summary.income)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Expenses</div>
            <div class="summary-value negative">${formatCurrency(summary.expenses)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Net</div>
            <div class="summary-value ${summary.net >= 0 ? 'positive' : 'negative'}">${formatCurrency(summary.net)}</div>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.shadowRoot?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;

      if (action === 'upload') {
        const fileInput = this.shadowRoot?.querySelector('[data-input="file"]') as HTMLInputElement;
        fileInput?.click();
      } else if (action === 'clear') {
        this.handleClearAll();
      } else if (action === 'toggle') {
        const row = target.closest('tr') as HTMLElement;
        if (row?.dataset.id) {
          this.handleToggleExclude(row.dataset.id);
        }
      }

      const sortField = target.dataset.sort as SortField;
      if (sortField) {
        this.handleSort(sortField);
      }
    });

    this.shadowRoot?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.dataset.action === 'search') {
        this.handleSearch(target.value);
      }
    });

    this.shadowRoot?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.dataset.input === 'file' && target.files?.[0]) {
        this.handleFileUpload(target.files[0]);
        target.value = '';
      }
    });
  }
}

widgetRegistry.register(TransactionsWidget, {
  name: 'Transactions',
  category: 'Finance',
  description: 'Import and manage transactions',
});
