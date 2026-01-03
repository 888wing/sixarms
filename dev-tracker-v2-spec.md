# 🧠 Dev Tracker v2：AI 驅動嘅開發進度助手

## 產品定位

> **一個住喺你 Mac 嘅 AI 開發助手，自動追蹤你做咗乜、幫你規劃要做乜**

唔係一個被動嘅工具，而係一個**主動嘅 AI Agent**：
- 自動理解你每日嘅開發工作
- 透過對話幫你整理同規劃
- 用視覺化方式呈現進度

---

## 🎯 核心功能

### 1. 智能追蹤（過去）

| 功能 | 說明 |
|------|------|
| 自動掃描 | 每日偵測文件變更 |
| AI 分類 | 自動判斷變更類型（UI、Bug Fix、Feature、Refactor...）|
| 對話微調 | 透過對話補充/修正 AI 嘅理解 |
| 歷史記錄 | 完整嘅開發歷史 timeline |

### 2. 智能規劃（未來）

| 功能 | 說明 |
|------|------|
| TODO 管理 | AI 根據對話自動創建/更新 TODO |
| 里程碑 | 設定階段性目標 |
| 優先級建議 | AI 根據 context 建議下一步 |
| 提醒 | 智能提醒被遺忘嘅 task |

### 3. 視覺化 Dashboard

| 功能 | 說明 |
|------|------|
| 活動熱點圖 | GitHub 風格嘅 contribution graph |
| 專案列表 | 所有專案狀態一覽 |
| 進度圖表 | 每個專案嘅開發曲線 |
| TODO Kanban | 視覺化嘅任務板 |

---

## 🖥️ 用戶界面設計

### 主界面：對話 + Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Dev Tracker                                            ─  □  ✕        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │       🗓️ 活動熱點圖          │  │        📊 本週統計               │ │
│  │  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐  │  │                                  │ │
│  │  │░│░│▓│▓│█│░│ │▓│█│█│▓│░│  │  │  代碼變更: +1,247 / -382 行      │ │
│  │  │░│▓│▓│█│█│░│ │░│▓│█│▓│▓│  │  │  活躍專案: 3 個                   │ │
│  │  │▓│▓│█│█│▓│░│ │▓│▓│▓│░│░│  │  │  完成 TODO: 7 個                  │ │
│  │  │░│░│▓│▓│░│░│ │░│▓│░│░│░│  │  │  新增 TODO: 4 個                  │ │
│  │  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘  │  │                                  │ │
│  │  Jan        Feb        Mar  │  │                                  │ │
│  └──────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┤
│  │  📁 專案列表                                                         │
│  ├──────────────────────────────────────────────────────────────────────┤
│  │                                                                      │
│  │  🎮 PeakShift-Overdrive              🟢 活躍   今日 +127 行          │
│  │     ├─ 今日：優化卡牌動畫、修復計分 bug                               │
│  │     └─ TODO：音效系統 (3)、成就系統 (5)                              │
│  │                                                                      │
│  │  🌐 portfolio-website                🟡 緩慢   3 日前                │
│  │     └─ TODO：響應式設計 (2)                                          │
│  │                                                                      │
│  │  📱 side-project-x                   🔴 停滯   45 日前               │
│  │     └─ 考慮封存？                                                    │
│  │                                                                      │
│  └──────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┤
│  │  💬 對話                                                      ⌘ + K │
│  ├──────────────────────────────────────────────────────────────────────┤
│  │                                                                      │
│  │  🤖 我睇到你今日改咗好多 PeakShift 嘅 UI 相關檔案，主要係：          │
│  │     • lib/ui/components/card_widget.dart (+89 行)                   │
│  │     • lib/ui/overlays/game_overlay.dart (+34 行)                    │
│  │     呢啲係做緊咩？卡牌動畫優化？                                     │
│  │                                                                      │
│  │  👤 係，主要係加入卡牌翻轉同埋消除嘅動畫效果                          │
│  │                                                                      │
│  │  🤖 明白！我已經記錄咗：                                              │
│  │     📝 2024-01-15: 卡牌動畫優化 - 翻轉 + 消除效果                    │
│  │     你之前話要做音效系統，想唔想我加入今個禮拜嘅 TODO？               │
│  │                                                                      │
│  │  ┌────────────────────────────────────────────────────────────────┐ │
│  │  │ 輸入訊息...                                              Send ▶ │ │
│  │  └────────────────────────────────────────────────────────────────┘ │
│  └──────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────┘
```

### 快速對話框（全局快捷鍵 ⌘+Shift+D）

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🧠 Dev Tracker                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 今日做咗乜 / 想問乜 / 想規劃乜...                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  快捷指令：                                                 │
│  📊 /status     今日進度                                   │
│  ✅ /todo       TODO 列表                                  │
│  📅 /plan       本週規劃                                   │
│  📈 /stats      統計 Dashboard                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 AI Agent 工作流程

### 每日自動流程

```
                    每日掃描 (e.g. 6:00 AM)
                           │
                           ▼
              ┌────────────────────────┐
              │  掃描所有 project 目錄  │
              │  收集文件變更           │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  AI 分析變更類型        │
              │  (Grok API)            │
              │                        │
              │  Input:                │
              │  - 改咗邊啲檔案         │
              │  - 文件內容 diff        │
              │  - 專案 context        │
              │                        │
              │  Output:               │
              │  - 變更類型分類         │
              │  - 今日工作摘要         │
              │  - 建議嘅 TODO 更新     │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  儲存到本地數據庫       │
              │  等待用戶確認/微調      │
              └───────────┬────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  通知用戶              │
              │  「今日偵測到變更，     │
              │   想睇下摘要嗎？」      │
              └────────────────────────┘
