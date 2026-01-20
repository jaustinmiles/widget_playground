/**
 * BaseProvider - Abstract base class for all data providers
 */

import type {
  ProviderConfig,
  ProviderState,
  ProviderStatus,
  DataResult,
  ProviderError,
  ProviderEvent,
  ProviderEventType,
} from './types.js';

export abstract class BaseProvider<T = unknown> extends EventTarget {
  readonly id: string;
  readonly name: string;
  protected _state: ProviderState;
  protected _data: T | null = null;

  constructor(config: ProviderConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this._state = {
      status: 'idle',
      lastUpdated: null,
      error: null,
    };
  }

  /** Current provider state */
  get state(): ProviderState {
    return { ...this._state };
  }

  /** Current data (null if not loaded) */
  get data(): T | null {
    return this._data;
  }

  /** Check if data is ready */
  get isReady(): boolean {
    return this._state.status === 'ready';
  }

  /** Check if provider is loading */
  get isLoading(): boolean {
    return this._state.status === 'loading';
  }

  /**
   * Fetch/refresh data from the source
   */
  abstract fetch(): Promise<DataResult<T>>;

  /**
   * Query data with optional parameters
   */
  abstract query(params?: Record<string, unknown>): Promise<DataResult<T>>;

  /**
   * Clean up resources
   */
  dispose(): void {
    this._data = null;
    this.setStatus('idle');
  }

  /**
   * Update provider status
   */
  protected setStatus(status: ProviderStatus, error?: ProviderError): void {
    const oldStatus = this._state.status;
    this._state.status = status;
    this._state.error = error || null;

    if (status === 'ready') {
      this._state.lastUpdated = Date.now();
    }

    if (oldStatus !== status) {
      this.emit('status-change', { oldStatus, newStatus: status, error });
    }
  }

  /**
   * Set data and emit update event
   */
  protected setData(data: T): void {
    this._data = data;
    this.emit('data-update', { data });
  }

  /**
   * Handle and emit error
   */
  protected handleError(error: unknown): ProviderError {
    const providerError: ProviderError = {
      code: 'PROVIDER_ERROR',
      message: error instanceof Error ? error.message : String(error),
      details: error,
    };

    this.setStatus('error', providerError);
    this.emit('error', providerError);

    return providerError;
  }

  /**
   * Emit a provider event
   */
  protected emit<D>(type: ProviderEventType, detail: D): void {
    const event: ProviderEvent<D> = {
      type,
      providerId: this.id,
      detail,
      timestamp: Date.now(),
    };

    this.dispatchEvent(new CustomEvent(type, { detail: event }));
  }

  /**
   * Create a successful data result
   */
  protected createResult(data: T, metadata?: Record<string, unknown>): DataResult<T> {
    return {
      data,
      timestamp: Date.now(),
      source: this.id,
      metadata,
    };
  }
}
