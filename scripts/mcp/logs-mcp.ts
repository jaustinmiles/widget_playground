#!/usr/bin/env npx tsx
/**
 * Logs MCP Server for Widget Playground
 *
 * Provides access to application logs for debugging.
 * Reads from in-memory log buffer exported by the logger module.
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
import { MCPToolResponse, textResponse } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../../..');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'app.log');

class LogsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'widget-playground-logs',
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

  private ensureLogsDir(): void {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'tail_logs',
            description: 'Get the last N lines of logs',
            inputSchema: {
              type: 'object',
              properties: {
                lines: {
                  type: 'number',
                  description: 'Number of lines to return (default: 50)',
                },
              },
            },
          },
          {
            name: 'search_logs',
            description: 'Search logs for a pattern (case-insensitive)',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'Search pattern (regex supported)',
                },
                context: {
                  type: 'number',
                  description: 'Number of lines before/after each match (default: 2)',
                },
              },
              required: ['pattern'],
            },
          },
          {
            name: 'log_levels',
            description: 'Filter logs by level (error, warn, info, debug)',
            inputSchema: {
              type: 'object',
              properties: {
                level: {
                  type: 'string',
                  enum: ['error', 'warn', 'info', 'debug'],
                  description: 'Minimum log level to show',
                },
                lines: {
                  type: 'number',
                  description: 'Maximum lines to return (default: 100)',
                },
              },
              required: ['level'],
            },
          },
          {
            name: 'clear_logs',
            description: 'Archive current logs and start fresh',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_log_files',
            description: 'List all log files including archives',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'write_log',
            description: 'Write a log entry (for testing or manual logging)',
            inputSchema: {
              type: 'object',
              properties: {
                level: {
                  type: 'string',
                  enum: ['error', 'warn', 'info', 'debug'],
                  description: 'Log level',
                },
                message: {
                  type: 'string',
                  description: 'Log message',
                },
                context: {
                  type: 'object',
                  description: 'Optional context object',
                },
              },
              required: ['level', 'message'],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'tail_logs':
            return await this.tailLogs(args?.lines as number | undefined);

          case 'search_logs':
            return await this.searchLogs(
              args?.pattern as string,
              args?.context as number | undefined
            );

          case 'log_levels':
            return await this.filterByLevel(
              args?.level as string,
              args?.lines as number | undefined
            );

          case 'clear_logs':
            return await this.clearLogs();

          case 'list_log_files':
            return await this.listLogFiles();

          case 'write_log':
            return await this.writeLog(
              args?.level as string,
              args?.message as string,
              args?.context as Record<string, unknown> | undefined
            );

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

  private readLogFile(): string[] {
    this.ensureLogsDir();
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return content.split('\n').filter(line => line.trim());
  }

  private async tailLogs(lines: number = 50): Promise<MCPToolResponse> {
    const allLines = this.readLogFile();
    const lastLines = allLines.slice(-lines);

    if (lastLines.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '**No logs found**\n\nThe log file is empty or does not exist.',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Last ${lastLines.length} log entries**\n\n\`\`\`\n${lastLines.join('\n')}\n\`\`\``,
        },
      ],
    };
  }

  private async searchLogs(
    pattern: string,
    context: number = 2
  ): Promise<MCPToolResponse> {
    const allLines = this.readLogFile();
    const regex = new RegExp(pattern, 'i');
    const matches: { lineNum: number; lines: string[] }[] = [];

    allLines.forEach((line, index) => {
      if (regex.test(line)) {
        const start = Math.max(0, index - context);
        const end = Math.min(allLines.length, index + context + 1);
        matches.push({
          lineNum: index + 1,
          lines: allLines.slice(start, end).map((l, i) => {
            const actualLine = start + i + 1;
            const marker = actualLine === index + 1 ? '>' : ' ';
            return `${marker} ${actualLine}: ${l}`;
          }),
        });
      }
    });

    if (matches.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No matches found for pattern:** \`${pattern}\``,
          },
        ],
      };
    }

    const output = matches
      .slice(0, 20) // Limit to 20 matches
      .map(m => m.lines.join('\n'))
      .join('\n---\n');

    const truncated = matches.length > 20 ? `\n\n*(Showing 20 of ${matches.length} matches)*` : '';

    return {
      content: [
        {
          type: 'text',
          text: `**Search results for:** \`${pattern}\` (${matches.length} matches)\n\n\`\`\`\n${output}\n\`\`\`${truncated}`,
        },
      ],
    };
  }

  private async filterByLevel(
    level: string,
    lines: number = 100
  ): Promise<MCPToolResponse> {
    const levelPriority: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    const minPriority = levelPriority[level.toLowerCase()] ?? 0;
    const allLines = this.readLogFile();

    const filtered = allLines.filter(line => {
      const match = line.match(/\[(DEBUG|INFO|WARN|ERROR)\]/i);
      if (!match) return false;
      const lineLevel = match[1].toLowerCase();
      return (levelPriority[lineLevel] ?? 0) >= minPriority;
    });

    const result = filtered.slice(-lines);

    if (result.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No logs found at level:** ${level.toUpperCase()} or higher`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Logs at ${level.toUpperCase()} level or higher** (${result.length} entries)\n\n\`\`\`\n${result.join('\n')}\n\`\`\``,
        },
      ],
    };
  }

  private async clearLogs(): Promise<MCPToolResponse> {
    this.ensureLogsDir();

    if (!fs.existsSync(LOG_FILE)) {
      return {
        content: [
          {
            type: 'text',
            text: '**No logs to clear**',
          },
        ],
      };
    }

    // Archive current log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(LOGS_DIR, `app-${timestamp}.log`);
    fs.renameSync(LOG_FILE, archivePath);

    // Create fresh log file
    fs.writeFileSync(LOG_FILE, '');

    return {
      content: [
        {
          type: 'text',
          text: `**Logs archived**\n\nPrevious logs saved to: \`${path.basename(archivePath)}\`\n\nNew log file started.`,
        },
      ],
    };
  }

  private async listLogFiles(): Promise<MCPToolResponse> {
    this.ensureLogsDir();

    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const stat = fs.statSync(path.join(LOGS_DIR, f));
        return {
          name: f,
          size: `${(stat.size / 1024).toFixed(1)} KB`,
          modified: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    if (files.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '**No log files found**',
          },
        ],
      };
    }

    const fileList = files.map(f => `- **${f.name}** (${f.size}) - ${f.modified}`).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Log Files**\n\n${fileList}`,
        },
      ],
    };
  }

  private async writeLog(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ): Promise<MCPToolResponse> {
    this.ensureLogsDir();

    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}\n`;

    fs.appendFileSync(LOG_FILE, logLine);

    return {
      content: [
        {
          type: 'text',
          text: `**Log entry written**\n\n\`${logLine.trim()}\``,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new LogsMCPServer();
server.start().catch(console.error);

export { LogsMCPServer };
