use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::models::AiResponseWithActions;

const GROK_API_URL: &str = "https://api.x.ai/v1/chat/completions";

#[derive(Debug, Clone)]
pub struct GrokClient {
    client: Client,
    api_key: Arc<Mutex<Option<String>>>,
}

#[derive(Debug, Serialize)]
struct GrokRequest {
    model: String,
    messages: Vec<GrokMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrokMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatHistoryItem {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
struct GrokResponse {
    choices: Vec<GrokChoice>,
}

#[derive(Debug, Deserialize)]
struct GrokChoice {
    message: GrokMessage,
}

impl GrokClient {
    pub fn new() -> Self {
        GrokClient {
            client: Client::new(),
            api_key: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_api_key(&self, key: String) {
        let mut api_key = self.api_key.lock().await;
        *api_key = Some(key);
    }

    pub async fn has_api_key(&self) -> bool {
        let api_key = self.api_key.lock().await;
        api_key.is_some()
    }

    pub async fn chat(&self, messages: Vec<GrokMessage>) -> Result<String, String> {
        let api_key = {
            let key = self.api_key.lock().await;
            key.clone().ok_or("API key not set")?
        };

        let request = GrokRequest {
            model: "grok-4-1-fast-reasoning".to_string(),
            messages,
            temperature: 0.7,
            max_tokens: 2048,
        };

        let response = self.client
            .post(GROK_API_URL)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, error_text));
        }

        let grok_response: GrokResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        grok_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .ok_or_else(|| "No response from Grok".to_string())
    }

    pub async fn classify_changes(&self, files_changed: &str, diff_summary: &str) -> Result<String, String> {
        let system_prompt = r#"你係一個開發進度追蹤助手。你嘅任務係分析 git 改動，然後分類呢啲改動屬於邊種類型。

分類選項：
- feature: 新功能
- bugfix: 修復 bug
- refactor: 重構代碼
- ui: UI/UX 改動
- docs: 文檔更新
- test: 測試相關
- chore: 雜項（配置、依賴等）
- other: 其他

請只回覆分類名稱，唔好解釋。"#;

        let user_prompt = format!(
            "改動嘅檔案：\n{}\n\n改動摘要：\n{}\n\n呢啲改動屬於邊種分類？",
            files_changed, diff_summary
        );

        let messages = vec![
            GrokMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            GrokMessage {
                role: "user".to_string(),
                content: user_prompt,
            },
        ];

        self.chat(messages).await
    }

    pub async fn generate_summary(&self, files_changed: &str, context: &str) -> Result<String, String> {
        let system_prompt = r#"你係一個開發進度追蹤助手。你嘅任務係根據 git 改動生成簡潔嘅中文摘要。

要求：
- 用廣東話書寫
- 簡潔明瞭，一到兩句話
- 描述主要改動嘅目的同內容
- 唔好列出具體檔案名"#;

        let user_prompt = format!(
            "改動嘅檔案：\n{}\n\n背景：\n{}\n\n請生成一個簡潔嘅摘要。",
            files_changed, context
        );

        let messages = vec![
            GrokMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            GrokMessage {
                role: "user".to_string(),
                content: user_prompt,
            },
        ];

        self.chat(messages).await
    }

    pub async fn chat_with_context(&self, user_message: &str, project_context: Option<&str>) -> Result<String, String> {
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

        let messages = vec![
            GrokMessage {
                role: "system".to_string(),
                content: system_prompt,
            },
            GrokMessage {
                role: "user".to_string(),
                content: user_message.to_string(),
            },
        ];

        self.chat(messages).await
    }

    /// Truncate history to fit within token limit
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

    /// Chat with conversation history support
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

    /// Chat with intent detection - returns structured response with actions
    pub async fn chat_with_intent_detection(
        &self,
        user_message: &str,
        history: Vec<ChatHistoryItem>,
        project_context: Option<&str>,
        _project_id: Option<&str>,
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
- create_todo: 用戶想創建待辦事項（關鍵詞：要做、待辦、todo、記住、提醒、之後要）
- log_progress: 用戶描述完成嘅工作（關鍵詞：完成、做咗、實現咗、修復咗、搞掂）
- create_inbox_item: 需要跟進或確認嘅事項
- general_chat: 一般對話

回覆格式必須係 JSON：
{{
  "message": "你嘅回覆內容（用廣東話，友善專業）",
  "detected_actions": [
    {{
      "intent": "create_todo|log_progress|create_inbox_item|general_chat",
      "confidence": 0.0-1.0,
      "data": {{
        "type": "todo|progress|inbox|none",
        ...
      }},
      "confirmed": false
    }}
  ]
}}

data 格式：
- create_todo: {{"type": "todo", "title": "任務標題", "priority": "low|medium|high|urgent", "due_date": null}}
- log_progress: {{"type": "progress", "summary": "進度摘要", "category": "feature|bugfix|refactor|ui|docs|test|chore|other", "date": null}}
- create_inbox_item: {{"type": "inbox", "question": "需要跟進嘅問題", "item_type": "todo_followup|planning"}}
- general_chat: {{"type": "none"}}

請用友善、專業嘅語氣回應，並準確識別用戶意圖。只輸出 JSON，唔好有其他內容。"#,
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

        // Try to extract JSON from response (handle markdown code blocks)
        let json_str = if response.contains("```json") {
            response
                .split("```json")
                .nth(1)
                .and_then(|s| s.split("```").next())
                .unwrap_or(&response)
                .trim()
        } else if response.contains("```") {
            response
                .split("```")
                .nth(1)
                .unwrap_or(&response)
                .trim()
        } else {
            response.trim()
        };

        // Try to parse as structured response
        match serde_json::from_str::<AiResponseWithActions>(json_str) {
            Ok(parsed) => Ok(parsed),
            Err(e) => {
                log::warn!("Failed to parse AI response as JSON: {}, response: {}", e, &response);
                // Fallback: wrap plain text response
                Ok(AiResponseWithActions {
                    message: response,
                    detected_actions: vec![],
                })
            }
        }
    }
}

impl Default for GrokClient {
    fn default() -> Self {
        Self::new()
    }
}
