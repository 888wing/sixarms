import { motion } from "framer-motion";
import { CheckCircle, XCircle, HelpCircle, BarChart3, ListTodo, FolderOpen } from "lucide-react";
import type { CommandResult } from "../../lib/api";
import type { Todo, Project } from "../../lib/types";

interface CommandResponseProps {
  result: CommandResult;
}

export function CommandResponse({ result }: CommandResponseProps) {
  const getIcon = () => {
    if (!result.success) return <XCircle size={16} className="text-accent-rose" />;

    switch (result.command) {
      case "/help":
        return <HelpCircle size={16} className="text-accent-cyan" />;
      case "/status":
        return <BarChart3 size={16} className="text-accent-green" />;
      case "/todo":
        return <ListTodo size={16} className="text-accent-amber" />;
      case "/projects":
        return <FolderOpen size={16} className="text-accent-violet" />;
      case "/add":
        return <CheckCircle size={16} className="text-accent-green" />;
      default:
        return <CheckCircle size={16} className="text-accent-cyan" />;
    }
  };

  const getBorderColor = () => {
    if (!result.success) return "border-accent-rose/30";
    switch (result.command) {
      case "/help":
        return "border-accent-cyan/30";
      case "/status":
        return "border-accent-green/30";
      case "/todo":
        return "border-accent-amber/30";
      case "/projects":
        return "border-accent-violet/30";
      case "/add":
        return "border-accent-green/30";
      default:
        return "border-border-subtle";
    }
  };

  const renderData = () => {
    if (!result.data) return null;

    // Render todo list
    if (result.command === "/todo" && Array.isArray(result.data)) {
      const todos = result.data as Todo[];
      if (todos.length === 0) return <p className="text-text-muted text-sm">No TODOs found</p>;

      return (
        <div className="mt-3 space-y-1">
          {todos.slice(0, 5).map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 text-sm font-mono">
              <span className={`w-2 h-2 rounded-full ${
                todo.status === "completed" ? "bg-accent-green" :
                todo.status === "in_progress" ? "bg-accent-amber" :
                "bg-text-muted"
              }`} />
              <span className={todo.status === "completed" ? "line-through text-text-muted" : "text-text-primary"}>
                {todo.title}
              </span>
            </div>
          ))}
          {todos.length > 5 && (
            <p className="text-text-muted text-xs">... and {todos.length - 5} more</p>
          )}
        </div>
      );
    }

    // Render projects list
    if (result.command === "/projects" && Array.isArray(result.data)) {
      const projects = result.data as Project[];
      if (projects.length === 0) return <p className="text-text-muted text-sm">No projects found</p>;

      return (
        <div className="mt-3 space-y-1">
          {projects.slice(0, 5).map((project) => (
            <div key={project.id} className="flex items-center gap-2 text-sm font-mono">
              <span className={`w-2 h-2 rounded-full ${
                project.status === "active" ? "bg-accent-green" :
                project.status === "paused" ? "bg-accent-amber" :
                "bg-text-muted"
              }`} />
              <span className="text-text-primary">{project.name}</span>
              <span className="text-text-muted text-xs">({project.status})</span>
            </div>
          ))}
          {projects.length > 5 && (
            <p className="text-text-muted text-xs">... and {projects.length - 5} more</p>
          )}
        </div>
      );
    }

    // Render added todo
    if (result.command === "/add" && result.data) {
      const todo = result.data as Todo;
      return (
        <div className="mt-2 p-2 bg-bg-primary rounded border border-border-subtle">
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-accent-amber" />
            <span className="text-text-primary">{todo.title}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-[80%] bg-bg-elevated p-4 rounded border ${getBorderColor()}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="font-mono text-sm text-text-muted">{result.command}</span>
        {!result.success && (
          <span className="text-xs bg-accent-rose/20 text-accent-rose px-2 py-0.5 rounded">
            ERROR
          </span>
        )}
      </div>

      {/* Message */}
      <div className="text-text-primary whitespace-pre-wrap font-mono text-sm">
        {result.message}
      </div>

      {/* Data */}
      {renderData()}
    </motion.div>
  );
}
