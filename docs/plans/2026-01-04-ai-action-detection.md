# AI Development Progress Observation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable AI to automatically detect user intents from conversations and execute corresponding actions (create todos, log progress, add inbox items).

**Architecture:** AI responses include structured action suggestions → Frontend displays actionable buttons → User confirms → Backend executes actions and updates database.

**Tech Stack:** Rust/Tauri backend, React/TypeScript frontend, Grok AI (grok-4-1-fast-reasoning), Zustand state management

---

## Overview

The core workflow:
1. **Auto Scan** → Detects git changes
2. **AI Conversation** → User describes work, AI responds with structured suggestions
3. **Action Detection** → AI parses intent and suggests actionable items
4. **User Confirmation** → One-click or auto-confirm actions
5. **Action Execution** → System creates todos/logs/inbox items
6. **Follow-up** → User tracks created items

---

## Task 1: Add AI Action Types and Models

**Files:**
- Modify: `src-tauri/src/models.rs`
- Modify: `src/lib/types.ts`

**Step 1: Add ConversationIntent enum in Rust**

Add to `src-tauri/src/models.rs`:

```rust
// ============================================
// AI Conversation Action Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConversationIntent {
    CreateTodo,
    LogProgress,
    CreateInboxItem,
    AskQuestion,
    GeneralChat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedAction {
    pub intent: ConversationIntent,
    pub confidence: f32,
    pub data: ActionData,
    pub confirmed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ActionData {
    #[serde(rename = "todo")]
    Todo {
        title: String,
        priority: Option<String>,
        due_date: Option<String>,
    },
    #[serde(rename = "progress")]
    Progress {
        summary: String,
        category: String,
        date: Option<String>,
    },
    #[serde(rename = "inbox")]
    Inbox {
        question: String,
        item_type: String,
    },
    #[serde(rename = "none")]
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResponseWithActions {
    pub message: String,
    pub detected_actions: Vec<DetectedAction>,
}
```

**Step 2: Add TypeScript types**

Add to `src/lib/types.ts`:

```typescript
// AI Action Types
export type ConversationIntent =
  | 'create_todo'
  | 'log_progress'
  | 'create_inbox_item'
  | 'ask_question'
  | 'general_chat';

export interface DetectedAction {
  intent: ConversationIntent;
  confidence: number;
  data: ActionData;
  confirmed: boolean;
}

export type ActionData =
  | { type: 'todo'; title: string; priority?: string; due_date?: string }
  | { type: 'progress'; summary: string; category: string; date?: string }
  | { type: 'inbox'; question: string; item_type: string }
  | { type: 'none' };

export interface AiResponseWithActions {
  message: string;
  detected_actions: DetectedAction[];
}
```

**Step 3: Run type check to verify**

Run: `cd src-tauri && cargo check`
Expected: Compilation succeeds

**Step 4: Commit**

```bash
git add src-tauri/src/models.rs src/lib/types.ts
git commit -m "feat: add AI action detection models"
```

---

## Task 2: Implement Intent Detection in Grok Client

**Files:**
- Modify: `src-tauri/src/grok.rs`

**Step 1: Add structured response parsing method**

Add to `src-tauri/src/grok.rs`:

