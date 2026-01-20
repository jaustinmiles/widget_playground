#!/usr/bin/env npx tsx
/**
 * App MCP Server for Widget Playground
 *
 * Provides control over the Vite development server.
 * Start, stop, restart, and check status.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { MCPToolResponse, textResponse } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../../..');
const PID_FILE = path.join(PROJECT_ROOT, '.vite.pid');

class AppMCPServer {
  private server: Server;
  private devServer: ChildProcess | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'widget-playground-app',
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

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'start',
            description: 'Start the Vite development server',
            inputSchema: {
              type: 'object',
              properties: {
                port: {
                  type: 'number',
                  description: 'Port to run on (default: 5173)',
                },
              },
            },
          },
          {
            name: 'stop',
            description: 'Stop the Vite development server',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'status',
            description: 'Check if the dev server is running',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'restart',
            description: 'Restart the Vite development server',
            inputSchema: {
              type: 'object',
              properties: {
                port: {
                  type: 'number',
                  description: 'Port to run on (default: 5173)',
                },
              },
            },
          },
          {
            name: 'build',
            description: 'Run production build',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'preview',
            description: 'Preview the production build',
            inputSchema: {
              type: 'object',
              properties: {
                port: {
                  type: 'number',
                  description: 'Port to run on (default: 4173)',
                },
              },
            },
          },
          {
            name: 'test',
            description: 'Run tests with Vitest',
            inputSchema: {
              type: 'object',
              properties: {
                watch: {
                  type: 'boolean',
                  description: 'Run in watch mode (default: false)',
                },
                filter: {
                  type: 'string',
                  description: 'Filter tests by name pattern',
                },
              },
            },
          },
          {
            name: 'lint',
            description: 'Run ESLint on the codebase',
            inputSchema: {
              type: 'object',
              properties: {
                fix: {
                  type: 'boolean',
                  description: 'Auto-fix issues (default: false)',
                },
              },
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'start':
            return await this.startServer(args?.port as number | undefined);

          case 'stop':
            return await this.stopServer();

          case 'status':
            return await this.getStatus();

          case 'restart':
            return await this.restartServer(args?.port as number | undefined);

          case 'build':
            return await this.runBuild();

          case 'preview':
            return await this.runPreview(args?.port as number | undefined);

          case 'test':
            return await this.runTests(
              args?.watch as boolean | undefined,
              args?.filter as string | undefined
            );

          case 'lint':
            return await this.runLint(args?.fix as boolean | undefined);

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

  private isServerRunning(): { running: boolean; pid?: number } {
    if (fs.existsSync(PID_FILE)) {
      try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
        // Check if process exists
        process.kill(pid, 0);
        return { running: true, pid };
      } catch {
        // Process doesn't exist, clean up PID file
        fs.unlinkSync(PID_FILE);
        return { running: false };
      }
    }
    return { running: false };
  }

  private async startServer(port: number = 5173): Promise<MCPToolResponse> {
    const status = this.isServerRunning();
    if (status.running) {
      return {
        content: [
          {
            type: 'text',
            text: `**Server already running**\n\nPID: ${status.pid}\nURL: http://localhost:${port}`,
          },
        ],
      };
    }

    return new Promise((resolve) => {
      this.devServer = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const pid = this.devServer.pid;
      if (pid) {
        fs.writeFileSync(PID_FILE, String(pid));
      }

      let output = '';
      const timeout = setTimeout(() => {
        resolve({
          content: [
            {
              type: 'text',
              text: `**Dev server started**\n\nPID: ${pid}\nURL: http://localhost:${port}\n\nOutput:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        });
      }, 3000);

      this.devServer.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Local:')) {
          clearTimeout(timeout);
          resolve({
            content: [
              {
                type: 'text',
                text: `**Dev server started**\n\nPID: ${pid}\nURL: http://localhost:${port}\n\nOutput:\n\`\`\`\n${output}\n\`\`\``,
              },
            ],
          });
        }
      });

      this.devServer.stderr?.on('data', (data) => {
        output += data.toString();
      });

      this.devServer.unref();
    });
  }

  private async stopServer(): Promise<MCPToolResponse> {
    const status = this.isServerRunning();
    if (!status.running) {
      return {
        content: [
          {
            type: 'text',
            text: '**Server not running**',
          },
        ],
      };
    }

    try {
      process.kill(status.pid!, 'SIGTERM');
      fs.unlinkSync(PID_FILE);

      return {
        content: [
          {
            type: 'text',
            text: `**Server stopped**\n\nPID ${status.pid} terminated.`,
          },
        ],
      };
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `**Failed to stop server**\n\nError: ${errorText}`,
          },
        ],
      };
    }
  }

  private async getStatus(): Promise<MCPToolResponse> {
    const status = this.isServerRunning();

    if (status.running) {
      return {
        content: [
          {
            type: 'text',
            text: `**Server Status: Running**\n\nPID: ${status.pid}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: '**Server Status: Stopped**',
        },
      ],
    };
  }

  private async restartServer(port?: number): Promise<MCPToolResponse> {
    await this.stopServer();
    // Small delay to ensure port is released
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.startServer(port);
  }

  private async runBuild(): Promise<MCPToolResponse> {
    return new Promise((resolve) => {
      try {
        const output = execSync('npm run build', {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          timeout: 120000, // 2 minute timeout
        });

        resolve({
          content: [
            {
              type: 'text',
              text: `**Build completed**\n\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        });
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        resolve({
          content: [
            {
              type: 'text',
              text: `**Build failed**\n\n\`\`\`\n${err.stdout || ''}\n${err.stderr || ''}\n${err.message}\n\`\`\``,
            },
          ],
        });
      }
    });
  }

  private async runPreview(port: number = 4173): Promise<MCPToolResponse> {
    return new Promise((resolve) => {
      const preview = spawn('npm', ['run', 'preview', '--', '--port', String(port)], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      const timeout = setTimeout(() => {
        resolve({
          content: [
            {
              type: 'text',
              text: `**Preview server started**\n\nURL: http://localhost:${port}\n\nOutput:\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        });
      }, 3000);

      preview.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Local:')) {
          clearTimeout(timeout);
          resolve({
            content: [
              {
                type: 'text',
                text: `**Preview server started**\n\nURL: http://localhost:${port}\n\nOutput:\n\`\`\`\n${output}\n\`\`\``,
              },
            ],
          });
        }
      });

      preview.stderr?.on('data', (data) => {
        output += data.toString();
      });

      preview.unref();
    });
  }

  private async runTests(
    watch: boolean = false,
    filter?: string
  ): Promise<MCPToolResponse> {
    return new Promise((resolve) => {
      const args = ['run', 'test'];
      if (!watch) {
        args.push('--', '--run');
      }
      if (filter) {
        args.push('--', '-t', filter);
      }

      try {
        const output = execSync(`npm ${args.join(' ')}`, {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          timeout: 300000, // 5 minute timeout
        });

        resolve({
          content: [
            {
              type: 'text',
              text: `**Tests completed**\n\n\`\`\`\n${output}\n\`\`\``,
            },
          ],
        });
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        resolve({
          content: [
            {
              type: 'text',
              text: `**Tests failed**\n\n\`\`\`\n${err.stdout || ''}\n${err.stderr || ''}\n\`\`\``,
            },
          ],
        });
      }
    });
  }

  private async runLint(fix: boolean = false): Promise<MCPToolResponse> {
    return new Promise((resolve) => {
      const args = ['run', 'lint'];
      if (fix) {
        args.push('--', '--fix');
      }

      try {
        const output = execSync(`npm ${args.join(' ')}`, {
          cwd: PROJECT_ROOT,
          encoding: 'utf-8',
          timeout: 60000, // 1 minute timeout
        });

        resolve({
          content: [
            {
              type: 'text',
              text: `**Lint completed**\n\n\`\`\`\n${output || 'No issues found'}\n\`\`\``,
            },
          ],
        });
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message: string };
        resolve({
          content: [
            {
              type: 'text',
              text: `**Lint issues found**\n\n\`\`\`\n${err.stdout || ''}\n${err.stderr || ''}\n\`\`\``,
            },
          ],
        });
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new AppMCPServer();
server.start().catch(console.error);

export { AppMCPServer };
