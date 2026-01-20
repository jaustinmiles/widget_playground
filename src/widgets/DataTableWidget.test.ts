import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataTableWidget } from './DataTableWidget.js';

describe('DataTableWidget', () => {
  let widget: DataTableWidget;

  const sampleData = {
    headers: ['name', 'age', 'city'],
    rows: [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
      { name: 'Charlie', age: 35, city: 'Chicago' },
      { name: 'Diana', age: 28, city: 'NYC' },
      { name: 'Eve', age: 32, city: 'LA' },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    widget = document.createElement('data-table-widget') as DataTableWidget;
    document.body.appendChild(widget);
    // Trigger initial render (requestAnimationFrame is mocked by fake timers)
    vi.advanceTimersToNextTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
    widget.remove();
  });

  describe('registration', () => {
    it('should be registered as custom element', () => {
      expect(customElements.get('data-table-widget')).toBeDefined();
    });

    it('should have correct tag', () => {
      expect(DataTableWidget.tag).toBe('data-table-widget');
    });

    it('should have widget metadata', () => {
      expect(DataTableWidget.widgetMeta).toBeDefined();
      expect(DataTableWidget.widgetMeta?.name).toBe('Data Table');
      expect(DataTableWidget.widgetMeta?.category).toBe('Display');
    });
  });

  describe('default properties', () => {
    it('should have null data by default', () => {
      expect(widget.getProperty('data')).toBe(null);
    });

    it('should have default pageSize of 50', () => {
      expect(widget.getProperty('pageSize')).toBe(50);
    });

    it('should have sortable enabled by default', () => {
      expect(widget.getProperty('sortable')).toBe(true);
    });

    it('should have searchable enabled by default', () => {
      expect(widget.getProperty('searchable')).toBe(true);
    });
  });

  describe('rendering without data', () => {
    it('should show empty state when no data', () => {
      const emptyState = widget.shadowRoot?.querySelector('.empty-state');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('No data');
    });
  });

  describe('rendering with data', () => {
    beforeEach(() => {
      widget.setProperty('data', sampleData);
      vi.advanceTimersToNextTimer();
    });

    it('should render table element', () => {
      const table = widget.shadowRoot?.querySelector('table');
      expect(table).not.toBeNull();
    });

    it('should render column headers', () => {
      const headers = widget.shadowRoot?.querySelectorAll('th');
      expect(headers?.length).toBe(3);
      expect(headers?.[0].textContent).toContain('name');
      expect(headers?.[1].textContent).toContain('age');
      expect(headers?.[2].textContent).toContain('city');
    });

    it('should render all rows', () => {
      const rows = widget.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(5);
    });

    it('should render cell data correctly', () => {
      const firstRow = widget.shadowRoot?.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');
      expect(cells?.[0].textContent).toBe('Alice');
      expect(cells?.[1].textContent).toContain('30');
      expect(cells?.[2].textContent).toBe('NYC');
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      widget.setProperty('data', sampleData);
      vi.advanceTimersToNextTimer();
    });

    it('should sort by column when header clicked', () => {
      const headers = widget.shadowRoot?.querySelectorAll('th');
      const ageHeader = headers?.[1] as HTMLElement; // age column
      ageHeader?.click();
      vi.advanceTimersToNextTimer();

      const firstRow = widget.shadowRoot?.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');
      expect(cells?.[0].textContent).toBe('Bob'); // Bob has lowest age (25)
    });

    it('should reverse sort on second click', () => {
      let headers = widget.shadowRoot?.querySelectorAll('th');
      let ageHeader = headers?.[1] as HTMLElement;
      ageHeader?.click(); // First click - ascending
      vi.advanceTimersToNextTimer();

      // Re-query after re-render (old elements are stale)
      headers = widget.shadowRoot?.querySelectorAll('th');
      ageHeader = headers?.[1] as HTMLElement;
      ageHeader?.click(); // Second click - descending
      vi.advanceTimersToNextTimer();

      const firstRow = widget.shadowRoot?.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');
      expect(cells?.[0].textContent).toBe('Charlie'); // Charlie has highest age (35)
    });

    it('should show sort indicator class', () => {
      const headers = widget.shadowRoot?.querySelectorAll('th');
      const nameHeader = headers?.[0] as HTMLElement;
      nameHeader?.click();
      vi.advanceTimersToNextTimer();

      // Re-query after re-render to get updated element with class
      const updatedHeaders = widget.shadowRoot?.querySelectorAll('th');
      const updatedNameHeader = updatedHeaders?.[0] as HTMLElement;

      // Widget uses sorted-asc/sorted-desc classes
      expect(updatedNameHeader.classList.contains('sorted-asc')).toBe(true);
    });

    it('should not sort when sortable is disabled', () => {
      widget.setProperty('sortable', false);
      vi.advanceTimersToNextTimer();

      const headers = widget.shadowRoot?.querySelectorAll('th');
      const nameHeader = headers?.[0] as HTMLElement;
      nameHeader?.click();
      vi.advanceTimersToNextTimer();

      // First row should still be Alice (original order)
      const firstRow = widget.shadowRoot?.querySelector('tbody tr');
      const cells = firstRow?.querySelectorAll('td');
      expect(cells?.[0].textContent).toBe('Alice');
    });
  });

  describe('searching', () => {
    beforeEach(() => {
      widget.setProperty('data', sampleData);
      vi.advanceTimersToNextTimer();
    });

    it('should render search input when searchable', () => {
      const searchInput = widget.shadowRoot?.querySelector('.search');
      expect(searchInput).not.toBeNull();
    });

    it('should not render search input when searchable is disabled', () => {
      widget.setProperty('searchable', false);
      vi.advanceTimersToNextTimer();
      const searchInput = widget.shadowRoot?.querySelector('.search');
      expect(searchInput).toBeNull();
    });

    it('should filter rows based on search', () => {
      const searchInput = widget.shadowRoot?.querySelector('.search') as HTMLInputElement;
      searchInput.value = 'NYC';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersToNextTimer();

      const rows = widget.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(2); // Alice and Diana are in NYC
    });

    it('should filter case-insensitively', () => {
      const searchInput = widget.shadowRoot?.querySelector('.search') as HTMLInputElement;
      searchInput.value = 'nyc';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersToNextTimer();

      const rows = widget.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(2);
    });

    it('should show empty state when no matches', () => {
      const searchInput = widget.shadowRoot?.querySelector('.search') as HTMLInputElement;
      searchInput.value = 'nonexistent';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersToNextTimer();

      const emptyState = widget.shadowRoot?.querySelector('.empty-state');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('No matching');
    });
  });

  describe('page size limiting', () => {
    const largeData = {
      headers: ['id', 'value'],
      rows: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, value: `Item ${i + 1}` })),
    };

    it('should only show pageSize rows', () => {
      widget.setProperty('pageSize', 10);
      widget.setProperty('data', largeData);
      vi.advanceTimersToNextTimer();

      const rows = widget.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(10);
    });

    it('should show row count', () => {
      widget.setProperty('pageSize', 10);
      widget.setProperty('data', largeData);
      vi.advanceTimersToNextTimer();

      const rowCount = widget.shadowRoot?.querySelector('.row-count');
      expect(rowCount?.textContent).toContain('10');
      expect(rowCount?.textContent).toContain('100');
    });
  });

  describe('data updates', () => {
    it('should update table when data changes', () => {
      widget.setProperty('data', sampleData);
      vi.advanceTimersToNextTimer();

      let rows = widget.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(5);

      // Update with new data
      widget.setProperty('data', {
        headers: ['x', 'y'],
        rows: [{ x: 1, y: 2 }],
      });
      vi.advanceTimersToNextTimer();

      rows = widget.shadowRoot?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(1);
    });
  });

  describe('setDataFromCSV helper', () => {
    it('should accept CSV data format', () => {
      widget.setDataFromCSV({
        headers: ['col1', 'col2'],
        rows: [{ col1: 'a', col2: 'b' }],
      });
      vi.advanceTimersToNextTimer();

      const headers = widget.shadowRoot?.querySelectorAll('th');
      expect(headers?.length).toBe(2);
    });
  });
});
