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
  { type: 'log', label: 'Log', icon: '📝' },
  { type: 'todo', label: 'TODO', icon: '✅' },
  { type: 'idea', label: 'Idea', icon: '💡' },
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
          projectId: projectId || null,
          priority: 'medium',
        });
      } else {
        // Create as inbox item
        await invoke('create_inbox_item', {
          itemType: entryType,
          question: content.trim(),
          projectId: projectId || null,
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
      // Cmd+1/2/3/4 for type selection
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          e.preventDefault();
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
        placeholder="Type something..."
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
          <option value="">No Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
          ESC close · ⌘↵ submit
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="px-4 py-1.5 text-sm bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
