import { create } from 'zustand';
import { chatApi, grokApi } from '../lib/api';
import type { ChatMessage } from '../lib/types';

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;

  // Actions
  fetchMessages: (projectId?: string, limit?: number) => Promise<void>;
  sendMessage: (content: string, projectId?: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  sending: false,
  error: null,

  fetchMessages: async (projectId?: string, limit?: number) => {
    set({ loading: true, error: null });
    try {
      const messages = await chatApi.getMessages(projectId, limit);
      // Reverse to show oldest first
      set({ messages: messages.reverse(), loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  sendMessage: async (content: string, projectId?: string) => {
    set({ sending: true, error: null });

    try {
      // Build history from existing messages (before adding new one)
      const currentMessages = get().messages;
      const history = currentMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Save user message to database
      const userMessage = await chatApi.createMessage('user', content, projectId);
      set((state) => ({
        messages: [...state.messages, userMessage],
      }));

      // Get AI response from Grok with conversation history
      try {
        const aiResponse = await grokApi.chatWithHistory(
          content,
          history,
          projectId,
          4000 // max history tokens
        );

        // Save AI response to database
        const assistantMessage = await chatApi.createMessage(
          'assistant',
          aiResponse,
          projectId
        );

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          sending: false,
        }));
      } catch (aiError) {
        // If Grok fails, add error message
        const errorMessage = await chatApi.createMessage(
          'assistant',
          `Sorry, AI is temporarily unavailable. Error: ${String(aiError)}`,
          projectId
        );

        set((state) => ({
          messages: [...state.messages, errorMessage],
          sending: false,
          error: String(aiError),
        }));
      }
    } catch (error) {
      set({ error: String(error), sending: false });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
