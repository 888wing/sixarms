# UI/UX 及架構修復實施計劃

> **狀態:** ✅ 已完成 (2026-01-04)
> **完成日期:** 2026-01-04

**Goal:** 修復 Sixarms 應用程式中 8 個系統性 UI/UX 和架構問題，提升用戶體驗和數據一致性。

**Architecture:** 採用漸進式修復策略，從簡單的 UI 修復開始（Phase 1），逐步深入到 Store 同步和事件系統改進（Phase 3）。每個修復都遵循 TDD 原則，確保不引入回歸問題。

**Tech Stack:** React 18, TypeScript, Zustand, Tauri v2, Framer Motion

---

## 問題摘要

| # | 問題 | 類型 | 嚴重程度 | Phase |
|---|------|------|---------|-------|
| 1 | Inbox badge 硬編碼為 3 | Bug | 🔴 Critical | 1 |
| 2 | Sidebar 只有 hover，無 toggle/pin | UX | 🔴 Critical | 1 |
| 3 | Store 之間缺乏同步 | 架構 | 🔴 High | 3 |
| 4 | Todo/Inbox 無專案過濾 | 功能缺失 | 🟡 Medium | 2 |
| 5 | Stats API 無專案維度 | 功能缺失 | 🟡 Medium | 2 |
| 6 | 重複的 ProjectSelector 代碼 | 技術債 | 🟢 Low | 2 |
| 7 | 缺少即時更新機制 | UX | 🟡 Medium | 3 |
| 8 | Event 系統不完整 | 架構 | 🟡 Medium | 3 |

---

## Phase 1: Quick Wins（預計 1-2 小時）

### Task 1.1: 修復 Inbox Badge 動態顯示

**Root Cause:** `Sidebar.tsx:28` 硬編碼 `badge: 3`，未連接 `inboxStore`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:1-161`

**Step 1: 導入 inboxStore**

在 Sidebar.tsx 頂部添加導入：

```typescript
// src/components/layout/Sidebar.tsx:1-13
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BarChart3,
  MessageSquare,
  Inbox,
  CheckSquare,
  GitBranch,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useInboxStore } from "../../stores/inboxStore";
