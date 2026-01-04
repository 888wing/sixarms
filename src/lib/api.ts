import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  ProjectStatus,
  DailyLog,
  Milestone,
  MilestoneStatus,
  MilestoneSource,
  Todo,
  TodoStatus,
  InboxItem,
  InboxStatus,
  ChatMessage,
  UserSettings,
  ScanSettings,
  SchedulerStatus,
  FileChange,
  GitDiffResult,
  GitTag,
  CachedGitTag,
  TagSyncResult,
  AiResponseWithActions,
  DetectedAction,
} from './types';

// ============================================
// Project API
// ============================================

export const projectApi = {
  getAll: () => invoke<Project[]>('get_projects'),

  create: (name: string, path: string) =>
    invoke<Project>('create_project', { name, path }),

  createBatch: (projects: [string, string][]) =>
    invoke<Project[]>('create_projects_batch', { projects }),

  updateStatus: (id: string, status: ProjectStatus) =>
    invoke<void>('update_project_status', { id, status }),

  delete: (id: string) =>
    invoke<void>('delete_project', { id }),
};

// ============================================
// Daily Log API
// ============================================

export const dailyLogApi = {
  getAll: (projectId?: string, limit?: number) =>
    invoke<DailyLog[]>('get_daily_logs', { project_id: projectId, limit }),

  create: (projectId: string, date: string, summary: string, category: string) =>
    invoke<DailyLog>('create_daily_log', {
      project_id: projectId,
      date,
      summary,
      category,
    }),
};

// ============================================
// Milestone API
// ============================================

export const milestoneApi = {
  getAll: (projectId?: string) =>
    invoke<Milestone[]>('get_milestones', { project_id: projectId }),

  create: (
    projectId: string,
    title: string,
    description?: string,
    version?: string,
    gitTag?: string,
    status?: MilestoneStatus,
    source?: MilestoneSource,
    targetDate?: string
  ) =>
    invoke<Milestone>('create_milestone', {
      project_id: projectId,
      title,
      description,
      version,
      git_tag: gitTag,
      status,
      source,
      target_date: targetDate,
    }),

  updateStatus: (id: string, status: MilestoneStatus) =>
    invoke<void>('update_milestone_status', { id, status }),

  delete: (id: string) =>
    invoke<void>('delete_milestone', { id }),
};

// ============================================
// Todo API
// ============================================

export const todoApi = {
  getAll: (status?: TodoStatus) =>
    invoke<Todo[]>('get_todos', { status }),

  create: (
    title: string,
    projectId?: string,
    priority?: string,
    dueDate?: string
  ) =>
    invoke<Todo>('create_todo', {
      title,
      project_id: projectId,
      priority,
      due_date: dueDate,
    }),

  updateStatus: (id: string, status: TodoStatus) =>
    invoke<void>('update_todo_status', { id, status }),

  delete: (id: string) =>
    invoke<void>('delete_todo', { id }),
};

// ============================================
// Inbox API
// ============================================

export const inboxApi = {
  getAll: (status?: InboxStatus) =>
    invoke<InboxItem[]>('get_inbox_items', { status }),

  answer: (id: string, answer: string) =>
    invoke<void>('answer_inbox_item', { id, answer }),

  create: (
    itemType: string,
    question: string,
    projectId?: string,
    context?: string
  ) =>
    invoke<InboxItem>('create_inbox_item', {
      item_type: itemType,
      question,
      project_id: projectId,
      context,
    }),
};

// ============================================
// Chat API
// ============================================

export const chatApi = {
  getMessages: (projectId?: string, limit?: number) =>
    invoke<ChatMessage[]>('get_chat_messages', { project_id: projectId, limit }),

  createMessage: (role: string, content: string, projectId?: string) =>
    invoke<ChatMessage>('create_chat_message', {
      role,
      content,
      project_id: projectId,
    }),
};

// ============================================
// Grok AI API
// ============================================

