use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

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
            model: "grok-beta".to_string(),
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
}

impl Default for GrokClient {
    fn default() -> Self {
        Self::new()
    }
}
