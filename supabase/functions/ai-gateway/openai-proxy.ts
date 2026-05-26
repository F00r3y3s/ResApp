/**
 * T7.2 OpenAI proxy — builds prompts and calls the OpenAI API.
 *
 * Security contract:
 * - The OPENAI_API_KEY is read from Deno.env (Edge Function secrets).
 * - Request/response content is NOT logged (privacy contract compliance).
 * - System prompts enforce safety boundaries (no medical/legal advice,
 *   allergy disclaimers, family-friendly content).
 */

import type { AIGatewayAction, AIGatewayRequest } from './types.ts';
import { MODEL_CONFIG } from './types.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';

// ---------------------------------------------------------------------------
// System prompts per action
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<AIGatewayAction, string> = {
  'ai-suggestion': `You are a helpful family kitchen assistant. Given a list of pantry items and dietary preferences, suggest recipes that can be made with available ingredients. Return a JSON array of recipe suggestions with: title, brief description, estimated time, and which pantry items are used. Keep suggestions family-friendly and practical. Always note potential allergens. Do not provide medical or nutritional advice.`,

  'ai-chat': `You are Smart Chef, a friendly AI cooking assistant for families. Help with cooking questions, substitutions, technique tips, and meal ideas. Be concise and practical. Always flag potential allergens when discussing ingredients. Do not provide medical, nutritional, or dietary advice beyond basic cooking guidance. Keep all responses family-friendly.`,

  'ai-meal-plan': `You are a meal planning assistant for families. Create practical weekly meal plans considering available pantry items, dietary restrictions, and household size. Return a structured JSON meal plan with: day, meal type (breakfast/lunch/dinner), recipe title, brief description, and key ingredients. Balance variety, nutrition basics, and practicality. Always note potential allergens. Do not provide medical or nutritional advice.`,

  'scan-parse': `You are a kitchen item recognition assistant. Analyze the provided image and extract structured data. For receipts: extract item names and quantities as a JSON array. For pantry photos: identify visible food items with estimated quantities. For nutrition labels: extract key nutritional facts. Return structured JSON only. Do not provide medical or nutritional advice.`,
};

// ---------------------------------------------------------------------------
// Main proxy function
// ---------------------------------------------------------------------------

export async function proxyToOpenAI(request: AIGatewayRequest): Promise<unknown> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = MODEL_CONFIG[request.action];
  const systemPrompt = SYSTEM_PROMPTS[request.action];
  const messages = buildMessages(request, systemPrompt);

  const response = await fetch(OPENAI_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      response_format: request.action === 'ai-chat' ? undefined : { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[ai-gateway] OpenAI API error:', response.status, errorBody);

    if (response.status === 429) {
      throw new OpenAIError('rate_limited', 'AI service is temporarily busy. Please try again in a moment.');
    }
    if (response.status >= 500) {
      throw new OpenAIError('service_unavailable', 'AI service is temporarily unavailable. Please try again later.');
    }
    throw new OpenAIError('ai_error', 'Failed to get AI response. Please try again.');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new OpenAIError('empty_response', 'AI returned an empty response. Please try again.');
  }

  // Try to parse as JSON for structured responses
  if (request.action !== 'ai-chat') {
    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, return as-is
      return { text: content };
    }
  }

  return { text: content };
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

function buildMessages(
  request: AIGatewayRequest,
  systemPrompt: string,
): Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> {
  const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    { role: 'system', content: systemPrompt },
  ];

  const payload = request.payload;

  switch (payload.type) {
    case 'ai-suggestion': {
      const userContent = [
        `Pantry items: ${payload.pantryItems.join(', ')}`,
        payload.preferences?.allergies?.length
          ? `Allergies: ${payload.preferences.allergies.join(', ')}`
          : '',
        payload.preferences?.dietaryRules?.length
          ? `Dietary rules: ${payload.preferences.dietaryRules.join(', ')}`
          : '',
        payload.preferences?.cuisines?.length
          ? `Preferred cuisines: ${payload.preferences.cuisines.join(', ')}`
          : '',
        `Max suggestions: ${payload.maxResults ?? 5}`,
      ].filter(Boolean).join('\n');

      messages.push({ role: 'user', content: userContent });
      break;
    }

    case 'ai-chat': {
      // Add context if provided
      if (payload.context) {
        const contextParts: string[] = [];
        if (payload.context.currentRecipe) {
          contextParts.push(`Current recipe: ${payload.context.currentRecipe}`);
        }
        if (payload.context.pantryItems?.length) {
          contextParts.push(`Available pantry items: ${payload.context.pantryItems.join(', ')}`);
        }
        if (contextParts.length > 0) {
          messages.push({ role: 'system', content: `Context: ${contextParts.join('. ')}` });
        }
      }

      // Add conversation history
      for (const msg of payload.messages) {
        messages.push({ role: msg.role, content: msg.content });
      }
      break;
    }

    case 'ai-meal-plan': {
      const planContent = [
        `Plan for ${payload.days} days, ${payload.servings} servings per meal.`,
        payload.pantryItems?.length
          ? `Available pantry items: ${payload.pantryItems.join(', ')}`
          : '',
        payload.preferences?.allergies?.length
          ? `Allergies (MUST avoid): ${payload.preferences.allergies.join(', ')}`
          : '',
        payload.preferences?.dietaryRules?.length
          ? `Dietary rules: ${payload.preferences.dietaryRules.join(', ')}`
          : '',
        payload.preferences?.cuisines?.length
          ? `Preferred cuisines: ${payload.preferences.cuisines.join(', ')}`
          : '',
      ].filter(Boolean).join('\n');

      messages.push({ role: 'user', content: planContent });
      break;
    }

    case 'scan-parse': {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Scan type: ${payload.scanType}. Extract structured data from this image.` },
          { type: 'image_url', image_url: { url: payload.imageUrl } },
        ],
      });
      break;
    }
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class OpenAIError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'OpenAIError';
  }
}
