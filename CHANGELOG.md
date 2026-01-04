# Changelog

All notable changes to Sixarms will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-04

### Added
- **AI Action Detection**: Chat and Inbox now detect user intent and suggest executable actions (create todo, log progress)
- **Global Shortcut**: Press ⌘+Shift+D to show/focus the app from anywhere
- **Todo Kanban Board**: Drag-and-drop task management with visual columns
- **Version Tracking**: Track project versions and milestones with git tag integration
- **Conversation History**: Chat now maintains context across messages
- **Multi-select Folder Support**: Add multiple project folders at once
- **New App Icons**: Updated Sixarms logo and favicon

### Changed
- Upgraded Grok AI model to `grok-4-1-fast-reasoning` for better performance
- Improved update manifest generation with signature files
- Enhanced Version Tracking UI and store management

### Fixed
- Fixed Grok API model compatibility (migrated from deprecated grok-beta)
- Fixed borrow checker issue in scheduler for active projects iteration

### Documentation
- Added open source release files and commercialization plan
- Added CLAUDE.md for AI-assisted development
- Added landing page design specification

### Testing
- Added unit test setup with Vitest
- Added initial store tests for projectStore and chatStore

## [0.1.0] - 2024-12-XX

### Added
- Initial release of Sixarms
- AI-powered development progress tracking
- Git activity scanning and analysis
- Daily work summaries with AI classification
- Inbox for AI-generated insights and suggestions
- Chat interface for AI assistance
- Project management dashboard
- Settings for scan preferences and notifications
- macOS Keychain integration for secure API key storage
- Auto-updater with GitHub releases
