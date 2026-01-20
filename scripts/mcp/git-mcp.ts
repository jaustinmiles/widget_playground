#!/usr/bin/env npx tsx
/**
 * Git MCP Server for Widget Playground
 *
 * Provides git operations with Claude bot authentication.
 * Enforces PR workflow - prevents direct commits to main/master.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From scripts/mcp/dist/ we need to go up 3 levels to project root
const PROJECT_ROOT = path.join(__dirname, '../../..');

class GitMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'widget-playground-git',
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
            name: 'setup_bot_auth',
            description: 'Set up Claude bot authentication for GitHub operations',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'status',
            description: 'Get git status of the repository',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_branch',
            description: 'Create and switch to a new feature branch',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Branch name (without feature/ prefix)',
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'stage_files',
            description: 'Add files to git staging area',
            inputSchema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to stage (stages all if not specified)',
                },
              },
            },
          },
          {
            name: 'commit',
            description: 'Commit staged changes with co-author attribution',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Commit message',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific files to commit (optional)',
                },
              },
              required: ['message'],
            },
          },
          {
            name: 'push',
            description: 'Push commits to remote branch',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'push_and_pr',
            description: 'Push branch and create a pull request',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'PR title',
                },
                body: {
                  type: 'string',
                  description: 'PR description',
                },
              },
              required: ['title', 'body'],
            },
          },
          {
            name: 'pr_reviews',
            description: 'Get review comments on a PR',
            inputSchema: {
              type: 'object',
              properties: {
                prNumber: {
                  type: 'number',
                  description: 'PR number',
                },
              },
              required: ['prNumber'],
            },
          },
          {
            name: 'reply_to_comment',
            description: 'Reply to a PR review comment',
            inputSchema: {
              type: 'object',
              properties: {
                prNumber: {
                  type: 'number',
                  description: 'PR number',
                },
                commentId: {
                  type: 'number',
                  description: 'Comment ID to reply to',
                },
                body: {
                  type: 'string',
                  description: 'Reply message',
                },
              },
              required: ['prNumber', 'commentId', 'body'],
            },
          },
          {
            name: 'log',
            description: 'Show recent commit history',
            inputSchema: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                  description: 'Number of commits to show (default: 10)',
                },
              },
            },
          },
          {
            name: 'diff',
            description: 'Show uncommitted changes',
            inputSchema: {
              type: 'object',
              properties: {
                staged: {
                  type: 'boolean',
                  description: 'Show only staged changes',
                },
              },
            },
          },
          {
            name: 'checkout',
            description: 'Switch to a different branch',
            inputSchema: {
              type: 'object',
              properties: {
                branch: {
                  type: 'string',
                  description: 'Branch name to switch to (e.g., "main" or "feature/xyz")',
                },
              },
              required: ['branch'],
            },
          },
          {
            name: 'fetch',
            description: 'Fetch latest changes from remote',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'pull',
            description: 'Pull latest changes from remote for current branch',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'stash',
            description: 'Stash uncommitted changes',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Optional stash message',
                },
              },
            },
          },
          {
            name: 'stash_pop',
            description: 'Pop the most recent stash',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'setup_bot_auth':
            return await this.setupBotAuth();

          case 'status':
            return await this.getStatus();

          case 'create_branch':
            return await this.createBranch(args?.name as string);

          case 'stage_files':
            return await this.stageFiles(args?.files as string[] | undefined);

          case 'commit':
            return await this.commit(args?.message as string, args?.files as string[] | undefined);

          case 'push':
            return await this.push();

          case 'push_and_pr':
            return await this.pushAndCreatePR(args?.title as string, args?.body as string);

          case 'pr_reviews':
            return await this.getPRReviews(args?.prNumber as number);

          case 'reply_to_comment':
            return await this.replyToComment(
              args?.prNumber as number,
              args?.commentId as number,
              args?.body as string
            );

          case 'log':
            return await this.getLog(args?.count as number | undefined);

          case 'diff':
            return await this.getDiff(args?.staged as boolean | undefined);

          case 'checkout':
            return await this.checkout(args?.branch as string);

          case 'fetch':
            return await this.fetch();

          case 'pull':
            return await this.pull();

          case 'stash':
            return await this.stash(args?.message as string | undefined);

          case 'stash_pop':
            return await this.stashPop();

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

  private async setupBotAuth() {
    const scriptPath = path.join(PROJECT_ROOT, 'context/setup-claude-bot.sh');
    const output = await this.runCommand('bash', [scriptPath]);

    return {
      content: [
        {
          type: 'text',
          text: `**Bot Authentication Setup**\n\n\`\`\`\n${output}\n\`\`\`\n\n✅ Ready for GitHub operations`,
        },
      ],
    };
  }

  private async getStatus() {
    const status = await this.runCommand('git', ['status']);
    const branch = await this.runCommand('git', ['branch', '--show-current']);

    return {
      content: [
        {
          type: 'text',
          text: `**Git Status**\n\n**Branch:** ${branch.trim()}\n\n\`\`\`\n${status}\n\`\`\``,
        },
      ],
    };
  }

  private async createBranch(name: string) {
    // Stash any uncommitted changes
    try {
      await this.runCommand('git', ['stash']);
    } catch {
      // No changes to stash is fine
    }

    // Get current branch to return to if needed
    const currentBranch = (await this.runCommand('git', ['branch', '--show-current'])).trim();

    // If on main/master, update it first
    if (currentBranch === 'main' || currentBranch === 'master') {
      try {
        await this.runCommand('git', ['fetch']);
        await this.runCommand('git', ['pull']);
      } catch {
        // May fail if remote not set up yet
      }
    }

    // Create new branch
    const branchName = `feature/${name}`;
    await this.runCommand('git', ['checkout', '-b', branchName]);

    // Restore stashed changes
    try {
      await this.runCommand('git', ['stash', 'pop']);
    } catch {
      // No stash to pop is fine
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created and switched to branch: **${branchName}**\n\nReady to start development.`,
        },
      ],
    };
  }

  private async stageFiles(files?: string[]) {
    if (files && files.length > 0) {
      for (const file of files) {
        await this.runCommand('git', ['add', file]);
      }
    } else {
      await this.runCommand('git', ['add', '-A']);
    }

    const status = await this.runCommand('git', ['status', '--short']);
    const fileCount = files ? files.length : 'all';

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Staged ${fileCount} file(s)**\n\n**Status:**\n\`\`\`\n${status || 'No changes'}\n\`\`\``,
        },
      ],
    };
  }

  private async commit(message: string, files?: string[]) {
    // Check if on protected branch
    const currentBranch = (await this.runCommand('git', ['branch', '--show-current'])).trim();
    const protectedBranches = ['main', 'master'];

    if (protectedBranches.includes(currentBranch)) {
      throw new Error(
        `❌ Cannot commit directly to protected branch "${currentBranch}".\n\n` +
        'Use create_branch to create a feature branch first.'
      );
    }

    // Stage files
    if (files && files.length > 0) {
      for (const file of files) {
        await this.runCommand('git', ['add', file]);
      }
    } else {
      await this.runCommand('git', ['add', '-A']);
    }

    // Commit with co-author
    const commitMessage = `${message}

Co-Authored-By: Claude <noreply@anthropic.com>`;

    await this.runCommand('git', ['commit', '-m', commitMessage]);

    const commitInfo = await this.runCommand('git', ['log', '-1', '--oneline']);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Committed**\n\n\`\`\`\n${commitInfo}\n\`\`\``,
        },
      ],
    };
  }

  private async push() {
    const currentBranch = (await this.runCommand('git', ['branch', '--show-current'])).trim();
    const protectedBranches = ['main', 'master'];

    if (protectedBranches.includes(currentBranch)) {
      throw new Error(
        `❌ Cannot push directly to protected branch "${currentBranch}".\n\n` +
        'Use create_branch to create a feature branch first.'
      );
    }

    await this.runCommand('git', ['push', '-u', 'origin', 'HEAD']);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Pushed to origin/${currentBranch}**`,
        },
      ],
    };
  }

  private async pushAndCreatePR(title: string, body: string) {
    // Set up bot auth first
    await this.setupBotAuth();

    const currentBranch = (await this.runCommand('git', ['branch', '--show-current'])).trim();

    // Push branch
    await this.runCommand('git', ['push', '-u', 'origin', currentBranch]);

    // Create PR
    const prBody = `${body}

---
Generated with Claude Code`;

    const output = await this.runCommand('gh', [
      'pr', 'create',
      '--title', title,
      '--body', prBody,
    ]);

    // Extract PR URL
    const prMatch = output.match(/https:\/\/github\.com\/[^\s]+/);
    const prUrl = prMatch ? prMatch[0] : output;

    return {
      content: [
        {
          type: 'text',
          text: `✅ **PR Created**\n\n**Branch:** ${currentBranch}\n**Title:** ${title}\n**URL:** ${prUrl}`,
        },
      ],
    };
  }

  private async getPRReviews(prNumber: number) {
    // Get PR review comments (inline code comments)
    const reviewCommentsJson = await this.runCommand('gh', [
      'api',
      `/repos/{owner}/{repo}/pulls/${prNumber}/comments`,
    ]);

    // Get PR reviews (top-level review submissions)
    const reviewsJson = await this.runCommand('gh', [
      'api',
      `/repos/{owner}/{repo}/pulls/${prNumber}/reviews`,
    ]);

    const reviewComments = JSON.parse(reviewCommentsJson || '[]');
    const reviews = JSON.parse(reviewsJson || '[]');

    let output = `**PR #${prNumber} Reviews**\n\n`;

    // Format top-level reviews
    if (reviews.length > 0) {
      output += `## Reviews\n\n`;
      for (const review of reviews) {
        const state = review.state || 'PENDING';
        const user = review.user?.login || 'Unknown';
        const body = review.body || '(No comment)';
        const submittedAt = review.submitted_at ? new Date(review.submitted_at).toLocaleString() : '';

        output += `### ${state} by @${user}${submittedAt ? ` (${submittedAt})` : ''}\n`;
        if (body && body.trim()) {
          output += `${body}\n`;
        }
        output += `\n`;
      }
    }

    // Format inline code comments
    if (reviewComments.length > 0) {
      output += `## Inline Comments\n\n`;
      for (const comment of reviewComments) {
        const user = comment.user?.login || 'Unknown';
        const file = comment.path || 'Unknown file';
        const line = comment.line || comment.original_line || '?';
        const body = comment.body || '';
        const id = comment.id;
        const diffHunk = comment.diff_hunk || '';

        output += `### ${file}:${line} (Comment ID: ${id})\n`;
        output += `**@${user}:** ${body}\n`;
        if (diffHunk) {
          output += `\`\`\`diff\n${diffHunk}\n\`\`\`\n`;
        }
        output += `\n`;
      }
    }

    if (reviews.length === 0 && reviewComments.length === 0) {
      output += `No reviews or comments found.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  }

  private async replyToComment(prNumber: number, commentId: number, body: string) {
    // Use gh api to reply to a review comment
    await this.runCommand('gh', [
      'api',
      '-X', 'POST',
      `/repos/{owner}/{repo}/pulls/${prNumber}/comments/${commentId}/replies`,
      '-f', `body=${body}`,
    ]);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Reply posted** to comment ${commentId} on PR #${prNumber}`,
        },
      ],
    };
  }

  private async getLog(count: number = 10) {
    const output = await this.runCommand('git', [
      'log',
      `--oneline`,
      `-n`, count.toString(),
    ]);

    return {
      content: [
        {
          type: 'text',
          text: `**Recent Commits**\n\n\`\`\`\n${output}\n\`\`\``,
        },
      ],
    };
  }

  private async getDiff(staged?: boolean) {
    const args = staged ? ['diff', '--staged'] : ['diff'];
    const output = await this.runCommand('git', args);

    const label = staged ? 'Staged Changes' : 'Uncommitted Changes';

    return {
      content: [
        {
          type: 'text',
          text: `**${label}**\n\n\`\`\`diff\n${output || 'No changes'}\n\`\`\``,
        },
      ],
    };
  }

  private async checkout(branch: string) {
    await this.runCommand('git', ['checkout', branch]);
    const currentBranch = (await this.runCommand('git', ['branch', '--show-current'])).trim();

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Switched to branch:** ${currentBranch}`,
        },
      ],
    };
  }

  private async fetch() {
    await this.runCommand('git', ['fetch', 'origin']);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Fetched latest from origin**`,
        },
      ],
    };
  }

  private async pull() {
    const currentBranch = (await this.runCommand('git', ['branch', '--show-current'])).trim();
    const output = await this.runCommand('git', ['pull', 'origin', currentBranch]);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Pulled latest for ${currentBranch}**\n\n\`\`\`\n${output || 'Already up to date'}\n\`\`\``,
        },
      ],
    };
  }

  private async stash(message?: string) {
    const args = message ? ['stash', 'push', '-m', message] : ['stash'];
    await this.runCommand('git', args);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Stashed changes**${message ? `: ${message}` : ''}`,
        },
      ],
    };
  }

  private async stashPop() {
    const output = await this.runCommand('git', ['stash', 'pop']);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Popped stash**\n\n\`\`\`\n${output}\n\`\`\``,
        },
      ],
    };
  }

  private async runCommand(
    command: string,
    args: string[],
    timeoutMs: number = 60000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT,
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill('SIGTERM');
          reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        if (code === 0) {
          resolve(stdout);
        } else {
          const errorOutput = [stderr, stdout].filter(Boolean).join('\n');
          reject(new Error(`Command failed (code ${code}):\n${errorOutput}`));
        }
      });

      proc.on('error', (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start if run directly
const server = new GitMCPServer();
server.start().catch(console.error);

export { GitMCPServer };
