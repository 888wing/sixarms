import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useTodoStore } from "../stores/todoStore";
import { useProjectStore } from "../stores/projectStore";
import { useToast } from "../components/Toast";
import { KanbanBoard } from "../components/kanban";
import { ProjectSelector } from "../components/ProjectSelector";
import type { TodoPriority, TodoColumn } from "../lib/types";

type ViewMode = "kanban" | "list";

export function Todos() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>("medium");
  const [newTodoProjectId, setNewTodoProjectId] = useState<string>("");

  const toast = useToast();
  const { todos, loading, fetchTodos, createTodo, moveTodo, deleteTodo } = useTodoStore();
  const { projects, selectedProjectId, fetchProjects } = useProjectStore();

  // Filter todos by selected project
  const filteredTodos = useMemo(() => {
    if (!selectedProjectId) return todos;
    return todos.filter((t) => t.project_id === selectedProjectId);
  }, [todos, selectedProjectId]);

  useEffect(() => {
    fetchTodos();
    fetchProjects();
  }, [fetchTodos, fetchProjects]);

  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim()) return;
    await createTodo(
      newTodoTitle,
      newTodoProjectId || undefined,
      newTodoPriority
    );
    setNewTodoTitle("");
    setNewTodoPriority("medium");
    setNewTodoProjectId("");
    setShowNewTodo(false);
    toast.success("TODO created");
  };

  const handleMoveTodo = async (id: string, column: string, position: number) => {
    await moveTodo(id, column as TodoColumn, position);
  };

  const handleDelete = async (id: string) => {
    await deleteTodo(id);
    toast.success("TODO deleted");
  };

  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="section-header text-2xl">TODOS</h1>
          <p className="text-text-muted text-sm mt-1">
            Drag and drop to change status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProjectSelector />
          {/* View Toggle */}
          <div className="flex items-center bg-bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded ${
                viewMode === "kanban"
                  ? "bg-bg-primary text-accent-cyan"
                  : "text-text-muted hover:text-text-primary"
              } transition-colors`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${
                viewMode === "list"
                  ? "bg-bg-primary text-accent-cyan"
                  : "text-text-muted hover:text-text-primary"
              } transition-colors`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Add Todo Button */}
          <button
            onClick={() => setShowNewTodo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors"
          >
            <Plus size={16} />
            <span className="font-display text-sm">Add TODO</span>
          </button>
        </div>
      </motion.header>

      {/* New Todo Form */}
      {showNewTodo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border-subtle"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTodo()}
                placeholder="What needs to be done?"
                className="terminal-input w-full"
                autoFocus
              />
            </div>

            <select
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
              className="terminal-input"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={newTodoProjectId}
              onChange={(e) => setNewTodoProjectId(e.target.value)}
              className="terminal-input"
            >
              <option value="">No Project</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateTodo}
              disabled={!newTodoTitle.trim()}
              className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded text-sm disabled:opacity-50 hover:bg-accent-cyan/30 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewTodo(false);
                setNewTodoTitle("");
              }}
              className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-text-muted">Loading...</div>
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            todos={filteredTodos}
            onMoveTodo={handleMoveTodo}
            onDeleteTodo={handleDelete}
          />
        ) : (
          <div className="space-y-2">
            {filteredTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-bg-secondary rounded-lg border border-border-subtle hover:border-border-active transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${
                      todo.status === "completed" ? "text-text-muted line-through" : "text-text-primary"
                    }`}>
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        todo.status === "pending" ? "bg-accent-amber/10 text-accent-amber" :
                        todo.status === "in_progress" ? "bg-accent-cyan/10 text-accent-cyan" :
                        todo.status === "completed" ? "bg-accent-green/10 text-accent-green" :
                        "bg-bg-elevated text-text-muted"
                      }`}>
                        {todo.status.replace("_", " ")}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        todo.priority === "urgent" || todo.priority === "high"
                          ? "bg-accent-rose/10 text-accent-rose"
                          : "bg-bg-elevated text-text-muted"
                      }`}>
                        {todo.priority}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="p-2 text-text-muted hover:text-accent-rose transition-colors"
                  >
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
