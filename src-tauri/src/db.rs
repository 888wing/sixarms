use rusqlite::{Connection, Result as SqlResult, params};
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard, PoisonError};
use chrono::Utc;

use crate::models::*;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> SqlResult<Self> {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("sixarms.db");
        let conn = Connection::open(db_path)?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    /// Get a lock on the database connection, recovering from poison if needed
    fn get_conn(&self) -> Result<MutexGuard<'_, Connection>, rusqlite::Error> {
        self.conn.lock().map_err(|e: PoisonError<_>| {
            // Log the poison error but try to recover by getting the inner value
            log::warn!("Database mutex was poisoned, recovering: {}", e);
            rusqlite::Error::ExecuteReturnedResults
        }).or_else(|_| {
            // Try to recover from poison by clearing it
            match self.conn.lock() {
                Ok(guard) => Ok(guard),
                Err(poison) => Ok(poison.into_inner()),
            }
        })
    }

    fn init_schema(&self) -> SqlResult<()> {
        let conn = self.get_conn()?;

        conn.execute_batch(r#"
            -- Projects table
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Daily logs table
            CREATE TABLE IF NOT EXISTS daily_logs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                date TEXT NOT NULL,
                summary TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'other',
                files_changed TEXT NOT NULL DEFAULT '[]',
                ai_classification TEXT,
                user_override TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                UNIQUE(project_id, date)
            );

            -- Milestones table
            CREATE TABLE IF NOT EXISTS milestones (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                version TEXT,
                git_tag TEXT,
                status TEXT NOT NULL DEFAULT 'planned',
                source TEXT NOT NULL DEFAULT 'manual',
                target_date TEXT,
                completed_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- Cached Git Tags table
            CREATE TABLE IF NOT EXISTS git_tags (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                commit_hash TEXT NOT NULL,
                date TEXT NOT NULL,
                message TEXT,
                first_seen_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                UNIQUE(project_id, name)
            );

            -- Todos table
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                priority TEXT NOT NULL DEFAULT 'medium',
                status TEXT NOT NULL DEFAULT 'pending',
                due_date TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- Inbox items table
            CREATE TABLE IF NOT EXISTS inbox_items (
                id TEXT PRIMARY KEY,
                item_type TEXT NOT NULL,
                project_id TEXT,
                question TEXT NOT NULL,
                context TEXT,
                suggested_actions TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'pending',
                answer TEXT,
                created_at TEXT NOT NULL,
                answered_at TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- Chat messages table
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                actions TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- Settings table
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date ON daily_logs(project_id, date);
            CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
            CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
            CREATE INDEX IF NOT EXISTS idx_git_tags_project ON git_tags(project_id);
            CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
            CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
            CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_items(status);
            CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_messages(project_id);
        "#)?;

        // Run migrations
        self.run_migrations()?;

        Ok(())
    }

    fn run_migrations(&self) -> SqlResult<()> {
        let conn = self.get_conn()?;

        // Check if source column exists in milestones
        let has_source_column: bool = conn
            .prepare("SELECT source FROM milestones LIMIT 1")
            .is_ok();

        if !has_source_column {
            log::info!("Running migration: adding source column to milestones");
            conn.execute(
                "ALTER TABLE milestones ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'",
                [],
            )?;
        }

        Ok(())
    }

    // ============================================
    // Project Operations
    // ============================================

    pub fn create_project(&self, project: &Project) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO projects (id, name, path, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                project.id,
                project.name,
                project.path,
                serde_json::to_string(&project.status).unwrap().trim_matches('"'),
                project.created_at.to_rfc3339(),
                project.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_projects(&self) -> SqlResult<Vec<Project>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare("SELECT id, name, path, status, created_at, updated_at FROM projects ORDER BY name")?;

        let projects = stmt.query_map([], |row| {
            let status_str: String = row.get(3)?;
            let status = match status_str.as_str() {
                "active" => ProjectStatus::Active,
                "paused" => ProjectStatus::Paused,
                "archived" => ProjectStatus::Archived,
                _ => ProjectStatus::Active,
            };

            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                status,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(projects)
    }

    pub fn update_project_status(&self, id: &str, status: ProjectStatus) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "UPDATE projects SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![
                serde_json::to_string(&status).unwrap().trim_matches('"'),
                Utc::now().to_rfc3339(),
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ============================================
    // Daily Log Operations
    // ============================================

    pub fn create_daily_log(&self, log: &DailyLog) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO daily_logs (id, project_id, date, summary, category, files_changed, ai_classification, user_override, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                log.id,
                log.project_id,
                log.date,
                log.summary,
                serde_json::to_string(&log.category).unwrap().trim_matches('"'),
                serde_json::to_string(&log.files_changed).unwrap(),
                log.ai_classification,
                log.user_override,
                log.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_daily_logs(&self, project_id: Option<&str>, limit: i32) -> SqlResult<Vec<DailyLog>> {
        let conn = self.get_conn()?;

        let query = match project_id {
            Some(_) => "SELECT id, project_id, date, summary, category, files_changed, ai_classification, user_override, created_at
                        FROM daily_logs WHERE project_id = ?1 ORDER BY date DESC LIMIT ?2",
            None => "SELECT id, project_id, date, summary, category, files_changed, ai_classification, user_override, created_at
                     FROM daily_logs ORDER BY date DESC LIMIT ?1",
        };

        let mut stmt = conn.prepare(query)?;

        let logs = if let Some(pid) = project_id {
            stmt.query_map(params![pid, limit], Self::row_to_daily_log)?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(params![limit], Self::row_to_daily_log)?
                .collect::<Result<Vec<_>, _>>()?
        };

        Ok(logs)
    }

    fn row_to_daily_log(row: &rusqlite::Row) -> rusqlite::Result<DailyLog> {
        let category_str: String = row.get(4)?;
        let category = match category_str.as_str() {
            "feature" => LogCategory::Feature,
            "bugfix" => LogCategory::Bugfix,
            "refactor" => LogCategory::Refactor,
            "ui" => LogCategory::Ui,
            "docs" => LogCategory::Docs,
            "test" => LogCategory::Test,
            "chore" => LogCategory::Chore,
            _ => LogCategory::Other,
        };

        let files_json: String = row.get(5)?;
        let files_changed: Vec<FileChange> = serde_json::from_str(&files_json).unwrap_or_default();

        Ok(DailyLog {
            id: row.get(0)?,
            project_id: row.get(1)?,
            date: row.get(2)?,
            summary: row.get(3)?,
            category,
            files_changed,
            ai_classification: row.get(6)?,
            user_override: row.get(7)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }

    // ============================================
    // Milestone Operations
    // ============================================

    pub fn create_milestone(&self, milestone: &Milestone) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO milestones (id, project_id, title, description, version, git_tag, status, source, target_date, completed_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                milestone.id,
                milestone.project_id,
                milestone.title,
                milestone.description,
                milestone.version,
                milestone.git_tag,
                serde_json::to_string(&milestone.status).unwrap().trim_matches('"'),
                serde_json::to_string(&milestone.source).unwrap().trim_matches('"'),
                milestone.target_date,
                milestone.completed_at.map(|dt| dt.to_rfc3339()),
                milestone.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_milestones(&self, project_id: Option<&str>) -> SqlResult<Vec<Milestone>> {
        let conn = self.get_conn()?;

        let query = match project_id {
            Some(_) => "SELECT id, project_id, title, description, version, git_tag, status, source, target_date, completed_at, created_at
                        FROM milestones WHERE project_id = ?1 ORDER BY created_at DESC",
            None => "SELECT id, project_id, title, description, version, git_tag, status, source, target_date, completed_at, created_at
                     FROM milestones ORDER BY created_at DESC",
        };

        let mut stmt = conn.prepare(query)?;

        let milestones = if let Some(pid) = project_id {
            stmt.query_map(params![pid], Self::row_to_milestone)?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([], Self::row_to_milestone)?
                .collect::<Result<Vec<_>, _>>()?
        };

        Ok(milestones)
    }

    pub fn milestone_exists_for_tag(&self, project_id: &str, git_tag: &str) -> SqlResult<bool> {
        let conn = self.get_conn()?;
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM milestones WHERE project_id = ?1 AND git_tag = ?2",
            params![project_id, git_tag],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn update_milestone_status(&self, id: &str, status: MilestoneStatus) -> SqlResult<()> {
        let conn = self.get_conn()?;
        let completed_at = if status == MilestoneStatus::Completed {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };

        conn.execute(
            "UPDATE milestones SET status = ?1, completed_at = ?2 WHERE id = ?3",
            params![
                serde_json::to_string(&status).unwrap().trim_matches('"'),
                completed_at,
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_milestone(&self, id: &str) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM milestones WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn row_to_milestone(row: &rusqlite::Row) -> rusqlite::Result<Milestone> {
        let status_str: String = row.get(6)?;
        let status = match status_str.as_str() {
            "in_progress" => MilestoneStatus::InProgress,
            "completed" => MilestoneStatus::Completed,
            "cancelled" => MilestoneStatus::Cancelled,
            _ => MilestoneStatus::Planned,
        };

        let source_str: String = row.get(7)?;
        let source = match source_str.as_str() {
            "tag" => MilestoneSource::Tag,
            "ai" => MilestoneSource::Ai,
            _ => MilestoneSource::Manual,
        };

        Ok(Milestone {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            version: row.get(4)?,
            git_tag: row.get(5)?,
            status,
            source,
            target_date: row.get(8)?,
            completed_at: row.get::<_, Option<String>>(9)?
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }

    // ============================================
    // Git Tags Operations
    // ============================================

    pub fn upsert_git_tag(&self, tag: &CachedGitTag) -> SqlResult<bool> {
        let conn = self.get_conn()?;

        // Check if tag already exists
        let existing: Option<String> = conn
            .query_row(
                "SELECT id FROM git_tags WHERE project_id = ?1 AND name = ?2",
                params![tag.project_id, tag.name],
                |row| row.get(0),
            )
            .ok();

        if existing.is_some() {
            // Update existing tag
            conn.execute(
                "UPDATE git_tags SET commit_hash = ?1, date = ?2, message = ?3 WHERE project_id = ?4 AND name = ?5",
                params![tag.commit_hash, tag.date, tag.message, tag.project_id, tag.name],
            )?;
            Ok(false) // Not a new tag
        } else {
            // Insert new tag
            conn.execute(
                "INSERT INTO git_tags (id, project_id, name, commit_hash, date, message, first_seen_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    tag.id,
                    tag.project_id,
                    tag.name,
                    tag.commit_hash,
                    tag.date,
                    tag.message,
                    tag.first_seen_at.to_rfc3339(),
                ],
            )?;
            Ok(true) // New tag
        }
    }

    pub fn get_cached_git_tags(&self, project_id: &str) -> SqlResult<Vec<CachedGitTag>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, commit_hash, date, message, first_seen_at
             FROM git_tags WHERE project_id = ?1 ORDER BY date DESC"
        )?;

        let tags = stmt
            .query_map(params![project_id], Self::row_to_cached_git_tag)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tags)
    }

    pub fn get_all_cached_git_tags(&self) -> SqlResult<Vec<CachedGitTag>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, commit_hash, date, message, first_seen_at
             FROM git_tags ORDER BY date DESC"
        )?;

        let tags = stmt
            .query_map([], Self::row_to_cached_git_tag)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tags)
    }

    pub fn delete_git_tags_for_project(&self, project_id: &str) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM git_tags WHERE project_id = ?1", params![project_id])?;
        Ok(())
    }

    fn row_to_cached_git_tag(row: &rusqlite::Row) -> rusqlite::Result<CachedGitTag> {
        Ok(CachedGitTag {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            commit_hash: row.get(3)?,
            date: row.get(4)?,
            message: row.get(5)?,
            first_seen_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }

    // ============================================
    // Todo Operations
    // ============================================

    pub fn create_todo(&self, todo: &Todo) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO todos (id, project_id, title, description, priority, status, due_date, created_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                todo.id,
                todo.project_id,
                todo.title,
                todo.description,
                serde_json::to_string(&todo.priority).unwrap().trim_matches('"'),
                serde_json::to_string(&todo.status).unwrap().trim_matches('"'),
                todo.due_date,
                todo.created_at.to_rfc3339(),
                todo.completed_at.map(|dt| dt.to_rfc3339()),
            ],
        )?;
        Ok(())
    }

    pub fn get_todos(&self, status: Option<TodoStatus>) -> SqlResult<Vec<Todo>> {
        let conn = self.get_conn()?;

        let query = match status {
            Some(_) => "SELECT id, project_id, title, description, priority, status, due_date, created_at, completed_at
                        FROM todos WHERE status = ?1 ORDER BY created_at DESC",
            None => "SELECT id, project_id, title, description, priority, status, due_date, created_at, completed_at
                     FROM todos ORDER BY created_at DESC",
        };

        let mut stmt = conn.prepare(query)?;

        let todos = if let Some(s) = status {
            let status_str = serde_json::to_string(&s).unwrap().trim_matches('"').to_string();
            stmt.query_map(params![status_str], Self::row_to_todo)?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([], Self::row_to_todo)?
                .collect::<Result<Vec<_>, _>>()?
        };

        Ok(todos)
    }

    pub fn update_todo_status(&self, id: &str, status: TodoStatus) -> SqlResult<()> {
        let conn = self.get_conn()?;
        let completed_at = if status == TodoStatus::Completed {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };

        conn.execute(
            "UPDATE todos SET status = ?1, completed_at = ?2 WHERE id = ?3",
            params![
                serde_json::to_string(&status).unwrap().trim_matches('"'),
                completed_at,
                id,
            ],
        )?;
        Ok(())
    }

    pub fn delete_todo(&self, id: &str) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute("DELETE FROM todos WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn row_to_todo(row: &rusqlite::Row) -> rusqlite::Result<Todo> {
        let priority_str: String = row.get(4)?;
        let priority = match priority_str.as_str() {
            "low" => TodoPriority::Low,
            "high" => TodoPriority::High,
            "urgent" => TodoPriority::Urgent,
            _ => TodoPriority::Medium,
        };

        let status_str: String = row.get(5)?;
        let status = match status_str.as_str() {
            "in_progress" => TodoStatus::InProgress,
            "completed" => TodoStatus::Completed,
            "cancelled" => TodoStatus::Cancelled,
            _ => TodoStatus::Pending,
        };

        Ok(Todo {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            priority,
            status,
            due_date: row.get(6)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            completed_at: row.get::<_, Option<String>>(8)?
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
        })
    }

    // ============================================
    // Inbox Operations
    // ============================================

    pub fn create_inbox_item(&self, item: &InboxItem) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO inbox_items (id, item_type, project_id, question, context, suggested_actions, status, answer, created_at, answered_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                item.id,
                serde_json::to_string(&item.item_type).unwrap().trim_matches('"'),
                item.project_id,
                item.question,
                item.context,
                serde_json::to_string(&item.suggested_actions).unwrap(),
                serde_json::to_string(&item.status).unwrap().trim_matches('"'),
                item.answer,
                item.created_at.to_rfc3339(),
                item.answered_at.map(|dt| dt.to_rfc3339()),
            ],
        )?;
        Ok(())
    }

    pub fn get_inbox_items(&self, status: Option<InboxStatus>) -> SqlResult<Vec<InboxItem>> {
        let conn = self.get_conn()?;

        let query = match status {
            Some(_) => "SELECT id, item_type, project_id, question, context, suggested_actions, status, answer, created_at, answered_at
                        FROM inbox_items WHERE status = ?1 ORDER BY created_at DESC",
            None => "SELECT id, item_type, project_id, question, context, suggested_actions, status, answer, created_at, answered_at
                     FROM inbox_items ORDER BY created_at DESC",
        };

        let mut stmt = conn.prepare(query)?;

        let items = if let Some(s) = status {
            let status_str = serde_json::to_string(&s).unwrap().trim_matches('"').to_string();
            stmt.query_map(params![status_str], Self::row_to_inbox_item)?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map([], Self::row_to_inbox_item)?
                .collect::<Result<Vec<_>, _>>()?
        };

        Ok(items)
    }

    pub fn answer_inbox_item(&self, id: &str, answer: &str) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "UPDATE inbox_items SET status = 'answered', answer = ?1, answered_at = ?2 WHERE id = ?3",
            params![answer, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    fn row_to_inbox_item(row: &rusqlite::Row) -> rusqlite::Result<InboxItem> {
        let item_type_str: String = row.get(1)?;
        let item_type = match item_type_str.as_str() {
            "daily_summary" => InboxItemType::DailySummary,
            "classification" => InboxItemType::Classification,
            "todo_followup" => InboxItemType::TodoFollowup,
            "planning" => InboxItemType::Planning,
            _ => InboxItemType::StaleProject,
        };

        let status_str: String = row.get(6)?;
        let status = match status_str.as_str() {
            "answered" => InboxStatus::Answered,
            "skipped" => InboxStatus::Skipped,
            _ => InboxStatus::Pending,
        };

        let actions_json: String = row.get(5)?;
        let suggested_actions: Vec<SuggestedAction> = serde_json::from_str(&actions_json).unwrap_or_default();

        Ok(InboxItem {
            id: row.get(0)?,
            item_type,
            project_id: row.get(2)?,
            question: row.get(3)?,
            context: row.get(4)?,
            suggested_actions,
            detected_actions: Vec::new(), // AI-detected actions are generated at runtime
            status,
            answer: row.get(7)?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            answered_at: row.get::<_, Option<String>>(9)?
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
        })
    }

    // ============================================
    // Chat Operations
    // ============================================

    pub fn create_chat_message(&self, message: &ChatMessage) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT INTO chat_messages (id, project_id, role, content, actions, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                message.id,
                message.project_id,
                serde_json::to_string(&message.role).unwrap().trim_matches('"'),
                message.content,
                message.actions.as_ref().map(|a| serde_json::to_string(a).unwrap()),
                message.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_chat_messages(&self, project_id: Option<&str>, limit: i32) -> SqlResult<Vec<ChatMessage>> {
        let conn = self.get_conn()?;

        let query = match project_id {
            Some(_) => "SELECT id, project_id, role, content, actions, created_at
                        FROM chat_messages WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
            None => "SELECT id, project_id, role, content, actions, created_at
                     FROM chat_messages ORDER BY created_at DESC LIMIT ?1",
        };

        let mut stmt = conn.prepare(query)?;

        let messages = if let Some(pid) = project_id {
            stmt.query_map(params![pid, limit], Self::row_to_chat_message)?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(params![limit], Self::row_to_chat_message)?
                .collect::<Result<Vec<_>, _>>()?
        };

        Ok(messages)
    }

    fn row_to_chat_message(row: &rusqlite::Row) -> rusqlite::Result<ChatMessage> {
        let role_str: String = row.get(2)?;
        let role = match role_str.as_str() {
            "user" => ChatRole::User,
            "system" => ChatRole::System,
            _ => ChatRole::Assistant,
        };

        let actions: Option<ChatAction> = row.get::<_, Option<String>>(4)?
            .and_then(|s| serde_json::from_str(&s).ok());

        Ok(ChatMessage {
            id: row.get(0)?,
            project_id: row.get(1)?,
            role,
            content: row.get(3)?,
            actions,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }

    // ============================================
    // Settings Operations
    // ============================================

    pub fn get_setting(&self, key: &str) -> SqlResult<Option<String>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let result = stmt.query_row(params![key], |row| row.get(0));

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> SqlResult<()> {
        let conn = self.get_conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    // ============================================
    // Statistics Operations
    // ============================================

    pub fn get_activity_stats(&self, days: i32) -> SqlResult<Vec<(String, i32)>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare(
            "SELECT date, COUNT(*) as count FROM daily_logs
             WHERE date >= date('now', ?1)
             GROUP BY date ORDER BY date"
        )?;

        let days_param = format!("-{} days", days);
        let stats = stmt.query_map(params![days_param], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(stats)
    }

    pub fn get_category_distribution(&self) -> SqlResult<Vec<(String, i32)>> {
        let conn = self.get_conn()?;
        let mut stmt = conn.prepare(
            "SELECT category, COUNT(*) as count FROM daily_logs
             GROUP BY category ORDER BY count DESC"
        )?;

        let distribution = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(distribution)
    }
}
