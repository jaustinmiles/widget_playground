#!/usr/bin/env npx tsx
/**
 * Database MCP Server for Widget Playground
 *
 * Provides DuckDB operations with safety features.
 * Auto-backup before write operations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Database from 'duckdb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../../..');
const DB_PATH = path.join(PROJECT_ROOT, 'data/widgets.duckdb');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'data/backups');

class DatabaseMCPServer {
  private server: Server;
  private db: Database.Database | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'widget-playground-database',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private getDB(): Database.Database {
    if (!this.db) {
      // Ensure data directory exists
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.db = new Database.Database(DB_PATH);
      this.initSchema();
    }
    return this.db;
  }

  private initSchema(): void {
    const db = this.db!;

    db.run(`
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

    db.run(`
      CREATE TABLE IF NOT EXISTS providers (
        id VARCHAR PRIMARY KEY,
        type VARCHAR NOT NULL,
        name VARCHAR,
        config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS bindings (
        id VARCHAR PRIMARY KEY,
        widget_id VARCHAR NOT NULL,
        provider_id VARCHAR NOT NULL,
        query_config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS canvas_snapshots (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        description VARCHAR,
        state JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'query',
            description: 'Run a read-only SQL query',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'SQL SELECT query to execute',
                },
              },
              required: ['sql'],
            },
          },
          {
            name: 'execute',
            description: 'Run a write SQL statement (INSERT/UPDATE/DELETE). Creates auto-backup first.',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'SQL statement to execute',
                },
              },
              required: ['sql'],
            },
          },
          {
            name: 'schema',
            description: 'Show schema for a table or list all tables',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Table name (optional - lists all tables if not provided)',
                },
              },
            },
          },
          {
            name: 'backup',
            description: 'Create a timestamped backup of the database',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Optional backup name/description',
                },
              },
            },
          },
          {
            name: 'list_backups',
            description: 'List available database backups',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'restore',
            description: 'Restore database from a backup',
            inputSchema: {
              type: 'object',
              properties: {
                backup_file: {
                  type: 'string',
                  description: 'Backup filename to restore from',
                },
              },
              required: ['backup_file'],
            },
          },
          {
            name: 'export_csv',
            description: 'Export query results to CSV',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'SQL SELECT query',
                },
                filename: {
                  type: 'string',
                  description: 'Output filename (optional)',
                },
              },
              required: ['sql'],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'query':
            return await this.runQuery(args?.sql as string);

          case 'execute':
            return await this.runExecute(args?.sql as string);

          case 'schema':
            return await this.getSchema(args?.table as string | undefined);

          case 'backup':
            return await this.createBackup(args?.name as string | undefined);

          case 'list_backups':
            return await this.listBackups();

          case 'restore':
            return await this.restoreBackup(args?.backup_file as string);

          case 'export_csv':
            return await this.exportCSV(args?.sql as string, args?.filename as string | undefined);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorText = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${errorText}` }],
          isError: true,
        };
      }
    });
  }

  private runQuery(sql: string): Promise<{ content: { type: string; text: string }[] }> {
    return new Promise((resolve, reject) => {
      const db = this.getDB();

      // Basic SQL injection prevention for read queries
      const normalizedSql = sql.trim().toUpperCase();
      if (!normalizedSql.startsWith('SELECT') && !normalizedSql.startsWith('DESCRIBE') && !normalizedSql.startsWith('SHOW')) {
        reject(new Error('Only SELECT, DESCRIBE, and SHOW queries allowed. Use "execute" for write operations.'));
        return;
      }

      db.all(sql, (err: Error | null, rows: unknown[]) => {
        if (err) {
          reject(err);
          return;
        }

        const rowCount = rows.length;
        const preview = rows.slice(0, 50);
        const truncated = rowCount > 50 ? `\n\n(Showing 50 of ${rowCount} rows)` : '';

        resolve({
          content: [
            {
              type: 'text',
              text: `**Query Results** (${rowCount} rows)\n\n\`\`\`json\n${JSON.stringify(preview, null, 2)}\n\`\`\`${truncated}`,
            },
          ],
        });
      });
    });
  }

  private async runExecute(sql: string): Promise<{ content: { type: string; text: string }[] }> {
    // Auto-backup before write operations
    await this.createBackup('auto-backup');

    return new Promise((resolve, reject) => {
      const db = this.getDB();

      db.run(sql, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          content: [
            {
              type: 'text',
              text: `✅ **Executed successfully**`,
            },
          ],
        });
      });
    });
  }

  private async getSchema(table?: string): Promise<{ content: { type: string; text: string }[] }> {
    const db = this.getDB();

    if (table) {
      return new Promise((resolve, reject) => {
        db.all(`DESCRIBE ${table}`, (err: Error | null, rows: unknown[]) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            content: [
              {
                type: 'text',
                text: `**Schema for ${table}**\n\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\``,
              },
            ],
          });
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        db.all(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'`,
          (err: Error | null, rows: unknown[]) => {
            if (err) {
              reject(err);
              return;
            }

            const tables = (rows as { table_name: string }[]).map(r => r.table_name);
            resolve({
              content: [
                {
                  type: 'text',
                  text: `**Tables**\n\n${tables.map(t => `- ${t}`).join('\n')}`,
                },
              ],
            });
          }
        );
      });
    }
  }

  private async createBackup(name?: string): Promise<{ content: { type: string; text: string }[] }> {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = name ? `${name}-${timestamp}` : timestamp;
    const backupPath = path.join(BACKUP_DIR, `${backupName}.duckdb`);

    // Copy database file
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Backup created**\n\nFile: ${backupName}.duckdb`,
        },
      ],
    };
  }

  private async listBackups(): Promise<{ content: { type: string; text: string }[] }> {
    if (!fs.existsSync(BACKUP_DIR)) {
      return {
        content: [
          {
            type: 'text',
            text: '**No backups found**',
          },
        ],
      };
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.duckdb'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: `${(stat.size / 1024).toFixed(1)} KB`,
          created: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.created.localeCompare(a.created));

    return {
      content: [
        {
          type: 'text',
          text: `**Available Backups**\n\n${files.map(f => `- **${f.name}** (${f.size}) - ${f.created}`).join('\n')}`,
        },
      ],
    };
  }

  private async restoreBackup(backupFile: string): Promise<{ content: { type: string; text: string }[] }> {
    const backupPath = path.join(BACKUP_DIR, backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupFile}`);
    }

    // Close current connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Create backup of current database before restore
    if (fs.existsSync(DB_PATH)) {
      const preRestoreBackup = path.join(BACKUP_DIR, `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.duckdb`);
      fs.copyFileSync(DB_PATH, preRestoreBackup);
    }

    // Restore from backup
    fs.copyFileSync(backupPath, DB_PATH);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Restored from backup**\n\nFile: ${backupFile}\n\nPrevious database saved as pre-restore backup.`,
        },
      ],
    };
  }

  private async exportCSV(sql: string, filename?: string): Promise<{ content: { type: string; text: string }[] }> {
    return new Promise((resolve, reject) => {
      const db = this.getDB();

      db.all(sql, (err: Error | null, rows: unknown[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows.length === 0) {
          resolve({
            content: [
              {
                type: 'text',
                text: '**No data to export**',
              },
            ],
          });
          return;
        }

        // Build CSV
        const columns = Object.keys(rows[0] as object);
        const header = columns.join(',');
        const dataRows = rows.map(row => {
          const obj = row as Record<string, unknown>;
          return columns.map(col => {
            const val = obj[col];
            if (val === null || val === undefined) return '';
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return String(val);
          }).join(',');
        });

        const csv = [header, ...dataRows].join('\n');

        if (filename) {
          const exportPath = path.join(PROJECT_ROOT, 'data', filename);
          fs.writeFileSync(exportPath, csv);
          resolve({
            content: [
              {
                type: 'text',
                text: `✅ **Exported to ${filename}**\n\n${rows.length} rows`,
              },
            ],
          });
        } else {
          resolve({
            content: [
              {
                type: 'text',
                text: `**CSV Export** (${rows.length} rows)\n\n\`\`\`csv\n${csv}\n\`\`\``,
              },
            ],
          });
        }
      });
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new DatabaseMCPServer();
server.start().catch(console.error);

export { DatabaseMCPServer };
