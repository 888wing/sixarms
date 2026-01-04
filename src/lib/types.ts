// ============================================
// Core Types
// ============================================

export interface Project {
  id: string;
  name: string;
  path: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface DailyLog {
  id: string;
  project_id: string;
  date: string;
  summary: string;
  category: LogCategory;
  files_changed: FileChange[];
  ai_classification?: string;
  user_override?: string;
  created_at: string;
}

export type LogCategory = 'feature' | 'bugfix' | 'refactor' | 'ui' | 'docs' | 'test' | 'chore' | 'other';

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface Todo {
  id: string;
  project_id?: string;
  title: string;
  description?: string;
  priority: TodoPriority;
  status: TodoStatus;
  due_date?: string;
  created_at: string;
  completed_at?: string;
}

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// ============================================
// Inbox Types
// ============================================

export interface InboxItem {
  id: string;
  item_type: InboxItemType;
  project_id?: string;
  question: string;
  context?: string;
  suggested_actions: SuggestedAction[];
  status: InboxStatus;
  answer?: string;
  created_at: string;
  answered_at?: string;
}

export type InboxItemType = 'daily_summary' | 'classification' | 'todo_followup' | 'planning' | 'stale_project';

export interface SuggestedAction {
  id: string;
  label: string;
  icon?: string;
}

export type InboxStatus = 'pending' | 'answered' | 'skipped';

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  project_id?: string;
  role: ChatRole;
  content: string;
  actions?: ChatAction;
  created_at: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatAction {
  action_type: ChatActionType;
  data: Record<string, unknown>;
}

export type ChatActionType = 'logged' | 'todo_created' | 'project_updated';

// ============================================
// Settings Types
// ============================================

export interface UserSettings {
  notifications: NotificationSettings;
  scan: ScanSettings;
  theme: string;
  language: string;
}

export interface NotificationSettings {
  daily_summary: boolean;
  todo_reminder: boolean;
  stale_project: boolean;
}

export interface ScanSettings {
  enabled: boolean;
  interval_minutes: number;
  scan_on_startup: boolean;
  auto_classify: boolean;
  auto_summarize: boolean;
}

export interface SchedulerStatus {
  is_running: boolean;
  last_scan: string | null;
}

// ============================================
// Scanner Types
// ============================================

export interface GitDiffResult {
  project_id: string;
  date: string;
  files: FileChange[];
  total_additions: number;
  total_deletions: number;
}

export interface GitTag {
  name: string;
  commit_hash: string;
  date: string;
  message?: string;
}

// ============================================
// Milestone Types
// ============================================

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  version?: string;
  git_tag?: string;
  status: MilestoneStatus;
  target_date?: string;
  completed_at?: string;
  created_at: string;
}

export type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
