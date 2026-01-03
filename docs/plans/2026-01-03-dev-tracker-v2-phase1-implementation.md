# Dev Tracker v2 Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the foundational automation layer for Dev Tracker v2, including automatic project scanning, AI-powered analysis engine, and notification system.

**Architecture:** Three-module approach: (1) `scheduler.rs` manages timing and triggers via tokio intervals, (2) `ai_agent.rs` provides AI analysis with Grok API, (3) `notification.rs` unifies in-app toast and native macOS notifications. All modules integrate via Tauri state management.

**Tech Stack:** Rust (tokio, tauri-plugin-notification), TypeScript/React, Zustand, SQLite, Grok API

---

## Task 1: Extend Data Models for AI Agent

**Files:**
- Modify: `src-tauri/src/models.rs`

**Step 1: Add new InboxItemType variants**

Add these new variants to the `InboxItemType` enum after line 140:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InboxItemType {
    DailySummary,
    Classification,
    TodoFollowup,
    Planning,
    StaleProject,
    // New Phase 2 types
    AnomalyDetection,    // 異常偵測
    WeeklyReview,        // 每週回顧
    PatternInsight,      // 模式洞察
}
```

**Step 2: Add ScanSettings model**

Add after line 236 (after NotificationSettings):

```rust
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
```

**Step 3: Update UserSettings to include ScanSettings**

Modify the UserSettings struct around line 204:

```rust
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
```

**Step 4: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src-tauri/src/models.rs
git commit -m "feat(models): add ScanSettings and new InboxItemType variants for Phase 1

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Scheduler Module Structure

**Files:**
- Create: `src-tauri/src/scheduler.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Create scheduler.rs with basic structure**

```rust
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Manager, State};
use crate::db::Database;
use crate::scanner::GitScanner;
use crate::models::ScanSettings;

/// Scheduler state for managing periodic scans
#[derive(Debug)]
pub struct Scheduler {
    is_running: Arc<Mutex<bool>>,
    last_scan: Arc<Mutex<Option<chrono::DateTime<chrono::Utc>>>>,
}

impl Scheduler {
    pub fn new() -> Self {
        Scheduler {
            is_running: Arc::new(Mutex::new(false)),
            last_scan: Arc::new(Mutex::new(None)),
        }
    }

    /// Start the scheduler with the given settings
    pub async fn start(&self, app_handle: AppHandle, settings: ScanSettings) {
        if !settings.enabled {
            log::info!("Scheduler disabled in settings");
            return;
        }

        let mut running = self.is_running.lock().await;
        if *running {
            log::warn!("Scheduler already running");
            return;
        }
        *running = true;
        drop(running);

        log::info!("Starting scheduler with interval: {} minutes", settings.interval_minutes);

        let is_running = self.is_running.clone();
        let last_scan = self.last_scan.clone();
        let interval_mins = settings.interval_minutes;

        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs((interval_mins as u64) * 60));

            loop {
                ticker.tick().await;

                let running = is_running.lock().await;
                if !*running {
                    log::info!("Scheduler stopped");
                    break;
                }
                drop(running);

                log::info!("Running scheduled scan...");

                // Update last scan time
                let mut last = last_scan.lock().await;
                *last = Some(chrono::Utc::now());
                drop(last);

                // Emit event to frontend
                if let Err(e) = app_handle.emit("scheduler:scan-started", ()) {
                    log::error!("Failed to emit scan-started event: {}", e);
                }

                // TODO: Trigger actual scan logic in Task 3
            }
        });
    }

    /// Stop the scheduler
    pub async fn stop(&self) {
        let mut running = self.is_running.lock().await;
        *running = false;
        log::info!("Scheduler stop requested");
    }

    /// Check if scheduler is running
    pub async fn is_running(&self) -> bool {
        *self.is_running.lock().await
    }

    /// Get last scan time
    pub async fn last_scan_time(&self) -> Option<chrono::DateTime<chrono::Utc>> {
        *self.last_scan.lock().await
    }
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}
```

**Step 2: Register scheduler module in lib.rs**

Add `mod scheduler;` after line 7 in lib.rs:

```rust
mod commands;
mod db;
mod grok;
mod grok_commands;
mod keychain;
mod models;
mod scheduler;
mod scanner;
mod scanner_commands;
```

Add the import after line 13:

```rust
use scheduler::Scheduler;
```