```rust
use crate::models::{AiResponseWithActions, DetectedAction, ActionData, ConversationIntent};

impl GrokClient {
    /// Chat with intent detection - returns structured response with actions
    pub async fn chat_with_intent_detection(
        &self,
        user_message: &str,
        history: Vec<ChatHistoryItem>,
        project_context: Option<&str>,
        project_id: Option<&str>,
    ) -> Result<AiResponseWithActions, String> {
        let system_prompt = format!(
            r#"你係 Sixarms，一個 AI 開發進度追蹤助手。你用廣東話同用戶溝通。

你嘅職責：
1. 幫用戶記錄每日嘅開發進度
2. 識別用戶意圖並建議相應動作
3. 管理 TODO 清單
4. 追蹤項目進度

{}

重要：你需要分析用戶訊息，識別以下意圖：
- create_todo: 用戶想創建待辦事項（關鍵詞：要做、待辦、todo、記住、提醒）
- log_progress: 用戶描述完成嘅工作（關鍵詞：完成、做咗、實現咗、修復咗）
- create_inbox_item: 需要跟進或確認嘅事項
- general_chat: 一般對話

回覆格式必須係 JSON：
{{
  "message": "你嘅回覆內容",
  "detected_actions": [
    {{
      "intent": "create_todo|log_progress|create_inbox_item|general_chat",
      "confidence": 0.0-1.0,
      "data": {{
        "type": "todo|progress|inbox|none",
        // 根據 type 填寫相應字段
      }},
      "confirmed": false
    }}
  ]
}}

如果係 create_todo:
{{"type": "todo", "title": "任務標題", "priority": "low|medium|high|urgent", "due_date": null}}

如果係 log_progress:
{{"type": "progress", "summary": "進度摘要", "category": "feature|bugfix|refactor|ui|docs|test|chore|other", "date": null}}

如果係 create_inbox_item:
{{"type": "inbox", "question": "需要跟進嘅問題", "item_type": "todo_followup|planning"}}

如果係 general_chat:
{{"type": "none"}}

請用友善、專業嘅語氣回應，並準確識別用戶意圖。"#,
            project_context.map(|c| format!("當前項目背景：\n{}", c)).unwrap_or_default()
        );

        let mut messages = vec![
            GrokMessage {
                role: "system".to_string(),
                content: system_prompt,
            },
        ];

        // Add truncated history
        let truncated = self.truncate_history(history, 3000);
        for item in truncated {
            messages.push(GrokMessage {
                role: item.role,
                content: item.content,
            });
        }

        // Add current user message
        messages.push(GrokMessage {
            role: "user".to_string(),
            content: user_message.to_string(),
        });

        let response = self.chat(messages).await?;

        // Try to parse as structured response
        match serde_json::from_str::<AiResponseWithActions>(&response) {
            Ok(parsed) => Ok(parsed),
            Err(_) => {
                // Fallback: wrap plain text response
                Ok(AiResponseWithActions {
                    message: response,
                    detected_actions: vec![],
                })
            }
        }
    }
}
```

**Step 2: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compilation succeeds

**Step 3: Commit**

```bash
git add src-tauri/src/grok.rs
git commit -m "feat: add intent detection to Grok client"
```

---

## Task 3: Add Tauri Commands for Intent Detection and Action Execution

**Files:**
- Modify: `src-tauri/src/grok_commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add chat_with_intent command**

Add to `src-tauri/src/grok_commands.rs`:

```rust
use crate::models::AiResponseWithActions;

#[tauri::command]
pub async fn chat_with_intent(
    grok: State<'_, GrokClient>,
    message: String,
    history: Vec<ChatHistoryItem>,
    project_context: Option<String>,
    project_id: Option<String>,
) -> Result<AiResponseWithActions, String> {
    grok.chat_with_intent_detection(
        &message,
        history,
        project_context.as_deref(),
        project_id.as_deref(),
    ).await
}
```

**Step 2: Add execute_detected_action command**

Add to `src-tauri/src/grok_commands.rs`:

```rust
use crate::db::Database;
use crate::models::{DetectedAction, ActionData, Todo, DailyLog, InboxItem, InboxItemType, LogCategory};

