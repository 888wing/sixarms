import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronDown, Loader2, AlertCircle, RefreshCw, ListTodo, FileText, CheckCircle, X } from "lucide-react";
import { useChatStore } from "../stores/chatStore";
import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { ChatMessage, ChatAction, DetectedAction } from "../lib/types";

function ActionCard({ action }: { action?: ChatAction }) {
  if (!action) return null;

  if (action.action_type === "logged") {
    const data = action.data as { date: string; summary: string; category: string };
    return (
      <div className="mt-3 border border-border-subtle rounded p-3 font-mono text-sm bg-bg-elevated">
        <div className="text-text-muted mb-1">┌─ LOGGED ─────────────────────────────────────────┐</div>
        <div className="text-text-primary">│ {data.date}</div>
        <div className="text-text-primary">│ {data.summary}</div>
        <div className="text-text-primary">│ Type: {data.category}</div>
        <div className="text-text-muted">└─────────────────────────────────────────────────┘</div>
      </div>
    );
  }

  if (action.action_type === "todo_created") {
    const data = action.data as { title: string; project: string; priority: string; dueDate: string };
    return (
      <div className="mt-3 border border-border-subtle rounded p-3 font-mono text-sm bg-bg-elevated">
        <div className="text-text-muted mb-1">┌─ TODO CREATED ────────────────────────────────────┐</div>
        <div className="text-accent-green">│ {data.title}</div>
        <div className="text-text-primary">│ {data.project} · {data.priority} · Due: {data.dueDate}</div>
        <div className="text-text-muted">└───────────────────────────────────────────────────┘</div>
      </div>
    );
  }

  return null;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`max-w-[80%] ${
        message.role === "assistant"
          ? "ai-bubble p-4 rounded"
          : "bg-bg-secondary p-4 rounded"
      }`}
    >
      <div className="flex items-center justify-between mb-2 text-xs text-text-muted font-mono">
        <span>{message.role === "assistant" ? "AI" : "USER"}</span>
        <span>{formatTime(message.created_at)}</span>
      </div>
      <div className="text-text-primary whitespace-pre-wrap font-body">
        {message.content}
      </div>
      <ActionCard action={message.actions} />
    </div>
  );
}

