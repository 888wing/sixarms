# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sixarms is an AI-powered development progress tracker - a native macOS desktop application built with Tauri v2 (Rust backend) and React (TypeScript frontend). It uses Grok AI for intelligent work categorization and git activity scanning.

## Development Commands

```bash
# Frontend development (Vite dev server only)
npm run dev

# Full Tauri development (frontend + Rust backend with hot reload)
npm run tauri dev

# Build for production
npm run tauri build

# Type check frontend
npx tsc --noEmit

# Build frontend only
npm run build
```

## Architecture

### Dual-Layer Structure
- **Frontend** (`src/`): React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend** (`src-tauri/src/`): Rust with Tauri v2, SQLite via rusqlite, Grok API integration

### Frontend-Backend Communication
All communication uses Tauri's IPC invoke system. The frontend calls Rust commands via `invoke()`:

```typescript
// Frontend: src/lib/api.ts
import { invoke } from '@tauri-apps/api/core';
invoke<Project[]>('get_projects')  // Calls Rust command
```

```rust
// Backend: src-tauri/src/commands.rs
#[tauri::command]
pub fn get_projects(db: State<Database>) -> Result<Vec<Project>, String>
```

### State Management (Frontend)
Zustand stores in `src/stores/`:
- `projectStore.ts` - Project CRUD operations
- `chatStore.ts` - AI chat message history
- `todoStore.ts` - Task management
- `inboxStore.ts` - AI-generated reflection questions
- `settingsStore.ts` - User preferences + scan settings
- `statsStore.ts` - Activity heatmap data
- `dailyLogStore.ts` - Work logs

### Backend Modules (Rust)
| Module | Purpose |
|--------|---------|
| `db.rs` | SQLite database operations, schema management |
| `commands.rs` | Main Tauri IPC command handlers |
| `grok.rs` | Grok AI API client (chat, classify, summarize) |
| `grok_commands.rs` | AI-related Tauri commands |
| `scanner.rs` | Git diff parsing, commit analysis |
| `scanner_commands.rs` | Git scanning Tauri commands |
| `scheduler.rs` | Periodic background scanning |
| `keychain.rs` | macOS Keychain for API key storage |
| `models.rs` | Shared data structures |
| `ai_agent.rs` | AI classification logic |
| `notification.rs` | macOS notification integration |

### Database Schema
SQLite database with tables: `projects`, `daily_logs`, `todos`, `inbox_items`, `chat_messages`, `user_settings`. Located in app data directory at runtime.

## Key Patterns

### API Binding Pattern
Frontend API is organized in `src/lib/api.ts` with domain-specific objects:
- `projectApi`, `todoApi`, `chatApi`, `inboxApi`, `grokApi`, `scannerApi`, `settingsApi`, `statsApi`, `schedulerApi`

Each API object wraps Tauri invoke calls with proper TypeScript types defined in `src/lib/types.ts`.

### Tauri State Management
Rust services are initialized in `lib.rs` setup and managed via `app.manage()`:
```rust
app.manage(db);           // Database
app.manage(grok_client);  // Grok API client
app.manage(keychain);     // Keychain access
app.manage(scanner);      // Git scanner
app.manage(scheduler);    // Background scheduler
```

### Theme System
Dark brutalist terminal aesthetic using custom Tailwind colors in `tailwind.config.js`:
- Background: `void`, `bg-primary`, `bg-secondary`, `bg-elevated`
- Accents: `accent-cyan`, `accent-green`, `accent-amber`, `accent-rose`, `accent-violet`
- Glow effects: `shadow-glow-cyan`, etc.

## macOS-Specific

- Keychain integration for secure API key storage (`security-framework` crate)
- Title bar style: Overlay (transparent title bar)
- App identifier: `com.sixarms.app`
- Auto-updater configured with GitHub releases

## Adding New Features

### New Tauri Command
1. Add function in `src-tauri/src/commands.rs` with `#[tauri::command]`
2. Register in `lib.rs` invoke_handler
3. Add TypeScript binding in `src/lib/api.ts`
4. Add types in `src/lib/types.ts` if needed

### New Zustand Store
1. Create store in `src/stores/`
2. Use pattern from existing stores (create function with actions)
3. Import and use in components via hooks