**Step 3: Initialize Scheduler in setup**

Add after line 45 (after scanner initialization):

```rust
// Initialize scheduler
let scheduler = Scheduler::new();
app.manage(scheduler);
```

**Step 4: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src-tauri/src/scheduler.rs src-tauri/src/lib.rs
git commit -m "feat(scheduler): create basic scheduler module structure

- Add Scheduler struct with start/stop/status methods
- Use tokio interval for periodic execution
- Register scheduler in Tauri app state

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Implement Startup Scan Logic

**Files:**
- Modify: `src-tauri/src/scheduler.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add run_startup_scan method to Scheduler**

Add this method to the Scheduler impl block in scheduler.rs:

```rust
/// Run a scan on app startup
pub async fn run_startup_scan(&self, app_handle: &AppHandle) -> Result<(), String> {
    log::info!("Running startup scan...");

    // Emit event to frontend
    if let Err(e) = app_handle.emit("scheduler:startup-scan-started", ()) {
        log::error!("Failed to emit startup-scan-started event: {}", e);
    }

    // Get database and scanner from app state
    let db = app_handle.state::<Database>();
    let scanner = app_handle.state::<GitScanner>();

    // Get all active projects
    let projects = db.get_projects().map_err(|e| format!("Failed to get projects: {}", e))?;
    let active_projects: Vec<_> = projects.iter()
        .filter(|p| p.status == crate::models::ProjectStatus::Active)
        .collect();

    log::info!("Found {} active projects to scan", active_projects.len());

    let mut scan_results = Vec::new();

    for project in active_projects {
        let path = std::path::Path::new(&project.path);

        if !scanner.is_git_repo(path) {
            log::warn!("Project {} is not a git repo, skipping", project.name);
            continue;
        }

        match scanner.get_today_diff(path) {
            Ok(mut diff) => {
                diff.project_id = project.id.clone();
                if diff.total_additions > 0 || diff.total_deletions > 0 {
                    scan_results.push((project.clone(), diff));
                }
            }
            Err(e) => {
                log::error!("Failed to scan project {}: {}", project.name, e);
            }
        }
    }

    log::info!("Startup scan complete: {} projects with changes", scan_results.len());

    // Emit scan results to frontend
    if let Err(e) = app_handle.emit("scheduler:startup-scan-complete", scan_results.len()) {
        log::error!("Failed to emit startup-scan-complete event: {}", e);
    }

    // Update last scan time
    let mut last = self.last_scan.lock().await;
    *last = Some(chrono::Utc::now());

    Ok(())
}
```

**Step 2: Call startup scan in lib.rs setup**

Add this after the scheduler initialization in lib.rs (around line 48):

```rust
// Run startup scan if enabled
let scheduler_clone = scheduler.clone();
let app_handle = app.handle().clone();
tauri::async_runtime::spawn(async move {
    // Small delay to ensure app is fully initialized
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Load settings to check if startup scan is enabled
    let db = app_handle.state::<Database>();
    let settings_json = db.get_setting("user_settings")
        .ok()
        .flatten()
        .unwrap_or_else(|| serde_json::to_string(&models::UserSettings::default()).unwrap());

    if let Ok(settings) = serde_json::from_str::<models::UserSettings>(&settings_json) {
        if settings.scan.scan_on_startup {
            if let Err(e) = scheduler_clone.run_startup_scan(&app_handle).await {
                log::error!("Startup scan failed: {}", e);
            }
        }

        // Start periodic scheduler
        scheduler_clone.start(app_handle.clone(), settings.scan).await;
    }
});
```

**Step 3: Make Scheduler Clone-able**

Add `Clone` derive to Scheduler:

```rust
#[derive(Debug, Clone)]
pub struct Scheduler {
    is_running: Arc<Mutex<bool>>,
    last_scan: Arc<Mutex<Option<chrono::DateTime<chrono::Utc>>>>,
}
```

**Step 4: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src-tauri/src/scheduler.rs src-tauri/src/lib.rs
git commit -m "feat(scheduler): implement startup scan logic

- Add run_startup_scan method to scan all active projects
- Integrate startup scan into app initialization
- Emit events for frontend tracking

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create AI Agent Module

**Files:**
- Create: `src-tauri/src/ai_agent.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Create ai_agent.rs with analysis engine**

