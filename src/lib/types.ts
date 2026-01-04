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
  detected_actions: DetectedAction[];
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
  version: VersionSettings;
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

export interface VersionSettings {
  auto_refresh: boolean;
  refresh_minutes: number;
  auto_milestones_from_tags: boolean;
  auto_major_updates: boolean;
  major_update_threshold: MajorUpdateThreshold;
  ai_create_mode: AiCreateMode;
}

export interface MajorUpdateThreshold {
  commits: number;
  files_changed: number;
}

export type AiCreateMode = 'suggest' | 'auto' | 'disabled';

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
  source: MilestoneSource;
  target_date?: string;
  completed_at?: string;
  created_at: string;
}

export type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneSource = 'manual' | 'tag' | 'ai';

// ============================================
// Cached Git Tag Types
// ============================================

export interface CachedGitTag {
  id: string;
  project_id: string;
  name: string;
  commit_hash: string;
  date: string;
  message?: string;
  first_seen_at: string;
}

export interface TagSyncResult {
  project_id: string;
  total_tags: number;
  new_tags: CachedGitTag[];
}

// ============================================
// AI Action Types
// ============================================

export type ConversationIntent =
  | 'create_todo'
  | 'log_progress'
  | 'create_inbox_item'
  | 'create_milestone'
  | 'ask_question'
  | 'general_chat';

export interface DetectedAction {
  intent: ConversationIntent;
  confidence: number;
  data: ActionData;
  confirmed: boolean;
}

export type ActionData =
  | { type: 'todo'; title: string; priority?: string; due_date?: string }
  | { type: 'progress'; summary: string; category: string; date?: string }
  | { type: 'inbox'; question: string; item_type: string }
  | { type: 'milestone'; title: string; description?: string; version?: string; git_tag?: string }
  | { type: 'none' };

export interface AiResponseWithActions {
  message: string;
  detected_actions: DetectedAction[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
