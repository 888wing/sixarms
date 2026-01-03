use crate::grok::{GrokClient, GrokMessage};
use crate::models::{DailyLog, InboxItem, InboxItemType, Project, GitDiffResult, SuggestedAction};
use serde::{Deserialize, Serialize};

/// AI Agent for analyzing development patterns and generating insights
#[derive(Debug, Clone)]
pub struct AiAgent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub summary: String,
    pub category: String,
    pub insights: Vec<String>,
    pub suggested_todos: Vec<String>,
}

impl AiAgent {
    pub fn new() -> Self {
        AiAgent
    }

    /// Analyze a day's work and generate insights
    pub async fn analyze_daily_work(
        &self,
        grok: &GrokClient,
        project: &Project,
        diff: &GitDiffResult,
    ) -> Result<AnalysisResult, String> {
        if !grok.has_api_key().await {
            return Err("Grok API key not configured".to_string());
        }

        let files_changed = diff.files.iter()
            .map(|f| format!("{} (+{}/-{})", f.path, f.additions, f.deletions))
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = format!(
            r#"分析以下專案今日嘅開發進度：

專案名稱：{}
改動檔案：
{}

總共新增 {} 行，刪除 {} 行。

請提供：
1. 一句話嘅工作摘要
2. 工作分類（feature/bugfix/refactor/ui/docs/test/chore/other）
3. 2-3 個關鍵洞察
4. 建議嘅後續任務（如有）

以 JSON 格式回覆：
{{"summary": "...", "category": "...", "insights": ["..."], "suggested_todos": ["..."]}}"#,
            project.name,
            files_changed,
            diff.total_additions,
            diff.total_deletions
        );

        let messages = vec![
            GrokMessage {
                role: "system".to_string(),
                content: "你係 Sixarms AI 助手，專注於分析開發進度。請用廣東話回覆。".to_string(),
            },
            GrokMessage {
                role: "user".to_string(),
                content: prompt,
            },
        ];

        let response = grok.chat(messages).await?;

        // Try to parse as JSON, fallback to simple result
        match serde_json::from_str::<AnalysisResult>(&response) {
            Ok(result) => Ok(result),
            Err(_) => {
                // If JSON parsing fails, create a simple result
                Ok(AnalysisResult {
                    summary: response.clone(),
                    category: "other".to_string(),
                    insights: vec![],
                    suggested_todos: vec![],
                })
            }
        }
    }

    /// Detect anomalies in work patterns
    pub async fn detect_anomaly(
        &self,
        grok: &GrokClient,
        project: &Project,
        recent_logs: &[DailyLog],
    ) -> Result<Option<String>, String> {
        if !grok.has_api_key().await {
            return Err("Grok API key not configured".to_string());
        }

        if recent_logs.is_empty() {
            return Ok(None);
        }

        let log_summaries = recent_logs.iter()
            .map(|l| format!("{}: {} ({:?})", l.date, l.summary, l.category))
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = format!(
            r#"分析以下專案嘅最近開發記錄，檢測有無異常模式：

專案名稱：{}
最近記錄：
{}

如果發現以下情況，請指出：
1. 長時間無進度
2. 頻繁切換任務類型
3. 大量刪除代碼
4. 其他異常模式

如果一切正常，回覆 "NORMAL"。
如果有異常，簡短描述異常情況（一句話）。"#,
            project.name,
            log_summaries
        );

        let messages = vec![
            GrokMessage {
                role: "system".to_string(),
                content: "你係開發模式分析專家。請簡短直接回覆。".to_string(),
            },
            GrokMessage {
                role: "user".to_string(),
                content: prompt,
            },
        ];

        let response = grok.chat(messages).await?;

        if response.trim().to_uppercase() == "NORMAL" {
            Ok(None)
        } else {
            Ok(Some(response))
        }
    }

    /// Generate an inbox item from analysis
    pub fn create_daily_summary_inbox(
        &self,
        project: &Project,
        analysis: &AnalysisResult,
    ) -> InboxItem {
        let mut item = InboxItem::new(
            InboxItemType::DailySummary,
            format!("【{}】今日進度：{}", project.name, analysis.summary),
            Some(project.id.clone()),
        );

        item.context = Some(format!(
            "分類：{}\n洞察：\n{}",
            analysis.category,
            analysis.insights.join("\n")
        ));

        // Add suggested actions
        item.suggested_actions = analysis.suggested_todos.iter()
            .enumerate()
            .map(|(i, todo)| SuggestedAction {
                id: format!("todo_{}", i),
                label: todo.clone(),
                icon: Some("check-circle".to_string()),
            })
            .collect();

        item
    }

    /// Generate an anomaly detection inbox item
    pub fn create_anomaly_inbox(
        &self,
        project: &Project,
        anomaly_description: &str,
    ) -> InboxItem {
        let mut item = InboxItem::new(
            InboxItemType::AnomalyDetection,
            format!("⚠️ 【{}】偵測到異常模式", project.name),
            Some(project.id.clone()),
        );

        item.context = Some(anomaly_description.to_string());

        item.suggested_actions = vec![
            SuggestedAction {
                id: "review".to_string(),
                label: "查看詳情".to_string(),
                icon: Some("eye".to_string()),
            },
            SuggestedAction {
                id: "dismiss".to_string(),
                label: "忽略".to_string(),
                icon: Some("x".to_string()),
            },
        ];

        item
    }
}

impl Default for AiAgent {
    fn default() -> Self {
        Self::new()
    }
}