```

### AI 分類邏輯

```
變更類型 (AI 自動判斷):
├── 🎨 UI/UX
│   └── 改動 ui/, components/, widgets/, styles/
├── 🐛 Bug Fix
│   └── commit message 或 diff 包含 fix, bug, issue
├── ✨ New Feature
│   └── 新增檔案、新增 function/class
├── ♻️ Refactor
│   └── 大量 rename、移動檔案、改結構
├── 📝 Documentation
│   └── README, docs/, comments
├── ⚡ Performance
│   └── 優化相關改動
├── 🧪 Testing
│   └── test/, spec/, _test.dart
└── 🔧 Config/Setup
    └── 設定檔、build 相關
```

### 對話微調流程

```
用戶：「今日做嘅唔係 bug fix，係加新功能」

       │
       ▼
┌─────────────────────────────────────────┐
│  AI 理解用戶意圖                         │
│  → 更正分類: Bug Fix → New Feature       │
│  → 更新數據庫                            │
│  → 學習 pattern（下次類似改動點分類）     │
└─────────────────────────────────────────┘
       │
       ▼
AI：「已更新！呢個功能叫咩名？我記錄落去」
```

---

## 🏗️ 技術架構

### 選項比較

| 方案 | 優點 | 缺點 | 適合 |
|------|------|------|------|
| **Tauri (Rust + Web)** | 跨平台、Web 技術做 UI、Rust 做核心 | 需要識 Web + Rust | ✅ 推薦 |
| **Swift + Rust** | 原生 macOS 體驗 | 只限 Mac、Swift 學習曲線 | 純 Mac 用戶 |
| **Electron** | 最快開發 | 食 RAM、肥 | 唔推薦 |

### 推薦架構：Tauri

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Dev Tracker                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                        Frontend (WebView)                        │   │
│   │                                                                  │   │
│   │   React/Solid + Tailwind + Recharts/D3                          │   │
│   │   • 對話 UI                                                      │   │
│   │   • Dashboard + 視覺化圖表                                       │   │
│   │   • 專案列表                                                     │   │
│   │   • TODO Kanban                                                  │   │
│   │                                                                  │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │ Tauri IPC                               │
│   ┌───────────────────────────┴─────────────────────────────────────┐   │
│   │                        Backend (Rust)                            │   │
│   │                                                                  │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │   │
│   │   │   Scanner   │  │  AI Client  │  │      Data Store         │ │   │
│   │   │             │  │   (Grok)    │  │       (SQLite)          │ │   │
│   │   │ • 文件監控   │  │             │  │                         │ │   │
│   │   │ • Diff 計算  │  │ • 分類分析  │  │ • Projects              │ │   │
│   │   │ • TODO 解析  │  │ • 摘要生成  │  │ • Snapshots             │ │   │
│   │   │             │  │ • 對話處理  │  │ • TODOs                 │ │   │
│   │   │             │  │             │  │ • Plans                 │ │   │
│   │   └─────────────┘  └─────────────┘  │ • Conversations         │ │   │
│   │                                     └─────────────────────────┘ │   │
│   │   ┌─────────────────────────────────────────────────────────┐   │   │
│   │   │                    Scheduler                             │   │   │
│   │   │    • 每日掃描 (cron)                                     │   │   │
│   │   │    • 背景同步                                            │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │                                                                  │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 目錄結構

```
dev-tracker/
├── Cargo.toml                    # Rust workspace
├── tauri.conf.json               # Tauri 設定
│
├── src-tauri/                    # Rust Backend
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs               # 入口
│       ├── commands/             # Tauri commands (IPC)
│       │   ├── mod.rs
│       │   ├── scan.rs           # 掃描相關
│       │   ├── ai.rs             # AI 對話
│       │   ├── todo.rs           # TODO 管理
│       │   └── stats.rs          # 統計數據
│       │
│       ├── core/
│       │   ├── mod.rs
│       │   ├── scanner.rs        # 文件掃描器
│       │   ├── differ.rs         # Diff 計算
│       │   ├── todo_parser.rs    # TODO 解析
│       │   └── classifier.rs     # 變更分類
│       │
│       ├── ai/
│       │   ├── mod.rs
│       │   ├── grok_client.rs    # Grok API
│       │   ├── prompts.rs        # Prompt 模板
│       │   └── context.rs        # Context 管理
│       │
│       ├── db/
│       │   ├── mod.rs
│       │   ├── models.rs         # 數據模型
│       │   ├── migrations/       # SQLite migrations
│       │   └── queries.rs        # 查詢邏輯
│       │
│       └── scheduler/
│           ├── mod.rs
│           └── daily_scan.rs     # 每日掃描任務
│
├── src/                          # Frontend (React/Solid)
│   ├── App.tsx
│   ├── components/
│   │   ├── Chat/                 # 對話 UI
│   │   ├── Dashboard/            # Dashboard
│   │   ├── ProjectList/          # 專案列表
│   │   ├── HeatMap/              # 熱點圖
│   │   ├── TodoKanban/           # TODO 看板
│   │   └── QuickDialog/          # 快捷對話框
│   │
│   ├── hooks/
│   │   ├── useAI.ts              # AI 對話 hook
│   │   ├── useProjects.ts        # 專案數據
│   │   └── useStats.ts           # 統計數據
│   │
│   └── lib/
│       ├── tauri.ts              # Tauri IPC wrapper
│       └── types.ts              # TypeScript types
│
├── public/
│   └── icons/
│
└── config/
    └── default.toml              # 預設設定
