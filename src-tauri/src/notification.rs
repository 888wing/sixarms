use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Notification service for system notifications
#[derive(Debug, Clone)]
pub struct NotificationService;

impl NotificationService {
    pub fn new() -> Self {
        NotificationService
    }

    /// Send a scan complete notification
    pub fn notify_scan_complete(&self, app: &AppHandle, projects_scanned: usize, items_created: usize) {
        let title = "Sixarms 掃描完成";
        let body = if items_created > 0 {
            format!("已掃描 {} 個專案，建立 {} 個收件箱項目", projects_scanned, items_created)
        } else {
            format!("已掃描 {} 個專案，無新改動", projects_scanned)
        };

        if let Err(e) = app.notification()
            .builder()
            .title(title)
            .body(&body)
            .show()
        {
            log::error!("Failed to show notification: {}", e);
        }
    }

    /// Send an anomaly detected notification
    pub fn notify_anomaly(&self, app: &AppHandle, project_name: &str, description: &str) {
        let title = format!("Sixarms 偵測到異常");
        let body = format!("【{}】{}", project_name, description);

        if let Err(e) = app.notification()
            .builder()
            .title(&title)
            .body(&body)
            .show()
        {
            log::error!("Failed to show anomaly notification: {}", e);
        }
    }

    /// Send a daily summary notification
    pub fn notify_daily_summary(&self, app: &AppHandle, project_name: &str, summary: &str) {
        let title = format!("Sixarms 每日摘要");
        let body = format!("【{}】{}", project_name, summary);

        if let Err(e) = app.notification()
            .builder()
            .title(&title)
            .body(&body)
            .show()
        {
            log::error!("Failed to show daily summary notification: {}", e);
        }
    }

    /// Send a generic notification
    pub fn notify(&self, app: &AppHandle, title: &str, body: &str) {
        if let Err(e) = app.notification()
            .builder()
            .title(title)
            .body(body)
            .show()
        {
            log::error!("Failed to show notification: {}", e);
        }
    }
}

impl Default for NotificationService {
    fn default() -> Self {
        Self::new()
    }
}
