use std::path::PathBuf;
use tauri::State;
use crate::db::Database;
use crate::scanner::GitScanner;
use crate::models::{FileChange, GitDiffResult, GitTag, CachedGitTag, TagSyncResult, Milestone};

#[tauri::command]
pub fn scan_today(scanner: State<GitScanner>, repo_path: String) -> Result<GitDiffResult, String> {
    let path = PathBuf::from(repo_path);
    scanner.get_today_diff(&path)
}

#[tauri::command]
pub fn scan_range(
    scanner: State<GitScanner>,
    repo_path: String,
    since: String,
    until: Option<String>,
) -> Result<GitDiffResult, String> {
    let path = PathBuf::from(repo_path);
    scanner.get_diff_for_range(&path, &since, until.as_deref())
}

#[tauri::command]
pub fn get_uncommitted(scanner: State<GitScanner>, repo_path: String) -> Result<Vec<FileChange>, String> {
    let path = PathBuf::from(repo_path);
    scanner.get_uncommitted_changes(&path)
}

#[tauri::command]
pub fn get_recent_commits(
    scanner: State<GitScanner>,
    repo_path: String,
    count: Option<usize>,
) -> Result<Vec<String>, String> {
    let path = PathBuf::from(repo_path);
    let count = count.unwrap_or(10);
    scanner.get_recent_commits(&path, count)
}

#[tauri::command]
pub fn get_current_branch(scanner: State<GitScanner>, repo_path: String) -> Result<String, String> {
    let path = PathBuf::from(repo_path);
    scanner.get_current_branch(&path)
}

#[tauri::command]
pub fn is_git_repo(scanner: State<GitScanner>, repo_path: String) -> Result<bool, String> {
    let path = PathBuf::from(repo_path);
    Ok(scanner.is_git_repo(&path))
}

#[tauri::command]
pub fn format_changes(scanner: State<GitScanner>, files: Vec<FileChange>) -> Result<String, String> {
    Ok(scanner.format_changes_for_display(&files))
}

#[tauri::command]
pub fn get_git_tags(scanner: State<GitScanner>, repo_path: String) -> Result<Vec<GitTag>, String> {
    let path = PathBuf::from(repo_path);
    scanner.get_git_tags(&path)
}

/// Sync git tags from repository to database
/// Returns information about new tags discovered
#[tauri::command]
pub fn sync_git_tags(
    scanner: State<GitScanner>,
    db: State<Database>,
    project_id: String,
    repo_path: String,
    auto_create_milestones: bool,
) -> Result<TagSyncResult, String> {
    let path = PathBuf::from(&repo_path);

    // Get tags from git
    let git_tags = scanner.get_git_tags(&path)?;

    let mut new_tags: Vec<CachedGitTag> = Vec::new();

    // Sync each tag to database
    for tag in &git_tags {
        let cached_tag = CachedGitTag::from_git_tag(project_id.clone(), tag);

        let is_new = db
            .upsert_git_tag(&cached_tag)
            .map_err(|e| format!("Failed to upsert tag: {}", e))?;

        if is_new {
            new_tags.push(cached_tag.clone());

            // Auto-create milestone if enabled
            if auto_create_milestones {
                // Check if milestone already exists for this tag
                let exists = db
                    .milestone_exists_for_tag(&project_id, &tag.name)
                    .map_err(|e| format!("Failed to check milestone: {}", e))?;

                if !exists {
                    let milestone = Milestone::from_tag(project_id.clone(), &cached_tag);
                    if let Err(e) = db.create_milestone(&milestone) {
                        log::warn!("Failed to create milestone for tag {}: {}", tag.name, e);
                    } else {
                        log::info!("Auto-created milestone for tag: {}", tag.name);
                    }
                }
            }
        }
    }

    Ok(TagSyncResult {
        project_id,
        total_tags: git_tags.len(),
        new_tags,
    })
}

/// Get cached git tags from database
#[tauri::command]
pub fn get_cached_tags(
    db: State<Database>,
    project_id: Option<String>,
) -> Result<Vec<CachedGitTag>, String> {
    match project_id {
        Some(pid) => db
            .get_cached_git_tags(&pid)
            .map_err(|e| format!("Failed to get cached tags: {}", e)),
        None => db
            .get_all_cached_git_tags()
            .map_err(|e| format!("Failed to get all cached tags: {}", e)),
    }
}
