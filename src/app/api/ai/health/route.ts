import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllModelsHealth, getBestModel, isModelHealthy, getEndpointsClient } from '@/lib/openrouter-endpoints';
import { EXTRACTION_MODELS, ExtractionModel } from '@/lib/extraction-provider';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'all': {
        const client = getEndpointsClient();
        const health = await client.getAllModelsHealth();
        
        // Format for UI using cached health data
        const models = Object.entries(EXTRACTION_MODELS).map(([id, modelId]) => {
          const h = health[id as ExtractionModel];
          const healthy = h?.hasHealthy || false;
          return {
            id,
            modelId,
            displayName: formatModelName(id),
            free: isFreeModel(id),
            healthy,
            status: healthy ? 'healthy' : (h?.overallStatus || 'degraded'),
            bestEndpoint: h?.bestEndpoint?.provider_name || 'none',
            latencyMs: h?.bestEndpoint?.latency_ms || 0,
            uptime24h: h?.bestEndpoint?.uptime_24h || 0,
          };
        });

        return NextResponse.json({ models, timestamp: new Date().toISOString() });
      }

      case 'best': {
        const preferred = (searchParams.get('model') as ExtractionModel) || 'llama-3.1-70b';
        const best = await getBestModel(preferred);
        return NextResponse.json({ 
          preferred, 
          best,
          timestamp: new Date().toISOString() 
        });
      }

      case 'check': {
        const model = searchParams.get('model') as ExtractionModel;
        const healthy = await isModelHealthy(model);
        return NextResponse.json({ 
          model, 
          healthy,
          timestamp: new Date().toISOString() 
        });
      }

      default: {
        // Quick status for all models
        const client = getEndpointsClient();
        const health = await client.getAllModelsHealth();
        
        const summary = Object.entries(health).map(([model, h]) => ({
          model,
          modelId: EXTRACTION_MODELS[model as ExtractionModel],
          healthy: h.hasHealthy,
          bestEndpoint: h.bestEndpoint?.provider_name || 'none',
          latencyMs: h.bestEndpoint?.latency_ms || 0,
          uptime24h: h.bestEndpoint?.uptime_24h || 0,
          status: h.overallStatus,
        }));

        return NextResponse.json({ 
          models: summary,
          timestamp: new Date().toISOString() 
        });
      }
    }
  } catch (error) {
    console.error('AI health check error:', error);
    return NextResponse.json({ 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatModelName(id: string): string {
  const names: Record<string, string> = {
    'llama-3.1-70b': 'Llama 3.1 70B',
    'llama-3.1-8b': 'Llama 3.1 8B',
    'mixtral-8x7b': 'Mixtral 8x7B',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4o': 'GPT-4o',
    'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
    'claude-3.5-haiku': 'Claude 3.5 Haiku',
    'gemini-flash-1.5': 'Gemini 1.5 Flash',
    'gemini-pro-1.5': 'Gemini 1.5 Pro',
  };
  return names[id] || id;
}

function isFreeModel(id: string): boolean {
  const freeModels = ['llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b', 'gemini-flash-1.5'];
  return freeModels.includes(id);
}