```

---

## 🗄️ 數據模型（擴展版）

### SQLite Schema

```sql
-- ============================================
-- 專案管理
-- ============================================

CREATE TABLE projects (
    id TEXT PRIMARY KEY,  -- UUID
    path TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    types TEXT,  -- JSON: ["flutter", "game"]
    description TEXT,  -- AI 生成或用戶填寫
    status TEXT DEFAULT 'active',  -- active, paused, archived
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 每日快照（自動掃描結果）
-- ============================================

CREATE TABLE daily_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    date DATE NOT NULL,  -- 每日一條記錄
    
    -- 文件統計
    total_files INTEGER,
    total_lines INTEGER,
    
    -- 變更統計
    files_changed INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    
    -- 變更嘅檔案列表 (JSON)
    changed_files TEXT,  -- [{"path": "...", "added": 10, "removed": 5}]
    
    -- AI 分析結果
    ai_classification TEXT,  -- JSON: {"ui": 45, "feature": 30, "bugfix": 25}
    ai_summary TEXT,  -- AI 生成嘅摘要
    
    -- 用戶修正（如果有）
    user_notes TEXT,
    user_classification_override TEXT,  -- 用戶手動修正分類
    
    -- TODO 統計
    todo_count INTEGER DEFAULT 0,
    fixme_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, date)
);

