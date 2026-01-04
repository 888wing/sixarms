import { vi } from 'vitest'

// Mock Tauri invoke function
export const invoke = vi.fn().mockImplementation((cmd: string, args?: unknown) => {
  console.log(`[Mock] invoke: ${cmd}`, args)

  // Return default mock responses based on command
  switch (cmd) {
    case 'get_projects':
      return Promise.resolve([])
    case 'get_todos':
      return Promise.resolve([])
    case 'get_inbox_items':
      return Promise.resolve([])
    case 'get_chat_messages':
      return Promise.resolve([])
    case 'get_settings':
      return Promise.resolve(JSON.stringify({
        theme: 'dark',
        language: 'zh-HK',
        notifications: {
          daily_summary: true,
          todo_reminders: true,
          inbox_alerts: true,
        },
        scan: {
          scan_on_startup: false,
          scan_interval_mins: 60,
        },
      }))
    case 'get_activity_stats':
      return Promise.resolve([])
    case 'get_category_distribution':
      return Promise.resolve([])
    case 'has_api_key':
      return Promise.resolve(false)
    case 'get_scheduler_status':
      return Promise.resolve({ is_running: false, last_scan: null })
    case 'health_check':
      return Promise.resolve('ok')
    default:
      return Promise.resolve(null)
  }
})

// Mock Tauri event system
export const listen = vi.fn().mockImplementation(() => {
  return Promise.resolve(() => {})
})

export const emit = vi.fn()

export const event = {
  listen,
  emit,
}

export const core = {
  invoke,
}

// Default export for @tauri-apps/api
export default {
  invoke,
  event,
  core,
}
