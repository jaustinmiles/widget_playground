/**
 * LLM Data Provider
 *
 * Provides data through Claude API interactions.
 * Can be used for generating content, transforming data, or answering queries.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './BaseProvider.js';
import type { ProviderConfig, DataResult, LLMProviderOptions } from './types.js';

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMQueryParams {
  prompt: string;
  context?: string;
  format?: 'text' | 'json';
}

export class LLMProvider extends BaseProvider<LLMResponse> {
  private client: Anthropic | null = null;
  private options: LLMProviderOptions;

  constructor(config: ProviderConfig & { options?: LLMProviderOptions }) {
    super(config);
    this.options = config.options || {};
  }

  /**
   * Initialize the Anthropic client
   */
  private getClient(): Anthropic {
    if (!this.client) {
      // Client will use ANTHROPIC_API_KEY from environment
      this.client = new Anthropic();
    }
    return this.client;
  }

  /**
   * Fetch is not applicable for LLM - use query instead
   */
  async fetch(): Promise<DataResult<LLMResponse>> {
    throw new Error('LLMProvider requires query() with a prompt. Use query({ prompt: "..." }) instead.');
  }

  /**
   * Query the LLM with a prompt
   */
  async query(params: LLMQueryParams): Promise<DataResult<LLMResponse>> {
    if (!params?.prompt) {
      throw new Error('LLMProvider query requires a prompt');
    }

    this.setStatus('loading');

    try {
      const client = this.getClient();

      // Build messages
      const messages: Anthropic.MessageParam[] = [];

      // Add context if provided
      if (params.context) {
        messages.push({
          role: 'user',
          content: `Context:\n${params.context}`,
        });
        messages.push({
          role: 'assistant',
          content: 'I understand the context. What would you like me to do with it?',
        });
      }

      // Add the main prompt
      let prompt = params.prompt;
      if (params.format === 'json') {
        prompt += '\n\nRespond with valid JSON only, no additional text.';
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await client.messages.create({
        model: this.options.model || 'claude-sonnet-4-20250514',
        max_tokens: this.options.maxTokens || 1024,
        system: this.options.systemPrompt,
        messages,
      });

      // Extract text content
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      const data: LLMResponse = {
        content: textContent,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      this.setData(data);
      this.setStatus('ready');

      return this.createResult(data, {
        model: response.model,
        stopReason: response.stop_reason,
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Convenience method for getting JSON responses
   */
  async queryJSON<T = unknown>(prompt: string, context?: string): Promise<T> {
    const result = await this.query({
      prompt,
      context,
      format: 'json',
    });

    try {
      return JSON.parse(result.data.content) as T;
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${result.data.content}`);
    }
  }

  /**
   * Transform data using the LLM
   */
  async transform<TIn, TOut>(
    data: TIn,
    instruction: string
  ): Promise<TOut> {
    const context = typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2);

    return this.queryJSON<TOut>(instruction, context);
  }

  /**
   * Summarize data using the LLM
   */
  async summarize(data: unknown): Promise<string> {
    const context = typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2);

    const result = await this.query({
      prompt: 'Please provide a brief summary of the following data.',
      context,
      format: 'text',
    });

    return result.data.content;
  }
}
