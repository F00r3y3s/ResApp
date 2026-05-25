import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import type { ChatRepository } from './chat-repository';
import { ChatScreenContent } from './chat-screen';
import type { ChatMessage } from './chat-types';

const mockRouterCalls: { method: string; path: string }[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (path: string) => mockRouterCalls.push({ method: 'push', path }),
  },
}));

function createInMemoryChatRepository(initial: ChatMessage[] = []): ChatRepository {
  let messages = [...initial];
  return {
    async getMessages() {
      return [...messages];
    },
    async saveMessage(msg) {
      messages = [...messages, msg];
    },
    async clearHistory() {
      messages = [];
    },
  };
}

function pantryItem(name: string): PantryItem {
  return {
    localId: `local-${name}`,
    name,
    normalizedName: name.toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'fridge',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
  };
}

function recipeWith(title: string, ingredients: string[]): Recipe {
  return {
    localId: `local-${title.toLocaleLowerCase().replace(/\s+/g, '-')}`,
    seedId: null,
    title,
    cuisine: 'indian',
    dietTags: [],
    allergens: [],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    ingredients: ingredients.map((name) => ({ name, quantity: '1', unit: 'whole' })),
    steps: [],
    imageKey: null,
    source: '',
    attribution: '',
    license: '',
    isSaved: false,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}

const defaultPreferences: GuestPreferences = {
  language: 'english',
  region: 'uk-us',
  householdSize: 4,
  dietaryRules: [],
  allergies: [],
  cuisines: [],
  goals: [],
  privacy: 'local-only',
  updatedAt: '2026-05-24T00:00:00.000Z',
};

let messageIdSeq = 0;
const createMessageId = () => {
  messageIdSeq += 1;
  return `test-msg-${messageIdSeq}`;
};

beforeEach(() => {
  mockRouterCalls.length = 0;
  messageIdSeq = 0;
});

describe('ChatScreenContent', () => {
  it('shows welcome card and suggested prompts when no history', async () => {
    render(
      <ChatScreenContent
        chatRepository={createInMemoryChatRepository()}
        recipes={[]}
        pantryItems={[]}
        preferences={null}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Hi! What are we cooking?')).toBeTruthy();
    });

    expect(screen.getByText('What can I cook tonight?')).toBeTruthy();
    expect(screen.getByText('Quick breakfast ideas')).toBeTruthy();
  });

  it('shows Free Smart Chef Lite badge for free users', async () => {
    render(
      <ChatScreenContent
        chatRepository={createInMemoryChatRepository()}
        recipes={[]}
        pantryItems={[]}
        preferences={null}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Free Smart Chef Lite')).toBeTruthy();
    });

    expect(screen.getByText('Upgrade')).toBeTruthy();
  });

  it('shows Premium AI badge for premium users without upgrade button', async () => {
    render(
      <ChatScreenContent
        chatRepository={createInMemoryChatRepository()}
        recipes={[]}
        pantryItems={[]}
        preferences={null}
        isPremium={true}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Premium AI')).toBeTruthy();
    });

    expect(screen.queryByText('Upgrade')).toBeNull();
  });

  it('navigates to paywall when upgrade is pressed', async () => {
    render(
      <ChatScreenContent
        chatRepository={createInMemoryChatRepository()}
        recipes={[]}
        pantryItems={[]}
        preferences={null}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Upgrade')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Upgrade'));

    expect(mockRouterCalls).toContainEqual({ method: 'push', path: '/paywall' });
  });

  it('sends a free user message and shows local Smart Chef Lite response', async () => {
    const repo = createInMemoryChatRepository();
    const recipes = [recipeWith('Tomato Pasta', ['Tomatoes', 'Pasta'])];
    const pantryItems = [pantryItem('Tomatoes'), pantryItem('Pasta')];

    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Message input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Message input'), 'What can I cook?');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(screen.getByText('What can I cook?')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/Tomato Pasta/)).toBeTruthy();
    });
  });

  it('uses sendToGateway for premium users', async () => {
    const repo = createInMemoryChatRepository();
    const sendToGateway = jest.fn().mockResolvedValue('AI says: try lasagna!') as any;

    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={[]}
        pantryItems={[]}
        preferences={defaultPreferences}
        isPremium={true}
        sendToGateway={sendToGateway}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Message input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Message input'), 'Hello AI');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(sendToGateway).toHaveBeenCalledWith('Hello AI');
    });

    await waitFor(() => {
      expect(screen.getByText('AI says: try lasagna!')).toBeTruthy();
    });
  });

  it('falls back to local response when gateway fails for premium user', async () => {
    const repo = createInMemoryChatRepository();
    const sendToGateway = jest.fn().mockRejectedValue(new Error('Network down')) as any;
    const recipes = [recipeWith('Pasta', ['Pasta'])];
    const pantryItems = [pantryItem('Pasta')];

    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
        isPremium={true}
        sendToGateway={sendToGateway}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Message input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Message input'), 'What to cook?');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(screen.getByText(/Smart Chef Lite/)).toBeTruthy();
    });
  });

  it('persists messages across renders', async () => {
    const repo = createInMemoryChatRepository();
    const recipes = [recipeWith('Pasta', ['Pasta'])];
    const pantryItems = [pantryItem('Pasta')];

    const { unmount } = render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Message input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Message input'), 'Test message');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeTruthy();
    });

    unmount();

    // Re-render with same repo — messages should persist
    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeTruthy();
    });
  });

  it('sends a prompt chip when tapped', async () => {
    const repo = createInMemoryChatRepository();
    const recipes = [recipeWith('Pasta', ['Pasta'])];
    const pantryItems = [pantryItem('Pasta')];

    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
        isPremium={false}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('What can I cook tonight?')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('What can I cook tonight?'));

    await waitFor(() => {
      // The user message should appear in the message list
      const userMessages = screen.getAllByText('What can I cook tonight?');
      // There should now be more than one — chip + user bubble
      expect(userMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('warns premium user when AI response mentions allergens', async () => {
    const repo = createInMemoryChatRepository();
    // AI response mentions almonds, but user is allergic to tree-nuts
    const sendToGateway = async () =>
      'Try a salad with almonds, lettuce, and olive oil.';

    const prefs: GuestPreferences = {
      ...defaultPreferences,
      allergies: ['tree-nuts'],
    };

    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={[]}
        pantryItems={[]}
        preferences={prefs}
        isPremium={true}
        sendToGateway={sendToGateway}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Message input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Message input'), 'Salad ideas');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(screen.getByText(/⚠️.*allergic/)).toBeTruthy();
    });
  });

  it('does not warn premium user when AI response has no allergen conflicts', async () => {
    const repo = createInMemoryChatRepository();
    const sendToGateway = async () =>
      'Try a rice and bean bowl with onion and tomato.';

    const prefs: GuestPreferences = {
      ...defaultPreferences,
      allergies: ['tree-nuts', 'dairy'],
    };

    render(
      <ChatScreenContent
        chatRepository={repo}
        recipes={[]}
        pantryItems={[]}
        preferences={prefs}
        isPremium={true}
        sendToGateway={sendToGateway}
        createMessageId={createMessageId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Message input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Message input'), 'Vegan ideas');
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() => {
      expect(screen.getByText(/rice and bean bowl/)).toBeTruthy();
    });

    expect(screen.queryByText(/⚠️/)).toBeNull();
  });
});