```rust
use crate::grok::{GrokClient, GrokMessage};
use crate::models::{DailyLog, InboxItem, InboxItemType, Project, GitDiffResult};
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
            .map(|(i, todo)| crate::models::SuggestedAction {
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
            crate::models::SuggestedAction {
                id: "review".to_string(),
                label: "查看詳情".to_string(),
                icon: Some("eye".to_string()),
            },
            crate::models::SuggestedAction {
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
```

**Step 2: Register ai_agent module in lib.rs**

Add after `mod scheduler;`:

```rust
mod ai_agent;
```

Add the import:

```rust
use ai_agent::AiAgent;
```

Initialize in setup (after scheduler):

```rust
// Initialize AI Agent
let ai_agent = AiAgent::new();
app.manage(ai_agent);
```

**Step 3: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add src-tauri/src/ai_agent.rs src-tauri/src/lib.rs
git commit -m "feat(ai_agent): create AI analysis engine module

- Add AiAgent struct with daily work analysis
- Add anomaly detection for development patterns
- Create inbox item generators for AI insights

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Integrate AI Agent with Scheduler

**Files:**
- Modify: `src-tauri/src/scheduler.rs`

**Step 1: Add AI analysis to run_scheduled_scan method**

Add this method to Scheduler:

```rust
/// Run a full scheduled scan with AI analysis
pub async fn run_scheduled_scan(&self, app_handle: &AppHandle) -> Result<(), String> {
    log::info!("Running scheduled scan with AI analysis...");

    // Emit event to frontend
    if let Err(e) = app_handle.emit("scheduler:scan-started", ()) {
        log::error!("Failed to emit scan-started event: {}", e);
    }

    // Get dependencies from app state
    let db = app_handle.state::<Database>();
    let scanner = app_handle.state::<GitScanner>();
    let grok = app_handle.state::<crate::grok::GrokClient>();
    let ai_agent = app_handle.state::<crate::ai_agent::AiAgent>();

    // Get settings
    let settings_json = db.get_setting("user_settings")
        .ok()
        .flatten()
        .unwrap_or_else(|| serde_json::to_string(&crate::models::UserSettings::default()).unwrap());

    let settings: crate::models::UserSettings = serde_json::from_str(&settings_json)
        .unwrap_or_default();

    // Get all active projects
    let projects = db.get_projects().map_err(|e| format!("Failed to get projects: {}", e))?;
    let active_projects: Vec<_> = projects.iter()
        .filter(|p| p.status == crate::models::ProjectStatus::Active)
        .collect();

    log::info!("Scanning {} active projects", active_projects.len());

    let mut inbox_items_created = 0;

    for project in active_projects {
        let path = std::path::Path::new(&project.path);

        if !scanner.is_git_repo(path) {
            continue;
        }

        // Get today's diff
        let diff = match scanner.get_today_diff(path) {
            Ok(mut d) => {
                d.project_id = project.id.clone();
                d
            }
            Err(e) => {
                log::error!("Failed to scan {}: {}", project.name, e);
                continue;
            }
        };

        // Skip if no changes
        if diff.total_additions == 0 && diff.total_deletions == 0 {
            continue;
        }

        // Run AI analysis if enabled
        if settings.scan.auto_classify || settings.scan.auto_summarize {
            match ai_agent.analyze_daily_work(&grok, project, &diff).await {
                Ok(analysis) => {
                    // Create inbox item for daily summary
                    let inbox_item = ai_agent.create_daily_summary_inbox(project, &analysis);

                    if let Err(e) = db.create_inbox_item(&inbox_item) {
                        log::error!("Failed to create inbox item: {}", e);
                    } else {
                        inbox_items_created += 1;
                    }

                    // Create daily log if auto-summarize is enabled
                    if settings.scan.auto_summarize {
                        let category = match analysis.category.as_str() {
                            "feature" => crate::models::LogCategory::Feature,
                            "bugfix" => crate::models::LogCategory::Bugfix,
                            "refactor" => crate::models::LogCategory::Refactor,
                            "ui" => crate::models::LogCategory::Ui,
                            "docs" => crate::models::LogCategory::Docs,
                            "test" => crate::models::LogCategory::Test,
                            "chore" => crate::models::LogCategory::Chore,
                            _ => crate::models::LogCategory::Other,
                        };

                        let daily_log = crate::models::DailyLog {
                            id: uuid::Uuid::new_v4().to_string(),
                            project_id: project.id.clone(),
                            date: chrono::Local::now().format("%Y-%m-%d").to_string(),
                            summary: analysis.summary.clone(),
                            category,
                            files_changed: diff.files.clone(),
                            ai_classification: Some(analysis.category.clone()),
                            user_override: None,
                            created_at: chrono::Utc::now(),
                        };

                        if let Err(e) = db.create_daily_log(&daily_log) {
                            // Ignore duplicate entry errors
                            if !e.to_string().contains("UNIQUE constraint") {
                                log::error!("Failed to create daily log: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    log::error!("AI analysis failed for {}: {}", project.name, e);
                }
            }
        }
    }

    log::info!("Scheduled scan complete: {} inbox items created", inbox_items_created);

    // Emit scan complete event
    if let Err(e) = app_handle.emit("scheduler:scan-complete", inbox_items_created) {
        log::error!("Failed to emit scan-complete event: {}", e);
    }

    // Update last scan time
    let mut last = self.last_scan.lock().await;
    *last = Some(chrono::Utc::now());

    Ok(())
}
```

