import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Check, Clock, MessageSquare, Loader2 } from "lucide-react";
import { useInboxStore } from "../stores/inboxStore";
import { useProjectStore } from "../stores/projectStore";
import type { InboxItem } from "../lib/types";

function InboxItemCard({
  item,
  onAnswer,
}: {
  item: InboxItem;
  onAnswer: (id: string, answer: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === item.project_id);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "daily_summary":
        return "DAILY SUMMARY";
      case "classification":
        return "CLASSIFICATION";
      case "todo_followup":
        return "TODO FOLLOWUP";
      case "planning":
        return "PLANNING FOLLOWUP";
      case "stale_project":
        return "STALE PROJECT";
      default:
        return type.toUpperCase();
    }
  };

  const handleSubmit = () => {
    const answer = inputValue || selectedAction || "";
    if (answer) {
      onAnswer(item.id, answer);
      setInputValue("");
      setSelectedAction(null);
    }
  };

  const handleSkip = () => {
    onAnswer(item.id, "skipped");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-6 ${item.status === "answered" ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs text-accent-cyan tracking-wider">
            {getTypeLabel(item.item_type)}
          </span>
          {project && (
            <>
              <span className="text-text-muted">·</span>
              <span className="font-mono text-sm text-text-secondary">
                {project.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Clock size={12} />
          <span className="font-mono">{formatTime(item.created_at)}</span>
          {item.status === "answered" && (
            <span className="bg-accent-green/20 text-accent-green px-2 py-0.5 rounded flex items-center gap-1">
              <Check size={10} />
              Answered
            </span>
          )}
        </div>
      </div>

      {/* Context */}
      {item.context && (
        <div className="mb-4 p-3 bg-bg-elevated rounded font-mono text-sm text-text-secondary whitespace-pre-wrap">
          <span className="text-text-muted">{"> "}</span>
          Changes detected:
          <div className="mt-2 text-text-primary">{item.context}</div>
        </div>
      )}

      {/* Question */}
      <div className="mb-4">
        <p className="text-text-primary">
          {item.question}
          {item.status === "pending" && <span className="cursor-blink" />}
        </p>
      </div>

      {/* Answer (if answered) */}
      {item.status === "answered" && item.answer && (
        <div className="mb-4 p-3 bg-bg-primary rounded border border-border-subtle">
          <span className="text-text-muted text-xs font-mono mr-2">{"> "}</span>
          <span className="text-text-primary">{item.answer}</span>
        </div>
      )}

      {/* Input and Actions (if pending) */}
      {item.status === "pending" && (
        <>
          {(item.item_type === "daily_summary" ||
            item.item_type === "classification") && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter your answer..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="terminal-input w-full text-sm"
              />
            </div>
          )}

          {item.suggested_actions && item.suggested_actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {item.suggested_actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  className={`
                    px-3 py-1.5 text-sm rounded border transition-all
                    ${
                      selectedAction === action.id
                        ? "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50"
                        : "bg-bg-elevated text-text-secondary border-border-subtle hover:border-accent-cyan/30 hover:text-text-primary"
                    }
                  `}
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick action buttons for planning type */}
          {item.item_type === "planning" && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: "continue", label: "Continue", icon: "🚀" },
                { id: "delay", label: "Delay", icon: "📅" },
                { id: "cancel", label: "Cancel", icon: "❌" },
              ].map((action) => (
                <button
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  className={`
                    px-3 py-1.5 text-sm rounded border transition-all
                    ${
                      selectedAction === action.id
                        ? "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50"
                        : "bg-bg-elevated text-text-secondary border-border-subtle hover:border-accent-cyan/30 hover:text-text-primary"
                    }
                  `}
                >
                  <span className="mr-1">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!inputValue && !selectedAction}
              className="px-4 py-2 text-sm bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Log
              <span>▶</span>
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function Inbox() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    loading,
    filter,
    pendingCount,
    answeredCount,
    filteredItems,
    fetchItems,
    answerItem,
    setFilter,
  } = useInboxStore();

  const { fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
    fetchItems();
  }, [fetchProjects, fetchItems]);

  const handleAnswer = async (id: string, answer: string) => {
    await answerItem(id, answer);
  };

  const handleFilterChange = (newFilter: "all" | "pending" | "answered") => {
    setFilter(newFilter);
    if (newFilter === "pending") {
      fetchItems("pending");
    } else if (newFilter === "answered") {
      fetchItems("answered");
    } else {
      fetchItems();
    }
  };

  const groupByDate = (items: InboxItem[]) => {
    const groups: { [key: string]: InboxItem[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Filter by search query
    const searchFiltered = items.filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(query) ||
        item.context?.toLowerCase().includes(query) ||
        item.answer?.toLowerCase().includes(query)
      );
    });

    searchFiltered.forEach((item) => {
      const date = new Date(item.created_at);
      const dateStr = date.toDateString();
      let label = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      if (dateStr === today) label = "Today";
      else if (dateStr === yesterday) label = "Yesterday";

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return groups;
  };

  const displayItems = filteredItems();
  const groupedItems = groupByDate(displayItems);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="section-header text-2xl">INBOX</h1>
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

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilterChange("all")}
              className={`px-3 py-1.5 text-sm rounded ${
                filter === "all"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange("pending")}
              className={`px-3 py-1.5 text-sm rounded ${
                filter === "pending"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => handleFilterChange("answered")}
              className={`px-3 py-1.5 text-sm rounded ${
                filter === "answered"
                  ? "bg-bg-secondary text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Processed
            </button>
          </div>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="terminal-input pl-10 py-2 text-sm w-48"
            />
          </div>
        </div>
      </motion.header>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-accent-cyan" />
        </div>
      ) : (
        <>
          {/* Inbox Items */}
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([date, dateItems]) => (
              <div key={date}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-text-muted text-sm font-mono">
                    ── {date} ──
                  </span>
                  <div className="flex-1 h-px bg-border-subtle" />
                </div>
                <div className="space-y-4">
                  {dateItems.map((item) => (
                    <InboxItemCard
                      key={item.id}
                      item={item}
                      onAnswer={handleAnswer}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {Object.keys(groupedItems).length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <MessageSquare size={48} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary">
                {searchQuery ? "No results found" : "Nothing to process 🎉"}
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
