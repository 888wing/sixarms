use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Emitter, Manager};
use crate::ai_agent::AiAgent;
use crate::db::Database;
use crate::grok::GrokClient;
use crate::scanner::GitScanner;
use crate::models::{ScanSettings, UserSettings, LogCategory, DailyLog};

/// Scheduler state for managing periodic scans
#[derive(Debug, Clone)]
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
        let grok = app_handle.state::<GrokClient>();
        let ai_agent = app_handle.state::<AiAgent>();

        // Get settings
        let settings_json = db.get_setting("user_settings")
            .ok()
            .flatten()
            .unwrap_or_else(|| serde_json::to_string(&UserSettings::default()).unwrap());

        let settings: UserSettings = serde_json::from_str(&settings_json)
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
                                "feature" => LogCategory::Feature,
                                "bugfix" => LogCategory::Bugfix,
                                "refactor" => LogCategory::Refactor,
                                "ui" => LogCategory::Ui,
                                "docs" => LogCategory::Docs,
                                "test" => LogCategory::Test,
                                "chore" => LogCategory::Chore,
                                _ => LogCategory::Other,
                            };

                            let daily_log = DailyLog {
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
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}
