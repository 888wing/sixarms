# Contributing to Sixarms

First off, thank you for considering contributing to Sixarms! It's people like you that make Sixarms such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots)
- **Describe the behavior you observed and what you expected**
- **Include your environment** (OS version, app version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the code compiles without errors
4. Make sure your code follows the existing style
5. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 18+
- Rust 1.77+
- Xcode Command Line Tools (macOS)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/sixarms.git
cd sixarms

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Project Structure

```
sixarms/
├── src/                    # React frontend
│   ├── pages/              # Page components
│   ├── stores/             # Zustand state stores
│   ├── components/         # Reusable components
│   └── lib/                # Utilities and types
├── src-tauri/              # Rust backend
│   └── src/
│       ├── db.rs           # Database operations
│       ├── commands.rs     # Tauri IPC commands
│       ├── grok.rs         # AI API client
│       └── scanner.rs      # Git scanner
└── docs/                   # Documentation
```

### Code Style

**Frontend (TypeScript)**
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind CSS for styling

**Backend (Rust)**
- Follow Rust conventions
- Use `thiserror` for error handling
- Document public functions

## Commit Messages

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, no code change
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding tests
- `chore:` Maintenance

Example: `feat: add weekly report generation`

## Questions?

Feel free to open an issue with the "question" label or start a discussion.

Thank you for contributing!
