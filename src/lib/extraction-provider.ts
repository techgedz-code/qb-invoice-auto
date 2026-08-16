import OpenAI from 'openai';
import { getEndpointsClient, getBestModel, isModelHealthy } from './openrouter-endpoints';
import { ParsedInvoice, LineItem } from './types';

/**
 * Model Provider using OpenRouter with automatic fallback
 * 
 * Features:
 * - Single API key (OpenRouter) gives access to 100+ models
 * - Automatic fallback when upstream providers are down
 * - Real-time health monitoring via Endpoints API
 * - Caching (5 min) to avoid rate limits
 * 
 * Default: Llama 3.1 70B (free on OpenRouter)
 * Fallback: Llama 3.1 8B → Mixtral 8x7B → (then paid models if configured)
 */

// Model configurations available on OpenRouter (matching .env.local)
export const EXTRACTION_MODELS = {
  // Free models
  'llama-3.1-70b': 'meta-llama/llama-3.1-70b-instruct',
  'llama-3.1-8b': 'meta-llama/llama-3.1-8b-instruct',
  'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct',
  
  // Paid models (available if you add billing to OpenRouter)
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4o': 'openai/gpt-4o',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-flash-1.5': 'google/gemini-flash-1.5',
} as const;

export type ExtractionModel = keyof typeof EXTRACTION_MODELS;

// Default to Llama 3.1 70B (as per .env.local)
const DEFAULT_MODEL: ExtractionModel = 'llama-3.1-70b';

const EXTRACTION_PROMPT = `
You are an expert invoice parser. Extract structured data from the invoice text below.
Return ONLY valid JSON matching this exact schema:

{
  "vendorName": "string",
  "vendorEmail": "string or null",
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD or null",
  "subtotal": number,
  "taxAmount": number,
  "totalAmount": number,
  "currency": "USD",
  "lineItems": [
    {"description": "string", "quantity": number, "unitPrice": number, "amount": number, "sku": "string or null"}
  ],
  "confidenceScore": number between 0 and 1
}

Rules:
- If a field is not found, use sensible defaults (empty string, 0, null)
- Dates must be in YYYY-MM-DD format
- All amounts in the invoice's currency
- confidenceScore: 1.0 = perfect extraction, 0.5 = many fields missing, 0.1 = barely readable
- Line items: extract all visible items with qty, unit price, total
`;

// Initialize OpenRouter client (OpenAI-compatible)
function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set. Get one at https://openrouter.ai/keys');
  }
  
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'QB Invoice Auto',
    },
  });
}

function getModelId(model: ExtractionModel = DEFAULT_MODEL): string {
  return EXTRACTION_MODELS[model];
}

/**
 * Extract invoice data with automatic fallback on provider failures
 */
export async function extractInvoiceData(
  text: string, 
  model: ExtractionModel = DEFAULT_MODEL
): Promise<ParsedInvoice> {
  const client = getOpenRouterClient();
  
  // Get the best available model (with automatic fallback)
  const bestModel = await getBestModel(model);
  const modelId = getModelId(bestModel);
  
  if (bestModel !== model) {
    console.log(`[AI Extraction] Using fallback model: ${bestModel} (requested: ${model})`);
  }
  
  try {
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: text.slice(0, 8000) }, // Limit input tokens
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Validate and sanitize
    return {
      vendorName: result.vendorName || 'Unknown Vendor',
      vendorEmail: result.vendorEmail || null,
      invoiceNumber: result.invoiceNumber || `INV-${Date.now()}`,
      invoiceDate: result.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: result.dueDate || null,
      subtotal: Number(result.subtotal) || 0,
      taxAmount: Number(result.taxAmount) || 0,
      totalAmount: Number(result.totalAmount) || 0,
      currency: result.currency || 'USD',
      lineItems: Array.isArray(result.lineItems) 
        ? result.lineItems.map((item: any) => ({
            description: item.description || 'Item',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            amount: Number(item.amount) || 0,
            sku: item.sku || null,
          }))
        : [],
      confidenceScore: Math.max(0, Math.min(1, Number(result.confidenceScore) || 0.5)),
    };
  } catch (error) {
    console.error(`Extraction failed with model ${modelId}:`, error);
    
    // If the fallback model also fails, throw error
    if (bestModel !== model) {
      throw new Error(`AI extraction failed on fallback model ${bestModel}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper to get available models for UI
export function getAvailableModels(): { id: ExtractionModel; name: string; free: boolean }[] {
  return [
    { id: 'llama-3.1-70b', name: 'Llama 3.1 70B (Free)', free: true },
    { id: 'llama-3.1-8b', name: 'Llama 3.1 8B (Free)', free: true },
    { id: 'mixtral-8x7b', name: 'Mixtral 8x7B (Free)', free: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini ($0.15/1M)', free: false },
    { id: 'gpt-4o', name: 'GPT-4o ($5/1M)', free: false },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet ($3/1M)', free: false },
    { id: 'gemini-flash-1.5', name: 'Gemini 1.5 Flash (Free tier)', free: true },
  ];
}

// Get current model from env or default
export function getCurrentModel(): ExtractionModel {
  const envModel = process.env.EXTRACTION_MODEL as ExtractionModel;
  if (envModel && EXTRACTION_MODELS[envModel]) {
    return envModel;
  }
  return DEFAULT_MODEL;
}