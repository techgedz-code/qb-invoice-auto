import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const tursoUrl = process.env.TURSO_DATABASE_URL!;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN!;

const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const EXTRACTION_MODELS = {
  // Free models
  'llama-3.1-70b': 'meta-llama/llama-3.1-70b-instruct',
  'llama-3.1-8b': 'meta-llama/llama-3.1-8b-instruct',
  'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct',
  
  // Paid models (if billing enabled on OpenRouter)
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4o': 'openai/gpt-4o',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-flash-1.5': 'google/gemini-flash-1.5',
} as const;

type ExtractionModel = keyof typeof EXTRACTION_MODELS;

interface EndpointData {
  id: string;
  name: string;
  model: string;
  provider_name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime_24h: number;
  latency_ms: number;
  error_rate: number;
  last_checked: string;
}

interface ProviderHealth {
  model: string;
  healthyEndpoints: EndpointData[];
  hasHealthy: boolean;
  bestEndpoint: EndpointData | null;
  overallStatus: 'healthy' | 'degraded' | 'down';
}

/**
 * OpenRouter Endpoints API client for monitoring provider health
 * Docs: https://openrouter.ai/docs/api-reference/endpoints
 */
class OpenRouterEndpointsClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private cache: Map<string, { data: ProviderHealth; timestamp: number }> = new Map();
  private cacheTtl = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchEndpoints(): Promise<EndpointData[]> {
    const response = await fetch(`${this.baseUrl}/endpoints`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Endpoints API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async getProviderHealth(model: ExtractionModel): Promise<ProviderHealth> {
    const cacheKey = model;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    const endpoints = await this.fetchEndpoints();
    const modelId = EXTRACTION_MODELS[model];

    // Filter endpoints for this model
    const modelEndpoints = endpoints.filter(e => 
      e.model === modelId || e.model.includes(modelId.split('/')[1])
    );

    const healthyEndpoints = modelEndpoints
      .filter(e => e.status === 'healthy')
      .sort((a, b) => a.latency_ms - b.latency_ms);

    const degradedEndpoints = modelEndpoints
      .filter(e => e.status === 'degraded')
      .sort((a, b) => a.latency_ms - b.latency_ms);

    const bestEndpoint = healthyEndpoints[0] || degradedEndpoints[0] || null;
    const hasHealthy = healthyEndpoints.length > 0;

    let overallStatus: 'healthy' | 'degraded' | 'down' = 'down';
    if (hasHealthy) overallStatus = 'healthy';
    else if (degradedEndpoints.length > 0) overallStatus = 'degraded';

    const health: ProviderHealth = {
      model,
      healthyEndpoints: [...healthyEndpoints, ...degradedEndpoints],
      hasHealthy,
      bestEndpoint,
      overallStatus,
    };

    this.cache.set(cacheKey, { data: health, timestamp: Date.now() });
    return health;
  }

  async getAllModelsHealth(): Promise<Record<ExtractionModel, ProviderHealth>> {
    const results: Partial<Record<ExtractionModel, ProviderHealth>> = {};
    for (const model of Object.keys(EXTRACTION_MODELS) as ExtractionModel[]) {
      try {
        results[model] = await this.getProviderHealth(model);
      } catch (e) {
        console.error(`Failed to check health for ${model}:`, e);
        results[model] = {
          model,
          healthyEndpoints: [],
          hasHealthy: false,
          bestEndpoint: null,
          overallStatus: 'down',
        };
      }
    }
    return results as Record<ExtractionModel, ProviderHealth>;
  }

  /**
   * Get the best available model with automatic fallback
   * Fallback chain: free models first, then paid models
   */
  async getBestAvailableModel(preferredModel: ExtractionModel): Promise<ExtractionModel> {
    // Check preferred model first
    const preferredHealth = await this.getProviderHealth(preferredModel);
    
    if (preferredHealth.hasHealthy) {
      return preferredModel;
    }

    // Fallback chain: free models first, then paid
    const fallbackOrder: ExtractionModel[] = [
      'llama-3.1-8b',      // Smaller free model
      'mixtral-8x7b',      // Free MoE model
      'gemini-flash-1.5',  // Free tier available
      'gpt-4o-mini',       // Cheap paid
      'claude-3.5-sonnet', // Paid
      'gpt-4o',            // Expensive paid
    ];

    for (const model of fallbackOrder) {
      if (model === preferredModel) continue;
      const health = await this.getProviderHealth(model);
      if (health.hasHealthy) {
        console.log(`[OpenRouter] Falling back from ${preferredModel} to ${model}`);
        return model;
      }
    }

    // None healthy - return preferred anyway
    return preferredModel;
  }
}

// Singleton instance
let endpointsClient: OpenRouterEndpointsClient | null = null;

export function getEndpointsClient(): OpenRouterEndpointsClient {
  if (!endpointsClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not set');
    }
    endpointsClient = new OpenRouterEndpointsClient(apiKey);
  }
  return endpointsClient;
}

/**
 * Get health status for all models (for admin dashboard)
 */
export async function getAllModelsHealth(): Promise<Record<ExtractionModel, ProviderHealth>> {
  const client = getEndpointsClient();
  return client.getAllModelsHealth();
}

/**
 * Get best available model with automatic fallback
 */
export async function getBestModel(preferredModel: ExtractionModel): Promise<ExtractionModel> {
  const client = getEndpointsClient();
  return client.getBestAvailableModel(preferredModel);
}

/**
 * Check if a specific model is healthy
 */
export async function isModelHealthy(model: ExtractionModel): Promise<boolean> {
  const client = getEndpointsClient();
  const health = await client.getProviderHealth(model);
  return health.hasHealthy;
}