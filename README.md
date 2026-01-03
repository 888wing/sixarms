# Sixarms

AI-Powered Development Progress Tracker - 智能開發進度追蹤助手

A native macOS desktop application that helps developers track their work progress through AI-powered conversations and automatic git activity scanning.

## Features

- **AI Chat** - Chat with Grok AI to log your daily work, and the AI will automatically categorize and organize your progress
- **Inbox** - AI-generated questions to help you reflect on your work and fill in the gaps
- **Dashboard** - Activity heatmap, monthly trends, and work distribution statistics
- **Project Management** - Track multiple projects with status and activity monitoring
- **TODO Tracking** - Simple task management integrated with your projects
- **Git Integration** - Automatic scanning of git commits to track your development activity

## Tech Stack

### Frontend
- **React 18** - UI framework with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Zustand** - Lightweight state management
- **Lucide React** - Icon library

### Backend
- **Tauri v2** - Native desktop app framework
- **Rust** - Backend language for performance and safety
- **SQLite** - Local database via rusqlite
- **security-framework** - macOS Keychain integration for secure API key storage
- **reqwest** - HTTP client for Grok API calls

### Design
- Dark Brutalist Terminal theme ("深夜工作室" aesthetic)
- Monospace fonts with terminal-inspired UI elements
- Cyan accent colors with muted secondary tones

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ with Cargo
- **Xcode Command Line Tools** (macOS)
- **Grok API Key** from [x.ai](https://x.ai)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sixarms.git
cd sixarms
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri dev
```

4. Build for production:
```bash
npm run tauri build
```

### Configuration

1. Launch the app and navigate to **Settings**
2. Enter your Grok API Key (stored securely in macOS Keychain)
3. Add your projects by specifying name and local path
4. Start chatting with the AI to log your work!

## Project Structure

```
sixarms/
├── src/                    # React frontend
│   ├── pages/              # Page components
│   │   ├── Home.tsx        # Landing page with quick actions
│   │   ├── Dashboard.tsx   # Statistics and activity heatmap
│   │   ├── Chat.tsx        # AI conversation interface
│   │   ├── Inbox.tsx       # AI-generated questions
│   │   └── Settings.tsx    # Configuration page
│   ├── stores/             # Zustand state stores
│   │   ├── projectStore.ts
│   │   ├── todoStore.ts
│   │   ├── chatStore.ts
│   │   ├── inboxStore.ts
│   │   ├── settingsStore.ts
│   │   ├── dailyLogStore.ts
│   │   └── statsStore.ts
│   ├── components/         # Reusable components
│   │   └── layout/
│   │       └── Sidebar.tsx
│   └── lib/                # Utilities
│       ├── api.ts          # Tauri IPC bindings
│       └── types.ts        # TypeScript type definitions
├── src-tauri/              # Rust backend
│   └── src/
│       ├── lib.rs          # Tauri app setup
│       ├── main.rs         # App entry point
│       ├── db.rs           # SQLite database operations
│       ├── models.rs       # Data models
│       ├── commands.rs     # Tauri IPC commands
│       ├── grok.rs         # Grok AI API client
│       ├── grok_commands.rs
│       ├── scanner.rs      # Git diff scanner
│       ├── scanner_commands.rs
│       └── keychain.rs     # macOS Keychain integration
└── package.json
```

## Database Schema

The app uses SQLite with the following tables:

- **projects** - Project metadata (name, path, status)
- **daily_logs** - Work logs with AI-generated summaries
- **todos** - Task items linked to projects
- **inbox_items** - AI-generated reflection questions
- **chat_messages** - Conversation history with AI
- **user_settings** - App preferences

## API Endpoints (Tauri Commands)

| Command | Description |
|---------|-------------|
| `get_projects` | List all projects |
| `create_project` | Add a new project |
| `get_todos` | Fetch todo items |
| `create_todo` | Create a todo |
| `get_chat_messages` | Fetch chat history |
| `send_chat_message` | Send message to Grok AI |
| `get_inbox_items` | Get AI-generated questions |
| `scan_git_activity` | Scan git commits in a project |
| `save_api_key` | Store API key in Keychain |
| `get_activity_stats` | Get activity heatmap data |

## Known Limitations

- **macOS only** - Keychain integration requires macOS. Windows/Linux support would need platform-specific implementations.
- **No tests yet** - Unit and integration tests are not yet implemented.
- **Grok API only** - Currently only supports Grok AI. Other LLM providers could be added.

## Security Considerations

- API keys are stored in macOS Keychain, not in plain text files
- All database queries use parameterized statements (no SQL injection)
- No use of `dangerouslySetInnerHTML` (no XSS vulnerabilities)
- Git scanner paths should be validated before use (see code review notes)

## License

MIT

## Contributing

Contributions are welcome! Please read the code review notes in the repository for areas that need improvement.

---

Built with Tauri, React, and Rust.