```

**Step 2: 獲取動態 pending count**

在 Sidebar 組件內部添加 store 連接和初始化：

```typescript
// src/components/layout/Sidebar.tsx - 在 Sidebar 函數開頭
export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  // 連接 inbox store 獲取動態 badge 數量
  const { pendingCount, fetchItems } = useInboxStore();
  const inboxBadgeCount = pendingCount();

  // 初始化時獲取 inbox items
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
```

**Step 3: 移除硬編碼 badge，改為動態計算**

修改 navItems 定義，移除靜態 badge：

```typescript
// src/components/layout/Sidebar.tsx:22-30 - 移除 badge: 3
const navItems: NavItem[] = [
  { icon: Home, label: "HOME", path: "/" },
  { icon: BarChart3, label: "DASH", path: "/dashboard" },
  { icon: CheckSquare, label: "TODO", path: "/todos" },
  { icon: GitBranch, label: "VER", path: "/versions" },
  { icon: MessageSquare, label: "CHAT", path: "/chat" },
  { icon: Inbox, label: "INBOX", path: "/inbox" },  // 移除 badge: 3
  { icon: Settings, label: "SET", path: "/settings" },
];
```

**Step 4: 動態傳入 badge 值**

修改渲染邏輯，為 inbox 路徑動態添加 badge：

```typescript
// src/components/layout/Sidebar.tsx - 在 navItems.map 內
{navItems.map((item) => {
  const isActive = location.pathname === item.path;
  const Icon = item.icon;
  // 動態計算 badge - 只有 inbox 且有 pending items 時顯示
  const badge = item.path === "/inbox" && inboxBadgeCount > 0
    ? inboxBadgeCount
    : undefined;

  return (
    <li key={item.path}>
      <NavLink
        // ... 現有屬性 ...
      >
        {/* ... 現有內容 ... */}

        {/* Badge - 使用動態 badge 變量 */}
        {badge && (
          <motion.span
            className={`
              absolute flex items-center justify-center
              text-xs font-mono font-bold
              ${isExpanded ? "right-3" : "top-1 right-1"}
              ${isActive ? "text-accent-cyan" : "text-accent-rose"}
            `}
            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isExpanded ? (
              <span className="bg-accent-rose/20 text-accent-rose px-2 py-0.5 rounded-full ai-indicator">
                {badge}
              </span>
            ) : (
              <span className="w-4 h-4 bg-accent-rose/20 text-accent-rose rounded-full flex items-center justify-center ai-indicator">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </motion.span>
        )}
      </NavLink>
    </li>
  );
})}
```

**Step 5: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Inbox badge 顯示實際 pending 數量
- 當 pending 為 0 時不顯示 badge
- 答覆 inbox item 後 badge 數量即時更新

**Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "fix(sidebar): connect inbox badge to inboxStore for dynamic count"
```

---

### Task 1.2: Sidebar 添加 Toggle/Pin 功能

**Root Cause:** `Sidebar.tsx:42-43` 只有 hover 觸發，沒有手動控制選項

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: 添加 pinned 狀態**

```typescript
// src/components/layout/Sidebar.tsx - 在 Sidebar 函數開頭
export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);  // 新增 pinned 狀態
  const location = useLocation();
```

**Step 2: 修改 hover 邏輯，考慮 pinned 狀態**

```typescript
// src/components/layout/Sidebar.tsx - 修改 motion.aside 的 handlers
<motion.aside
  className="fixed left-0 top-0 h-screen bg-bg-primary border-r border-border-subtle flex flex-col z-50"
  initial={false}
  animate={{ width: isExpanded || isPinned ? 240 : 64 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
  onMouseEnter={() => !isPinned && setIsExpanded(true)}
  onMouseLeave={() => !isPinned && setIsExpanded(false)}
>
```

**Step 3: 添加 Pin 按鈕**

在 Logo 區域添加 pin toggle 按鈕：

```typescript
// src/components/layout/Sidebar.tsx - Logo 區域內
{/* Logo */}
<div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle">
  <motion.div
    className="flex items-center gap-3 overflow-hidden"
    animate={{ opacity: 1 }}
  >
    <img src="/logo.svg" alt="Sixarms" className="w-8 h-8" />
    <AnimatePresence>
      {(isExpanded || isPinned) && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="font-display font-bold text-text-primary tracking-wider whitespace-nowrap"
        >
          SIXARMS
        </motion.span>
      )}
    </AnimatePresence>
  </motion.div>

  {/* Pin Toggle Button */}
  <AnimatePresence>
    {(isExpanded || isPinned) && (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={() => setIsPinned(!isPinned)}
        className={`
          p-1.5 rounded transition-colors
          ${isPinned
            ? "text-accent-cyan bg-accent-cyan/10"
            : "text-text-muted hover:text-text-primary hover:bg-bg-secondary"
          }
        `}
        title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isPinned ? "rotate-45" : ""}
        >
          <path d="M12 2v10" />
          <path d="M9 4.5l6-1.5" />
          <path d="M9 9l6 1.5" />
          <path d="M12 12v10" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </motion.button>
    )}
  </AnimatePresence>
</div>
```

**Step 4: 更新 expand indicator 邏輯**

```typescript
// src/components/layout/Sidebar.tsx - 底部 expand indicator
{/* Expand indicator - 只在非 pinned 時顯示 */}
{!isPinned && (
  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
    <motion.div
      animate={{ rotate: isExpanded ? 180 : 0 }}
      className="w-4 h-4 bg-bg-secondary border border-border-subtle rounded-full flex items-center justify-center text-text-muted"
    >
      <ChevronRight size={10} />
    </motion.div>
  </div>
)}
```

**Step 5: 更新 App.tsx 為 Sidebar 預留空間**

```typescript
// src/App.tsx - 修改 main content 區域
<BrowserRouter>
  <div className="app-background min-h-screen flex">
    <Sidebar />
    {/* 為 fixed sidebar 預留空間 */}
    <div className="w-16 flex-shrink-0" />
    <main className="flex-1 overflow-auto">
      <Routes>
        {/* ... routes ... */}
      </Routes>
    </main>
  </div>
</BrowserRouter>
```

**Step 6: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Sidebar 默認為 collapsed 狀態
- Hover 時展開，離開時收合
- 點擊 Pin 按鈕後保持展開
- Pin 狀態下 hover 不影響展開狀態
- Sidebar 為 fixed 定位，主內容滾動時不影響

**Step 7: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat(sidebar): add pin/toggle functionality and fixed positioning"
```

---

### Task 1.3: 更新 NavItem 類型定義（清理）

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:15-20`

**Step 1: 移除 badge 從 NavItem interface**

```typescript
// src/components/layout/Sidebar.tsx:15-19
interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  // badge 已移除，因為現在是動態計算的
}
```

**Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "refactor(sidebar): remove static badge from NavItem interface"
```

---

## Phase 2: Core Improvements（預計 4-6 小時）

### Task 2.1: 提取共用 ProjectSelector 組件

**Root Cause:** Chat.tsx 和 VersionTracking.tsx 有重複的 project selector 代碼

**Files:**
- Create: `src/components/ProjectSelector.tsx`
- Modify: `src/pages/Chat.tsx`
- Modify: `src/components/VersionTracking.tsx`

**Step 1: 創建共用 ProjectSelector 組件**

```typescript
// src/components/ProjectSelector.tsx
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useProjectStore } from "../stores/projectStore";