**Step 2: Update the scheduler loop to call run_scheduled_scan**

Modify the start method's spawn loop to call the new method:

```rust
// In the loop inside start():
tokio::spawn(async move {
    let mut ticker = interval(Duration::from_secs((interval_mins as u64) * 60));

    loop {
        ticker.tick().await;

        let running = is_running.lock().await;
        if !*running {
            log::info!("Scheduler stopped");
            break;
        }
        drop(running);

        // Create a temporary scheduler to call the method
        let temp_scheduler = Scheduler {
            is_running: is_running.clone(),
            last_scan: last_scan.clone(),
        };

        if let Err(e) = temp_scheduler.run_scheduled_scan(&app_handle).await {
            log::error!("Scheduled scan failed: {}", e);
        }
    }
});
```

**Step 3: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add src-tauri/src/scheduler.rs
git commit -m "feat(scheduler): integrate AI analysis with scheduled scans

- Add run_scheduled_scan method with full AI analysis
- Create inbox items and daily logs automatically
- Respect user settings for auto-classify and auto-summarize

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Notification Module

**Files:**
- Create: `src-tauri/src/notification.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add tauri-plugin-notification to Cargo.toml**

Add after `tauri-plugin-dialog = "2"`:

```toml
tauri-plugin-notification = "2"
```

**Step 2: Create notification.rs**

```rust
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// Notification types for different alert categories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NotificationType {
    ScanComplete,
    DailySummary,
    Anomaly,
    Reminder,
    System,
}

/// Notification payload for frontend events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPayload {
    pub notification_type: NotificationType,
    pub title: String,
    pub body: String,
    pub icon: Option<String>,
    pub action_id: Option<String>,
}

/// Unified notification service
#[derive(Debug, Clone)]
pub struct NotificationService;

impl NotificationService {
    pub fn new() -> Self {
        NotificationService
    }

    /// Send an in-app toast notification via event
    pub fn send_toast(&self, app: &AppHandle, payload: NotificationPayload) -> Result<(), String> {
        app.emit("notification:toast", &payload)
            .map_err(|e| format!("Failed to send toast: {}", e))
    }

    /// Send a system notification (macOS native)
    pub async fn send_system(&self, app: &AppHandle, payload: &NotificationPayload) -> Result<(), String> {
        // For now, we'll use the event system
        // The actual notification plugin integration will be added when we configure permissions
        log::info!("System notification: {} - {}", payload.title, payload.body);

        // Emit to frontend to handle system notification
        app.emit("notification:system", payload)
            .map_err(|e| format!("Failed to send system notification: {}", e))
    }

    /// Send both toast and system notification
    pub async fn send_both(&self, app: &AppHandle, payload: NotificationPayload) -> Result<(), String> {
        self.send_toast(app, payload.clone())?;
        self.send_system(app, &payload).await?;
        Ok(())
    }

    /// Create a scan complete notification
    pub fn scan_complete_notification(projects_scanned: usize, items_created: usize) -> NotificationPayload {
        NotificationPayload {
            notification_type: NotificationType::ScanComplete,
            title: "掃描完成".to_string(),
            body: format!("已掃描 {} 個專案，產生 {} 個待處理項目", projects_scanned, items_created),
            icon: Some("scan".to_string()),
            action_id: Some("view_inbox".to_string()),
        }
    }

