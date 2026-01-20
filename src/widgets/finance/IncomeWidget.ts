/**
 * Income Widget
 *
 * Salary input and RSU vesting schedule (date/amount pairs).
 */

import { BaseWidget, widgetRegistry } from '../../core/widget/index.js';
import { financeStore, formatCurrency } from '../../finance/index.js';
import type { Income } from '../../finance/index.js';

const INCOME_STYLES = `
  .income-widget {
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

  .content {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .section {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  .salary-input {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .salary-input label {
    color: #475569;
  }

  input {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 13px;
  }

  input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  input[type="number"] {
    font-variant-numeric: tabular-nums;
    text-align: right;
    width: 120px;
  }

  input[type="date"] {
    width: 140px;
  }

  .rsu-item {
    display: grid;
    grid-template-columns: 140px 1fr 32px;
    gap: 8px;
    align-items: center;
    padding: 8px;
    border-radius: 6px;
    margin-bottom: 4px;
  }

  .rsu-item:hover {
    background: #f8fafc;
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
    padding: 16px;
    text-align: center;
    color: #94a3b8;
    font-style: italic;
  }

  .summary {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f1f5f9;
    border-radius: 6px;
    margin-top: 8px;
  }

  .summary-label {
    color: #64748b;
  }

  .summary-value {
    font-weight: 600;
    color: #059669;
  }
`;

export class IncomeWidget extends BaseWidget {
  static tag = 'income-widget';
  static properties = {};
  static styles = INCOME_STYLES;

  private income: Income = { salary: 0, rsuVests: [] };

  protected onInit(): void {
    this.income = financeStore.getIncome();

    financeStore.addEventListener('income-changed', (e) => {
      this.income = (e as CustomEvent).detail;
      this.requestRender();
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getTotalRSU(): number {
    return this.income.rsuVests.reduce((sum, v) => sum + v.amount, 0);
  }

  private handleSalaryChange(value: number): void {
    financeStore.setSalary(value);
  }

  private handleAddVest(): void {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 3);
    financeStore.addRSUVest({
      date: defaultDate,
      amount: 0,
    });
  }

  private handleUpdateVest(id: string, field: 'date' | 'amount', value: string | number): void {
    if (field === 'date') {
      financeStore.updateRSUVest(id, { date: new Date(value as string) });
    } else {
      financeStore.updateRSUVest(id, { amount: value as number });
    }
  }

  private handleDeleteVest(id: string): void {
    financeStore.removeRSUVest(id);
  }

  protected render(): string {
    const totalRSU = this.getTotalRSU();
    const sortedVests = [...this.income.rsuVests].sort((a, b) => a.date.getTime() - b.date.getTime());

    return `
      <div class="income-widget">
        <div class="header">
          <span class="title">Income</span>
        </div>
        <div class="content">
          <div class="section">
            <div class="section-title">Monthly Salary</div>
            <div class="salary-input">
              <label>$</label>
              <input
                type="number"
                value="${this.income.salary}"
                placeholder="Monthly salary"
                data-field="salary"
                min="0"
                step="100"
              />
              <span style="color: #64748b">/month</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">RSU Vesting Schedule</div>
            ${sortedVests.length === 0 ? `
              <div class="empty-state">No RSU vests scheduled</div>
            ` : `
              ${sortedVests.map(vest => `
                <div class="rsu-item" data-id="${vest.id}">
                  <input
                    type="date"
                    value="${this.formatDateForInput(vest.date)}"
                    data-field="date"
                  />
                  <input
                    type="number"
                    value="${vest.amount}"
                    placeholder="Amount"
                    data-field="amount"
                    min="0"
                    step="100"
                  />
                  <button class="delete-btn" data-action="delete" title="Remove vest">×</button>
                </div>
              `).join('')}
            `}
            <button class="add-btn" data-action="add">+ Add RSU Vest</button>

            ${sortedVests.length > 0 ? `
              <div class="summary">
                <span class="summary-label">Total RSU Value</span>
                <span class="summary-value">${formatCurrency(totalRSU)}</span>
              </div>
            ` : ''}
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

      if (action === 'add') {
        this.handleAddVest();
      } else if (action === 'delete') {
        const item = target.closest('.rsu-item') as HTMLElement;
        if (item?.dataset.id) {
          this.handleDeleteVest(item.dataset.id);
        }
      }
    });

    this.shadowRoot?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const field = target.dataset.field;

      if (field === 'salary') {
        this.handleSalaryChange(parseFloat(target.value) || 0);
        return;
      }

      const item = target.closest('.rsu-item') as HTMLElement;
      if (item?.dataset.id && field) {
        const value = target.type === 'number' ? parseFloat(target.value) || 0 : target.value;
        this.handleUpdateVest(item.dataset.id, field as 'date' | 'amount', value);
      }
    });
  }
}

widgetRegistry.register(IncomeWidget, {
  name: 'Income',
  category: 'Finance',
  description: 'Salary and RSU vesting schedule',
});
