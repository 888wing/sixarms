# Version Tracking Automation Plan

**Purpose:** Turn the current "VER" page into an automated source control tracker that refreshes Git tags, persists milestones, and can auto-create milestones or major update notes.

---

## Background

**Current behavior**
- Tags are loaded from local git on page mount only.
- Milestones are stored in a client-only Zustand store and disappear on restart.
- No automatic milestone creation from tags or chatbot.
- No project selector on the version tracking page, so it feels single-project.

**User goal**
- Auto-refresh git tag list and version info.
- Let the chatbot auto-create milestones and major update records.
- Make this work reliably across multiple projects.

---

## Goals

- Persist milestones in the local database.
- Keep git tags up to date without manual refresh.
- Auto-create milestones from new tags and create inbox suggestions for detected major updates.
- Support multi-project selection and "all projects" view.
- Provide settings to control automation behavior.

## Non-goals (for this phase)

- GitHub or GitLab API integration.
- Cross-device sync.
- Team or shared milestones.

---

## Proposed Design

### 1) Data model and persistence

**New DB tables**
- `milestones` to persist milestone data.
- `git_tags` to cache tags and detect newly created tags.
- `version_events` (optional) for "major update" records that do not map to a git tag.

**Milestone fields**
- id, project_id, title, description, version, git_tag, status, target_date
- created_at, completed_at, updated_at, source (manual | tag | ai)

**Tag fields**
- project_id, name, commit_hash, date, message, first_seen_at

### 2) Backend commands (Tauri)

**Milestones**
- `get_milestones(project_id?)`
- `create_milestone(milestone)`
- `update_milestone_status(id, status)`
- `update_milestone(id, fields)`
- `delete_milestone(id)`

**Tags**
- `sync_git_tags(project_id)` reads tags from git, upserts `git_tags`, and returns delta.
- Keep existing `get_git_tags` for direct list reads.

### 3) Scheduler integration

**Startup and interval**
- On startup or scheduled scan, call `sync_git_tags` for active projects.
- Detect new tags and optionally auto-create milestones from them.
- Emit events to the frontend: `version:tags-updated`, `version:milestones-updated`.

**Major update detection**
- Use git diff stats (files changed, additions, deletions) to detect "major update".
- When thresholds are met, create an inbox suggestion by default.

### 4) Chatbot integration

**New action type**
- Add `create_milestone` to detected actions.
- `execute_detected_action` should call the milestone API and mark the source as `ai`.

**Guardrails**
- Default to "suggest" mode if confidence is low.
- Allow auto-create in settings for high-confidence cases.

### 5) UI updates (Version Tracking page)

- Add a project selector (same pattern as Chat page).
- Add an "All Projects" view that aggregates tags and milestones.
- Add "Last refresh" label and manual refresh button.
- Show tags from the cached table and auto-refresh events.
- Add badges for auto-created milestones (source: tag or ai).
- Add a "link to tag" action for manual milestones.

### 6) Settings

Add a new `version` block inside user settings:

```
version: {
  auto_refresh: true,
  refresh_minutes: 30,
  auto_milestones_from_tags: true,
  auto_major_updates: true,
  major_update_threshold: {
    files_changed: 20,
    additions: 500,
    deletions: 500
  },
  ai_create_mode: "suggest" | "auto"
}
```

---

## Implementation Phases

### Phase 1: Persistence and UI baseline
- Add `milestones` table and CRUD API.
- Replace in-memory milestone store with DB-backed store.
- Add project selector to the version tracking page.
- Add "manual refresh" for tags.

### Phase 2: Tag sync and auto refresh
- Add `git_tags` table and `sync_git_tags` command.
- Trigger tag sync on startup and scheduler ticks.
- Emit events to update the tag list in UI.

### Phase 3: Auto milestone creation
- Auto-create milestones from new tags.
- Add "major update" detection based on diff stats (default to inbox suggestion).
- Add chatbot action for creating milestones.
- Add settings to control automation.

### Phase 4: QA and polish
- Error handling for repos with slow tag scans.
- UI polish for auto-created entries.
- Regression tests for scheduler and milestones.

---

## Acceptance Criteria

- Tags are refreshed automatically without manual page reload.
- Milestones persist across app restarts.
- New tags create milestones when the setting is enabled.
- Major update inbox suggestions are created when thresholds are met.
- User can switch projects and view "All Projects" on the version tracking page.

---

## Risks and Mitigations

- **Large repos slow down tag scans:** cache tags and rate-limit refresh.
- **False positives for major updates:** tune thresholds and prefer "suggest" mode.
- **Too many auto milestones:** add deduplication and per-project cooldown.

---

## Open Questions

None. Decisions:
- Major updates default to inbox suggestions.
- Tag-based milestones use tag name as the title.
- "All Projects" view is supported on the version tracking page.