    /// Create a daily summary notification
    pub fn daily_summary_notification(project_name: &str, summary: &str) -> NotificationPayload {
        NotificationPayload {
            notification_type: NotificationType::DailySummary,
            title: format!("【{}】今日摘要", project_name),
            body: summary.to_string(),
            icon: Some("file-text".to_string()),
            action_id: None,
        }
    }

    /// Create an anomaly notification
    pub fn anomaly_notification(project_name: &str, description: &str) -> NotificationPayload {
        NotificationPayload {
            notification_type: NotificationType::Anomaly,
            title: format!("⚠️ 【{}】異常偵測", project_name),
            body: description.to_string(),
            icon: Some("alert-triangle".to_string()),
            action_id: Some("view_details".to_string()),
        }
    }
}

impl Default for NotificationService {
    fn default() -> Self {
        Self::new()
    }
}
```

**Step 3: Register notification module in lib.rs**

Add `mod notification;` after `mod ai_agent;`:

```rust
mod notification;
```

Add import and initialization:

```rust
use notification::NotificationService;

// In setup, after ai_agent:
let notification_service = NotificationService::new();
app.manage(notification_service);
```

Add the notification plugin after other plugins:

```rust
.plugin(tauri_plugin_notification::init())
```

**Step 4: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 5: Commit**

```bash
git add src-tauri/src/notification.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat(notification): create unified notification service

- Add NotificationService with toast and system notification support
- Define notification types and payload structures
- Add helper methods for common notification scenarios

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Scheduler Commands

**Files:**
- Create: `src-tauri/src/scheduler_commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Create scheduler_commands.rs**

```rust
use tauri::State;
use crate::scheduler::Scheduler;
use crate::db::Database;
use crate::models::{ScanSettings, UserSettings};

/// Get scheduler status
#[tauri::command]
pub async fn get_scheduler_status(scheduler: State<'_, Scheduler>) -> Result<serde_json::Value, String> {
    let is_running = scheduler.is_running().await;
    let last_scan = scheduler.last_scan_time().await;

    Ok(serde_json::json!({
        "is_running": is_running,
        "last_scan": last_scan.map(|dt| dt.to_rfc3339())
    }))
}

/// Manually trigger a scan
#[tauri::command]
pub async fn trigger_manual_scan(
    app: tauri::AppHandle,
    scheduler: State<'_, Scheduler>,
) -> Result<(), String> {
    scheduler.run_scheduled_scan(&app).await
}

/// Update scan settings and restart scheduler if needed
#[tauri::command]
pub async fn update_scan_settings(
    app: tauri::AppHandle,
    scheduler: State<'_, Scheduler>,
    db: State<'_, Database>,
    settings: ScanSettings,
) -> Result<(), String> {
    // Get current user settings
    let settings_json = db.get_setting("user_settings")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| serde_json::to_string(&UserSettings::default()).unwrap());

    let mut user_settings: UserSettings = serde_json::from_str(&settings_json)
        .map_err(|e| e.to_string())?;

    // Update scan settings
    user_settings.scan = settings.clone();

    // Save updated settings
    let updated_json = serde_json::to_string(&user_settings)
        .map_err(|e| e.to_string())?;

    db.set_setting("user_settings", &updated_json)
        .map_err(|e| e.to_string())?;

    // Restart scheduler with new settings
    scheduler.stop().await;

    if settings.enabled {
        scheduler.start(app, settings).await;
    }

    Ok(())
}

/// Get current scan settings
#[tauri::command]
pub fn get_scan_settings(db: State<'_, Database>) -> Result<ScanSettings, String> {
    let settings_json = db.get_setting("user_settings")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| serde_json::to_string(&UserSettings::default()).unwrap());

    let user_settings: UserSettings = serde_json::from_str(&settings_json)
        .map_err(|e| e.to_string())?;

    Ok(user_settings.scan)
}
```

**Step 2: Register scheduler_commands module in lib.rs**

Add `mod scheduler_commands;` in the module declarations.

Add the commands to the invoke_handler:

```rust
// Scheduler commands
scheduler_commands::get_scheduler_status,
scheduler_commands::trigger_manual_scan,
scheduler_commands::update_scan_settings,
scheduler_commands::get_scan_settings,
```

**Step 3: Verify changes compile**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add src-tauri/src/scheduler_commands.rs src-tauri/src/lib.rs
git commit -m "feat(commands): add scheduler control commands

- Add get_scheduler_status command
- Add trigger_manual_scan command
- Add update_scan_settings and get_scan_settings commands

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Frontend Settings Store

**Files:**
- Modify: `src/stores/settingsStore.ts`

**Step 1: Add scan settings types and state**

Update the settingsStore to include scan settings:

```typescript
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface ScanSettings {
  enabled: boolean;
  interval_minutes: number;
  scan_on_startup: boolean;
  auto_classify: boolean;
  auto_summarize: boolean;
}

