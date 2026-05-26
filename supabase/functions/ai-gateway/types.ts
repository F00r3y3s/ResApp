/**
 * T7.2 AI Gateway types.
 *
 * These types define the contract between the mobile app and the Edge Function.
 * The app sends an action + payload; the gateway validates, gates, and proxies.
 */

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export type AIGatewayAction =
  | 'ai-suggestion'
  | 'ai-chat'
  | 'ai-meal-plan'
  | 'scan-parse';

export type AIGatewayRequest = {
  /** Which AI action to perform */
  action: AIGatewayAction;
  /** Action-specific payload (never contains secrets) */
  payload: AIGatewayPayload;
};

export type AIGatewayPayload =
  | AISuggestionPayload
  | AIChatPayload
  | AIMealPlanPayload
  | ScanParsePayload;

export type AISuggestionPayload = {
  type: 'ai-suggestion';
  /** Pantry items to base suggestions on */
  pantryItems: string[];
  /** User dietary preferences */
  preferences?: {
    allergies?: string[];
    dietaryRules?: string[];
    cuisines?: string[];
  };
  /** Max suggestions to return */
  maxResults?: number;
};

export type AIChatPayload = {
  type: 'ai-chat';
  /** Chat messages (system prompt is added server-side) */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Optional context about current recipe/pantry */
  context?: {
    currentRecipe?: string;
    pantryItems?: string[];
  };
};

export type AIMealPlanPayload = {
  type: 'ai-meal-plan';
  /** Number of days to plan */
  days: number;
  /** Household size */
  servings: number;
  /** Available pantry items */
  pantryItems?: string[];
  /** Dietary constraints */
  preferences?: {
    allergies?: string[];
    dietaryRules?: string[];
    cuisines?: string[];
  };
};

export type ScanParsePayload = {
  type: 'scan-parse';
  /** Base64-encoded image or image URL from Supabase Storage */
  imageUrl: string;
  /** What kind of scan */
  scanType: 'receipt' | 'pantry-photo' | 'nutrition-label';
};

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export type AIGatewayResponse = {
  success: true;
  action: AIGatewayAction;
  data: unknown;
};

export type AIGatewayErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

// ---------------------------------------------------------------------------
// Model configuration
// ---------------------------------------------------------------------------

export const MODEL_CONFIG: Record<AIGatewayAction, string> = {
  'ai-suggestion': 'gpt-4o-mini',
  'ai-chat': 'gpt-4o-mini',
  'ai-meal-plan': 'gpt-4o-mini',
  'scan-parse': 'gpt-4o-mini',
} as const;
