use tauri::State;
use crate::db::Database;
use crate::grok::{ChatHistoryItem, GrokClient, GrokMessage};
use crate::keychain::Keychain;
use crate::models::{AiResponseWithActions, DetectedAction, ActionData, Todo, DailyLog, InboxItem, InboxItemType, LogCategory, Milestone, MilestoneStatus, MilestoneSource};

#[tauri::command]
pub async fn set_api_key(grok: State<'_, GrokClient>, keychain: State<'_, Keychain>, key: String) -> Result<(), String> {
    // Save to keychain
    keychain.save_api_key(&key)?;

    // Set in client
    grok.set_api_key(key).await;

    Ok(())
}

#[tauri::command]
pub async fn has_api_key(grok: State<'_, GrokClient>) -> Result<bool, String> {
    Ok(grok.has_api_key().await)
}

#[tauri::command]
pub async fn delete_api_key(keychain: State<'_, Keychain>) -> Result<(), String> {
    keychain.delete_api_key()
}

#[tauri::command]
pub async fn chat_with_grok(
    grok: State<'_, GrokClient>,
    message: String,
    project_context: Option<String>,
) -> Result<String, String> {
    grok.chat_with_context(&message, project_context.as_deref()).await
}

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

#[tauri::command]
pub async fn classify_with_grok(
    grok: State<'_, GrokClient>,
    files_changed: String,
    diff_summary: String,
) -> Result<String, String> {
    grok.classify_changes(&files_changed, &diff_summary).await
}

#[tauri::command]
pub async fn generate_summary_with_grok(
    grok: State<'_, GrokClient>,
    files_changed: String,
    context: String,
) -> Result<String, String> {
    grok.generate_summary(&files_changed, &context).await
}

#[tauri::command]
pub async fn send_grok_messages(
    grok: State<'_, GrokClient>,
    messages: Vec<GrokMessage>,
) -> Result<String, String> {
    grok.chat(messages).await
}

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

#[tauri::command]
pub async fn execute_detected_action(
    db: State<'_, Database>,
    action: DetectedAction,
    project_id: Option<String>,
) -> Result<serde_json::Value, String> {
    match action.data {
        ActionData::Todo { title, priority, due_date } => {
            let mut todo = Todo::new(title.clone(), project_id);
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
                    "title": title,
                    "priority": format!("{:?}", todo.priority).to_lowercase()
                }
            }))
        }
        ActionData::Progress { summary, category, date } => {
            let project_id = project_id.ok_or("Project ID required for logging progress")?;
            let date = date.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
            let log_category = match category.as_str() {
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
                category: log_category,
                files_changed: vec![],
                ai_classification: Some(category.clone()),
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
            let inbox_type = match item_type.as_str() {
                "todo_followup" => InboxItemType::TodoFollowup,
                "planning" => InboxItemType::Planning,
                _ => InboxItemType::TodoFollowup,
            };

            let item = InboxItem::new(inbox_type, question.clone(), project_id);
            db.create_inbox_item(&item).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({
                "type": "inbox_created",
                "data": {
                    "id": item.id,
                    "question": question
                }
            }))
        }
        ActionData::Milestone { title, description, version, git_tag } => {
            let project_id = project_id.ok_or("Project ID required for creating milestone")?;

            let milestone = Milestone {
                id: uuid::Uuid::new_v4().to_string(),
                project_id: project_id.clone(),
                title: title.clone(),
                description,
                version: version.clone(),
                git_tag,
                status: MilestoneStatus::Planned,
                source: MilestoneSource::Ai,
                target_date: None,
                completed_at: None,
                created_at: chrono::Utc::now(),
            };

            db.create_milestone(&milestone).map_err(|e| e.to_string())?;

            Ok(serde_json::json!({
                "type": "milestone_created",
                "data": {
                    "id": milestone.id,
                    "title": title,
                    "version": version
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
