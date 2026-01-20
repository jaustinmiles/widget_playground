/**
 * DuckDB Connection Manager
 *
 * Provides database connection and schema management for widget playground.
 * Uses DuckDB for columnar storage - great for analytics widgets and CSV operations.
 */

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';

export interface DuckDBConnection {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
}

let connection: DuckDBConnection | null = null;

/**
 * Initialize DuckDB connection (browser/WASM version)
 */
export async function initDuckDB(): Promise<DuckDBConnection> {
  if (connection) {
    return connection;
  }

  // Initialize DuckDB WASM
  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: duckdb_wasm,
      mainWorker: duckdb_worker,
    },
    eh: {
      mainModule: duckdb_wasm,
      mainWorker: duckdb_worker,
    },
  };

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule);
  const conn = await db.connect();

  connection = { db, conn };

  // Initialize schema
  await initSchema(conn);

  return connection;
}

/**
 * Get existing connection or initialize new one
 */
export async function getDuckDB(): Promise<DuckDBConnection> {
  if (!connection) {
    return initDuckDB();
  }
  return connection;
}

/**
 * Initialize database schema
 */
async function initSchema(conn: duckdb.AsyncDuckDBConnection): Promise<void> {
  // Widget instances on canvas
  await conn.query(`
    CREATE TABLE IF NOT EXISTS widget_instances (
      id VARCHAR PRIMARY KEY,
      widget_type VARCHAR NOT NULL,
      config JSON,
      position_x FLOAT DEFAULT 0,
      position_y FLOAT DEFAULT 0,
      width FLOAT DEFAULT 200,
      height FLOAT DEFAULT 150,
      z_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Data provider configurations
  await conn.query(`
    CREATE TABLE IF NOT EXISTS providers (
      id VARCHAR PRIMARY KEY,
      type VARCHAR NOT NULL,
      name VARCHAR,
      config JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Widget-provider bindings
  await conn.query(`
    CREATE TABLE IF NOT EXISTS bindings (
      id VARCHAR PRIMARY KEY,
      widget_id VARCHAR NOT NULL,
      provider_id VARCHAR NOT NULL,
      query_config JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Canvas state snapshots (for save/load)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS canvas_snapshots (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      description VARCHAR,
      state JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Application logs (for MCP log viewer)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id INTEGER PRIMARY KEY,
      level VARCHAR NOT NULL,
      message VARCHAR NOT NULL,
      context JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sequence for log IDs
  await conn.query(`
    CREATE SEQUENCE IF NOT EXISTS log_id_seq START 1
  `);
}

/**
 * Execute a query and return results as objects
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const { conn } = await getDuckDB();
  const result = await conn.query(sql);
  return result.toArray().map(row => row.toJSON() as T);
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
export async function execute(sql: string): Promise<void> {
  const { conn } = await getDuckDB();
  await conn.query(sql);
}

/**
 * Close the database connection
 */
export async function closeDuckDB(): Promise<void> {
  if (connection) {
    await connection.conn.close();
    await connection.db.terminate();
    connection = null;
  }
}

/**
 * Export query results to CSV string
 */
export async function exportToCSV(sql: string): Promise<string> {
  const { conn } = await getDuckDB();
  const result = await conn.query(sql);

  const columns = result.schema.fields.map(f => f.name);
  const rows = result.toArray();

  // Build CSV
  const header = columns.join(',');
  const dataRows = rows.map(row => {
    const obj = row.toJSON();
    return columns.map(col => {
      const val = obj[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(',');
  });

  return [header, ...dataRows].join('\n');
}

/**
 * Import CSV data into a table
 */
export async function importFromCSV(
  tableName: string,
  csvContent: string,
  options: { hasHeader?: boolean; delimiter?: string } = {}
): Promise<number> {
  const { conn, db } = await getDuckDB();
  const { hasHeader = true, delimiter = ',' } = options;

  // Register CSV as a virtual file
  await db.registerFileText(`${tableName}.csv`, csvContent);

  // Import into table
  await conn.query(`
    CREATE OR REPLACE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${tableName}.csv',
      header=${hasHeader},
      delim='${delimiter}'
    )
  `);

  // Get row count
  const result = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  const rows = result.toArray();
  return rows[0]?.toJSON().count as number || 0;
}

/**
 * Get table schema information
 */
export async function getTableSchema(tableName: string): Promise<{ name: string; type: string }[]> {
  const { conn } = await getDuckDB();
  const result = await conn.query(`DESCRIBE ${tableName}`);
  return result.toArray().map(row => {
    const obj = row.toJSON();
    return {
      name: obj.column_name as string,
      type: obj.column_type as string,
    };
  });
}

/**
 * List all tables in the database
 */
export async function listTables(): Promise<string[]> {
  const { conn } = await getDuckDB();
  const result = await conn.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'main'
  `);
  return result.toArray().map(row => row.toJSON().table_name as string);
}
