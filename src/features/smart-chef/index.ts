export { createChatRepository } from './chat-repository';
export type { ChatRepository, ChatStorage } from './chat-repository';
export { getChatRepository } from './chat-repository-provider';
export { ChatScreenContent } from './chat-screen';
export type { AIChatSender, ChatScreenContentProps } from './chat-screen';
export type { ChatHistory, ChatMessage, ChatRole } from './chat-types';
export { generateLocalResponse } from './local-responder';
export type { LocalResponderInput, LocalResponse } from './local-responder';
export { SmartChefScreenContent } from './smart-chef-screen';
export type { SmartChefScreenContentProps } from './smart-chef-screen';
export {
    SUBSTITUTION_TABLE, detectAllergyConflicts,
    lookupSubstitutions
} from './substitutions';
export type {
    AllergyConflict,
    Substitute,
    SubstitutionEntry,
    SubstitutionResult
} from './substitutions';
export { generateLocalSuggestions } from './suggestion-engine';
export type { ScoredSuggestion, SuggestionInput } from './suggestion-engine';

