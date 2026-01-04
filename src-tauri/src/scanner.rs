use std::path::Path;
use std::process::Command;
use regex::Regex;
use crate::models::{FileChange, GitDiffResult, GitTag};

pub struct GitScanner;

impl GitScanner {
    pub fn new() -> Self {
        GitScanner
    }

    /// Validate and sanitize a path for git operations
    /// Returns the canonicalized path if valid, or an error
    fn validate_path(&self, path: &Path) -> Result<std::path::PathBuf, String> {
        // Check path exists
        if !path.exists() {
            return Err(format!("Path does not exist: {:?}", path));
        }

        // Check it's a directory
        if !path.is_dir() {
            return Err(format!("Path is not a directory: {:?}", path));
        }

        // Canonicalize to resolve symlinks and get absolute path
        let canonical = path.canonicalize()
            .map_err(|e| format!("Failed to resolve path: {}", e))?;

        // Check for shell metacharacters in path string
        let path_str = canonical.to_string_lossy();
        let dangerous_chars = ['`', '$', '|', '&', ';', '>', '<', '(', ')', '{', '}', '[', ']', '!', '\n', '\r'];
        for c in dangerous_chars {
            if path_str.contains(c) {
                return Err(format!("Path contains invalid character: {}", c));
            }
        }

        Ok(canonical)
    }

    /// Validate date format (YYYY-MM-DD or relative formats like "midnight")
    fn validate_date_param(&self, date: &str) -> Result<(), String> {
        // Allow common git date formats
        let valid_patterns = [
            r"^\d{4}-\d{2}-\d{2}$",           // YYYY-MM-DD
            r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", // YYYY-MM-DD HH:MM:SS
            r"^midnight$",                     // relative
            r"^\d+ (day|week|month|year)s? ago$", // relative
            r"^yesterday$",                    // relative
            r"^today$",                        // relative
        ];

        for pattern in valid_patterns {
            let re = Regex::new(pattern).unwrap();
            if re.is_match(date) {
                return Ok(());
            }
        }

        // Check for dangerous characters
        let dangerous_chars = ['`', '$', '|', '&', ';', '>', '<', '(', ')', '{', '}', '!', '\n', '\r'];
        for c in dangerous_chars {
            if date.contains(c) {
                return Err(format!("Date parameter contains invalid character: {}", c));
            }
        }

        // If no dangerous chars and reasonable length, allow it
        if date.len() > 50 {
            return Err("Date parameter too long".to_string());
        }

        Ok(())
    }

    /// Check if a directory is a git repository
    pub fn is_git_repo(&self, path: &Path) -> bool {
        path.join(".git").exists()
    }

    /// Get the diff stats for today
    pub fn get_today_diff(&self, repo_path: &Path) -> Result<GitDiffResult, String> {
        // Validate and sanitize the path
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        // Get today's date in the format git expects
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        // Get diff stats for today
        let output = Command::new("git")
            .args([
                "log",
                "--since=midnight",
                "--numstat",
                "--pretty=format:",
                "--no-merges",
            ])
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let files = self.parse_numstat(&stdout);

        let total_additions: i32 = files.iter().map(|f| f.additions).sum();
        let total_deletions: i32 = files.iter().map(|f| f.deletions).sum();

        Ok(GitDiffResult {
            project_id: String::new(), // Will be set by caller
            date: today,
            files,
            total_additions,
            total_deletions,
        })
    }

