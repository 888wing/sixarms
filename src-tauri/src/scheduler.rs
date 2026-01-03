use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Emitter};
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
}

impl Default for Scheduler {
    fn default() -> Self {
        Self::new()
    }
}
