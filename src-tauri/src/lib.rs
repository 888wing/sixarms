mod ai_agent;
mod commands;
mod db;
mod grok;
mod grok_commands;
mod keychain;
mod models;
mod notification;
mod scheduler;
mod scheduler_commands;
mod scanner;
mod scanner_commands;

use ai_agent::AiAgent;
use db::Database;
use grok::GrokClient;
use keychain::Keychain;
use notification::NotificationService;
use scheduler::Scheduler;
use scanner::GitScanner;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize database
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let db = Database::new(app_data_dir).expect("Failed to initialize database");
            app.manage(db);

            // Initialize Grok client
            let grok_client = GrokClient::new();

            // Try to load API key from keychain
            let keychain = Keychain::new();
            if let Ok(Some(key)) = keychain.get_api_key() {
                let client = grok_client.clone();
                tauri::async_runtime::spawn(async move {
                    client.set_api_key(key).await;
                });
            }

            app.manage(grok_client);
            app.manage(keychain);

            // Initialize scanner
            let scanner = GitScanner::new();
            app.manage(scanner);

            // Initialize scheduler
            let scheduler = Scheduler::new();
            app.manage(scheduler.clone());

            // Initialize AI Agent
            let ai_agent = AiAgent::new();
            app.manage(ai_agent);

            // Initialize Notification Service
            let notification_service = NotificationService::new();
            app.manage(notification_service);

            // Run startup scan if enabled
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
                        if let Err(e) = scheduler.run_startup_scan(&app_handle).await {
                            log::error!("Startup scan failed: {}", e);
                        }
                    }

                    // Start periodic scheduler
                    scheduler.start(app_handle.clone(), settings.scan).await;
                }
            });

            // Setup logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register global shortcut ⌘+Shift+D (Cmd+Shift+D on macOS)
            #[cfg(desktop)]
            {
                let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyD);
                let app_handle = app.handle().clone();

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, _shortcut, event| {
                            if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                                if let Some(window) = app_handle.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(shortcut)?;
            }

            // Initialize updater plugin (desktop only)
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // Database commands
            commands::get_projects,
            commands::create_project,
            commands::create_projects_batch,
            commands::update_project_status,
            commands::delete_project,
            commands::get_daily_logs,
            commands::create_daily_log,
            commands::get_milestones,
            commands::create_milestone,
            commands::update_milestone_status,
            commands::delete_milestone,
            commands::get_todos,
            commands::create_todo,
            commands::update_todo_status,
            commands::delete_todo,
            commands::get_inbox_items,
            commands::answer_inbox_item,
            commands::create_inbox_item,
            commands::get_chat_messages,
            commands::create_chat_message,
            commands::get_settings,
            commands::save_settings,
            commands::get_activity_stats,
            commands::get_category_distribution,
            commands::health_check,
            // Grok commands
            grok_commands::set_api_key,
            grok_commands::has_api_key,
            grok_commands::delete_api_key,
            grok_commands::chat_with_grok,
            grok_commands::chat_with_grok_history,
            grok_commands::classify_with_grok,
            grok_commands::generate_summary_with_grok,
            grok_commands::send_grok_messages,
            grok_commands::chat_with_intent,
            grok_commands::execute_detected_action,
            // Scanner commands
            scanner_commands::scan_today,
            scanner_commands::scan_range,
            scanner_commands::get_uncommitted,
            scanner_commands::get_recent_commits,
            scanner_commands::get_current_branch,
            scanner_commands::is_git_repo,
            scanner_commands::format_changes,
            scanner_commands::get_git_tags,
            scanner_commands::sync_git_tags,
            scanner_commands::get_cached_tags,
            // Scheduler commands
            scheduler_commands::start_scheduler,
            scheduler_commands::stop_scheduler,
            scheduler_commands::get_scheduler_status,
            scheduler_commands::trigger_manual_scan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