    /// Get diff stats for a specific date range
    pub fn get_diff_for_range(
        &self,
        repo_path: &Path,
        since: &str,
        until: Option<&str>,
    ) -> Result<GitDiffResult, String> {
        // Validate and sanitize the path
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        // Validate date parameters
        self.validate_date_param(since)?;
        if let Some(u) = until {
            self.validate_date_param(u)?;
        }

        let mut args = vec![
            "log".to_string(),
            format!("--since={}", since),
            "--numstat".to_string(),
            "--pretty=format:".to_string(),
            "--no-merges".to_string(),
        ];

        if let Some(u) = until {
            args.push(format!("--until={}", u));
        }

        let output = Command::new("git")
            .args(&args)
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let files = self.parse_numstat(&stdout);

        let total_additions: i32 = files.iter().map(|f| f.additions).sum();
        let total_deletions: i32 = files.iter().map(|f| f.deletions).sum();

        Ok(GitDiffResult {
            project_id: String::new(),
            date: since.to_string(),
            files,
            total_additions,
            total_deletions,
        })
    }

    /// Get the last commit message
    pub fn get_last_commit_message(&self, repo_path: &Path) -> Result<String, String> {
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        let output = Command::new("git")
            .args(["log", "-1", "--pretty=%B"])
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    /// Get recent commit subjects (for context)
    pub fn get_recent_commits(&self, repo_path: &Path, count: usize) -> Result<Vec<String>, String> {
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        // Limit count to reasonable range
        let safe_count = count.min(100);

        let output = Command::new("git")
            .args([
                "log",
                &format!("-{}", safe_count),
                "--pretty=format:%s",
                "--no-merges",
            ])
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.lines().map(|s| s.to_string()).collect())
    }

    /// Get the current branch name
    pub fn get_current_branch(&self, repo_path: &Path) -> Result<String, String> {
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        let output = Command::new("git")
            .args(["rev-parse", "--abbrev-ref", "HEAD"])
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    /// Get uncommitted changes
    pub fn get_uncommitted_changes(&self, repo_path: &Path) -> Result<Vec<FileChange>, String> {
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        let output = Command::new("git")
            .args(["diff", "--numstat"])
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(self.parse_numstat(&stdout))
    }

    /// Get all git tags for a repository
    pub fn get_git_tags(&self, repo_path: &Path) -> Result<Vec<GitTag>, String> {
        let safe_path = self.validate_path(repo_path)?;

        if !self.is_git_repo(&safe_path) {
            return Err("Not a git repository".to_string());
        }

        // Get tags with commit info: tag_name, commit_hash, date, message
        let output = Command::new("git")
            .args([
                "tag",
                "-l",
                "--format=%(refname:short)|||%(objectname:short)|||%(creatordate:iso-strict)|||%(contents:subject)",
                "--sort=-creatordate",
            ])
            .current_dir(&safe_path)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output.status.success() {
            return Err("Git command failed".to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let tags: Vec<GitTag> = stdout
            .lines()
            .filter(|line| !line.trim().is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split("|||").collect();
                if parts.len() >= 3 {
                    Some(GitTag {
                        name: parts[0].trim().to_string(),
                        commit_hash: parts[1].trim().to_string(),
                        date: parts[2].trim().to_string(),
                        message: parts.get(3).map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
                    })
                } else {
                    None
                }
            })
            .collect();

        Ok(tags)
    }

    /// Parse git numstat output into FileChange structs
    fn parse_numstat(&self, output: &str) -> Vec<FileChange> {
        output
            .lines()
            .filter(|line| !line.trim().is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let additions = parts[0].parse().unwrap_or(0);
                    let deletions = parts[1].parse().unwrap_or(0);
                    let path = parts[2..].join(" ");

                    Some(FileChange {
                        path,
                        additions,
                        deletions,
                    })
                } else {
                    None
                }
            })
            .collect()
    }

