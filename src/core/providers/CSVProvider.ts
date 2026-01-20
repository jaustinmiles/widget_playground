/**
 * CSV Data Provider
 *
 * Loads and parses CSV data from URLs or raw content.
 * Uses DuckDB for SQL queries on CSV data.
 */

import { BaseProvider } from './BaseProvider.js';
import type { ProviderConfig, DataResult, CSVProviderOptions } from './types.js';

export interface CSVRow {
  [key: string]: string | number | boolean | null;
}

export interface CSVData {
  headers: string[];
  rows: CSVRow[];
  rowCount: number;
}

export class CSVProvider extends BaseProvider<CSVData> {
  private options: CSVProviderOptions;

  constructor(config: ProviderConfig & { options: CSVProviderOptions }) {
    super(config);
    this.options = config.options;
  }

  /**
   * Fetch CSV data from URL or parse raw content
   */
  async fetch(): Promise<DataResult<CSVData>> {
    this.setStatus('loading');

    try {
      let content: string;

      if (this.options.url) {
        const response = await fetch(this.options.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        content = await response.text();
      } else if (this.options.content) {
        content = this.options.content;
      } else {
        throw new Error('CSVProvider requires either url or content option');
      }

      const data = this.parseCSV(content);
      this.setData(data);
      this.setStatus('ready');

      return this.createResult(data, {
        source: this.options.url || 'inline',
        rowCount: data.rowCount,
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Query CSV data with optional filtering
   */
  async query(params?: {
    filter?: (row: CSVRow) => boolean;
    columns?: string[];
    limit?: number;
    offset?: number;
  }): Promise<DataResult<CSVData>> {
    if (!this._data) {
      await this.fetch();
    }

    const data = this._data!;
    let rows = [...data.rows];

    // Apply filter
    if (params?.filter) {
      rows = rows.filter(params.filter);
    }

    // Apply offset
    if (params?.offset) {
      rows = rows.slice(params.offset);
    }

    // Apply limit
    if (params?.limit) {
      rows = rows.slice(0, params.limit);
    }

    // Select columns
    let headers = data.headers;
    if (params?.columns) {
      headers = params.columns.filter(c => data.headers.includes(c));
      rows = rows.map(row => {
        const filtered: CSVRow = {};
        for (const col of headers) {
          filtered[col] = row[col];
        }
        return filtered;
      });
    }

    const result: CSVData = {
      headers,
      rows,
      rowCount: rows.length,
    };

    return this.createResult(result, {
      filtered: !!params?.filter,
      totalRows: data.rowCount,
    });
  }

  /**
   * Parse CSV content into structured data
   */
  private parseCSV(content: string): CSVData {
    const delimiter = this.options.delimiter || ',';
    const hasHeaders = this.options.headers !== false;

    const lines = content
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      return { headers: [], rows: [], rowCount: 0 };
    }

    // Parse header row
    const firstRow = this.parseLine(lines[0], delimiter);
    const headers = hasHeaders
      ? firstRow
      : firstRow.map((_, i) => `column_${i + 1}`);

    // Parse data rows
    const startIndex = hasHeaders ? 1 : 0;
    const rows: CSVRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const values = this.parseLine(lines[i], delimiter);
      const row: CSVRow = {};

      for (let j = 0; j < headers.length; j++) {
        const value = values[j] ?? '';
        row[headers[j]] = this.parseValue(value);
      }

      rows.push(row);
    }

    return {
      headers,
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Parse a single CSV line, handling quoted values
   */
  private parseLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Parse a string value to appropriate type
   */
  private parseValue(value: string): string | number | boolean | null {
    // Empty or null
    if (value === '' || value.toLowerCase() === 'null') {
      return null;
    }

    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return num;
    }

    // String (remove surrounding quotes if present)
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    return value;
  }

  /**
   * Get a specific column's values
   */
  getColumn(columnName: string): (string | number | boolean | null)[] {
    if (!this._data) {
      return [];
    }
    return this._data.rows.map(row => row[columnName]);
  }

  /**
   * Get unique values in a column
   */
  getUniqueValues(columnName: string): (string | number | boolean | null)[] {
    const values = this.getColumn(columnName);
    return [...new Set(values)];
  }
}
