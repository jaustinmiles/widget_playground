/**
 * Bills Widget
 *
 * Recurring expenses with frequency (monthly/yearly).
 */

import { BaseWidget, widgetRegistry } from '../../core/widget/index.js';
import { financeStore, formatCurrency, calculateMonthlyExpenses } from '../../finance/index.js';
import type { Bill } from '../../finance/index.js';

const BILLS_STYLES = `
  .bills-widget {
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

  .monthly-total {
    font-size: 14px;
    font-weight: 600;
    color: #d97706;
  }

  .content {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }

  .item {
    display: grid;
    grid-template-columns: 1fr 100px 90px 32px;
    gap: 8px;
    align-items: center;
    padding: 8px;
    border-radius: 6px;
    margin-bottom: 4px;
  }

  .item:hover {
    background: #f8fafc;
  }

  input, select {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 13px;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  input[type="number"] {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  select {
    background: white;
    cursor: pointer;
  }

  .delete-btn {
    padding: 4px 8px;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 4px;
    font-size: 16px;
  }

  .delete-btn:hover {
    background: #fee2e2;
    color: #dc2626;
  }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    padding: 10px;
    margin-top: 8px;
    background: #f1f5f9;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    font-size: 13px;
  }

  .add-btn:hover {
    background: #e2e8f0;
    border-color: #94a3b8;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100px;
    color: #94a3b8;
    font-style: italic;
  }

  .yearly-tag {
    font-size: 10px;
    color: #64748b;
    margin-left: 4px;
  }
`;

export class BillsWidget extends BaseWidget {
  static tag = 'bills-widget';
  static properties = {};
  static styles = BILLS_STYLES;

  private bills: Bill[] = [];

  protected onInit(): void {
    this.bills = financeStore.getBills();

    financeStore.addEventListener('bills-changed', (e) => {
      this.bills = (e as CustomEvent).detail;
      this.requestRender();
    });
  }

  private getMonthlyTotal(): number {
    return calculateMonthlyExpenses(this.bills);
  }

  private handleAddBill(): void {
    financeStore.addBill({
      name: 'New Bill',
      amount: 0,
      frequency: 'monthly',
    });
  }

  private handleUpdateBill(id: string, field: keyof Omit<Bill, 'id'>, value: string | number): void {
    financeStore.updateBill(id, { [field]: value });
  }

  private handleDeleteBill(id: string): void {
    financeStore.removeBill(id);
  }

  protected render(): string {
    const monthlyTotal = this.getMonthlyTotal();

    return `
      <div class="bills-widget">
        <div class="header">
          <span class="title">Bills & Expenses</span>
          <span class="monthly-total">${formatCurrency(monthlyTotal)}/mo</span>
        </div>
        <div class="content">
          ${this.bills.length === 0 ? `
            <div class="empty-state">No bills added</div>
          ` : `
            ${this.bills.map(bill => `
              <div class="item" data-id="${bill.id}">
                <input
                  type="text"
                  value="${bill.name}"
                  placeholder="Bill name"
                  data-field="name"
                />
                <input
                  type="number"
                  value="${bill.amount}"
                  placeholder="Amount"
                  data-field="amount"
                  min="0"
                  step="10"
                />
                <select data-field="frequency">
                  <option value="monthly" ${bill.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="yearly" ${bill.frequency === 'yearly' ? 'selected' : ''}>Yearly</option>
                </select>
                <button class="delete-btn" data-action="delete" title="Remove bill">×</button>
              </div>
            `).join('')}
          `}
          <button class="add-btn" data-action="add">+ Add Bill</button>
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.shadowRoot?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;

      if (action === 'add') {
        this.handleAddBill();
      } else if (action === 'delete') {
        const item = target.closest('.item') as HTMLElement;
        if (item?.dataset.id) {
          this.handleDeleteBill(item.dataset.id);
        }
      }
    });

    this.shadowRoot?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const item = target.closest('.item') as HTMLElement;
      const field = target.dataset.field as keyof Omit<Bill, 'id'>;

      if (item?.dataset.id && field) {
        let value: string | number = target.value;
        if (target.type === 'number') {
          value = parseFloat(target.value) || 0;
        }
        this.handleUpdateBill(item.dataset.id, field, value);
      }
    });
  }
}

widgetRegistry.register(BillsWidget, {
  name: 'Bills',
  category: 'Finance',
  description: 'Track recurring expenses',
});
