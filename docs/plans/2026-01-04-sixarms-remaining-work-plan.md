# Sixarms 剩餘開發工作綜合實施計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 Sixarms Dev Tracker v2 的剩餘功能：Quick Entry 視窗、Slash 指令系統、異常偵測引擎、Kanban 看板視圖

**Architecture:**
- Phase 1: Quick Entry 多視窗系統 + 全局快捷鍵
- Phase 2: Slash 指令解析器整合到 Chat
- Phase 3: Kanban 看板視圖 + 拖放排序

**Tech Stack:** Tauri v2 (Rust), React 18, TypeScript, Zustand, dnd-kit, Tailwind CSS

---

## 狀態摘要

### ✅ 已完成
- Version Tracking 自動化 (milestones + git_tags 持久化)
- UI 架構修復 (Sidebar pin, ProjectSelector, Store sync)
- AI Action Detection v0.2.0
- Scheduler 基礎掃描系統
- 通知服務基礎

### 📋 待完成 (本計劃範圍)
| Phase | 功能 | 複雜度 | 預計時間 |
|-------|------|--------|----------|
| 1 | Quick Entry 視窗 + 全局快捷鍵 | 高 | - |
| 2 | Slash 指令系統 | 中 | - |
| 3 | Kanban 看板視圖 | 高 | - |

---

## Phase 1: Quick Entry 視窗系統

### Task 1.1: 建立 Quick Entry Rust 模組

**Files:**
- Create: `src-tauri/src/quick_entry.rs`
- Modify: `src-tauri/src/lib.rs:1-50`

**Step 1: 創建 quick_entry.rs 基礎結構**

```rust
// src-tauri/src/quick_entry.rs
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Create the Quick Entry window (hidden by default)
pub fn create_quick_entry_window(app: &AppHandle) -> Result<(), String> {
    // Check if window already exists
    if app.get_webview_window("quick-entry").is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        "quick-entry",
        WebviewUrl::App("quick-entry.html".into()),
    )
    .title("Quick Entry")
    .inner_size(500.0, 320.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .center()
    .visible(false)
    .skip_taskbar(true)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Toggle Quick Entry window visibility
pub fn toggle_quick_entry(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("quick-entry") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.center().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    } else {
        create_quick_entry_window(app)?;
        if let Some(window) = app.get_webview_window("quick-entry") {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
```

**Step 2: 添加 Tauri command**

```rust
// src-tauri/src/quick_entry.rs (繼續)

#[tauri::command]
pub fn show_quick_entry(app: AppHandle) -> Result<(), String> {
    toggle_quick_entry(&app)
}

#[tauri::command]
pub fn hide_quick_entry(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("quick-entry") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

**Step 3: 驗證編譯**

Run: `cd src-tauri && cargo check`
Expected: 編譯成功

---

### Task 1.2: 註冊全局快捷鍵

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: 添加 global-shortcut 依賴**

```toml
# src-tauri/Cargo.toml - 在 [dependencies] 區段添加
tauri-plugin-global-shortcut = "2"
```

**Step 2: 在 lib.rs 註冊 quick_entry 模組和快捷鍵**

```rust
// src-tauri/src/lib.rs - 在頂部添加
mod quick_entry;

// 在 run() 函數內，plugin 註冊區段添加
.plugin(tauri_plugin_global_shortcut::Builder::new().build())

// 在 invoke_handler 添加 commands
quick_entry::show_quick_entry,
quick_entry::hide_quick_entry,
```

**Step 3: 在 setup 中註冊快捷鍵**

```rust
// src-tauri/src/lib.rs - 在 .setup() 內添加
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

