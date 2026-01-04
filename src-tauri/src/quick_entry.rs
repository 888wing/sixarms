// Quick Entry module for the floating input window
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Create the Quick Entry window (hidden by default)
pub fn create_quick_entry_window(app: &AppHandle) -> Result<(), String> {
    // Check if window already exists
    if app.get_webview_window("quick-entry").is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        "quick-entry",
        WebviewUrl::App("quick-entry.html".into()),
    )
    .title("Quick Entry")
    .inner_size(500.0, 320.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .center()
    .visible(false)
    .skip_taskbar(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Toggle Quick Entry window visibility
pub fn toggle_quick_entry(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("quick-entry") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.center().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    } else {
        create_quick_entry_window(app)?;
        if let Some(window) = app.get_webview_window("quick-entry") {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Tauri command to show/toggle Quick Entry window
#[tauri::command]
pub fn show_quick_entry(app: AppHandle) -> Result<(), String> {
    toggle_quick_entry(&app)
}

/// Tauri command to hide Quick Entry window
#[tauri::command]
pub fn hide_quick_entry(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("quick-entry") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
