use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================
// Core Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub status: ProjectStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProjectStatus {
    Active,
    Paused,
    Archived,
}

impl Default for ProjectStatus {
    fn default() -> Self {
        ProjectStatus::Active
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyLog {
    pub id: String,
    pub project_id: String,
    pub date: String, // YYYY-MM-DD format
    pub summary: String,
    pub category: LogCategory,
    pub files_changed: Vec<FileChange>,
    pub ai_classification: Option<String>,
    pub user_override: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogCategory {
    Feature,
    Bugfix,
    Refactor,
    Ui,
    Docs,
    Test,
    Chore,
    Other,
}

impl Default for LogCategory {
    fn default() -> Self {
        LogCategory::Other
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    pub path: String,
    pub additions: i32,
    pub deletions: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: TodoPriority,
    pub status: TodoStatus,
    pub due_date: Option<String>, // YYYY-MM-DD format
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TodoPriority {
    Low,
    Medium,
    High,
    Urgent,
}

impl Default for TodoPriority {
    fn default() -> Self {
        TodoPriority::Medium
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TodoStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

impl Default for TodoStatus {
    fn default() -> Self {
        TodoStatus::Pending
    }
}

// ============================================
// Inbox Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InboxItem {
    pub id: String,
    pub item_type: InboxItemType,
    pub project_id: Option<String>,
    pub question: String,
    pub context: Option<String>,
    pub suggested_actions: Vec<SuggestedAction>,
    pub status: InboxStatus,
    pub answer: Option<String>,
    pub created_at: DateTime<Utc>,
    pub answered_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InboxItemType {
    DailySummary,
    Classification,
    TodoFollowup,
    Planning,
    StaleProject,
    // Phase 2 types
    AnomalyDetection,    // 異常偵測
    WeeklyReview,        // 每週回顧
    PatternInsight,      // 模式洞察
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedAction {
    pub id: String,
    pub label: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum InboxStatus {
    Pending,
    Answered,
    Skipped,
}

impl Default for InboxStatus {
    fn default() -> Self {
        InboxStatus::Pending
    }
}

// ============================================
// Chat Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub project_id: Option<String>,
    pub role: ChatRole,
    pub content: String,
    pub actions: Option<ChatAction>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatAction {
    pub action_type: ChatActionType,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ChatActionType {
    Logged,
    TodoCreated,
    ProjectUpdated,
}

// ============================================
// Settings Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub notifications: NotificationSettings,
    pub scan: ScanSettings,
    pub theme: String,
    pub language: String,
}

impl Default for UserSettings {
    fn default() -> Self {
        UserSettings {
            notifications: NotificationSettings::default(),
            scan: ScanSettings::default(),
            theme: "dark".to_string(),
            language: "zh-HK".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub daily_summary: bool,
    pub todo_reminder: bool,
    pub stale_project: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        NotificationSettings {
            daily_summary: true,
            todo_reminder: true,
            stale_project: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSettings {
    pub enabled: bool,
    pub interval_minutes: u32,
    pub scan_on_startup: bool,
    pub auto_classify: bool,
    pub auto_summarize: bool,
}

impl Default for ScanSettings {
    fn default() -> Self {
        ScanSettings {
            enabled: true,
            interval_minutes: 30,
            scan_on_startup: true,
            auto_classify: true,
            auto_summarize: true,
        }
    }
}

// ============================================
// Scanner Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiffResult {
    pub project_id: String,
    pub date: String,
    pub files: Vec<FileChange>,
    pub total_additions: i32,
    pub total_deletions: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitTag {
    pub name: String,
    pub commit_hash: String,
    pub date: String,
    pub message: Option<String>,
}

// ============================================
// Milestone Models
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Milestone {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub git_tag: Option<String>,
    pub status: MilestoneStatus,
    pub target_date: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MilestoneStatus {
    Planned,
    InProgress,
    Completed,
    Cancelled,
}

impl Default for MilestoneStatus {
    fn default() -> Self {
        MilestoneStatus::Planned
    }
}

impl Milestone {
    pub fn new(project_id: String, title: String) -> Self {
        Milestone {
            id: Uuid::new_v4().to_string(),
            project_id,
            title,
            description: None,
            version: None,
            git_tag: None,
            status: MilestoneStatus::Planned,
            target_date: None,
            completed_at: None,
            created_at: Utc::now(),
        }
    }
}

// ============================================
// API Response Models
// ============================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: &str) -> Self {
        ApiResponse {
            success: false,
            data: None,
            error: Some(message.to_string()),
        }
    }
}

// ============================================
// Helper implementations
// ============================================

impl Project {
    pub fn new(name: String, path: String) -> Self {
        let now = Utc::now();
        Project {
            id: Uuid::new_v4().to_string(),
            name,
            path,
            status: ProjectStatus::Active,
            created_at: now,
            updated_at: now,
        }
    }
}

impl Todo {
    pub fn new(title: String, project_id: Option<String>) -> Self {
        Todo {
            id: Uuid::new_v4().to_string(),
            project_id,
            title,
            description: None,
            priority: TodoPriority::Medium,
            status: TodoStatus::Pending,
            due_date: None,
            created_at: Utc::now(),
            completed_at: None,
        }
    }
}

impl InboxItem {
    pub fn new(item_type: InboxItemType, question: String, project_id: Option<String>) -> Self {
        InboxItem {
            id: Uuid::new_v4().to_string(),
            item_type,
            project_id,
            question,
            context: None,
            suggested_actions: Vec::new(),
            status: InboxStatus::Pending,
            answer: None,
            created_at: Utc::now(),
            answered_at: None,
        }
    }
}

impl ChatMessage {
    pub fn new(role: ChatRole, content: String, project_id: Option<String>) -> Self {
        ChatMessage {
            id: Uuid::new_v4().to_string(),
            project_id,
            role,
            content,
            actions: None,
            created_at: Utc::now(),
        }
    }
}
