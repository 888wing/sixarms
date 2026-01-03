use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Emitter, Manager};
use crate::db::Database;
use crate::scanner::GitScanner;
use crate::models::ScanSettings;

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
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}
