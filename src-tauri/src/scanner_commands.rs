use std::path::PathBuf;
use tauri::State;
use crate::scanner::GitScanner;
use crate::models::{FileChange, GitDiffResult};

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
