/**
 * Provider Registry - Central hub for data provider management
 */

import type { BaseProvider } from './BaseProvider.js';
import type { ProviderConfig, ProviderType } from './types.js';
import { CSVProvider } from './CSVProvider.js';
import { LLMProvider } from './LLMProvider.js';

type ProviderConstructor = new (config: ProviderConfig & { options?: unknown }) => BaseProvider;

class ProviderRegistry {
  private providers = new Map<string, BaseProvider>();
  private factories = new Map<ProviderType, ProviderConstructor>();

  constructor() {
    // Register built-in provider types
    this.registerFactory('csv', CSVProvider as ProviderConstructor);
    this.registerFactory('llm', LLMProvider as ProviderConstructor);
  }

  /**
   * Register a provider factory for a type
   */
  registerFactory(type: ProviderType, factory: ProviderConstructor): void {
    this.factories.set(type, factory);
  }

  /**
   * Create and register a provider instance
   */
  create<T extends BaseProvider>(config: ProviderConfig & { options?: unknown }): T {
    if (this.providers.has(config.id)) {
      throw new Error(`Provider with id "${config.id}" already exists`);
    }

    const Factory = this.factories.get(config.type);
    if (!Factory) {
      throw new Error(`Unknown provider type: ${config.type}`);
    }

    const provider = new Factory(config) as T;
    this.providers.set(config.id, provider);

    return provider;
  }

  /**
   * Get a provider by ID
   */
  get<T extends BaseProvider>(id: string): T | undefined {
    return this.providers.get(id) as T | undefined;
  }

  /**
   * Check if a provider exists
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Get all providers
   */
  getAll(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  getByType(type: ProviderType): BaseProvider[] {
    return this.getAll().filter(p => {
      const config = (p as unknown as { type?: ProviderType });
      return config.type === type;
    });
  }

  /**
   * Remove a provider
   */
  remove(id: string): boolean {
    const provider = this.providers.get(id);
    if (provider) {
      provider.dispose();
      this.providers.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Remove all providers
   */
  clear(): void {
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    this.providers.clear();
  }

  /**
   * Get provider count
   */
  get size(): number {
    return this.providers.size;
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();