-- ============================================
-- TODO / 任務管理
-- ============================================

CREATE TABLE todos (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    
    -- 內容
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,  -- feature, bugfix, refactor, etc.
    
    -- 來源
    source TEXT,  -- 'code' (從代碼掃描), 'manual' (手動), 'ai' (AI 建議)
    source_file TEXT,  -- 如果係從代碼嚟
    source_line INTEGER,
    
    -- 狀態
    status TEXT DEFAULT 'todo',  -- todo, in_progress, done, cancelled
    priority TEXT DEFAULT 'medium',  -- low, medium, high, urgent
    
    -- 時間
    due_date DATE,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 規劃 / 里程碑
-- ============================================

CREATE TABLE milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    
    status TEXT DEFAULT 'planned',  -- planned, in_progress, completed, delayed
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- 里程碑包含嘅 TODO
CREATE TABLE milestone_todos (
    milestone_id TEXT REFERENCES milestones(id),
    todo_id TEXT REFERENCES todos(id),
    PRIMARY KEY (milestone_id, todo_id)
);

-- ============================================
-- 對話歷史（用於 context）
-- ============================================

CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),  -- 可以係 NULL（通用對話）
    
    messages TEXT NOT NULL,  -- JSON array of messages
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AI 學習 / 偏好
-- ============================================