// 註冊 ⌘+Shift+D 快捷鍵
let shortcut = "CmdOrCtrl+Shift+D".parse::<Shortcut>().unwrap();
app.global_shortcut().on_shortcut(shortcut, |app, _, event| {
    if event.state == ShortcutState::Pressed {
        let _ = quick_entry::toggle_quick_entry(app);
    }
}).ok();
```

**Step 4: 驗證編譯**

Run: `cd src-tauri && cargo build`
Expected: 編譯成功

---

### Task 1.3: 創建 Quick Entry HTML 入口

**Files:**
- Create: `quick-entry.html`
- Create: `src/quick-entry/main.tsx`
- Create: `src/quick-entry/QuickEntry.tsx`

**Step 1: 創建 quick-entry.html**

```html
<!-- quick-entry.html -->
<!doctype html>
<html lang="zh-HK">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quick Entry</title>
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body class="bg-transparent">
    <div id="quick-entry-root"></div>
    <script type="module" src="/src/quick-entry/main.tsx"></script>
  </body>
</html>
```

**Step 2: 創建 main.tsx**

```typescript
// src/quick-entry/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QuickEntry } from './QuickEntry';
import '../index.css';

ReactDOM.createRoot(document.getElementById('quick-entry-root')!).render(
  <React.StrictMode>
    <QuickEntry />
  </React.StrictMode>
);
```

**Step 3: 創建 QuickEntry.tsx 組件**

```typescript
// src/quick-entry/QuickEntry.tsx
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X } from 'lucide-react';

type EntryType = 'log' | 'todo' | 'idea' | 'bug';

interface Project {
  id: string;
  name: string;
  status: string;
}

const entryTypes: { type: EntryType; label: string; icon: string }[] = [
  { type: 'log', label: '記錄', icon: '💬' },
  { type: 'todo', label: 'TODO', icon: '✅' },
  { type: 'idea', label: '想法', icon: '💡' },
  { type: 'bug', label: 'Bug', icon: '🐛' },
];

