# Chatbot History Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable chatbot to maintain conversation context by sending message history with each API call

**Architecture:** Stateless API with client-managed history, token-limited context window

**Tech Stack:** Rust (Tauri backend), TypeScript (React frontend), Grok API (x.ai)

---

## Current State Analysis

### Problems Identified
1. **No conversation memory**: Each API call only sends system prompt + current message
2. **Password prompt on startup**: Keychain access triggers macOS password dialog

### Current Flow
```
User Message → chatStore.sendMessage() → grokApi.chat()
→ chat_with_grok command → GrokClient.chat_with_context()
→ [system + current_message] → Grok API → Response
```

### Target Flow
```
User Message → chatStore.sendMessage() → grokApi.chatWithHistory()
→ chat_with_grok_history command → GrokClient.chat_with_history()
→ [system + truncated_history + current_message] → Grok API → Response
```

---

## Implementation Tasks

### Task 1: Add History Support to Grok Client (grok.rs)

**Files:**
- Modify: `src-tauri/src/grok.rs`

**Step 1: Add ChatHistoryItem struct**

After line 26 (after GrokMessage struct):
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatHistoryItem {
    pub role: String,
    pub content: String,
}
```

**Step 2: Add truncate_history helper method**

Add to impl GrokClient (before closing brace):
```rust
fn truncate_history(&self, history: Vec<ChatHistoryItem>, max_tokens: usize) -> Vec<ChatHistoryItem> {
    let mut result = Vec::new();
    let mut total_chars = 0;
    let chars_per_token = 4; // Rough estimate for mixed CJK/English

    // Add from newest to oldest
    for item in history.into_iter().rev() {
        let item_chars = item.content.len();
        if total_chars + item_chars > max_tokens * chars_per_token {
            break;
        }
        total_chars += item_chars;
        result.push(item);
    }

    // Reverse back to chronological order
    result.reverse();
    result
}
```

**Step 3: Add chat_with_history method**

Add to impl GrokClient (after chat_with_context method):
```rust
pub async fn chat_with_history(
    &self,
    user_message: &str,
    history: Vec<ChatHistoryItem>,
    project_context: Option<&str>,
    max_history_tokens: usize,
) -> Result<String, String> {
    let system_prompt = format!(
        r#"你係 Sixarms，一個 AI 開發進度追蹤助手。你用廣東話同用戶溝通。

你嘅職責：
1. 幫用戶記錄每日嘅開發進度
2. 分析 git 改動並提供分類建議
3. 管理 TODO 清單
4. 追蹤項目進度

{}

請用友善、專業嘅語氣回應。"#,
        project_context.map(|c| format!("當前項目背景：\n{}", c)).unwrap_or_default()
    );

    let mut messages = vec![
        GrokMessage {
            role: "system".to_string(),
            content: system_prompt,
        },
    ];

    // Add truncated history
    let truncated = self.truncate_history(history, max_history_tokens);
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

    self.chat(messages).await
}
```

---

### Task 2: Add Tauri Command (grok_commands.rs)

**Files:**
- Modify: `src-tauri/src/grok_commands.rs`

**Step 1: Add import for ChatHistoryItem**

Update imports:
```rust
use crate::grok::{GrokClient, GrokMessage, ChatHistoryItem};
```

**Step 2: Add new command**

After `chat_with_grok` function:
```rust
#[tauri::command]
pub async fn chat_with_grok_history(
    grok: State<'_, GrokClient>,
    message: String,
    history: Vec<ChatHistoryItem>,
    project_context: Option<String>,
    max_history_tokens: Option<usize>,
) -> Result<String, String> {
    let max_tokens = max_history_tokens.unwrap_or(4000);
    grok.chat_with_history(
        &message,
        history,
        project_context.as_deref(),
        max_tokens,
    ).await
}
```

---

### Task 3: Register Command (lib.rs)

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add to invoke_handler**

Add `chat_with_grok_history` to the command list in `.invoke_handler()`.

---

### Task 4: Add Frontend API Function (api.ts)

**Files:**
- Modify: `src/lib/api.ts`

**Step 1: Add ChatHistoryItem interface**

In the types section:
```typescript
interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}
```

**Step 2: Add chatWithHistory function**

In grokApi object:
```typescript
chatWithHistory: (
  message: string,
  history: ChatHistoryItem[],
  projectContext?: string,
  maxHistoryTokens?: number
): Promise<string> =>
  invoke('chat_with_grok_history', {
    message,
    history,
    projectContext,
    maxHistoryTokens: maxHistoryTokens ?? 4000,
  }),
```

---

### Task 5: Update Chat Store (chatStore.ts)

**Files:**
- Modify: `src/stores/chatStore.ts`

**Step 1: Update sendMessage to pass history**

Replace the grokApi.chat call with chatWithHistory, passing the conversation history.

---

## Password Issue (Keychain)

### Root Cause
macOS Keychain triggers password prompt when app accesses stored credentials without "Always Allow" permission.

### Current Mitigation
The app already caches the key in memory after first load. If password prompts persist:

1. Open "Keychain Access" app
2. Search for `com.sixarms.app`
3. Right-click → Get Info → Access Control
4. Add app to "Always allow access by these applications"

### Future Enhancement (Optional)
Modify `save_api_key` to use `set_generic_password_with_access` with appropriate ACL settings.

---

## Testing Plan

1. Start app with existing API key
2. Send a message referencing something from earlier in conversation
3. Verify AI remembers the context
4. Send 20+ messages to test token truncation
5. Verify older messages are dropped gracefully

---

## Future: Smart Summary Memory

For Phase 2, consider:
- Periodic summarization of conversation history
- Store summaries in database
- Include summary in system prompt instead of full history
- Reduces token usage while maintaining context
