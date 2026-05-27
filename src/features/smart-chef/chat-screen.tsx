import { router } from 'expo-router';
import { ChefHat, Send, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import type { ChatRepository } from './chat-repository';
import type { ChatMessage } from './chat-types';
import { generateLocalResponse } from './local-responder';
import { detectAllergyConflicts } from './substitutions';

const SUGGESTED_PROMPTS = [
  'What can I cook tonight?',
  'Quick breakfast ideas',
  'Use my expiring items',
  'Healthy lunch options',
] as const;

export type AIChatSender = (userMessage: string) => Promise<string>;

export type ChatScreenContentProps = {
  chatRepository: ChatRepository;
  recipes: Recipe[];
  pantryItems: PantryItem[];
  preferences: GuestPreferences | null;
  /** Whether the user has premium entitlement. */
  isPremium: boolean;
  /** Called when premium user sends a message — should hit AI gateway. */
  sendToGateway?: AIChatSender;
  /** Override "now" for deterministic message timestamps in tests. */
  now?: () => Date;
  /** Override message id generator for deterministic tests. */
  createMessageId?: () => string;
};

export function ChatScreenContent({
  chatRepository,
  recipes,
  pantryItems,
  preferences,
  isPremium,
  sendToGateway,
  now = () => new Date(),
  createMessageId = defaultMessageId,
}: ChatScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  // Load chat history on mount
  useEffect(() => {
    let isMounted = true;
    chatRepository.getMessages().then((stored) => {
      if (isMounted) {
        setMessages(stored);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [chatRepository]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const isEmpty = messages.length === 0;

  async function handleSend(rawText?: string) {
    const text = (rawText ?? input).trim();
    if (!text || isSending) return;

    setErrorMessage(null);
    setIsSending(true);

    const userMsg: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: now().toISOString(),
      source: 'local',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    await chatRepository.saveMessage(userMsg);

    try {
      let assistantContent: string;
      let assistantSource: 'local' | 'gateway' = 'local';

      if (isPremium && sendToGateway) {
        try {
          assistantContent = await sendToGateway(text);
          assistantSource = 'gateway';
        } catch (gatewayError) {
          // Fall back to local response if gateway fails
          const local = generateLocalResponse({
            userMessage: text,
            recipes,
            pantryItems,
            preferences,
            now: now(),
          });
          assistantContent = `${local.text}\n\n_Premium AI is unavailable right now. Showing Smart Chef Lite._`;
          assistantSource = 'local';
        }

        // Allergen guardrail: scan AI response for conflicts with user allergies
        if (assistantSource === 'gateway') {
          const userAllergens = preferences?.allergies ?? [];
          if (userAllergens.length > 0) {
            const words = extractIngredientCandidates(assistantContent);
            const conflicts = detectAllergyConflicts(words, userAllergens);
            if (conflicts.length > 0) {
              const triggered = Array.from(
                new Set(conflicts.flatMap((c) => c.allergens)),
              ).join(', ');
              assistantContent = `⚠️ This response mentions ingredients you're allergic to (${triggered}). Please double-check before cooking.\n\n${assistantContent}`;
            }
          }
        }
      } else {
        const local = generateLocalResponse({
          userMessage: text,
          recipes,
          pantryItems,
          preferences,
          now: now(),
        });
        assistantContent = local.text;
        assistantSource = 'local';
      }

      const assistantMsg: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: now().toISOString(),
        source: assistantSource,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await chatRepository.saveMessage(assistantMsg);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  }

  function handlePromptChip(prompt: string) {
    setInput(prompt);
    void handleSend(prompt);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <ChefHat size={26} stroke={KitchenDesign.colors.cream} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Chef</Text>
            <View style={styles.tierBadge}>
              {isPremium ? (
                <>
                  <Sparkles size={12} stroke={KitchenDesign.colors.orange} />
                  <Text style={styles.tierBadgeText}>Premium AI</Text>
                </>
              ) : (
                <Text style={styles.tierBadgeText}>Free Smart Chef Lite</Text>
              )}
            </View>
          </View>
        </View>
        {!isPremium ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/paywall')}
            style={({ pressed }) => [styles.upgradeButton, pressed ? styles.pressed : null]}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </Pressable>
        ) : null}
      </View>

      {isEmpty ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <View style={styles.welcomeCard}>
            <ChefHat size={48} stroke={KitchenDesign.colors.orange} />
            <Text style={styles.welcomeTitle}>Hi! What are we cooking?</Text>
            <Text style={styles.welcomeBody}>
              Ask about recipes, pantry ideas, swaps, or meal prep. I&apos;ll use what you have on
              hand.
            </Text>
          </View>
          <View style={styles.promptList}>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                accessibilityRole="button"
                onPress={() => handlePromptChip(prompt)}
                style={({ pressed }) => [styles.promptChip, pressed ? styles.pressed : null]}>
                <Text style={styles.promptChipText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(msg) => msg.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {errorMessage ? (
        <Text style={styles.errorBanner}>{errorMessage}</Text>
      ) : null}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask AI Chef anything..."
          placeholderTextColor={KitchenDesign.colors.muted}
          style={styles.input}
          multiline
          maxLength={500}
          accessibilityLabel="Message input"
          editable={!isSending}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={isSending || !input.trim()}
          onPress={() => handleSend()}
          style={({ pressed }) => [
            styles.sendButton,
            pressed && !isSending ? styles.pressed : null,
            isSending || !input.trim() ? styles.disabled : null,
          ]}>
          {isSending ? (
            <ActivityIndicator size="small" color={KitchenDesign.colors.cream} />
          ) : (
            <Send size={22} stroke={KitchenDesign.colors.cream} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}>
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
          ]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

let messageIdCounter = 0;
function defaultMessageId(): string {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extracts likely ingredient mentions from AI-generated text.
 * Splits on common punctuation and whitespace; keeps multi-word fragments
 * for the substring-based allergen lookup.
 */
function extractIngredientCandidates(text: string): string[] {
  // Split on commas, periods, newlines, and bullet points to get candidate phrases.
  const fragments = text
    .split(/[,.;:\n•·\-–—]+/g)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  // Also include individual words for shorter ingredient names (e.g., "milk").
  const words = text
    .split(/[\s,.;:\n•·\-–—()]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  return [...fragments, ...words];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: KitchenDesign.colors.border,
    borderBottomWidth: 1,
    backgroundColor: KitchenDesign.colors.porcelain,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  headerTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tierBadgeText: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  upgradeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: KitchenDesign.colors.orange,
  },
  upgradeButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyContent: {
    padding: 20,
    gap: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  welcomeCard: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 18,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  welcomeTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  welcomeBody: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  promptList: {
    gap: 10,
  },
  promptChip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  promptChipText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  messageList: {
    padding: 16,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: KitchenDesign.colors.orange,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: KitchenDesign.colors.cream,
  },
  bubbleTextAssistant: {
    color: KitchenDesign.colors.ink,
  },
  errorBanner: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFEBEE',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingTop: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderTopColor: KitchenDesign.colors.border,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.5,
  },
});