function ActionSuggestion({
  action,
  onExecute,
  onDismiss,
  executing,
}: {
  action: DetectedAction;
  onExecute: () => void;
  onDismiss: () => void;
  executing: boolean;
}) {
  const getActionInfo = () => {
    switch (action.data.type) {
      case 'todo':
        return {
          icon: <ListTodo size={16} />,
          label: '創建待辦',
          title: action.data.title,
          color: 'text-accent-cyan',
          bgColor: 'bg-accent-cyan/10 border-accent-cyan/30',
        };
      case 'progress':
        return {
          icon: <FileText size={16} />,
          label: '記錄進度',
          title: action.data.summary,
          color: 'text-accent-green',
          bgColor: 'bg-accent-green/10 border-accent-green/30',
        };
      case 'inbox':
        return {
          icon: <CheckCircle size={16} />,
          label: '添加跟進',
          title: action.data.question,
          color: 'text-accent-amber',
          bgColor: 'bg-accent-amber/10 border-accent-amber/30',
        };
      default:
        return null;
    }
  };

  const info = getActionInfo();
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center justify-between p-3 rounded border ${info.bgColor}`}
    >
      <div className="flex items-center gap-3">
        <span className={info.color}>{info.icon}</span>
        <div>
          <span className={`text-xs font-mono ${info.color}`}>{info.label}</span>
          <p className="text-sm text-text-primary truncate max-w-[300px]">
            {info.title}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDismiss}
          disabled={executing}
          className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
        <button
          onClick={onExecute}
          disabled={executing}
          className={`px-3 py-1.5 text-sm rounded ${info.color} ${info.bgColor} hover:opacity-80 transition-opacity flex items-center gap-2`}
        >
          {executing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>確認</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function Chat() {
  const [input, setInput] = useState("");
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    pendingActions,
    loading,
    sending,
    executingAction,
    error,
    fetchMessages,
    sendMessage,
    executeAction,
    dismissAction,
  } = useChatStore();

  const {
    projects,
    selectedProjectId,
    fetchProjects,
    selectProject,
  } = useProjectStore();

  const { hasApiKey, checkApiKey } = useSettingsStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchProjects();
    checkApiKey();
  }, [fetchProjects, checkApiKey]);

  useEffect(() => {
    fetchMessages(selectedProjectId ?? undefined, 50);
  }, [selectedProjectId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    await sendMessage(content, selectedProjectId ?? undefined);
  };

  const handleProjectSelect = (id: string | null) => {
    selectProject(id);
    setShowProjectMenu(false);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-b border-border-subtle flex items-center justify-between"
      >
        <h1 className="section-header text-xl">CHAT</h1>
        <div className="relative" ref={projectMenuRef}>
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="flex items-center gap-2 text-text-secondary hover:text-accent-cyan transition-colors"
          >
            <span className="text-lg">{selectedProject ? "📁" : "🌐"}</span>
            <span className="font-mono text-sm">
              {selectedProject?.name ?? "All Projects"}
            </span>
            <ChevronDown size={16} />
          </button>

          {showProjectMenu && (
            <div className="absolute right-0 top-full mt-2 bg-bg-elevated border border-border-subtle rounded shadow-lg z-10 min-w-[200px]">
              <button
                onClick={() => handleProjectSelect(null)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary transition-colors ${
                  !selectedProjectId ? "text-accent-cyan" : "text-text-secondary"
                }`}
              >
                🌐 All Projects
              </button>
              {projects.filter(p => p.status === 'active').map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary transition-colors ${
                    selectedProjectId === project.id ? "text-accent-cyan" : "text-text-secondary"
                  }`}
                >
                  📁 {project.name}
                </button>
              ))}
              {projects.filter(p => p.status === 'active').length === 0 && (
                <div className="px-4 py-2 text-sm text-text-muted">
                  No active projects
                </div>
              )}
            </div>
          )}
        </div>
      </motion.header>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="mx-4 mt-4 p-3 bg-accent-amber/10 border border-accent-amber/30 rounded flex items-center gap-3">
          <AlertCircle size={18} className="text-accent-amber flex-shrink-0" />
          <div className="text-sm">
            <span className="text-accent-amber font-medium">API Key not configured</span>
            <span className="text-text-secondary ml-2">
              Please go to Settings to enter your Grok API Key to enable AI chat
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-accent-cyan" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-center">
              {hasApiKey
                ? "Start chatting with AI!\nIt can help you log work progress and manage tasks"
                : "Set up your API Key to start chatting"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <MessageBubble message={message} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="ai-bubble p-4 rounded">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-accent-rose/10 border border-accent-rose/30 text-accent-rose px-4 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button
                onClick={() => fetchMessages(selectedProjectId ?? undefined)}
                className="ml-2 hover:text-white transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="px-4 py-3 border-t border-border-subtle bg-bg-elevated/50">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="text-xs text-text-muted font-mono mb-2">
              💡 AI 偵測到以下動作建議：
            </div>
            <AnimatePresence>
              {pendingActions.map((action, index) => (
                <ActionSuggestion
                  key={`action-${index}`}
                  action={action}
                  onExecute={() => executeAction(action, selectedProjectId ?? undefined)}
                  onDismiss={() => dismissAction(index)}
                  executing={executingAction}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-mono">
              {">"}
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={hasApiKey ? "Type a message..." : "Please set up API Key first..."}
              disabled={!hasApiKey || sending}
              className="terminal-input w-full pl-8 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !hasApiKey || sending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span>💡 Describe what you worked on today</span>
            <span>· AI will help you log and categorize it</span>
          </div>
        </div>
      </div>
    </div>
  );
}
