import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';

interface WhatsNewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
  features: string[];
  improvements: string[];
  fixes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-01-04',
    highlights: [
      'AI Action Detection - Chat and Inbox now suggest executable actions',
      'Global shortcut ⌘+Shift+D to show app',
    ],
    features: [
      'AI detects user intent and suggests actions (create todo, log progress)',
      'Press ⌘+Shift+D to show/focus the app from anywhere',
      'Todo Kanban board with drag-and-drop',
      'Version tracking with git tag integration',
      'Conversation history in Chat',
      'Multi-select folder support when adding projects',
    ],
    improvements: [
      'Upgraded to Grok grok-4-1-fast-reasoning model',
      'Enhanced Version Tracking UI',
    ],
    fixes: [
      'Fixed Grok API model compatibility',
      'Fixed scheduler iteration issue',
    ],
  },
  {
    version: '0.1.0',
    date: '2024-12-01',
    highlights: ['Initial release of Sixarms'],
    features: [
      'AI-powered development progress tracking',
      'Git activity scanning and analysis',
      'Daily work summaries with AI classification',
      'Inbox for AI-generated insights',
      'Chat interface for AI assistance',
      'Project management dashboard',
    ],
    improvements: [],
    fixes: [],
  },
];

export function WhatsNew({ isOpen, onClose }: WhatsNewProps) {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('0.2.0');

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion('0.2.0'));
  }, []);

  const selectedChangelog = CHANGELOG.find((c) => c.version === selectedVersion);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-primary border border-border-subtle rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-elevated">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-text-primary">What's New</h2>
                  <p className="text-xs text-text-muted">
                    Current version: <span className="font-mono text-accent-cyan">v{currentVersion}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-primary rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Version Tabs */}
            <div className="flex gap-2 p-4 border-b border-border-subtle bg-bg-secondary overflow-x-auto">
              {CHANGELOG.map((entry) => (
                <button
                  key={entry.version}
                  onClick={() => setSelectedVersion(entry.version)}
                  className={`
                    px-3 py-1.5 rounded text-sm font-mono whitespace-nowrap transition-colors
                    ${selectedVersion === entry.version
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }
                  `}
                >
                  v{entry.version}
                  {entry.version === currentVersion && (
                    <span className="ml-1.5 text-xs text-accent-green">(current)</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {selectedChangelog && (
                <div className="space-y-6">
                  {/* Date */}
                  <p className="text-text-muted text-sm">
                    Released: {selectedChangelog.date}
                  </p>

                  {/* Highlights */}
                  {selectedChangelog.highlights.length > 0 && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-accent-cyan/10 to-accent-purple/10 border border-accent-cyan/20">
                      <h3 className="text-sm font-medium text-accent-cyan mb-2 flex items-center gap-2">
                        <Sparkles size={14} />
                        Highlights
                      </h3>
                      <ul className="space-y-1">
                        {selectedChangelog.highlights.map((item, i) => (
                          <li key={i} className="text-text-primary text-sm flex items-start gap-2">
                            <ArrowRight size={14} className="text-accent-cyan mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Features */}
                  {selectedChangelog.features.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-accent-green mb-2">New Features</h3>
                      <ul className="space-y-1.5">
                        {selectedChangelog.features.map((item, i) => (
                          <li key={i} className="text-text-secondary text-sm flex items-start gap-2">
                            <span className="text-accent-green">+</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {selectedChangelog.improvements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-accent-amber mb-2">Improvements</h3>
                      <ul className="space-y-1.5">
                        {selectedChangelog.improvements.map((item, i) => (
                          <li key={i} className="text-text-secondary text-sm flex items-start gap-2">
                            <span className="text-accent-amber">~</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fixes */}
                  {selectedChangelog.fixes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-accent-rose mb-2">Bug Fixes</h3>
                      <ul className="space-y-1.5">
                        {selectedChangelog.fixes.map((item, i) => (
                          <li key={i} className="text-text-secondary text-sm flex items-start gap-2">
                            <span className="text-accent-rose">*</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle bg-bg-secondary flex items-center justify-between">
              <a
                href="https://github.com/888wing/sixarms/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-muted hover:text-accent-cyan transition-colors flex items-center gap-1"
              >
                View all releases
                <ExternalLink size={12} />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded text-sm hover:bg-accent-cyan/30 transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
