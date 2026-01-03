use tauri::State;
use crate::db::Database;
use crate::models::*;

// ============================================
// Project Commands
// ============================================

#[tauri::command]
pub fn get_projects(db: State<Database>) -> Result<Vec<Project>, String> {
    db.get_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(db: State<Database>, name: String, path: String) -> Result<Project, String> {
    let project = Project::new(name, path);
    db.create_project(&project).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub fn update_project_status(db: State<Database>, id: String, status: String) -> Result<(), String> {
    let status = match status.as_str() {
        "active" => ProjectStatus::Active,
        "paused" => ProjectStatus::Paused,
        "archived" => ProjectStatus::Archived,
        _ => return Err("Invalid status".to_string()),
    };
    db.update_project_status(&id, status).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(db: State<Database>, id: String) -> Result<(), String> {
    db.delete_project(&id).map_err(|e| e.to_string())
}

// ============================================
// Daily Log Commands
// ============================================

#[tauri::command]
pub fn get_daily_logs(db: State<Database>, project_id: Option<String>, limit: Option<i32>) -> Result<Vec<DailyLog>, String> {
    let limit = limit.unwrap_or(30);
    db.get_daily_logs(project_id.as_deref(), limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_daily_log(
    db: State<Database>,
    project_id: String,
    date: String,
    summary: String,
    category: String,
) -> Result<DailyLog, String> {
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
        project_id,
        date,
        summary,
        category,
        files_changed: Vec::new(),
        ai_classification: None,
        user_override: None,
        created_at: chrono::Utc::now(),
    };

    db.create_daily_log(&log).map_err(|e| e.to_string())?;
    Ok(log)
}

// ============================================
// Todo Commands
// ============================================

#[tauri::command]
pub fn get_todos(db: State<Database>, status: Option<String>) -> Result<Vec<Todo>, String> {
    let status = status.map(|s| match s.as_str() {
        "pending" => TodoStatus::Pending,
        "in_progress" => TodoStatus::InProgress,
        "completed" => TodoStatus::Completed,
        "cancelled" => TodoStatus::Cancelled,
        _ => TodoStatus::Pending,
    });
    db.get_todos(status).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_todo(
    db: State<Database>,
    title: String,
    project_id: Option<String>,
    priority: Option<String>,
    due_date: Option<String>,
) -> Result<Todo, String> {
    let mut todo = Todo::new(title, project_id);

    if let Some(p) = priority {
        todo.priority = match p.as_str() {
            "low" => TodoPriority::Low,
            "high" => TodoPriority::High,
            "urgent" => TodoPriority::Urgent,
            _ => TodoPriority::Medium,
        };
    }

    todo.due_date = due_date;

    db.create_todo(&todo).map_err(|e| e.to_string())?;
    Ok(todo)
}

#[tauri::command]
pub fn update_todo_status(db: State<Database>, id: String, status: String) -> Result<(), String> {
    let status = match status.as_str() {
        "pending" => TodoStatus::Pending,
        "in_progress" => TodoStatus::InProgress,
        "completed" => TodoStatus::Completed,
        "cancelled" => TodoStatus::Cancelled,
        _ => return Err("Invalid status".to_string()),
    };
    db.update_todo_status(&id, status).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_todo(db: State<Database>, id: String) -> Result<(), String> {
    db.delete_todo(&id).map_err(|e| e.to_string())
}

// ============================================
// Inbox Commands
// ============================================

#[tauri::command]
pub fn get_inbox_items(db: State<Database>, status: Option<String>) -> Result<Vec<InboxItem>, String> {
    let status = status.map(|s| match s.as_str() {
        "pending" => InboxStatus::Pending,
        "answered" => InboxStatus::Answered,
        "skipped" => InboxStatus::Skipped,
        _ => InboxStatus::Pending,
    });
    db.get_inbox_items(status).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn answer_inbox_item(db: State<Database>, id: String, answer: String) -> Result<(), String> {
    db.answer_inbox_item(&id, &answer).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_inbox_item(
    db: State<Database>,
    item_type: String,
    question: String,
    project_id: Option<String>,
    context: Option<String>,
) -> Result<InboxItem, String> {
    let item_type = match item_type.as_str() {
        "daily_summary" => InboxItemType::DailySummary,
        "classification" => InboxItemType::Classification,
        "todo_followup" => InboxItemType::TodoFollowup,
        "planning" => InboxItemType::Planning,
        _ => InboxItemType::StaleProject,
    };

    let mut item = InboxItem::new(item_type, question, project_id);
    item.context = context;

    db.create_inbox_item(&item).map_err(|e| e.to_string())?;
    Ok(item)
}

// ============================================
// Chat Commands
// ============================================

#[tauri::command]
pub fn get_chat_messages(db: State<Database>, project_id: Option<String>, limit: Option<i32>) -> Result<Vec<ChatMessage>, String> {
    let limit = limit.unwrap_or(50);
    db.get_chat_messages(project_id.as_deref(), limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_chat_message(
    db: State<Database>,
    role: String,
    content: String,
    project_id: Option<String>,
) -> Result<ChatMessage, String> {
    let role = match role.as_str() {
        "user" => ChatRole::User,
        "system" => ChatRole::System,
        _ => ChatRole::Assistant,
    };

    let message = ChatMessage::new(role, content, project_id);
    db.create_chat_message(&message).map_err(|e| e.to_string())?;
    Ok(message)
}

// ============================================
// Settings Commands
// ============================================

#[tauri::command]
pub fn get_settings(db: State<Database>) -> Result<UserSettings, String> {
    let settings_json = db.get_setting("user_settings").map_err(|e| e.to_string())?;

    match settings_json {
        Some(json) => serde_json::from_str(&json).map_err(|e| e.to_string()),
        None => Ok(UserSettings::default()),
    }
}

#[tauri::command]
pub fn save_settings(db: State<Database>, settings: UserSettings) -> Result<(), String> {
    let json = serde_json::to_string(&settings).map_err(|e| e.to_string())?;
    db.set_setting("user_settings", &json).map_err(|e| e.to_string())
}

// ============================================
// Statistics Commands
// ============================================

#[tauri::command]
pub fn get_activity_stats(db: State<Database>, days: Option<i32>) -> Result<Vec<(String, i32)>, String> {
    let days = days.unwrap_or(365);
    db.get_activity_stats(days).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_category_distribution(db: State<Database>) -> Result<Vec<(String, i32)>, String> {
    db.get_category_distribution().map_err(|e| e.to_string())
}

// ============================================
// Health Check
// ============================================

#[tauri::command]
pub fn health_check() -> Result<String, String> {
    Ok("Sixarms backend is running".to_string())
}
