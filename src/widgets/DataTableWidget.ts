/**
 * DataTable Widget
 *
 * Displays tabular data with sorting and basic filtering.
 * Can be bound to CSV or other data providers.
 */

import { BaseWidget, widgetRegistry } from '../core/widget/index.js';

const TABLE_STYLES = `
  .data-table {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
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
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .row-count {
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

  td {
    color: #334155;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #94a3b8;
    font-style: italic;
  }

  .cell-number {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .cell-boolean {
    text-align: center;
  }

  .cell-boolean.true {
    color: #059669;
  }

  .cell-boolean.false {
    color: #dc2626;
  }
`;

interface TableRow {
  [key: string]: unknown;
}

interface TableData {
  headers: string[];
  rows: TableRow[];
}

export class DataTableWidget extends BaseWidget {
  static tag = 'data-table-widget';
  static properties = {
    data: { type: 'object' as const, default: null },
    pageSize: { type: 'number' as const, default: 50 },
    sortable: { type: 'boolean' as const, default: true },
    searchable: { type: 'boolean' as const, default: true },
  };
  static styles = TABLE_STYLES;

  private sortColumn: string | null = null;
  private sortDirection: 'asc' | 'desc' = 'asc';
  private searchTerm = '';

  private get tableData(): TableData | null {
    const data = this.getProperty<TableData>('data');
    if (!data || !data.headers || !data.rows) return null;
    return data;
  }

  private get filteredRows(): TableRow[] {
    const data = this.tableData;
    if (!data) return [];

    let rows = [...data.rows];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      rows = rows.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Apply sorting
    if (this.sortColumn) {
      const col = this.sortColumn;
      const dir = this.sortDirection === 'asc' ? 1 : -1;

      rows.sort((a, b) => {
        const aVal = a[col];
        const bVal = b[col];

        if (aVal === null || aVal === undefined) return dir;
        if (bVal === null || bVal === undefined) return -dir;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * dir;
        }

        return String(aVal).localeCompare(String(bVal)) * dir;
      });
    }

    return rows;
  }

  private handleSort(column: string): void {
    if (!this.getProperty<boolean>('sortable')) return;

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.requestRender();
  }

  private handleSearch(term: string): void {
    this.searchTerm = term;
    this.requestRender();
  }

  private formatCell(value: unknown, header: string): string {
    if (value === null || value === undefined) {
      return '<span style="color: #94a3b8">—</span>';
    }

    if (typeof value === 'boolean') {
      return `<span class="cell-boolean ${value}">${value ? '✓' : '✗'}</span>`;
    }

    if (typeof value === 'number') {
      return `<span class="cell-number">${value.toLocaleString()}</span>`;
    }

    return String(value);
  }

  protected render(): string {
    const data = this.tableData;
    const searchable = this.getProperty<boolean>('searchable');
    const pageSize = this.getProperty<number>('pageSize') || 50;

    if (!data) {
      return `
        <div class="data-table">
          <div class="empty-state">No data available</div>
        </div>
      `;
    }

    const rows = this.filteredRows.slice(0, pageSize);
    const totalRows = this.filteredRows.length;

    return `
      <div class="data-table">
        ${searchable ? `
          <div class="toolbar">
            <input
              type="text"
              class="search"
              placeholder="Search..."
              value="${this.searchTerm}"
              data-action="search"
            />
            <span class="row-count">${rows.length} of ${data.rows.length} rows</span>
          </div>
        ` : ''}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${data.headers.map(header => {
                  let className = '';
                  if (this.sortColumn === header) {
                    className = `sorted-${this.sortDirection}`;
                  }
                  return `<th class="${className}" data-column="${header}">${header}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${data.headers.map(header =>
                    `<td>${this.formatCell(row[header], header)}</td>`
                  ).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${rows.length === 0 ? `
            <div class="empty-state">No matching rows</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Event delegation
    this.shadowRoot?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const column = target.dataset.column;

      if (column) {
        this.handleSort(column);
      }
    });

    this.shadowRoot?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.dataset.action === 'search') {
        this.handleSearch(target.value);
      }
    });
  }

  /**
   * Set data from a CSV provider result
   */
  setDataFromCSV(csvData: { headers: string[]; rows: TableRow[] }): void {
    this.setProperty('data', csvData);
  }
}

// Register the widget
widgetRegistry.register(DataTableWidget, {
  name: 'Data Table',
  category: 'Display',
  description: 'Display tabular data with sorting',
});