    /// Format file changes for display
    pub fn format_changes_for_display(&self, files: &[FileChange]) -> String {
        files
            .iter()
            .map(|f| {
                let change_indicator = if f.additions > 0 && f.deletions > 0 {
                    format!("[+{}/-{}]", f.additions, f.deletions)
                } else if f.additions > 0 {
                    format!("[+{}]", f.additions)
                } else if f.deletions > 0 {
                    format!("[-{}]", f.deletions)
                } else {
                    String::new()
                };
                format!("{} {}", change_indicator, f.path)
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

impl Default for GitScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_parse_numstat() {
        let scanner = GitScanner::new();
        let output = "10\t5\tfile1.rs\n20\t0\tfile2.rs\n0\t3\tfile3.rs";
        let files = scanner.parse_numstat(output);

        assert_eq!(files.len(), 3);
        assert_eq!(files[0].path, "file1.rs");
        assert_eq!(files[0].additions, 10);
        assert_eq!(files[0].deletions, 5);
    }

    #[test]
    fn test_parse_numstat_empty() {
        let scanner = GitScanner::new();
        let output = "";
        let files = scanner.parse_numstat(output);
        assert!(files.is_empty());
    }

    #[test]
    fn test_parse_numstat_with_spaces_in_path() {
        let scanner = GitScanner::new();
        let output = "5\t2\tpath with spaces.rs";
        let files = scanner.parse_numstat(output);

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "path with spaces.rs");
    }

    #[test]
    fn test_validate_date_param_valid() {
        let scanner = GitScanner::new();

        // Valid date formats
        assert!(scanner.validate_date_param("2024-01-15").is_ok());
        assert!(scanner.validate_date_param("midnight").is_ok());
        assert!(scanner.validate_date_param("yesterday").is_ok());
        assert!(scanner.validate_date_param("today").is_ok());
        assert!(scanner.validate_date_param("1 day ago").is_ok());
        assert!(scanner.validate_date_param("7 days ago").is_ok());
        assert!(scanner.validate_date_param("1 week ago").is_ok());
        assert!(scanner.validate_date_param("2 months ago").is_ok());
    }

    #[test]
    fn test_validate_date_param_invalid() {
        let scanner = GitScanner::new();

        // Invalid - contains dangerous characters
        assert!(scanner.validate_date_param("2024-01-15; rm -rf /").is_err());
        assert!(scanner.validate_date_param("$(whoami)").is_err());
        assert!(scanner.validate_date_param("`date`").is_err());
        assert!(scanner.validate_date_param("2024-01-15 | cat").is_err());
    }

    #[test]
    fn test_validate_date_param_too_long() {
        let scanner = GitScanner::new();
        let long_date = "a".repeat(100);
        assert!(scanner.validate_date_param(&long_date).is_err());
    }

    #[test]
    fn test_validate_path_nonexistent() {
        let scanner = GitScanner::new();
        let result = scanner.validate_path(Path::new("/nonexistent/path/12345"));
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_path_file_not_dir() {
        let scanner = GitScanner::new();
        // Use Cargo.toml as a file that exists but is not a directory
        let result = scanner.validate_path(Path::new("Cargo.toml"));
        assert!(result.is_err());
    }

    #[test]
    fn test_is_git_repo_false() {
        let scanner = GitScanner::new();
        let temp_dir = TempDir::new().unwrap();
        assert!(!scanner.is_git_repo(temp_dir.path()));
    }

    #[test]
    fn test_is_git_repo_true() {
        let scanner = GitScanner::new();
        let temp_dir = TempDir::new().unwrap();
        fs::create_dir(temp_dir.path().join(".git")).unwrap();
        assert!(scanner.is_git_repo(temp_dir.path()));
    }

    #[test]
    fn test_format_changes_for_display() {
        let scanner = GitScanner::new();
        let files = vec![
            FileChange { path: "file1.rs".to_string(), additions: 10, deletions: 5 },
            FileChange { path: "file2.rs".to_string(), additions: 20, deletions: 0 },
            FileChange { path: "file3.rs".to_string(), additions: 0, deletions: 3 },
        ];

        let display = scanner.format_changes_for_display(&files);
        assert!(display.contains("[+10/-5] file1.rs"));
        assert!(display.contains("[+20] file2.rs"));
        assert!(display.contains("[-3] file3.rs"));
    }
}
