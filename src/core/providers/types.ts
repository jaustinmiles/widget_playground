/**
 * Data Provider type definitions
 */

export type ProviderType = 'csv' | 'llm' | 'static' | 'custom';

export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  options?: Record<string, unknown>;
}

export interface DataResult<T = unknown> {
  data: T;
  timestamp: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderError {
  code: string;
  message: string;
  details?: unknown;
}

export type ProviderStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ProviderState {
  status: ProviderStatus;
  lastUpdated: number | null;
  error: ProviderError | null;
}

export interface CSVProviderOptions {
  url?: string;
  content?: string;
  delimiter?: string;
  headers?: boolean;
}

export interface LLMProviderOptions {
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface StaticProviderOptions {
  data: unknown;
}

export type ProviderEventType =
  | 'data-update'
  | 'status-change'
  | 'error';

export interface ProviderEvent<T = unknown> {
  type: ProviderEventType;
  providerId: string;
  detail: T;
  timestamp: number;
}
