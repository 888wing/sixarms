// Slash Commands module - Chat command parser and executor
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::models::{Todo, TodoStatus, TodoPriority, ProjectStatus};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SlashCommand {
    // Query commands
    Status,
    Todo { filter: Option<String> },
    Stats { period: String },
    Plan,

    // Action commands
    Add { task: String },
    Done { identifier: String },
    Scan { project_id: Option<String> },

    // System commands
    Project { name: String },
    Projects,
    Help,

    // Unknown command
    Unknown { input: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub command: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

/// Parse a slash command from user input
pub fn parse_command(input: &str) -> Option<SlashCommand> {
    let input = input.trim();
    if !input.starts_with('/') {
        return None;
    }

    let parts: Vec<&str> = input[1..].splitn(2, ' ').collect();
    let cmd = parts[0].to_lowercase();
    let args = parts.get(1).map(|s| s.trim().to_string());

    match cmd.as_str() {
        "status" => Some(SlashCommand::Status),
        "todo" | "todos" => Some(SlashCommand::Todo { filter: args }),
        "stats" => Some(SlashCommand::Stats {
            period: args.unwrap_or_else(|| "week".to_string())
        }),
        "plan" => Some(SlashCommand::Plan),
        "add" => args.map(|task| SlashCommand::Add { task }),
        "done" => args.map(|identifier| SlashCommand::Done { identifier }),
        "scan" => Some(SlashCommand::Scan { project_id: args }),
        "project" => args.map(|name| SlashCommand::Project { name }),
        "projects" => Some(SlashCommand::Projects),
        "help" | "h" | "?" => Some(SlashCommand::Help),
        _ => Some(SlashCommand::Unknown { input: input.to_string() }),
    }
}

/// Generate help text for slash commands
pub fn get_help_text() -> String {
    r#"Query Commands
  /status          Today's work progress summary
  /todo [filter]   Show TODO list
  /stats [period]  Statistics (week/month/year)
  /plan            Weekly plan overview

Action Commands
  /add <task>      Add new TODO
  /done <id|name>  Mark as complete
  /scan [project]  Trigger manual scan

System Commands
  /project <name>  Switch current project
  /projects        List all projects
  /help            Show this help"#.to_string()
}

/// Execute a slash command
pub fn execute_command(
    command: SlashCommand,
    db: &Database,
    selected_project_id: Option<&str>,
) -> CommandResult {
    match command {
        SlashCommand::Help => CommandResult {
            success: true,
            command: "/help".to_string(),
            message: get_help_text(),
            data: None,
        },

        SlashCommand::Status => {
            match get_status_summary(db, selected_project_id) {
                Ok(summary) => {
                    let msg = summary.message.clone();
                    CommandResult {
                        success: true,
                        command: "/status".to_string(),
                        message: msg,
                        data: Some(serde_json::to_value(&summary).unwrap()),
                    }
                }
                Err(e) => CommandResult {
                    success: false,
                    command: "/status".to_string(),
                    message: format!("Failed to get status: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Todo { filter } => {
            match db.get_todos(None) {
                Ok(todos) => {
                    // Apply filter if provided
                    let filtered: Vec<&Todo> = if let Some(ref f) = filter {
                        let f_lower = f.to_lowercase();
                        todos.iter().filter(|t| {
                            t.title.to_lowercase().contains(&f_lower) ||
                            format!("{:?}", t.status).to_lowercase().contains(&f_lower)
                        }).collect()
                    } else {
                        todos.iter().collect()
                    };

                    // Filter by project if selected
                    let project_filtered: Vec<&Todo> = if let Some(pid) = selected_project_id {
                        filtered.into_iter().filter(|t| {
                            t.project_id.as_deref() == Some(pid)
                        }).collect()
                    } else {
                        filtered
                    };

                    let count = project_filtered.len();
                    let pending = project_filtered.iter().filter(|t| t.status == TodoStatus::Pending).count();
                    let in_progress = project_filtered.iter().filter(|t| t.status == TodoStatus::InProgress).count();

                    CommandResult {
                        success: true,
                        command: "/todo".to_string(),
                        message: format!("{} TODOs ({} pending, {} in progress)", count, pending, in_progress),
                        data: Some(serde_json::to_value(&project_filtered).unwrap()),
                    }
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/todo".to_string(),
                    message: format!("Failed to get TODOs: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Projects => {
            match db.get_projects() {
                Ok(projects) => {
                    let active = projects.iter().filter(|p| p.status == ProjectStatus::Active).count();
                    CommandResult {
                        success: true,
                        command: "/projects".to_string(),
                        message: format!("{} projects ({} active)", projects.len(), active),
                        data: Some(serde_json::to_value(&projects).unwrap()),
                    }
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/projects".to_string(),
                    message: format!("Failed to get projects: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Add { task } => {
            // Create a new Todo object
            let mut new_todo = Todo::new(task.clone(), selected_project_id.map(|s| s.to_string()));
            new_todo.priority = TodoPriority::Medium;

            match db.create_todo(&new_todo) {
                Ok(()) => CommandResult {
                    success: true,
                    command: "/add".to_string(),
                    message: format!("Added TODO: {}", task),
                    data: Some(serde_json::to_value(&new_todo).unwrap()),
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/add".to_string(),
                    message: format!("Failed to add: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Unknown { input } => CommandResult {
            success: false,
            command: input.clone(),
            message: format!("Unknown command: {}. Type /help for available commands.", input),
            data: None,
        },

        // Other commands - return "in development"
        _ => CommandResult {
            success: false,
            command: format!("{:?}", command),
            message: "This feature is in development".to_string(),
            data: None,
        },
    }
}

#[derive(Serialize)]
struct StatusSummary {
    message: String,
    todo_pending: usize,
    todo_in_progress: usize,
    todo_completed_today: usize,
    active_projects: usize,
}

fn get_status_summary(db: &Database, project_id: Option<&str>) -> Result<StatusSummary, String> {
    let todos = db.get_todos(None).map_err(|e| e.to_string())?;
    let projects = db.get_projects().map_err(|e| e.to_string())?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Filter by project if selected
    let filtered_todos: Vec<&Todo> = if let Some(pid) = project_id {
        todos.iter().filter(|t| t.project_id.as_deref() == Some(pid)).collect()
    } else {
        todos.iter().collect()
    };

    let pending = filtered_todos.iter().filter(|t| t.status == TodoStatus::Pending).count();
    let in_progress = filtered_todos.iter().filter(|t| t.status == TodoStatus::InProgress).count();
    let completed_today = filtered_todos.iter()
        .filter(|t| {
            t.status == TodoStatus::Completed &&
            t.completed_at
                .as_ref()
                .map(|d| d.format("%Y-%m-%d").to_string().starts_with(&today))
                .unwrap_or(false)
        })
        .count();
    let active = projects.iter().filter(|p| p.status == ProjectStatus::Active).count();

    Ok(StatusSummary {
        message: format!(
            "Today's Status\nPending: {} | In Progress: {} | Completed Today: {}\nActive Projects: {}",
            pending, in_progress, completed_today, active
        ),
        todo_pending: pending,
        todo_in_progress: in_progress,
        todo_completed_today: completed_today,
        active_projects: active,
    })
}

/// Tauri command to execute a slash command
#[tauri::command]
pub fn execute_slash_command(
    db: State<Database>,
    input: String,
    project_id: Option<String>,
) -> CommandResult {
    match parse_command(&input) {
        Some(cmd) => execute_command(cmd, &db, project_id.as_deref()),
        None => CommandResult {
            success: false,
            command: input,
            message: "Not a valid slash command".to_string(),
            data: None,
        },
    }
}