#[tauri::command]
pub async fn execute_detected_action(
    db: State<'_, Database>,
    action: DetectedAction,
    project_id: Option<String>,
) -> Result<serde_json::Value, String> {
    match action.data {
        ActionData::Todo { title, priority, due_date } => {
            let mut todo = Todo::new(title, project_id);
            if let Some(p) = priority {
                todo.priority = match p.as_str() {
                    "low" => crate::models::TodoPriority::Low,
                    "high" => crate::models::TodoPriority::High,
                    "urgent" => crate::models::TodoPriority::Urgent,
                    _ => crate::models::TodoPriority::Medium,
                };
            }
            todo.due_date = due_date;

            db.create_todo(&todo).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({
                "type": "todo_created",
                "data": {
                    "id": todo.id,
                    "title": todo.title,
                    "priority": format!("{:?}", todo.priority).to_lowercase()
                }
            }))
        }
        ActionData::Progress { summary, category, date } => {
            let project_id = project_id.ok_or("Project ID required for logging progress")?;
            let date = date.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
            let category = match category.as_str() {
                "feature" => LogCategory::Feature,
                "bugfix" => LogCategory::Bugfix,
                "refactor" => LogCategory::Refactor,
                "ui" => LogCategory::Ui,
                "docs" => LogCategory::Docs,
                "test" => LogCategory::Test,
                "chore" => LogCategory::Chore,
                _ => LogCategory::Other,
            };

            let log = DailyLog {
                id: uuid::Uuid::new_v4().to_string(),
                project_id: project_id.clone(),
                date: date.clone(),
                summary: summary.clone(),
                category,
                files_changed: vec![],
                ai_classification: Some(format!("{:?}", category).to_lowercase()),
                user_override: None,
                created_at: chrono::Utc::now(),
            };

            db.create_daily_log(&log).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({
                "type": "progress_logged",
                "data": {
                    "id": log.id,
                    "summary": summary,
                    "date": date
                }
            }))
        }
        ActionData::Inbox { question, item_type } => {
            let item_type = match item_type.as_str() {
                "todo_followup" => InboxItemType::TodoFollowup,
                "planning" => InboxItemType::Planning,
                _ => InboxItemType::TodoFollowup,
            };

            let item = InboxItem::new(item_type, question.clone(), project_id);
            db.create_inbox_item(&item).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({
                "type": "inbox_created",
                "data": {
                    "id": item.id,
                    "question": question
                }
            }))
        }
        ActionData::None => {
            Ok(serde_json::json!({
                "type": "no_action",
                "data": null
            }))
        }
    }
}
```

**Step 3: Register commands in lib.rs**

Update the `invoke_handler` in `src-tauri/src/lib.rs` to include:

```rust
grok_commands::chat_with_intent,
grok_commands::execute_detected_action,
```

**Step 4: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compilation succeeds

**Step 5: Commit**

```bash
git add src-tauri/src/grok_commands.rs src-tauri/src/lib.rs
git commit -m "feat: add intent detection and action execution commands"
```

---

## Task 4: Update Frontend API

**Files:**
- Modify: `src/lib/api.ts`

**Step 1: Add new API functions**

Add to `src/lib/api.ts`:

```typescript
import type { AiResponseWithActions, DetectedAction } from './types';

// Add to grokApi object:
export const grokApi = {
  // ... existing methods ...

  chatWithIntent: (
    message: string,
    history: ChatHistoryItem[],
    projectContext?: string,
    projectId?: string
  ) =>
    invoke<AiResponseWithActions>('chat_with_intent', {
      message,
      history,
      project_context: projectContext,
      project_id: projectId,
    }),

  executeAction: (action: DetectedAction, projectId?: string) =>
    invoke<{ type: string; data: unknown }>('execute_detected_action', {
      action,
      project_id: projectId,
    }),
};
```

**Step 2: Run TypeScript check**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add intent detection API functions"
```

---

## Task 5: Update Chat Store with Action Handling

**Files:**
- Modify: `src/stores/chatStore.ts`

**Step 1: Update chat store to use intent detection**

Replace `src/stores/chatStore.ts`:

```typescript
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
      set({ messages: messages.reverse(), loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  sendMessage: async (content: string, projectId?: string) => {
    set({ sending: true, error: null, pendingActions: [] });

    try {
      // Build history from existing messages
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

        // Filter actions with confidence > 0.5
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
```

**Step 2: Run TypeScript check**

Run: `npm run typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/stores/chatStore.ts
git commit -m "feat: update chat store with action handling"
```

---

## Task 6: Enhance Chat UI with Action Buttons

**Files:**
- Modify: `src/pages/Chat.tsx`

**Step 1: Add ActionSuggestion component**

Add to `src/pages/Chat.tsx` (before the Chat function):