interface ProjectSelectorProps {
  showAllOption?: boolean;
  allLabel?: string;
  className?: string;
}

export function ProjectSelector({
  showAllOption = true,
  allLabel = "All Projects",
  className = ""
}: ProjectSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    projects,
    selectedProjectId,
    fetchProjects,
    selectProject,
  } = useProjectStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const activeProjects = projects.filter((p) => p.status === "active");

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string | null) => {
    selectProject(id);
    setShowMenu(false);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-text-secondary hover:text-accent-cyan transition-colors"
      >
        <span className="text-lg">{selectedProject ? "📁" : "🌐"}</span>
        <span className="font-mono text-sm">
          {selectedProject?.name ?? allLabel}
        </span>
        <ChevronDown size={16} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-bg-elevated border border-border-subtle rounded shadow-lg z-10 min-w-[200px]">
          {showAllOption && (
            <button
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary transition-colors ${
                !selectedProjectId ? "text-accent-cyan" : "text-text-secondary"
              }`}
            >
              🌐 {allLabel}
            </button>
          )}
          {activeProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project.id)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary transition-colors ${
                selectedProjectId === project.id ? "text-accent-cyan" : "text-text-secondary"
              }`}
            >
              📁 {project.name}
            </button>
          ))}
          {activeProjects.length === 0 && (
            <div className="px-4 py-2 text-sm text-text-muted">
              No active projects
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: 更新 Chat.tsx 使用共用組件**

```typescript
// src/pages/Chat.tsx - 導入
import { ProjectSelector } from "../components/ProjectSelector";

// src/pages/Chat.tsx - 移除重複代碼，使用共用組件
// 在 header 區域替換原有的 project selector
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="p-4 border-b border-border-subtle flex items-center justify-between"
>
  <h1 className="section-header text-xl">CHAT</h1>
  <ProjectSelector />
</motion.header>
```

**Step 3: 更新 VersionTracking.tsx 使用共用組件**

```typescript
// src/components/VersionTracking.tsx - 導入
import { ProjectSelector } from "./ProjectSelector";

// 在 header 區域替換原有的 project selector
<div className="flex items-center gap-3">
  <button
    onClick={handleRefreshTags}
    disabled={tagsLoading}
    className={/* ... */}
  >
    {/* ... */}
  </button>
  <ProjectSelector allLabel="全部專案" />
</div>
```

**Step 4: 移除 Chat.tsx 中的重複代碼**

移除以下變量和 JSX：
- `showProjectMenu` state
- `projectMenuRef` ref
- `handleProjectSelect` function
- `handleClickOutside` useEffect
- 整個 project menu dropdown JSX

**Step 5: 移除 VersionTracking.tsx 中的重複代碼**

移除以下變量和 JSX：
- `showProjectMenu` state
- `projectMenuRef` ref
- `handleProjectSelect` function
- `handleClickOutside` useEffect（與 project menu 相關的）
- 整個 project menu dropdown JSX

**Step 6: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Chat 頁面的專案選擇器正常工作
- Version 頁面的專案選擇器正常工作
- 選擇專案後各頁面正確過濾數據
- 兩個頁面行為一致

**Step 7: Commit**

```bash
git add src/components/ProjectSelector.tsx src/pages/Chat.tsx src/components/VersionTracking.tsx
git commit -m "refactor: extract shared ProjectSelector component"
```

---

### Task 2.2: Todo 頁面添加專案過濾

**Root Cause:** `todoApi.getAll` 只支援 status 過濾，UI 沒有專案選擇器

**Files:**
- Modify: `src/lib/api.ts:103-105`
- Modify: `src/stores/todoStore.ts:49-56`
- Modify: `src/pages/Todos.tsx`

**Step 1: 更新 todoApi 支援 projectId 過濾**

```typescript
// src/lib/api.ts:103-106
export const todoApi = {
  getAll: (status?: TodoStatus, projectId?: string) =>
    invoke<Todo[]>('get_todos', { status, project_id: projectId }),
```

**Step 2: 更新 todoStore.fetchTodos 接受 projectId**

```typescript
// src/stores/todoStore.ts:16,49-56
interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;

  // Computed
  pendingTodos: () => Todo[];
  completedTodos: () => Todo[];
  todayTodos: () => Todo[];

  // Actions
  fetchTodos: (status?: TodoStatus, projectId?: string) => Promise<void>;  // 更新
  // ...
}

// ...

fetchTodos: async (status?: TodoStatus, projectId?: string) => {
  set({ loading: true, error: null });
  try {
    const todos = await todoApi.getAll(status, projectId);
    set({ todos, loading: false });
  } catch (error) {
    set({ error: String(error), loading: false });
  }
},
```

**Step 3: 更新 Todos.tsx 添加專案選擇器**

```typescript
// src/pages/Todos.tsx - 添加導入
import { ProjectSelector } from "../components/ProjectSelector";
import { useProjectStore } from "../stores/projectStore";

// src/pages/Todos.tsx - 在組件內添加
const { selectedProjectId } = useProjectStore();

// 更新 useEffect 以響應專案變化
useEffect(() => {
  fetchTodos(undefined, selectedProjectId ?? undefined);
}, [fetchTodos, selectedProjectId]);

// 在 header 添加 ProjectSelector
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center justify-between mb-8"
>
  <h1 className="section-header text-2xl">TODOS</h1>
  <ProjectSelector />
</motion.header>
```

**Step 4: 檢查後端是否支援 project_id 過濾**

檢查 `src-tauri/src/commands.rs` 的 `get_todos` 命令是否處理 `project_id` 參數。

如果不支援，需要更新後端：

```rust
// src-tauri/src/commands.rs
#[tauri::command]
pub fn get_todos(
    db: State<Database>,
    status: Option<String>,
    project_id: Option<String>,  // 添加此參數
) -> Result<Vec<Todo>, String> {
    db.get_todos(status.as_deref(), project_id.as_deref())
        .map_err(|e| e.to_string())
}
```

**Step 5: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Todos 頁面顯示專案選擇器
- 選擇專案後只顯示該專案的 todos
- 選擇 "All Projects" 顯示所有 todos

**Step 6: Commit**

```bash
git add src/lib/api.ts src/stores/todoStore.ts src/pages/Todos.tsx
git commit -m "feat(todos): add project filtering support"
```

---

### Task 2.3: Inbox 頁面添加專案過濾

**Files:**
- Modify: `src/lib/api.ts:131-133`
- Modify: `src/stores/inboxStore.ts:48-55`
- Modify: `src/pages/Inbox.tsx`

**Step 1: 更新 inboxApi 支援 projectId 過濾**

```typescript
// src/lib/api.ts:131-133
export const inboxApi = {
  getAll: (status?: InboxStatus, projectId?: string) =>
    invoke<InboxItem[]>('get_inbox_items', { status, project_id: projectId }),
```

**Step 2: 更新 inboxStore.fetchItems 接受 projectId**

```typescript
// src/stores/inboxStore.ts:18,48-55
interface InboxState {
  // ...
  fetchItems: (status?: InboxStatus, projectId?: string) => Promise<void>;
  // ...
}

fetchItems: async (status?: InboxStatus, projectId?: string) => {
  set({ loading: true, error: null });
  try {
    const items = await inboxApi.getAll(status, projectId);
    set({ items, loading: false });
  } catch (error) {
    set({ error: String(error), loading: false });
  }
},
```

**Step 3: 更新 Inbox.tsx 添加專案選擇器**

```typescript
// src/pages/Inbox.tsx - 添加導入
import { ProjectSelector } from "../components/ProjectSelector";
import { useProjectStore } from "../stores/projectStore";

// src/pages/Inbox.tsx - 在組件內添加
const { selectedProjectId } = useProjectStore();

// 更新 useEffect 以響應專案變化
useEffect(() => {
  fetchProjects();
  fetchItems(undefined, selectedProjectId ?? undefined);
}, [fetchProjects, fetchItems, selectedProjectId]);

// 更新 handleFilterChange 以傳遞 projectId
const handleFilterChange = (newFilter: "all" | "pending" | "answered") => {
  setFilter(newFilter);
  const status = newFilter === "all" ? undefined : newFilter;
  fetchItems(status, selectedProjectId ?? undefined);
};

// 在 header 區域添加 ProjectSelector
<div className="flex items-center justify-between mb-4">
  <h1 className="section-header text-2xl">INBOX</h1>
  <div className="flex items-center gap-4">
    <ProjectSelector />
    <div className="flex items-center gap-4 text-sm">
      <span className="text-accent-rose font-mono">
        [{pendingCount()}] Pending
      </span>
      <span className="text-text-muted">·</span>
      <span className="text-text-secondary font-mono">
        {answeredCount()} Processed
      </span>
    </div>
  </div>
</div>
```

**Step 4: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Inbox 頁面顯示專案選擇器
- 選擇專案後只顯示該專案的 inbox items
- Filter 切換時保持專案過濾

**Step 5: Commit**

```bash
git add src/lib/api.ts src/stores/inboxStore.ts src/pages/Inbox.tsx
git commit -m "feat(inbox): add project filtering support"
```

---

### Task 2.4: Dashboard 添加專案過濾

**Root Cause:** `statsApi` 沒有 projectId 參數，Dashboard 顯示全局統計

**Files:**
- Modify: `src/lib/api.ts:309-314`
- Modify: `src/stores/statsStore.ts`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: 更新 statsApi 支援 projectId**

```typescript
// src/lib/api.ts:309-315
export const statsApi = {
  getActivity: (days?: number, projectId?: string) =>
    invoke<[string, number][]>('get_activity_stats', { days, project_id: projectId }),

  getCategoryDistribution: (projectId?: string) =>
    invoke<[string, number][]>('get_category_distribution', { project_id: projectId }),
};
```

**Step 2: 更新 statsStore 支援 projectId**

```typescript
// src/stores/statsStore.ts
interface StatsState {
  activityData: [string, number][];
  categoryDistribution: [string, number][];
  loading: boolean;
  error: string | null;

  fetchActivityStats: (days?: number, projectId?: string) => Promise<void>;
  fetchCategoryDistribution: (projectId?: string) => Promise<void>;
  fetchAllStats: (projectId?: string) => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  activityData: [],
  categoryDistribution: [],
  loading: false,
  error: null,

  fetchActivityStats: async (days?: number, projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.getActivity(days, projectId);
      set({ activityData: data, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchCategoryDistribution: async (projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await statsApi.getCategoryDistribution(projectId);
      set({ categoryDistribution: data, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchAllStats: async (projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const [activity, distribution] = await Promise.all([
        statsApi.getActivity(365, projectId),
        statsApi.getCategoryDistribution(projectId),
      ]);
      set({
        activityData: activity,
        categoryDistribution: distribution,
        loading: false,
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
```

**Step 3: 更新 Dashboard.tsx 添加專案選擇器**

```typescript
// src/pages/Dashboard.tsx - 添加導入
import { ProjectSelector } from "../components/ProjectSelector";
import { useProjectStore } from "../stores/projectStore";

// src/pages/Dashboard.tsx - 在組件內添加
const { selectedProjectId } = useProjectStore();

// 更新 useEffect 以響應專案變化
useEffect(() => {
  fetchAllStats(selectedProjectId ?? undefined);
  fetchTodos();
  fetchProjects();
}, [fetchAllStats, fetchTodos, fetchProjects, selectedProjectId]);

// 在 header 添加 ProjectSelector
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center justify-between mb-8"
>
  <h1 className="section-header text-2xl">DASHBOARD</h1>
  <div className="flex items-center gap-4">
    <ProjectSelector />
    <select
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
      className="terminal-input text-sm py-2"
    >
      <option value="month">This Month</option>
      <option value="quarter">This Quarter</option>
      <option value="year">This Year</option>
    </select>
  </div>
</motion.header>
```

**Step 4: 檢查/更新後端 stats 命令**

確保後端 `get_activity_stats` 和 `get_category_distribution` 支援 `project_id` 過濾。

**Step 5: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Dashboard 顯示專案選擇器
- 選擇專案後 heatmap 和 distribution 只顯示該專案數據
- 切換專案時數據即時更新

**Step 6: Commit**

```bash
git add src/lib/api.ts src/stores/statsStore.ts src/pages/Dashboard.tsx
git commit -m "feat(dashboard): add project filtering for statistics"
```

---

## Phase 3: Architecture Improvements（預計 1-2 天）

### Task 3.1: 完善事件系統 - 創建事件監聽 Hook

**Root Cause:** `useSchedulerEvents` 只顯示 toast，不刷新 stores

**Files:**
- Create: `src/hooks/useAppEvents.ts`
- Modify: `src/App.tsx`

**Step 1: 創建統一的事件監聽 Hook**

```typescript
// src/hooks/useAppEvents.ts
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useToast } from '../components/Toast';
import { useInboxStore } from '../stores/inboxStore';
import { useTodoStore } from '../stores/todoStore';
import { useStatsStore } from '../stores/statsStore';
import { useDailyLogStore } from '../stores/dailyLogStore';

interface AppEventPayloads {
  'scheduler:startup-scan-started': null;
  'scheduler:startup-scan-complete': number;
  'scheduler:scan-started': null;
  'scheduler:scan-complete': number;
  'inbox:item-created': { id: string; project_id?: string };
  'todo:created': { id: string; project_id?: string };
  'daily-log:created': { id: string; project_id?: string };
}

/**
 * Hook to listen for all app events and update stores accordingly
 */
export function useAppEvents() {
  const toast = useToast();
  const { fetchItems } = useInboxStore();
  const { fetchTodos } = useTodoStore();
  const { fetchAllStats } = useStatsStore();
  const { fetchLogs } = useDailyLogStore();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Scheduler events - existing
    listen<AppEventPayloads['scheduler:startup-scan-started']>(
      'scheduler:startup-scan-started',
      () => {
        toast.info('Running startup scan...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['scheduler:startup-scan-complete']>(
      'scheduler:startup-scan-complete',
      (event) => {
        const count = event.payload;
        if (count > 0) {
          toast.success(`Startup scan complete, found ${count} project(s) with changes`);
          // 刷新相關 stores
          fetchItems();
          fetchAllStats();
        } else {
          toast.info('Startup scan complete, no new changes');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['scheduler:scan-started']>(
      'scheduler:scan-started',
      () => {
        toast.info('Running scheduled scan...');
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    listen<AppEventPayloads['scheduler:scan-complete']>(
      'scheduler:scan-complete',
      (event) => {
        const inboxItemsCreated = event.payload;
        if (inboxItemsCreated > 0) {
          toast.success(`Scan complete, created ${inboxItemsCreated} inbox item(s)`);
          // 刷新 inbox store
          fetchItems();
        } else {
          toast.info('Scan complete, no new items');
        }
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // 新增: Inbox item 創建事件
    listen<AppEventPayloads['inbox:item-created']>(
      'inbox:item-created',
      () => {
        fetchItems();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // 新增: Todo 創建事件
    listen<AppEventPayloads['todo:created']>(
      'todo:created',
      () => {
        fetchTodos();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    // 新增: Daily log 創建事件
    listen<AppEventPayloads['daily-log:created']>(
      'daily-log:created',
      () => {
        fetchLogs();
        fetchAllStats();
      }
    ).then((unlisten) => unsubscribers.push(unlisten));

    return () => {
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [toast, fetchItems, fetchTodos, fetchAllStats, fetchLogs]);
}
```

**Step 2: 更新 App.tsx 使用新 Hook**

```typescript
// src/App.tsx
import { useAppEvents } from "./hooks/useAppEvents";

function AppContent() {
  // 使用統一的事件監聽 hook（替換舊的 useSchedulerEvents）
  useAppEvents();

  return (
    // ... 現有內容
  );
}
```

**Step 3: 移除舊的 useSchedulerEvents hook 的使用**

```typescript
// src/App.tsx - 移除這行
// import { useSchedulerEvents } from "./hooks/useSchedulerEvents";
// useSchedulerEvents(); // 移除此調用
```

**Step 4: 更新後端發送事件**

在 Rust 後端的相關創建操作中添加事件發送：

```rust
// src-tauri/src/commands.rs - 在 create 操作後發送事件

// 例如在 create_inbox_item 後
app_handle.emit("inbox:item-created", json!({
    "id": item.id,
    "project_id": item.project_id
})).ok();

// 在 create_todo 後
app_handle.emit("todo:created", json!({
    "id": todo.id,
    "project_id": todo.project_id
})).ok();

// 在 create_daily_log 後
app_handle.emit("daily-log:created", json!({
    "id": log.id,
    "project_id": log.project_id
})).ok();
```

**Step 5: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- Scheduler 掃描完成後，Sidebar inbox badge 自動更新
- 在 Chat 創建 todo 後，切換到 Todos 頁面能看到新 todo
- Dashboard 在有新 daily log 時自動更新統計

**Step 6: Commit**

```bash
git add src/hooks/useAppEvents.ts src/App.tsx
git commit -m "feat: implement unified app event system for store synchronization"
```

---

### Task 3.2: 後端添加事件發送

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`（如需要）

**Step 1: 更新 create_inbox_item 命令**

```rust
// src-tauri/src/commands.rs
use tauri::Manager;

#[tauri::command]
pub fn create_inbox_item(
    db: State<Database>,
    app: tauri::AppHandle,  // 添加 app handle
    item_type: String,
    question: String,
    project_id: Option<String>,
    context: Option<String>,
) -> Result<InboxItem, String> {
    let item = db.create_inbox_item(&item_type, &question, project_id.as_deref(), context.as_deref())
        .map_err(|e| e.to_string())?;

    // 發送事件通知前端
    let _ = app.emit("inbox:item-created", serde_json::json!({
        "id": item.id,
        "project_id": item.project_id
    }));

    Ok(item)
}
```

**Step 2: 更新 create_todo 命令**

```rust
#[tauri::command]
pub fn create_todo(
    db: State<Database>,
    app: tauri::AppHandle,
    title: String,
    project_id: Option<String>,
    priority: Option<String>,
    due_date: Option<String>,
) -> Result<Todo, String> {
    let todo = db.create_todo(&title, project_id.as_deref(), priority.as_deref(), due_date.as_deref())
        .map_err(|e| e.to_string())?;

    let _ = app.emit("todo:created", serde_json::json!({
        "id": todo.id,
        "project_id": todo.project_id
    }));

    Ok(todo)
}
```

**Step 3: 更新 create_daily_log 命令**

```rust
#[tauri::command]
pub fn create_daily_log(
    db: State<Database>,
    app: tauri::AppHandle,
    project_id: String,
    date: String,
    summary: String,
    category: String,
) -> Result<DailyLog, String> {
    let log = db.create_daily_log(&project_id, &date, &summary, &category)
        .map_err(|e| e.to_string())?;

    let _ = app.emit("daily-log:created", serde_json::json!({
        "id": log.id,
        "project_id": log.project_id
    }));

    Ok(log)
}
```

**Step 4: 驗證修復**

Run: `npm run tauri dev`

測試流程：
1. 打開 Chat 頁面創建一個 todo（通過 AI 對話）
2. 觀察 Sidebar 或切換到 Todos 頁面
3. 新 todo 應該自動出現

**Step 5: Commit**

```bash
git add src-tauri/src/commands.rs
git commit -m "feat(backend): emit events on data creation for frontend sync"
```

---

### Task 3.3: 添加 Store 訂閱重新獲取機制

**Files:**
- Create: `src/hooks/useStoreSync.ts`

**Step 1: 創建 Store 同步 Hook**

```typescript
// src/hooks/useStoreSync.ts
import { useEffect, useCallback } from 'react';
import { useInboxStore } from '../stores/inboxStore';
import { useTodoStore } from '../stores/todoStore';
import { useStatsStore } from '../stores/statsStore';
import { useProjectStore } from '../stores/projectStore';

/**
 * Hook to sync stores when project selection changes
 */
export function useStoreSync() {
  const { selectedProjectId } = useProjectStore();
  const { fetchItems } = useInboxStore();
  const { fetchTodos } = useTodoStore();
  const { fetchAllStats } = useStatsStore();

  const syncStores = useCallback(() => {
    const projectId = selectedProjectId ?? undefined;
    fetchItems(undefined, projectId);
    fetchTodos(undefined, projectId);
    fetchAllStats(projectId);
  }, [selectedProjectId, fetchItems, fetchTodos, fetchAllStats]);

  // 當專案選擇變化時同步所有 stores
  useEffect(() => {
    syncStores();
  }, [syncStores]);

  return { syncStores };
}
```

**Step 2: 在 App.tsx 使用同步 Hook**

```typescript
// src/App.tsx
import { useStoreSync } from "./hooks/useStoreSync";

function AppContent() {
  useAppEvents();
  useStoreSync();  // 添加 store 同步

  return (
    // ... 現有內容
  );
}
```

**Step 3: 驗證修復**

Run: `npm run tauri dev`

預期結果：
- 在任意頁面切換專案後，所有頁面的數據都會同步更新
- 切換到新頁面時顯示正確的專案數據

**Step 4: Commit**

```bash
git add src/hooks/useStoreSync.ts src/App.tsx
git commit -m "feat: add store sync mechanism for project selection changes"
```

---

## 驗收標準

### Phase 1 驗收 ✅
- [x] Inbox badge 顯示實際 pending 數量
- [x] Sidebar 可以 pin/unpin
- [x] Sidebar 滾動時保持固定
- [x] Pin 狀態下 hover 不影響展開

### Phase 2 驗收 ✅
- [x] ProjectSelector 組件可在多個頁面復用
- [x] Todo 頁面可按專案過濾
- [x] Inbox 頁面可按專案過濾
- [x] Dashboard 可按專案顯示統計

### Phase 3 驗收 ✅
- [x] 創建 inbox item 後 Sidebar badge 自動更新
- [x] 創建 todo 後其他頁面自動顯示
- [x] 切換專案後所有頁面數據同步更新
- [x] 後端事件正確發送到前端

---

## 風險與緩解措施

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 後端不支援 project_id 過濾 | Phase 2 無法完成 | 先檢查後端，必要時同步更新 |
| 事件過多導致性能問題 | UI 卡頓 | 添加 debounce，批量更新 |
| Store 狀態不一致 | 數據顯示錯誤 | 添加錯誤處理和重試機制 |
| Pin 狀態不持久 | 重啟後丟失 | 考慮存儲到 localStorage |

---

## 相關文檔

- [Version Tracking Automation Plan](./2026-01-05-version-tracking-automation-plan.md)
- [AI Action Detection Plan](./2026-01-04-ai-action-detection.md)
