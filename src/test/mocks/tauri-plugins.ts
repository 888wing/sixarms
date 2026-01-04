import { vi } from 'vitest'

// Mock @tauri-apps/plugin-dialog
export const open = vi.fn().mockResolvedValue(null)
export const save = vi.fn().mockResolvedValue(null)
export const message = vi.fn().mockResolvedValue(undefined)
export const ask = vi.fn().mockResolvedValue(true)
export const confirm = vi.fn().mockResolvedValue(true)

// Mock @tauri-apps/plugin-shell
export const Command = {
  create: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' }),
    spawn: vi.fn().mockResolvedValue({ pid: 12345 }),
  }),
}

// Mock @tauri-apps/plugin-updater
export const check = vi.fn().mockResolvedValue(null)

// Mock @tauri-apps/plugin-process
export const exit = vi.fn()
export const relaunch = vi.fn()

export default {
  open,
  save,
  message,
  ask,
  confirm,
  Command,
  check,
  exit,
  relaunch,
}
