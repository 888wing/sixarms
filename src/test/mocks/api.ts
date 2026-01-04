import { vi } from 'vitest'
import type { Project, Todo, InboxItem, ChatMessage, DailyLog } from '../../lib/types'

// Mock data factories
export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Test Project',
  path: '/path/to/project',
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  title: 'Test Todo',
  priority: 'medium',
  status: 'pending',
  column: 'backlog',
  position: 0,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockInboxItem = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  id: 'inbox-1',
  item_type: 'daily_summary',
  question: 'What did you work on today?',
  suggested_actions: [
    { id: 'continue', label: 'Continue', icon: '🚀' },
    { id: 'delay', label: 'Delay', icon: '📅' },
  ],
  detected_actions: [],
  status: 'pending',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockChatMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const createMockDailyLog = (overrides: Partial<DailyLog> = {}): DailyLog => ({
  id: 'log-1',
  project_id: 'project-1',
  date: '2025-01-01',
  summary: 'Worked on features',
  category: 'feature',
  files_changed: [],
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

// Project API Mock
export const mockProjectApi = {
  getAll: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation((name: string, path: string) =>
    Promise.resolve(createMockProject({ name, path }))
  ),
  createBatch: vi.fn().mockResolvedValue([]),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
}

// Todo API Mock
export const mockTodoApi = {
  getAll: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation((title: string) =>
    Promise.resolve(createMockTodo({ title }))
  ),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  move: vi.fn().mockResolvedValue(undefined),
}

// Inbox API Mock
export const mockInboxApi = {
  getAll: vi.fn().mockResolvedValue([]),
  answer: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockImplementation((itemType: string, question: string) =>
    Promise.resolve(createMockInboxItem({ item_type: itemType as any, question }))
  ),
}

// Chat API Mock
export const mockChatApi = {
  getMessages: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn().mockImplementation((role: string, content: string) =>
    Promise.resolve(createMockChatMessage({ role: role as any, content }))
  ),
}

// Settings API Mock
export const mockSettingsApi = {
  get: vi.fn().mockResolvedValue({
    theme: 'dark',
    language: 'zh-HK',
    notifications: {
      daily_summary: true,
      todo_reminder: true,
      stale_project: false,
    },
    scan: {
      enabled: true,
      interval_minutes: 60,
      scan_on_startup: false,
      auto_classify: true,
      auto_summarize: true,
    },
  }),
  save: vi.fn().mockResolvedValue(undefined),
}

// Stats API Mock
export const mockStatsApi = {
  getActivity: vi.fn().mockResolvedValue([]),
  getCategoryDistribution: vi.fn().mockResolvedValue([]),
}

// Grok API Mock
export const mockGrokApi = {
  setApiKey: vi.fn().mockResolvedValue(undefined),
  hasApiKey: vi.fn().mockResolvedValue(false),
  deleteApiKey: vi.fn().mockResolvedValue(undefined),
  chat: vi.fn().mockResolvedValue('AI response'),
  classify: vi.fn().mockResolvedValue('feature'),
  generateSummary: vi.fn().mockResolvedValue('Summary'),
  sendMessages: vi.fn().mockResolvedValue('AI response'),
}

// Scanner API Mock
export const mockScannerApi = {
  scanToday: vi.fn().mockResolvedValue({
    project_id: 'project-1',
    date: '2025-01-01',
    files: [],
    total_additions: 0,
    total_deletions: 0,
  }),
  scanRange: vi.fn().mockResolvedValue({
    project_id: 'project-1',
    date: '2025-01-01',
    files: [],
    total_additions: 0,
    total_deletions: 0,
  }),
  getUncommitted: vi.fn().mockResolvedValue([]),
  getRecentCommits: vi.fn().mockResolvedValue([]),
  getCurrentBranch: vi.fn().mockResolvedValue('main'),
  isGitRepo: vi.fn().mockResolvedValue(true),
  formatChanges: vi.fn().mockResolvedValue(''),
}

// Scheduler API Mock
export const mockSchedulerApi = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn().mockResolvedValue({ is_running: false, last_scan: null }),
  triggerManualScan: vi.fn().mockResolvedValue(undefined),
}

// Helper to reset all mocks
export const resetAllMocks = () => {
  Object.values(mockProjectApi).forEach(fn => fn.mockClear())
  Object.values(mockTodoApi).forEach(fn => fn.mockClear())
  Object.values(mockInboxApi).forEach(fn => fn.mockClear())
  Object.values(mockChatApi).forEach(fn => fn.mockClear())
  Object.values(mockSettingsApi).forEach(fn => fn.mockClear())
  Object.values(mockStatsApi).forEach(fn => fn.mockClear())
  Object.values(mockGrokApi).forEach(fn => fn.mockClear())
  Object.values(mockScannerApi).forEach(fn => fn.mockClear())
  Object.values(mockSchedulerApi).forEach(fn => fn.mockClear())
}