interface NotificationSettings {
  daily_summary: boolean;
  todo_reminder: boolean;
  stale_project: boolean;
}

interface Settings {
  notifications: NotificationSettings;
  scan: ScanSettings;
  theme: string;
  language: string;
}

interface SchedulerStatus {
  is_running: boolean;
  last_scan: string | null;
}

interface SettingsState {
  settings: Settings;
  schedulerStatus: SchedulerStatus | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  updateScanSettings: (scanSettings: ScanSettings) => Promise<void>;
  fetchSchedulerStatus: () => Promise<void>;
  triggerManualScan: () => Promise<void>;
}

const defaultSettings: Settings = {
  notifications: {
    daily_summary: true,
    todo_reminder: true,
    stale_project: false,
  },
  scan: {
    enabled: true,
    interval_minutes: 30,
    scan_on_startup: true,
    auto_classify: true,
    auto_summarize: true,
  },
  theme: 'dark',
  language: 'zh-HK',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  schedulerStatus: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await invoke<Settings>('get_settings');
      set({ settings: { ...defaultSettings, ...settings }, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  updateSettings: async (updates: Partial<Settings>) => {
    const current = get().settings;
    const newSettings = { ...current, ...updates };

    try {
      await invoke('save_settings', { settings: newSettings });
      set({ settings: newSettings });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateScanSettings: async (scanSettings: ScanSettings) => {
    try {
      await invoke('update_scan_settings', { settings: scanSettings });
      set((state) => ({
        settings: { ...state.settings, scan: scanSettings },
      }));
      // Refresh scheduler status after update
      get().fetchSchedulerStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchSchedulerStatus: async () => {
    try {
      const status = await invoke<SchedulerStatus>('get_scheduler_status');
      set({ schedulerStatus: status });
    } catch (error) {
      console.error('Failed to fetch scheduler status:', error);
    }
  },

  triggerManualScan: async () => {
    try {
      await invoke('trigger_manual_scan');
      get().fetchSchedulerStatus();
    } catch (error) {
      set({ error: String(error) });
    }
  },
}));
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck` (if available) or `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/stores/settingsStore.ts
git commit -m "feat(store): add scan settings and scheduler status to settings store

- Add ScanSettings and SchedulerStatus types
- Add updateScanSettings and fetchSchedulerStatus actions
- Add triggerManualScan action for manual scan trigger

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Enhanced Toast Component

**Files:**
- Create: `src/components/EnhancedToast.tsx`

**Step 1: Create EnhancedToast.tsx with terminal-style UI**

```tsx
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Scan,
  FileText,
  X
} from 'lucide-react';

interface NotificationPayload {
  notification_type: 'scan_complete' | 'daily_summary' | 'anomaly' | 'reminder' | 'system';
  title: string;
  body: string;
  icon?: string;
  action_id?: string;
}

interface EnhancedToast extends NotificationPayload {
  id: string;
  timestamp: Date;
}

export function EnhancedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<EnhancedToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((payload: NotificationPayload) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: EnhancedToast = {
      ...payload,
      id,
      timestamp: new Date(),
    };
    setToasts((prev) => [...prev, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  useEffect(() => {
    // Listen for toast events from Rust backend
    const unlisten = listen<NotificationPayload>('notification:toast', (event) => {
      addToast(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addToast]);

  return (
    <>
      {children}
      <EnhancedToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

function EnhancedToastContainer({
  toasts,
  onRemove,
}: {
  toasts: EnhancedToast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <EnhancedToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function EnhancedToastItem({
  toast,
  onRemove,
}: {
  toast: EnhancedToast;
  onRemove: (id: string) => void;
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = 50;
    const step = (interval / 5000) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const getIcon = () => {
    switch (toast.notification_type) {
      case 'scan_complete':
        return <Scan size={18} className="text-accent-cyan" />;
      case 'daily_summary':
        return <FileText size={18} className="text-accent-green" />;
      case 'anomaly':
        return <AlertTriangle size={18} className="text-accent-amber" />;
      case 'reminder':
        return <Info size={18} className="text-accent-violet" />;
      case 'system':
      default:
        return <CheckCircle size={18} className="text-accent-cyan" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.notification_type) {
      case 'scan_complete':
        return 'border-accent-cyan/30';
      case 'daily_summary':
        return 'border-accent-green/30';
      case 'anomaly':
        return 'border-accent-amber/30';
      case 'reminder':
        return 'border-accent-violet/30';
      case 'system':
      default:
        return 'border-accent-cyan/30';
    }
  };

  const getProgressColor = () => {
    switch (toast.notification_type) {
      case 'scan_complete':
        return 'bg-accent-cyan';
      case 'daily_summary':
        return 'bg-accent-green';
      case 'anomaly':
        return 'bg-accent-amber';
      case 'reminder':
        return 'bg-accent-violet';
      case 'system':
      default:
        return 'bg-accent-cyan';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={`
        pointer-events-auto
        bg-bg-elevated border ${getBorderColor()}
        rounded overflow-hidden
        min-w-[320px] max-w-[420px]
        font-mono
      `}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border-b border-border-subtle">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-rose/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-amber/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green/60" />
        </div>
        <span className="text-text-muted text-xs flex-1">sixarms://notification</span>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-medium truncate">
              {toast.title}
            </p>
            <p className="text-text-secondary text-xs mt-1 line-clamp-2">
              {toast.body}
            </p>
            <p className="text-text-muted text-xs mt-2">
              {toast.timestamp.toLocaleTimeString('zh-HK')}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-bg-primary">
        <motion.div
          className={`h-full ${getProgressColor()}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/EnhancedToast.tsx
git commit -m "feat(ui): create terminal-style EnhancedToast component

- Add EnhancedToastProvider with Tauri event listener
- Terminal-style window chrome with traffic lights
- Type-specific icons and colors

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update Settings Page UI

**Files:**
- Modify: `src/pages/Settings.tsx`

**Step 1: Add Scan Settings section to Settings page**

Add the following section after the existing settings (reference the existing Settings.tsx structure):

```tsx
{/* Scan Settings Section */}
<div className="card p-6">
  <h2 className="section-header text-lg mb-4">自動掃描設定</h2>

  <div className="space-y-4">
    {/* Enable Scheduler */}
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-primary">啟用自動掃描</p>
        <p className="text-text-muted text-sm">定期掃描所有專案並產生進度報告</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={settings.scan.enabled}
          onChange={(e) => updateScanSettings({ ...settings.scan, enabled: e.target.checked })}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-bg-primary rounded-full peer peer-checked:bg-accent-cyan/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-accent-cyan"></div>
      </label>
    </div>

    {/* Scan Interval */}
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-primary">掃描間隔</p>
        <p className="text-text-muted text-sm">每隔多久執行一次自動掃描</p>
      </div>
      <select
        value={settings.scan.interval_minutes}
        onChange={(e) => updateScanSettings({ ...settings.scan, interval_minutes: Number(e.target.value) })}
        className="terminal-input w-32"
        disabled={!settings.scan.enabled}
      >
        <option value={15}>15 分鐘</option>
        <option value={30}>30 分鐘</option>
        <option value={60}>1 小時</option>
        <option value={120}>2 小時</option>
      </select>
    </div>

    {/* Startup Scan */}
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-primary">啟動時掃描</p>
        <p className="text-text-muted text-sm">App 啟動時自動執行掃描</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={settings.scan.scan_on_startup}
          onChange={(e) => updateScanSettings({ ...settings.scan, scan_on_startup: e.target.checked })}
          className="sr-only peer"
          disabled={!settings.scan.enabled}
        />
        <div className="w-11 h-6 bg-bg-primary rounded-full peer peer-checked:bg-accent-cyan/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-accent-cyan disabled:opacity-50"></div>
      </label>
    </div>

    {/* Auto Classify */}
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-primary">自動分類</p>
        <p className="text-text-muted text-sm">使用 AI 自動分類改動類型</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={settings.scan.auto_classify}
          onChange={(e) => updateScanSettings({ ...settings.scan, auto_classify: e.target.checked })}
          className="sr-only peer"
          disabled={!settings.scan.enabled}
        />
        <div className="w-11 h-6 bg-bg-primary rounded-full peer peer-checked:bg-accent-cyan/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-accent-cyan disabled:opacity-50"></div>
      </label>
    </div>

    {/* Auto Summarize */}
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-primary">自動摘要</p>
        <p className="text-text-muted text-sm">自動產生每日工作摘要</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={settings.scan.auto_summarize}
          onChange={(e) => updateScanSettings({ ...settings.scan, auto_summarize: e.target.checked })}
          className="sr-only peer"
          disabled={!settings.scan.enabled}
        />
        <div className="w-11 h-6 bg-bg-primary rounded-full peer peer-checked:bg-accent-cyan/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-accent-cyan disabled:opacity-50"></div>
      </label>
    </div>

    {/* Scheduler Status */}
    {schedulerStatus && (
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${schedulerStatus.is_running ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`} />
            <span className="text-text-secondary text-sm">
              {schedulerStatus.is_running ? '排程器運行中' : '排程器已停止'}
            </span>
          </div>
          <button
            onClick={triggerManualScan}
            className="text-accent-cyan hover:text-accent-cyan/80 text-sm transition-colors"
          >
            立即掃描
          </button>
        </div>
        {schedulerStatus.last_scan && (
          <p className="text-text-muted text-xs mt-2">
            上次掃描：{new Date(schedulerStatus.last_scan).toLocaleString('zh-HK')}
          </p>
        )}
      </div>
    )}
  </div>
</div>
```

**Step 2: Import required hooks and add to component**

Make sure to import from the settings store and call the necessary hooks:

```tsx
import { useSettingsStore } from '../stores/settingsStore';

// Inside the component:
const {
  settings,
  schedulerStatus,
  updateScanSettings,
  fetchSchedulerStatus,
  triggerManualScan
} = useSettingsStore();

// Fetch scheduler status on mount
useEffect(() => {
  fetchSchedulerStatus();
}, [fetchSchedulerStatus]);
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat(ui): add scan settings section to Settings page

- Add toggle for scheduler enable/disable
- Add interval selection dropdown
- Add toggles for startup scan, auto-classify, auto-summarize
- Show scheduler status with manual scan trigger

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Integration Testing

**Files:**
- All modified files

**Step 1: Run Rust cargo check**

Run: `cd src-tauri && cargo check`
Expected: No errors

**Step 2: Run Rust cargo clippy for linting**

Run: `cd src-tauri && cargo clippy`
Expected: No errors or warnings (or acceptable ones)

**Step 3: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Run the development server**

Run: `npm run tauri dev`
Expected: App launches without errors, scheduler starts if enabled

**Step 5: Verify scheduler functionality**

1. Open Settings page
2. Verify scan settings are visible
3. Toggle scheduler on/off
4. Click "立即掃描" to trigger manual scan
5. Check console logs for scan activity

**Step 6: Final commit**

```bash
git add .
git commit -m "test: verify Phase 1 integration

- All Rust modules compile successfully
- TypeScript types are valid
- Scheduler initializes on app startup
- Manual scan trigger works

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 1 Completion Checklist

- [ ] Task 1: Data models extended with ScanSettings
- [ ] Task 2: Scheduler module created
- [ ] Task 3: Startup scan implemented
- [ ] Task 4: AI Agent module created
- [ ] Task 5: AI Agent integrated with scheduler
- [ ] Task 6: Notification module created
- [ ] Task 7: Scheduler commands added
- [ ] Task 8: Settings store updated
- [ ] Task 9: Enhanced Toast component created
- [ ] Task 10: Settings page UI updated
- [ ] Task 11: Integration testing passed

---

## Execution Notes

**Dependencies Between Tasks:**
- Tasks 1-4 can be done in sequence
- Task 5 depends on Tasks 2-4
- Task 6 can be done in parallel with Tasks 2-5
- Tasks 7-10 depend on earlier Rust tasks
- Task 11 requires all previous tasks

**Estimated Effort:**
- Tasks 1-6: Core backend work (~60% of effort)
- Tasks 7-10: Frontend integration (~30% of effort)
- Task 11: Testing and verification (~10% of effort)
