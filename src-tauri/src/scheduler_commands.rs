use tauri::State;
use crate::scheduler::Scheduler;
use crate::models::ScanSettings;

/// Start the scheduler with given settings
#[tauri::command]
pub async fn start_scheduler(
    scheduler: State<'_, Scheduler>,
    app_handle: tauri::AppHandle,
    settings: ScanSettings,
) -> Result<(), String> {
    scheduler.start(app_handle, settings).await;
    Ok(())
}

/// Stop the scheduler
#[tauri::command]
pub async fn stop_scheduler(scheduler: State<'_, Scheduler>) -> Result<(), String> {
    scheduler.stop().await;
    Ok(())
}

/// Get scheduler status
#[tauri::command]
pub async fn get_scheduler_status(scheduler: State<'_, Scheduler>) -> Result<SchedulerStatus, String> {
    let is_running = scheduler.is_running().await;
    let last_scan = scheduler.last_scan_time().await;

    Ok(SchedulerStatus {
        is_running,
        last_scan: last_scan.map(|t| t.to_rfc3339()),
    })
}

/// Trigger a manual scan
#[tauri::command]
pub async fn trigger_manual_scan(
    scheduler: State<'_, Scheduler>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    scheduler.run_scheduled_scan(&app_handle).await
}

/// Scheduler status response
#[derive(serde::Serialize)]
pub struct SchedulerStatus {
    pub is_running: bool,
    pub last_scan: Option<String>,
}
