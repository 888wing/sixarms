import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  ProjectStatus,
  DailyLog,
  Todo,
  TodoStatus,
  InboxItem,
  InboxStatus,
  ChatMessage,
  UserSettings,
  FileChange,
  GitDiffResult,
} from './types';

// ============================================
// Project API
// ============================================

export const projectApi = {
  getAll: () => invoke<Project[]>('get_projects'),

  create: (name: string, path: string) =>
    invoke<Project>('create_project', { name, path }),

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
// Health Check
// ============================================

export const healthCheck = () =>
  invoke<string>('health_check');