```typescript
import { CheckCircle, ListTodo, FileText, X, Loader2 } from "lucide-react";
import type { DetectedAction } from "../lib/types";

function ActionSuggestion({
  action,
  onExecute,
  onDismiss,
  executing,
}: {
  action: DetectedAction;
  onExecute: () => void;
  onDismiss: () => void;
  executing: boolean;
}) {
  const getActionInfo = () => {
    switch (action.data.type) {
      case 'todo':
        return {
          icon: <ListTodo size={16} />,
          label: '創建待辦',
          title: action.data.title,
          color: 'text-accent-cyan',
          bgColor: 'bg-accent-cyan/10 border-accent-cyan/30',
        };
      case 'progress':
        return {
          icon: <FileText size={16} />,
          label: '記錄進度',
          title: action.data.summary,
          color: 'text-accent-green',
          bgColor: 'bg-accent-green/10 border-accent-green/30',
        };
      case 'inbox':
        return {
          icon: <CheckCircle size={16} />,
          label: '添加跟進',
          title: action.data.question,
          color: 'text-accent-amber',
          bgColor: 'bg-accent-amber/10 border-accent-amber/30',
        };
      default:
        return null;
    }
  };

  const info = getActionInfo();
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center justify-between p-3 rounded border ${info.bgColor}`}
    >
      <div className="flex items-center gap-3">
        <span className={info.color}>{info.icon}</span>
        <div>
          <span className={`text-xs font-mono ${info.color}`}>{info.label}</span>
          <p className="text-sm text-text-primary truncate max-w-[300px]">
            {info.title}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDismiss}
          disabled={executing}
          className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
        <button
          onClick={onExecute}
          disabled={executing}
          className={`px-3 py-1.5 text-sm rounded ${info.color} ${info.bgColor} hover:opacity-80 transition-opacity flex items-center gap-2`}
        >
          {executing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>確認</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
```

**Step 2: Update Chat component to show pending actions**

Update the Chat component to include:

```typescript
export function Chat() {
  // ... existing state ...

  const {
    messages,
    pendingActions,
    loading,
    sending,
    executingAction,
    error,
    fetchMessages,
    sendMessage,
    executeAction,
    dismissAction,
  } = useChatStore();

  // ... existing code ...

  // Add before the input section:
  {/* Pending Actions */}
  {pendingActions.length > 0 && (
    <div className="px-4 pb-2">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="text-xs text-text-muted font-mono mb-2">
          💡 AI 偵測到以下動作建議：
        </div>
        <AnimatePresence>
          {pendingActions.map((action, index) => (
            <ActionSuggestion
              key={`action-${index}`}
              action={action}
              onExecute={() => executeAction(action, selectedProjectId ?? undefined)}
              onDismiss={() => dismissAction(index)}
              executing={executingAction}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )}
```

**Step 3: Run dev server to verify UI**

Run: `npm run dev`
Expected: Chat page shows with action suggestions appearing after AI detects intents

**Step 4: Commit**

```bash
git add src/pages/Chat.tsx
git commit -m "feat: add action suggestion UI to chat"
```

---

## Task 7: Connect Scan Results to Conversation

**Files:**
- Modify: `src-tauri/src/scheduler.rs`

**Step 1: Create inbox item after scan with AI analysis**

Update scheduler to generate AI-powered inbox items after scanning. The scheduler should:
1. After detecting changes, call `AiAgent.analyze_daily_work()`
2. Create an inbox item with the analysis results
3. Include suggested actions for the user to confirm

**Step 2: Run cargo check**

Run: `cd src-tauri && cargo check`
Expected: Compilation succeeds

**Step 3: Test the scan → inbox flow**

1. Make changes in a tracked project
2. Trigger a manual scan
3. Verify an inbox item is created with AI analysis

**Step 4: Commit**

```bash
git add src-tauri/src/scheduler.rs
git commit -m "feat: connect scan results to inbox with AI analysis"
```

---

## Task 8: Final Integration Testing

**Steps:**

1. Start the app: `npm run tauri dev`

2. Test the complete workflow:
   - Add a project with git repository
   - Make some code changes
   - Go to Chat page
   - Type: "今日我完成咗登入功能嘅開發"
   - Verify AI suggests "記錄進度" action
   - Click confirm
   - Verify daily log is created

3. Test todo creation:
   - Type: "記住聽日要做單元測試"
   - Verify AI suggests "創建待辦" action
   - Click confirm
   - Go to Todos page and verify

4. Test scan → conversation flow:
   - Trigger manual scan from settings
   - Check inbox for AI-generated summary
   - Click suggested action to log progress

**Commit:**

```bash
git add -A
git commit -m "feat: complete AI action detection workflow"
```

---

## Summary

This implementation adds:

1. **Intent Detection**: AI analyzes user messages to detect create_todo, log_progress, create_inbox_item intents
2. **Structured Responses**: Grok returns JSON with message + detected actions
3. **Action Execution**: Tauri commands to execute detected actions
4. **Enhanced UI**: Action suggestion cards with confirm/dismiss buttons
5. **Visual Feedback**: Confirmation messages after action execution
6. **Scan Integration**: Auto-generated inbox items from git scans

The user workflow becomes:
- **Auto Scan** → Detects changes → Creates AI-analyzed inbox item
- **Chat** → User describes work → AI detects intent → Suggests actions
- **Confirm** → User clicks confirm → System creates todo/log/inbox
- **Track** → User views created items in respective pages
