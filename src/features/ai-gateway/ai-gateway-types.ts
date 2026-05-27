/**
 * T7.2 AI Gateway client types.
 *
 * Mirrors the Edge Function contract. The app sends typed requests
 * and receives typed responses. No model keys ever touch the client.
 */

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type AIGatewayAction =
  | 'ai-suggestion'
  | 'ai-chat'
  | 'ai-meal-plan'
  | 'scan-parse';

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export type AISuggestionPayload = {
  type: 'ai-suggestion';
  pantryItems: string[];
  preferences?: {
    allergies?: string[];
    dietaryRules?: string[];
    cuisines?: string[];
  };
  maxResults?: number;
};

export type AIChatPayload = {
  type: 'ai-chat';
  messages: { role: 'user' | 'assistant'; content: string }[];
  context?: {
    currentRecipe?: string;
    pantryItems?: string[];
  };
};

export type AIMealPlanPayload = {
  type: 'ai-meal-plan';
  days: number;
  servings: number;
  pantryItems?: string[];
  preferences?: {
    allergies?: string[];
    dietaryRules?: string[];
    cuisines?: string[];
  };
};

export type ScanParsePayload = {
  type: 'scan-parse';
  imageUrl: string;
  scanType: 'receipt' | 'pantry-photo' | 'nutrition-label';
};

export type AIGatewayPayload =
  | AISuggestionPayload
  | AIChatPayload
  | AIMealPlanPayload
  | ScanParsePayload;

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export type AIGatewayRequest = {
  action: AIGatewayAction;
  payload: AIGatewayPayload;
};

export type AIGatewayResponse<T = unknown> = {
  success: true;
  action: AIGatewayAction;
  data: T;
};

export type AIGatewayErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      limit?: number;
      used?: number;
      resetAt?: string;
    };
  };
};

export type AIGatewayResult<T = unknown> = AIGatewayResponse<T> | AIGatewayErrorResponse;