export interface GrokMessage {
  role: string;
  content: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export const grokApi = {
  setApiKey: (key: string) =>
    invoke<void>('set_api_key', { key }),

  hasApiKey: () =>
    invoke<boolean>('has_api_key'),

  deleteApiKey: () =>
    invoke<void>('delete_api_key'),

  chat: (message: string, projectContext?: string) =>
    invoke<string>('chat_with_grok', {
      message,
      project_context: projectContext,
    }),

  chatWithHistory: (
    message: string,
    history: ChatHistoryItem[],
    projectContext?: string,
    maxHistoryTokens?: number
  ) =>
    invoke<string>('chat_with_grok_history', {
      message,
      history,
      project_context: projectContext,
      max_history_tokens: maxHistoryTokens ?? 4000,
    }),

  classify: (filesChanged: string, diffSummary: string) =>
    invoke<string>('classify_with_grok', {
      files_changed: filesChanged,
      diff_summary: diffSummary,
    }),

  generateSummary: (filesChanged: string, context: string) =>
    invoke<string>('generate_summary_with_grok', {
      files_changed: filesChanged,
      context,
    }),

  sendMessages: (messages: GrokMessage[]) =>
    invoke<string>('send_grok_messages', { messages }),

  chatWithIntent: (
    message: string,
    history: ChatHistoryItem[],
    projectContext?: string,
    projectId?: string
  ) =>
    invoke<AiResponseWithActions>('chat_with_intent', {
      message,
      history,
      project_context: projectContext,
      project_id: projectId,
    }),

  executeAction: (action: DetectedAction, projectId?: string) =>
    invoke<{ type: string; data: unknown }>('execute_detected_action', {
      action,
      project_id: projectId,
    }),
};

// ============================================
// Scanner API
// ============================================

export const scannerApi = {
  scanToday: (repoPath: string) =>
    invoke<GitDiffResult>('scan_today', { repo_path: repoPath }),

  scanRange: (repoPath: string, since: string, until?: string) =>
    invoke<GitDiffResult>('scan_range', {
      repo_path: repoPath,
      since,
      until,
    }),

  getUncommitted: (repoPath: string) =>
    invoke<FileChange[]>('get_uncommitted', { repo_path: repoPath }),

  getRecentCommits: (repoPath: string, count?: number) =>
    invoke<string[]>('get_recent_commits', {
      repo_path: repoPath,
      count,
    }),

  getCurrentBranch: (repoPath: string) =>
    invoke<string>('get_current_branch', { repo_path: repoPath }),

  isGitRepo: (repoPath: string) =>
    invoke<boolean>('is_git_repo', { repo_path: repoPath }),

  formatChanges: (files: FileChange[]) =>
    invoke<string>('format_changes', { files }),

  getGitTags: (repoPath: string) =>
    invoke<GitTag[]>('get_git_tags', { repo_path: repoPath }),

  syncGitTags: (projectId: string, repoPath: string, autoCreateMilestones: boolean) =>
    invoke<TagSyncResult>('sync_git_tags', {
      project_id: projectId,
      repo_path: repoPath,
      auto_create_milestones: autoCreateMilestones,
    }),

  getCachedTags: (projectId?: string) =>
    invoke<CachedGitTag[]>('get_cached_tags', { project_id: projectId }),
};

// ============================================
// Settings API
// ============================================

export const settingsApi = {
  get: () =>
    invoke<UserSettings>('get_settings'),

  save: (settings: UserSettings) =>
    invoke<void>('save_settings', { settings }),
};

// ============================================
// Statistics API
// ============================================

export const statsApi = {
  getActivity: (days?: number) =>
    invoke<[string, number][]>('get_activity_stats', { days }),

  getCategoryDistribution: () =>
    invoke<[string, number][]>('get_category_distribution'),
};

// ============================================
// Scheduler API
// ============================================

export const schedulerApi = {
  start: (settings: ScanSettings) =>
    invoke<void>('start_scheduler', { settings }),

  stop: () =>
    invoke<void>('stop_scheduler'),

  getStatus: () =>
    invoke<SchedulerStatus>('get_scheduler_status'),

  triggerManualScan: () =>
    invoke<void>('trigger_manual_scan'),
};

// ============================================
// Health Check
// ============================================

export const healthCheck = () =>
  invoke<string>('health_check');
