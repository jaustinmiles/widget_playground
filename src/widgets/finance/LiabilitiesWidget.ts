/**
 * Liabilities Widget
 *
 * Editable list of liabilities with name, value, and interest rate.
 */

import { BaseWidget, widgetRegistry } from '../../core/widget/index.js';
import { financeStore, formatCurrency } from '../../finance/index.js';
import type { Liability } from '../../finance/index.js';

const LIABILITIES_STYLES = `
  .liabilities-widget {
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

  .total {
    font-size: 14px;
    font-weight: 600;
    color: #dc2626;
  }

  .content {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }

  .item {
    display: grid;
    grid-template-columns: 1fr 100px 70px 32px;
    gap: 8px;
    align-items: center;
    padding: 8px;
    border-radius: 6px;
    margin-bottom: 4px;
  }

  .item:hover {
    background: #f8fafc;
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
`;

export class LiabilitiesWidget extends BaseWidget {
  static tag = 'liabilities-widget';
  static properties = {};
  static styles = LIABILITIES_STYLES;

  private liabilities: Liability[] = [];

  protected onInit(): void {
    this.liabilities = financeStore.getLiabilities();

    financeStore.addEventListener('liabilities-changed', (e) => {
      this.liabilities = (e as CustomEvent).detail;
      this.requestRender();
    });
  }

  private getTotal(): number {
    return this.liabilities.reduce((sum, l) => sum + l.value, 0);
  }

  private handleAddLiability(): void {
    financeStore.addLiability({
      name: 'New Liability',
      value: 0,
      interestRate: 0,
    });
  }

  private handleUpdateLiability(id: string, field: keyof Omit<Liability, 'id'>, value: string | number): void {
    financeStore.updateLiability(id, { [field]: value });
  }

  private handleDeleteLiability(id: string): void {
    financeStore.removeLiability(id);
  }

  protected render(): string {
    const total = this.getTotal();

    return `
      <div class="liabilities-widget">
        <div class="header">
          <span class="title">Liabilities</span>
          <span class="total">-${formatCurrency(total)}</span>
        </div>
        <div class="content">
          ${this.liabilities.length === 0 ? `
            <div class="empty-state">No liabilities added</div>
          ` : `
            ${this.liabilities.map(liability => `
              <div class="item" data-id="${liability.id}">
                <input
                  type="text"
                  value="${liability.name}"
                  placeholder="Liability name"
                  data-field="name"
                />
                <input
                  type="number"
                  value="${liability.value}"
                  placeholder="Value"
                  data-field="value"
                  min="0"
                  step="100"
                />
                <input
                  type="number"
                  value="${liability.interestRate}"
                  placeholder="%"
                  data-field="interestRate"
                  min="0"
                  max="100"
                  step="0.1"
                  style="width: 60px"
                  title="Annual interest rate %"
                />
                <button class="delete-btn" data-action="delete" title="Remove liability">×</button>
              </div>
            `).join('')}
          `}
          <button class="add-btn" data-action="add">+ Add Liability</button>
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
        this.handleAddLiability();
      } else if (action === 'delete') {
        const item = target.closest('.item') as HTMLElement;
        if (item?.dataset.id) {
          this.handleDeleteLiability(item.dataset.id);
        }
      }
    });

    this.shadowRoot?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const item = target.closest('.item') as HTMLElement;
      const field = target.dataset.field as keyof Omit<Liability, 'id'>;

      if (item?.dataset.id && field) {
        const value = target.type === 'number' ? parseFloat(target.value) || 0 : target.value;
        this.handleUpdateLiability(item.dataset.id, field, value);
      }
    });
  }
}

widgetRegistry.register(LiabilitiesWidget, {
  name: 'Liabilities',
  category: 'Finance',
  description: 'Track liabilities with interest rates',
});