CREATE TABLE user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用戶對 AI 分類嘅修正（用於學習）
CREATE TABLE classification_feedback (
    id TEXT PRIMARY KEY,
    file_pattern TEXT,  -- e.g., "lib/ui/**"
    ai_classification TEXT,
    user_correction TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_snapshots_date ON daily_snapshots(project_id, date);
CREATE INDEX idx_todos_status ON todos(project_id, status);
CREATE INDEX idx_todos_priority ON todos(priority, status);
```

---

## 🤖 AI Prompts 設計

### 每日分析 Prompt

```
你係一個開發進度追蹤助手。
分析以下文件變更，判斷今日嘅開發工作類型。

專案資訊：
- 名稱：{project_name}
- 類型：{project_types}
- 描述：{project_description}

今日變更嘅檔案：
{changed_files_with_diff}

請返回 JSON 格式：
{
  "classification": {
    "ui": 0-100,        // UI/UX 相關
    "feature": 0-100,   // 新功能
    "bugfix": 0-100,    // Bug 修復
    "refactor": 0-100,  // 重構
    "docs": 0-100,      // 文檔
    "test": 0-100,      // 測試
    "config": 0-100     // 設定
  },
  "summary": "用廣東話寫嘅一句話摘要",
  "highlights": ["重點 1", "重點 2"],
  "suggested_todos": [
    {"title": "建議嘅 TODO", "priority": "medium"}
  ]
}
```

### 對話 Prompt

```
你係 Dev Tracker，一個幫開發者追蹤進度同規劃嘅 AI 助手。
用廣東話回覆，語氣友善但簡潔。

用戶嘅專案資料：
{projects_context}

今日嘅開發情況：
{today_snapshot}

待辦事項：
{todos}

你可以執行嘅動作：
- update_snapshot(project_id, notes, classification_override)
- create_todo(project_id, title, priority, category)
- complete_todo(todo_id)
- create_milestone(project_id, title, target_date)
- answer_question(response)

用戶話：{user_message}

請決定要執行咩動作，並返回 JSON：
{
  "action": "action_name",
  "params": {...},
  "response": "俾用戶嘅回覆"
}
```

---

## 📊 視覺化組件

### 1. 活動熱點圖

```
GitHub 風格，顯示過去一年嘅開發活動

技術：D3.js 或 cal-heatmap
數據源：daily_snapshots 表

顏色分級：
□ 0 commits      (空白)
░ 1-3 commits    (淺色)
▒ 4-7 commits    (中等)
▓ 8-12 commits   (深色)
█ 13+ commits    (最深)
```

### 2. 專案進度圖

```
每個專案嘅代碼行數變化曲線

技術：Recharts / Chart.js
數據源：daily_snapshots 表

X 軸：日期
Y 軸：累計代碼行數
多條線：不同專案
```

### 3. 分類餅圖

```
本週/本月嘅工作類型分佈

技術：Recharts
數據源：ai_classification 聚合

餅圖 slices：
🎨 UI/UX: 35%
✨ Feature: 30%
🐛 Bug Fix: 20%
♻️ Refactor: 10%
📝 Docs: 5%
```

### 4. TODO Kanban

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   📝 Todo   │ │ 🚧 進行中   │ │  ✅ 完成    │
├─────────────┤ ├─────────────┤ ├─────────────┤
│             │ │             │ │             │
│ [高] 音效   │ │ [中] 動畫   │ │ [低] README │
│ [中] 成就   │ │             │ │ [中] 計分   │
│ [低] 多語言 │ │             │ │             │
│             │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘

技術：react-beautiful-dnd 或 @dnd-kit
數據源：todos 表
```

---

## 🚀 實施計劃

### Phase 1：基礎架構（2 週）

**Week 1：Rust Core**
- [ ] Tauri 專案初始化
- [ ] SQLite 設定 + migrations
- [ ] 基礎 Scanner（改進現有 project-scanner）
- [ ] Diff 計算邏輯

**Week 2：基礎 UI**
- [ ] React/Solid 設定
- [ ] 基礎 layout
- [ ] 專案列表組件
- [ ] Tauri IPC 連接

**完成後：** 可以掃描 projects 並顯示列表

---

### Phase 2：AI 整合（1.5 週）

- [ ] Grok API client (Rust)
- [ ] 每日分析 prompt
- [ ] 對話 prompt
- [ ] 基礎對話 UI
- [ ] 分類結果儲存

**完成後：** 可以同 AI 對話，AI 可以分析變更

---

### Phase 3：視覺化（1.5 週）

- [ ] 活動熱點圖
- [ ] 專案進度圖
- [ ] 分類餅圖
- [ ] Dashboard layout

**完成後：** 有靚嘅 dashboard

---

### Phase 4：TODO + 規劃（1 週）

- [ ] TODO 管理 UI
- [ ] Kanban 組件
- [ ] 里程碑功能
- [ ] AI TODO 建議

**完成後：** 完整嘅任務管理

---

### Phase 5：自動化 + 打磨（1 週）

- [ ] 每日自動掃描
- [ ] 全局快捷鍵
- [ ] 通知系統
- [ ] 設定頁面
- [ ] 打磨 UI/UX

**完成後：** 可用嘅 MVP

---

### Phase 6：進階功能（持續）

- [ ] 用戶偏好學習
- [ ] 更智能嘅建議
- [ ] 報告生成（週報/月報）
- [ ] 數據導出
- [ ] 產品化準備

---

## ⚙️ 設定設計

```toml
# ~/.config/dev-tracker/config.toml

[general]
# 掃描嘅根目錄
project_roots = [
    "~/Desktop",
    "~/Developer"
]

# 語言
language = "zh-HK"

[appearance]
# 主題
theme = "system"  # system, light, dark

# 快捷鍵
global_shortcut = "CommandOrControl+Shift+D"

[scanning]
# 每日掃描時間
daily_scan_time = "06:00"

# 保留幾多日嘅數據
retention_days = 365

[ai]
provider = "grok"
model = "grok-beta"
# API key 從環境變數或 keychain 讀取

[notifications]
enabled = true
daily_summary = true
stale_project_reminder = true
stale_threshold_days = 14
```

---

## 📝 下一步行動

1. **確認技術棧**：Tauri + React/Solid OK？
2. **設計優先級**：先做邊個功能？
3. **開始 coding**：我可以幫你寫 scaffold

---

## 💡 產品化路線（未來）

```
當前階段：本地 App + Grok API (client-side)
     │
     ▼
產品化階段：
     │
     ├── Backend API 層（隱藏 API key）
     │   └── Cloudflare Workers / Vercel Edge
     │
     ├── 用戶認證
     │   └── Clerk / Auth0
     │
     ├── 雲端同步（可選）
     │   └── 多設備同步數據
     │
     └── 訂閱制 / 一次買斷
```

---

**呢個就係完整嘅 Dev Tracker v2 規劃。**
你覺得點？有冇想調整嘅地方？
