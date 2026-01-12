/**
 * Data provider type definitions
 */

/**
 * Standardized data record (CSV-like row)
 */
export interface DataRecord {
  [key: string]: string | number | boolean | null;
}

/**
 * Dataset with metadata
 */
export interface DataSet {
  /** Column definitions */
  columns: ColumnDefinition[];
  /** Data rows */
  records: DataRecord[];
  /** Optional metadata */
  meta?: DataSetMeta;
}

export interface DataSetMeta {
  source: string;
  timestamp: number;
  rowCount: number;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  nullable?: boolean;
}

export type ColumnType = 'string' | 'number' | 'boolean' | 'date';

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: string;
  type: ProviderType;
  options: Record<string, unknown>;
}

export type ProviderType = 'csv' | 'llm' | 'duckdb' | 'static';

/**
 * Data provider interface - all providers implement this
 */
export interface IDataProvider<TConfig = unknown> {
  /** Provider type identifier */
  readonly type: ProviderType;
  /** Provider instance ID */
  readonly id: string;
  /** Current configuration */
  readonly config: TConfig;

  /** Initialize the provider */
  initialize(): Promise<void>;

  /** Fetch data, optionally with query parameters */
  fetch(query?: DataQuery): Promise<DataSet>;

  /** Subscribe to data changes (for live data) */
  subscribe(callback: (data: DataSet) => void): () => void;

  /** Cleanup resources */
  dispose(): void;
}

/**
 * Query parameters for data filtering/transformation
 */
export interface DataQuery {
  filter?: Record<string, unknown>;
  sort?: SortSpec[];
  limit?: number;
  offset?: number;
  columns?: string[];
}

export interface SortSpec {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * CSV Provider specific config
 */
export interface CSVProviderConfig {
  /** CSV content as string, URL, or File */
  source: string | File;
  /** Delimiter character (default: ',') */
  delimiter?: string;
  /** Whether first row contains headers (default: true) */
  hasHeaders?: boolean;
  /** Custom column definitions (overrides auto-detection) */
  columns?: ColumnDefinition[];
}

/**
 * LLM Provider specific config
 */
export interface LLMProviderConfig {
  /** The document/text to extract data from */
  document: string;
  /** Instructions for extraction */
  extractionPrompt?: string;
  /** Expected output schema */
  outputSchema: import('./widget.types').DataSchema;
}

/**
 * DuckDB Provider specific config
 */
export interface DuckDBProviderConfig {
  /** SQL query to execute */
  query: string;
  /** Named parameters for the query */
  params?: Record<string, unknown>;
}
