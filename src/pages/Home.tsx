import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Circle,
  ChevronRight,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { useProjectStore } from "../stores/projectStore";
import { useTodoStore } from "../stores/todoStore";
import { useInboxStore } from "../stores/inboxStore";

export function Home() {
  const navigate = useNavigate();
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [showNewTodo, setShowNewTodo] = useState(false);

  const { projects, fetchProjects } = useProjectStore();
  const {
    todos,
    loading: todosLoading,
    fetchTodos,
    createTodo,
    updateTodoStatus,
  } = useTodoStore();
  const {
    items: inboxItems,
    loading: inboxLoading,
    fetchItems: fetchInboxItems,
    answerItem,
  } = useInboxStore();

  const activeProjects = projects.filter((p) => p.status === "active");
  const pendingInbox = inboxItems.filter((i) => i.status === "pending").slice(0, 3);
  const todayTodos = todos
    .filter((t) => t.status !== "completed" && t.status !== "cancelled")
    .slice(0, 5);

  useEffect(() => {
    fetchProjects();
    fetchTodos();
    fetchInboxItems("pending");
  }, [fetchProjects, fetchTodos, fetchInboxItems]);

  const today = new Date().toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const handleToggleTodo = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    await updateTodoStatus(id, newStatus as "pending" | "completed");
  };

  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim()) return;
    await createTodo(newTodoTitle);
    setNewTodoTitle("");
    setShowNewTodo(false);
  };

  const handleAnswerInbox = async (id: string, answer: string) => {
    await answerItem(id, answer);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <h1 className="section-header text-2xl">HOME</h1>
          <span className="font-mono text-text-secondary">{today}</span>
        </div>
      </motion.header>

      {/* Agent Inbox Preview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="section-header text-lg">AGENT INBOX</h2>
            {pendingInbox.length > 0 && (
              <span className="bg-accent-rose/20 text-accent-rose px-2 py-0.5 rounded-full text-xs font-mono ai-indicator">
                {pendingInbox.length}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/inbox")}
            className="text-text-secondary hover:text-accent-cyan text-sm flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>

        {inboxLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-accent-cyan" />
          </div>
        ) : pendingInbox.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <div className="text-2xl mb-2">✨</div>
            <p>冇待處理嘅問題</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingInbox.map((item, index) => (
              <InboxItemCard
                key={item.id}
                item={item}
                index={index}
                onAnswer={handleAnswerInbox}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* Progress and Todos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Active Projects */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header text-lg">ACTIVE PROJECTS</h2>
            <button
              onClick={() => navigate("/settings")}
              className="text-text-secondary hover:text-accent-cyan text-sm flex items-center gap-1 transition-colors"
            >
              Manage <ChevronRight size={14} />
            </button>
          </div>
          {activeProjects.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
              <p>未有活躍專案</p>
              <button
                onClick={() => navigate("/settings")}
                className="mt-2 text-accent-cyan text-sm hover:underline"
              >
                新增專案
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProjects.slice(0, 4).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-bg-elevated rounded hover:bg-bg-elevated/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📁</span>
                    <div>
                      <p className="font-display text-text-primary text-sm">
                        {project.name}
                      </p>
                      <p className="text-text-muted text-xs font-mono truncate max-w-[200px]">
                        {project.path}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-accent-green">活躍</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Today's Todos */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <h2 className="section-header text-lg mb-4">TODAY'S TODOS</h2>
          {todosLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-accent-cyan" />
            </div>
          ) : (
            <div className="space-y-2">
              {todayTodos.length === 0 && !showNewTodo ? (
                <div className="text-center py-4 text-text-muted">
                  <p>今日未有 TODO</p>
                </div>
              ) : (
                todayTodos.map((todo, index) => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    onClick={() => handleToggleTodo(todo.id, todo.status)}
                    className={`
                      flex items-center gap-3 p-3 rounded cursor-pointer
                      ${
                        todo.status === "completed"
                          ? "bg-bg-elevated/50"
                          : "bg-bg-elevated hover:bg-bg-elevated/80"
                      }
                      transition-colors
                    `}
                  >
                    {todo.status === "completed" ? (
                      <CheckCircle size={18} className="text-accent-green flex-shrink-0" />
                    ) : (
                      <Circle size={18} className="text-text-muted flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        todo.status === "completed"
                          ? "text-text-muted line-through"
                          : "text-text-primary"
                      }`}
                    >
                      {todo.title}
                    </span>
                    {todo.priority === "high" || todo.priority === "urgent" ? (
                      <span className="ml-auto text-xs text-accent-rose">
                        {todo.priority === "urgent" ? "🔴" : "🟠"}
                      </span>
                    ) : null}
                  </motion.div>
                ))
              )}

              {showNewTodo ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTodo()}
                    placeholder="輸入 TODO..."
                    className="terminal-input flex-1 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateTodo}
                    disabled={!newTodoTitle.trim()}
                    className="px-3 py-1.5 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded text-sm disabled:opacity-50"
                  >
                    新增
                  </button>
                  <button
                    onClick={() => {
                      setShowNewTodo(false);
                      setNewTodoTitle("");
                    }}
                    className="px-3 py-1.5 text-text-secondary text-sm"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewTodo(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 text-text-muted hover:text-accent-cyan border border-dashed border-border-subtle rounded hover:border-accent-cyan/30 transition-colors"
                >
                  <Plus size={16} />
                  <span className="text-sm">新增 TODO</span>
                </button>
              )}
            </div>
          )}
        </motion.section>
      </div>

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <h2 className="section-header text-lg mb-4">QUICK ACTIONS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: "記錄今日工作", path: "/chat" },
            { icon: Plus, label: "新增 TODO", action: () => setShowNewTodo(true) },
            { icon: BarChart3, label: "查看統計", path: "/dashboard" },
            { icon: MessageSquare, label: "問 AI", path: "/chat" },
          ].map((action) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => action.path ? navigate(action.path) : action.action?.()}
              className="flex items-center justify-center gap-2 p-4 bg-bg-elevated border border-border-subtle rounded text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
            >
              <action.icon size={18} />
              <span className="text-sm font-display">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

// Inbox Item Card Component
function InboxItemCard({
  item,
  index,
  onAnswer,
}: {
  item: {
    id: string;
    question: string;
    project_id?: string;
    item_type: string;
  };
  index: number;
  onAnswer: (id: string, answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === item.project_id);

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(item.id, answer);
      setAnswer("");
    }
  };

  const handleQuickAnswer = (text: string) => {
    onAnswer(item.id, text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className="ai-bubble p-4 rounded"
    >
      <p className="text-text-primary mb-2">
        {project && (
          <span className="text-accent-cyan font-mono text-sm mr-2">
            {project.name}:
          </span>
        )}
        <span className="cursor-blink">{item.question}</span>
      </p>

      {item.item_type === "daily_summary" || item.item_type === "classification" ? (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="輸入回答..."
            className="terminal-input flex-1 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="px-3 py-1.5 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded text-sm disabled:opacity-50"
          >
            送出
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleQuickAnswer("yes")}
            className="px-3 py-1.5 bg-accent-green/10 text-accent-green border border-accent-green/30 rounded text-sm hover:bg-accent-green/20 transition-colors"
          >
            係，加入
          </button>
          <button
            onClick={() => handleQuickAnswer("later")}
            className="px-3 py-1.5 bg-bg-elevated text-text-secondary border border-border-subtle rounded text-sm hover:text-text-primary transition-colors"
          >
            遲啲先
          </button>
          <button
            onClick={() => handleQuickAnswer("skip")}
            className="px-3 py-1.5 bg-bg-elevated text-text-secondary border border-border-subtle rounded text-sm hover:text-text-primary transition-colors"
          >
            跳過
          </button>
        </div>
      )}
    </motion.div>
  );
}