export function QuickEntry() {
  const [content, setContent] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('log');
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    invoke<Project[]>('get_projects').then((p) => {
      const active = p.filter((proj) => proj.status === 'active');
      setProjects(active);
      if (active.length > 0 && !projectId) {
        setProjectId(active[0].id);
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    invoke('hide_quick_entry');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      if (entryType === 'todo') {
        await invoke('create_todo', {
          title: content.trim(),
          project_id: projectId || null,
          priority: 'medium',
        });
      } else {
        // Create as inbox item for now
        await invoke('create_inbox_item', {
          item_type: entryType,
          question: content.trim(),
          project_id: projectId || null,
        });
      }
      setContent('');
      handleClose();
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setSubmitting(false);
    }
  }, [content, entryType, projectId, submitting, handleClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
      // ⌘+1/2/3/4 for type selection
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          setEntryType(entryTypes[num - 1].type);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleSubmit]);

  return (
    <div className="quick-entry-window h-screen p-4 flex flex-col bg-void border border-accent-cyan rounded-lg shadow-glow-cyan">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-accent-cyan">⚡</span>
          <span className="font-display text-text-primary text-sm tracking-wider">
            QUICK ENTRY
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="輸入內容..."
        autoFocus
        className="flex-1 w-full p-3 bg-bg-primary border border-border-subtle rounded font-mono text-sm text-text-primary placeholder-text-muted resize-none focus:border-accent-cyan focus:outline-none transition-colors"
      />

      {/* Project Selector */}
      <div className="mt-3">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full p-2 bg-bg-secondary border border-border-subtle rounded font-mono text-sm text-text-secondary focus:border-accent-cyan focus:outline-none"
        >
          <option value="">無專案</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              📁 {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Type Buttons */}
      <div className="flex gap-2 mt-3">
        {entryTypes.map((t, i) => (
          <button
            key={t.type}
            onClick={() => setEntryType(t.type)}
            className={`flex-1 px-3 py-2 rounded text-sm transition-all ${
              entryType === t.type
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50'
                : 'bg-bg-secondary text-text-muted border border-border-subtle hover:border-accent-cyan/30 hover:text-text-secondary'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            <span className="text-xs text-text-muted ml-1">⌘{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
        <span className="text-xs text-text-muted font-mono">
          ESC 取消 · ⌘↵ 送出
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="px-4 py-1.5 text-sm bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '送出中...' : '送出'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: 驗證文件存在**

Run: `ls -la quick-entry.html src/quick-entry/`
Expected: 文件列表顯示所有創建的文件

---

### Task 1.4: 更新 Vite 配置支援多入口

**Files:**
- Modify: `vite.config.ts`

**Step 1: 添加多入口配置**

```typescript
// vite.config.ts - 更新 build.rollupOptions
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "quick-entry": resolve(__dirname, "quick-entry.html"),
      },
    },
  },
});
```

**Step 2: 驗證配置**

Run: `npm run build`
Expected: 構建成功，生成 dist/quick-entry.html

---

### Task 1.5: 更新 Tauri 配置

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: 添加 Quick Entry 視窗配置和權限**

在 `tauri.conf.json` 的 `app.windows` 數組添加：

```json
{
  "label": "quick-entry",
  "url": "quick-entry.html",
  "title": "Quick Entry",
  "width": 500,
  "height": 320,
  "resizable": false,
  "decorations": false,
  "alwaysOnTop": true,
  "center": true,
  "visible": false,
  "skipTaskbar": true
}
```

**Step 2: 添加 global-shortcut 權限**

在 `tauri.conf.json` 的 `app.security.capabilities` 或單獨的 capabilities 文件添加：

```json
{
  "permissions": [
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister"
  ]
}
```

**Step 3: 驗證配置**

Run: `npm run tauri dev`
Expected: 應用啟動，按 ⌘+Shift+D 顯示 Quick Entry 視窗

**Step 4: Commit**

```bash
git add src-tauri/src/quick_entry.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git add quick-entry.html src/quick-entry/ vite.config.ts src-tauri/tauri.conf.json
git commit -m "feat: add Quick Entry window with global shortcut ⌘+Shift+D"
```

---

## Phase 2: Slash 指令系統

### Task 2.1: 建立 Slash Commands 解析器

**Files:**
- Create: `src-tauri/src/slash_commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 創建 slash_commands.rs**

```rust
// src-tauri/src/slash_commands.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SlashCommand {
    // 查詢類
    Status,
    Todo { filter: Option<String> },
    Stats { period: String },
    Plan,

    // 操作類
    Add { task: String },
    Done { identifier: String },
    Scan { project_id: Option<String> },

    // 系統類
    Project { name: String },
    Projects,
    Help,

    // 未知指令
    Unknown { input: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub command: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

/// Parse a slash command from user input
pub fn parse_command(input: &str) -> Option<SlashCommand> {
    let input = input.trim();
    if !input.starts_with('/') {
        return None;
    }

    let parts: Vec<&str> = input[1..].splitn(2, ' ').collect();
    let cmd = parts[0].to_lowercase();
    let args = parts.get(1).map(|s| s.trim().to_string());

    match cmd.as_str() {
        "status" => Some(SlashCommand::Status),
        "todo" => Some(SlashCommand::Todo { filter: args }),
        "stats" => Some(SlashCommand::Stats {
            period: args.unwrap_or_else(|| "week".to_string())
        }),
        "plan" => Some(SlashCommand::Plan),
        "add" => args.map(|task| SlashCommand::Add { task }),
        "done" => args.map(|identifier| SlashCommand::Done { identifier }),
        "scan" => Some(SlashCommand::Scan { project_id: args }),
        "project" => args.map(|name| SlashCommand::Project { name }),
        "projects" => Some(SlashCommand::Projects),
        "help" => Some(SlashCommand::Help),
        _ => Some(SlashCommand::Unknown { input: input.to_string() }),
    }
}

/// Generate help text for slash commands
pub fn get_help_text() -> String {
    r#"📊 查詢類
  /status          今日工作進度摘要
  /todo [filter]   顯示 TODO 列表
  /stats [period]  統計數據 (week/month/year)
  /plan            本週規劃總覽

✏️ 操作類
  /add <task>      新增 TODO
  /done <id|name>  標記完成
  /scan [project]  手動觸發掃描

🔧 系統類
  /project <name>  切換當前專案
  /projects        列出所有專案
  /help            顯示此說明"#.to_string()
}
```

**Step 2: 添加 execute_command 函數**

```rust
// src-tauri/src/slash_commands.rs (繼續)
use crate::db::Database;
use crate::models::{Todo, Project};

pub fn execute_command(
    command: SlashCommand,
    db: &Database,
    selected_project_id: Option<&str>,
) -> CommandResult {
    match command {
        SlashCommand::Help => CommandResult {
            success: true,
            command: "/help".to_string(),
            message: get_help_text(),
            data: None,
        },

        SlashCommand::Status => {
            match get_status_summary(db, selected_project_id) {
                Ok(summary) => CommandResult {
                    success: true,
                    command: "/status".to_string(),
                    message: summary.message,
                    data: Some(serde_json::to_value(&summary).unwrap()),
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/status".to_string(),
                    message: format!("獲取狀態失敗: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Todo { filter } => {
            match db.get_todos(filter.as_deref(), selected_project_id) {
                Ok(todos) => {
                    let count = todos.len();
                    let pending = todos.iter().filter(|t| t.status == "pending").count();
                    let in_progress = todos.iter().filter(|t| t.status == "in_progress").count();
                    CommandResult {
                        success: true,
                        command: "/todo".to_string(),
                        message: format!("共 {} 個 TODO ({} 待處理, {} 進行中)", count, pending, in_progress),
                        data: Some(serde_json::to_value(&todos).unwrap()),
                    }
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/todo".to_string(),
                    message: format!("獲取 TODO 失敗: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Projects => {
            match db.get_projects() {
                Ok(projects) => {
                    let active = projects.iter().filter(|p| p.status == "active").count();
                    CommandResult {
                        success: true,
                        command: "/projects".to_string(),
                        message: format!("共 {} 個專案 ({} 活躍)", projects.len(), active),
                        data: Some(serde_json::to_value(&projects).unwrap()),
                    }
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/projects".to_string(),
                    message: format!("獲取專案失敗: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Add { task } => {
            match db.create_todo(&task, selected_project_id, Some("medium"), None) {
                Ok(todo) => CommandResult {
                    success: true,
                    command: "/add".to_string(),
                    message: format!("✅ 已新增 TODO: {}", task),
                    data: Some(serde_json::to_value(&todo).unwrap()),
                },
                Err(e) => CommandResult {
                    success: false,
                    command: "/add".to_string(),
                    message: format!("新增失敗: {}", e),
                    data: None,
                },
            }
        },

        SlashCommand::Unknown { input } => CommandResult {
            success: false,
            command: input.clone(),
            message: format!("未知指令: {}。輸入 /help 查看可用指令。", input),
            data: None,
        },

        // 其他指令暫時返回 "功能開發中"
        _ => CommandResult {
            success: false,
            command: format!("{:?}", command),
            message: "此功能開發中".to_string(),
            data: None,
        },
    }
}

#[derive(Serialize)]
struct StatusSummary {
    message: String,
    todo_pending: usize,
    todo_in_progress: usize,
    todo_completed_today: usize,
    active_projects: usize,
}

fn get_status_summary(db: &Database, project_id: Option<&str>) -> Result<StatusSummary, String> {
    let todos = db.get_todos(None, project_id).map_err(|e| e.to_string())?;
    let projects = db.get_projects().map_err(|e| e.to_string())?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let pending = todos.iter().filter(|t| t.status == "pending").count();
    let in_progress = todos.iter().filter(|t| t.status == "in_progress").count();
    let completed_today = todos.iter()
        .filter(|t| t.status == "completed" && t.updated_at.starts_with(&today))
        .count();
    let active = projects.iter().filter(|p| p.status == "active").count();

    Ok(StatusSummary {
        message: format!(
            "📊 今日狀態\n待處理: {} | 進行中: {} | 今日完成: {}\n活躍專案: {}",
            pending, in_progress, completed_today, active
        ),
        todo_pending: pending,
        todo_in_progress: in_progress,
        todo_completed_today: completed_today,
        active_projects: active,
    })
}
```

**Step 3: 添加 Tauri command**

```rust
// src-tauri/src/slash_commands.rs (繼續)
use tauri::State;

#[tauri::command]
pub fn execute_slash_command(
    db: State<Database>,
    input: String,
    project_id: Option<String>,
) -> CommandResult {
    match parse_command(&input) {
        Some(cmd) => execute_command(cmd, &db, project_id.as_deref()),
        None => CommandResult {
            success: false,
            command: input,
            message: "不是有效的斜線指令".to_string(),
            data: None,
        },
    }
}
```

**Step 4: 在 lib.rs 註冊模組**

```rust
// src-tauri/src/lib.rs
mod slash_commands;

// 在 invoke_handler 添加
slash_commands::execute_slash_command,
```

**Step 5: 驗證編譯**

Run: `cd src-tauri && cargo check`
Expected: 編譯成功

---

### Task 2.2: 前端整合 Slash 指令

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/components/chat/CommandResponse.tsx`
- Modify: `src/pages/Chat.tsx`

**Step 1: 添加 API 綁定**

```typescript
// src/lib/api.ts - 添加到 export 區段
export interface CommandResult {
  success: boolean;
  command: string;
  message: string;
  data?: unknown;
}

export const slashApi = {
  execute: (input: string, projectId?: string) =>
    invoke<CommandResult>('execute_slash_command', {
      input,
      project_id: projectId,
    }),
};
```

**Step 2: 創建 CommandResponse 組件**

```typescript
// src/components/chat/CommandResponse.tsx
import { CheckCircle, XCircle, Terminal } from 'lucide-react';
import type { CommandResult } from '../../lib/api';

interface Props {
  result: CommandResult;
}

export function CommandResponse({ result }: Props) {
  return (
    <div className="p-4 bg-bg-primary border border-border-subtle rounded font-mono text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border-subtle">
        <Terminal size={14} className="text-accent-cyan" />
        <span className="text-accent-cyan">{result.command}</span>
        {result.success ? (
          <CheckCircle size={14} className="text-accent-green ml-auto" />
        ) : (
          <XCircle size={14} className="text-accent-rose ml-auto" />
        )}
      </div>

      {/* Message */}
      <pre className="whitespace-pre-wrap text-text-secondary">
        {result.message}
      </pre>

      {/* Data table if available */}
      {result.data && Array.isArray(result.data) && result.data.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <div className="text-xs text-text-muted mb-2">
            共 {result.data.length} 項結果
          </div>
          <div className="max-h-48 overflow-auto">
            {result.data.slice(0, 10).map((item: any, i: number) => (
              <div
                key={i}
                className="py-1.5 px-2 hover:bg-bg-secondary rounded text-xs"
              >
                {item.title || item.name || JSON.stringify(item)}
              </div>
            ))}
            {result.data.length > 10 && (
              <div className="py-1.5 px-2 text-text-muted text-xs">
                ... 還有 {result.data.length - 10} 項
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: 在 Chat.tsx 整合 Slash 指令**

在 `handleSendMessage` 函數開頭添加指令檢測：

```typescript
// src/pages/Chat.tsx - 在 handleSendMessage 內
import { slashApi } from '../lib/api';
import { CommandResponse } from '../components/chat/CommandResponse';

// 檢測是否為 slash 指令
if (input.trim().startsWith('/')) {
  const result = await slashApi.execute(input.trim(), selectedProjectId ?? undefined);

  // 添加用戶消息
  addMessage({
    id: Date.now().toString(),
    role: 'user',
    content: input.trim(),
    created_at: new Date().toISOString(),
  });

  // 添加指令響應
  addMessage({
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: result.message,
    created_at: new Date().toISOString(),
    // 可以在 metadata 中存儲完整結果
  });

  setInput('');
  return;
}
```

**Step 4: 驗證功能**

Run: `npm run tauri dev`
Expected: 在 Chat 輸入 `/help` 顯示指令列表

**Step 5: Commit**

```bash
git add src-tauri/src/slash_commands.rs src-tauri/src/lib.rs
git add src/lib/api.ts src/components/chat/CommandResponse.tsx src/pages/Chat.tsx
git commit -m "feat: add Slash command system with /help, /status, /todo, /add"
```

---

## Phase 3: Kanban 看板視圖

### Task 3.1: 更新資料庫 Schema

**Files:**
- Modify: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/models.rs`

**Step 1: 更新 Todo 模型**

```rust
// src-tauri/src/models.rs - 更新 Todo struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub column: String,        // 新增: 'backlog' | 'in_progress' | 'done'
    pub position: i32,         // 新增: 排序位置
    pub created_at: String,
    pub updated_at: String,
}
```

**Step 2: 添加資料庫遷移**

```rust
// src-tauri/src/db.rs - 在 init_schema 添加遷移
// 檢查並添加新欄位
conn.execute_batch(r#"
    -- Add column and position if not exists
    ALTER TABLE todos ADD COLUMN column TEXT DEFAULT 'backlog';
    ALTER TABLE todos ADD COLUMN position INTEGER DEFAULT 0;
"#).ok(); // .ok() 忽略已存在的錯誤

// 更新現有資料
conn.execute_batch(r#"
    UPDATE todos SET column = 'done' WHERE status = 'completed' AND column IS NULL;
    UPDATE todos SET column = 'in_progress' WHERE status = 'in_progress' AND column IS NULL;
    UPDATE todos SET column = 'backlog' WHERE column IS NULL;
"#).ok();
```

**Step 3: 添加 move_todo 命令**

```rust
// src-tauri/src/commands.rs
#[tauri::command]
pub fn move_todo(
    db: State<Database>,
    id: String,
    column: String,
    position: i32,
) -> Result<(), String> {
    db.move_todo(&id, &column, position).map_err(|e| e.to_string())
}

// src-tauri/src/db.rs
pub fn move_todo(&self, id: &str, column: &str, position: i32) -> SqlResult<()> {
    let conn = self.get_conn()?;
    let now = Utc::now().to_rfc3339();

    // 更新 status 基於 column
    let status = match column {
        "done" => "completed",
        "in_progress" => "in_progress",
        _ => "pending",
    };

    conn.execute(
        "UPDATE todos SET column = ?1, position = ?2, status = ?3, updated_at = ?4 WHERE id = ?5",
        params![column, position, status, now, id],
    )?;
    Ok(())
}
```

**Step 4: 驗證編譯**

Run: `cd src-tauri && cargo check`
Expected: 編譯成功

---

### Task 3.2: 安裝 dnd-kit 依賴

**Files:**
- Modify: `package.json`

**Step 1: 安裝依賴**

Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Step 2: 驗證安裝**

Run: `npm list @dnd-kit/core`
Expected: 顯示已安裝版本

---

### Task 3.3: 創建 Kanban 組件

**Files:**
- Create: `src/components/kanban/KanbanBoard.tsx`
- Create: `src/components/kanban/KanbanColumn.tsx`
- Create: `src/components/kanban/KanbanCard.tsx`
- Create: `src/components/kanban/index.ts`

**Step 1: 創建 KanbanCard.tsx**

```typescript
// src/components/kanban/KanbanCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Todo } from '../../lib/types';

interface Props {
  todo: Todo;
  onDelete?: (id: string) => void;
}

export function KanbanCard({ todo, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors: Record<string, string> = {
    urgent: 'border-l-accent-rose',
    high: 'border-l-accent-amber',
    medium: 'border-l-accent-cyan',
    low: 'border-l-text-muted',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-bg-primary border border-border-subtle rounded cursor-grab hover:border-accent-cyan/50 transition-colors border-l-2 ${priorityColors[todo.priority] || 'border-l-text-muted'}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate">{todo.title}</p>
          {todo.project_id && (
            <p className="text-xs text-text-muted mt-1 truncate">
              #{todo.project_id.slice(0, 8)}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
            }}
            className="p-1 text-text-muted hover:text-accent-rose transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 創建 KanbanColumn.tsx**

```typescript
// src/components/kanban/KanbanColumn.tsx
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import type { Todo } from '../../lib/types';

interface Props {
  id: string;
  title: string;
  icon: string;
  todos: Todo[];
  onDeleteTodo?: (id: string) => void;
}

const columnColors: Record<string, string> = {
  backlog: 'text-text-muted',
  in_progress: 'text-accent-cyan',
  done: 'text-accent-green',
};

export function KanbanColumn({ id, title, icon, todos, onDeleteTodo }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[280px] max-w-[360px] flex flex-col">
      {/* Header */}
      <div className={`flex items-center gap-2 p-3 bg-bg-elevated rounded-t border border-border-subtle border-b-0 ${columnColors[id]}`}>
        <span>{icon}</span>
        <span className="font-display text-sm uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-xs bg-bg-secondary px-2 py-0.5 rounded">
          {todos.length}
        </span>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 bg-bg-secondary border border-border-subtle rounded-b overflow-auto transition-colors ${
          isOver ? 'bg-accent-cyan/5 border-accent-cyan/30' : ''
        }`}
      >
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {todos.map((todo) => (
              <KanbanCard key={todo.id} todo={todo} onDelete={onDeleteTodo} />
            ))}
            {todos.length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">
                拖放任務到這裡
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
```

**Step 3: 創建 KanbanBoard.tsx**

```typescript
// src/components/kanban/KanbanBoard.tsx
import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { Todo } from '../../lib/types';

interface Props {
  todos: Todo[];
  onMoveTodo: (id: string, column: string, position: number) => void;
  onDeleteTodo?: (id: string) => void;
}

const columns = [
  { id: 'backlog', title: 'Backlog', icon: '📥' },
  { id: 'in_progress', title: '進行中', icon: '🔄' },
  { id: 'done', title: '完成', icon: '✅' },
];

export function KanbanBoard({ todos, onMoveTodo, onDeleteTodo }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const todosByColumn = useMemo(() => {
    const grouped: Record<string, Todo[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };
    todos.forEach((todo) => {
      const col = todo.column || 'backlog';
      if (grouped[col]) {
        grouped[col].push(todo);
      }
    });
    // Sort by position
    Object.keys(grouped).forEach((col) => {
      grouped[col].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });
    return grouped;
  }, [todos]);

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const todoId = active.id as string;
    const overId = over.id as string;

    // Determine target column
    let targetColumn = columns.find((c) => c.id === overId)?.id;
    if (!targetColumn) {
      // Dropped on another card - find its column
      const overTodo = todos.find((t) => t.id === overId);
      targetColumn = overTodo?.column || 'backlog';
    }

    // Calculate position
    const columnTodos = todosByColumn[targetColumn] || [];
    const overIndex = columnTodos.findIndex((t) => t.id === overId);
    const position = overIndex >= 0 ? overIndex : columnTodos.length;

    onMoveTodo(todoId, targetColumn, position);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            icon={col.icon}
            todos={todosByColumn[col.id] || []}
            onDeleteTodo={onDeleteTodo}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTodo && <KanbanCard todo={activeTodo} />}
      </DragOverlay>
    </DndContext>
  );
}
```

**Step 4: 創建 index.ts**

```typescript
// src/components/kanban/index.ts
export { KanbanBoard } from './KanbanBoard';
export { KanbanColumn } from './KanbanColumn';
export { KanbanCard } from './KanbanCard';
```

**Step 5: 驗證文件**

Run: `ls src/components/kanban/`
Expected: 列出所有創建的文件

---

### Task 3.4: 整合到 Todos 頁面

**Files:**
- Modify: `src/stores/todoStore.ts`
- Modify: `src/pages/Todos.tsx`
- Modify: `src/lib/api.ts`

**Step 1: 添加 moveTodo API**

```typescript
// src/lib/api.ts
export const todoApi = {
  // ... 現有方法
  move: (id: string, column: string, position: number) =>
    invoke<void>('move_todo', { id, column, position }),
};
```

**Step 2: 添加 moveTodo 到 store**

```typescript
// src/stores/todoStore.ts - 添加到 interface 和 implementation
moveTodo: (id: string, column: string, position: number) => Promise<void>;

// Implementation
moveTodo: async (id, column, position) => {
  await todoApi.move(id, column, position);
  // Optimistic update
  set((state) => ({
    todos: state.todos.map((t) =>
      t.id === id ? { ...t, column, position } : t
    ),
  }));
},
```

**Step 3: 更新 Todos.tsx 使用 KanbanBoard**

```typescript
// src/pages/Todos.tsx - 在 kanban view mode 中使用
import { KanbanBoard } from '../components/kanban';

// 在 viewMode === 'kanban' 的 render 區域
{viewMode === 'kanban' && (
  <KanbanBoard
    todos={filteredTodos}
    onMoveTodo={moveTodo}
    onDeleteTodo={handleDelete}
  />
)}
```

**Step 4: 驗證功能**

Run: `npm run tauri dev`
Expected: Todos 頁面的 Kanban 視圖支援拖放排序

**Step 5: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/models.rs src-tauri/src/commands.rs
git add src/components/kanban/ src/stores/todoStore.ts src/pages/Todos.tsx src/lib/api.ts
git commit -m "feat: add Kanban board view with drag-and-drop support"
```

---

## 驗收標準

### Phase 1 驗收
- [ ] 按 ⌘+Shift+D 可開啟/關閉 Quick Entry 視窗
- [ ] Quick Entry 可選擇專案和類型
- [ ] 送出後正確創建 Todo 或 Inbox Item
- [ ] ESC 可關閉視窗

### Phase 2 驗收
- [ ] Chat 輸入 `/help` 顯示指令列表
- [ ] `/status` 顯示今日工作摘要
- [ ] `/todo` 顯示 TODO 列表
- [ ] `/add <task>` 可新增 TODO

### Phase 3 驗收
- [ ] Kanban 視圖顯示三欄：Backlog/進行中/完成
- [ ] 拖放卡片可移動到不同欄位
- [ ] 移動後 status 自動更新
- [ ] 位置排序正確保存

---

## 風險與緩解

| 風險 | 緩解措施 |
|------|---------|
| 多視窗 bundle 失敗 | 確保 vite 配置正確，檢查 rollupOptions |
| 全局快捷鍵衝突 | 使用較少見的組合鍵，提供設定選項 |
| dnd-kit SSR 問題 | Tauri 是純客戶端，無此風險 |
| 資料庫遷移失敗 | 使用 .ok() 忽略已存在錯誤 |

---

## 相關文檔

- [Dev Tracker v2 優化設計](./2026-01-03-dev-tracker-v2-optimization-design.md)
- [UI 架構修復計劃](./2026-01-04-ui-architecture-fixes-plan.md) ✅ 已完成
- [Version Tracking 自動化](./2026-01-05-version-tracking-automation-plan.md)
