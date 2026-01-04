import { create } from 'zustand';
import { chatApi, grokApi } from '../lib/api';
import type { ChatMessage, DetectedAction, AiResponseWithActions } from '../lib/types';

interface ChatState {
  messages: ChatMessage[];
  pendingActions: DetectedAction[];
  loading: boolean;
  sending: boolean;
  executingAction: boolean;
  error: string | null;

  // Actions
  fetchMessages: (projectId?: string, limit?: number) => Promise<void>;
  sendMessage: (content: string, projectId?: string) => Promise<void>;
  executeAction: (action: DetectedAction, projectId?: string) => Promise<void>;
  dismissAction: (actionIndex: number) => void;
  clearMessages: () => void;
  clearPendingActions: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  pendingActions: [],
  loading: false,
  sending: false,
  executingAction: false,
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
    set({ sending: true, error: null, pendingActions: [] });

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

      // Get AI response with intent detection
      try {
        const aiResponse: AiResponseWithActions = await grokApi.chatWithIntent(
          content,
          history,
          projectId,
          projectId
        );

        // Save AI response to database
        const assistantMessage = await chatApi.createMessage(
          'assistant',
          aiResponse.message,
          projectId
        );

        // Filter actions with confidence > 0.5 and not 'none' type
        const meaningfulActions = aiResponse.detected_actions.filter(
          (a) => a.confidence > 0.5 && a.data.type !== 'none'
        );

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          pendingActions: meaningfulActions,
          sending: false,
        }));
      } catch (aiError) {
        // Fallback to simple chat if intent detection fails
        try {
          const fallbackResponse = await grokApi.chatWithHistory(
            content,
            history,
            projectId,
            4000
          );

          const assistantMessage = await chatApi.createMessage(
            'assistant',
            fallbackResponse,
            projectId
          );

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            sending: false,
          }));
        } catch (fallbackError) {
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
      }
    } catch (error) {
      set({ error: String(error), sending: false });
    }
  },

  executeAction: async (action: DetectedAction, projectId?: string) => {
    set({ executingAction: true });
    try {
      const result = await grokApi.executeAction(action, projectId);

      // Add confirmation message to chat
      let confirmationText = '';
      if (result.type === 'todo_created') {
        const data = result.data as { title: string };
        confirmationText = `✅ 已創建待辦事項：「${data.title}」`;
      } else if (result.type === 'progress_logged') {
        const data = result.data as { summary: string; date: string };
        confirmationText = `✅ 已記錄進度 (${data.date})：「${data.summary}」`;
      } else if (result.type === 'inbox_created') {
        const data = result.data as { question: string };
        confirmationText = `✅ 已添加跟進事項：「${data.question}」`;
      }

      if (confirmationText) {
        const confirmMessage = await chatApi.createMessage(
          'assistant',
          confirmationText,
          projectId
        );
        set((state) => ({
          messages: [...state.messages, confirmMessage],
        }));
      }

      // Remove executed action from pending
      set((state) => ({
        pendingActions: state.pendingActions.filter((a) => a !== action),
        executingAction: false,
      }));
    } catch (error) {
      set({ error: String(error), executingAction: false });
    }
  },

  dismissAction: (actionIndex: number) => {
    set((state) => ({
      pendingActions: state.pendingActions.filter((_, i) => i !== actionIndex),
    }));
  },

  clearMessages: () => {
    set({ messages: [], error: null, pendingActions: [] });
  },

  clearPendingActions: () => {
    set({ pendingActions: [] });
  },
}));
