import { useState, useEffect, useCallback, DragEvent } from "react";
import { motion } from "framer-motion";
import { Key, FolderOpen, Bell, Eye, EyeOff, Plus, X, Check, Loader2, Upload } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToast } from "../components/Toast";
import type { ProjectStatus } from "../lib/types";

export function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const toast = useToast();

  const {
    projects,
    loading: projectsLoading,
    fetchProjects,
    createProject,
    updateProjectStatus,
    deleteProject,
  } = useProjectStore();

  const {
    settings,
    hasApiKey,
    loading: settingsLoading,
    saved,
    fetchSettings,
    saveSettings,
    updateNotifications,
    setApiKey: saveApiKey,
    checkApiKey,
  } = useSettingsStore();

  useEffect(() => {
    fetchProjects();
    fetchSettings();
    checkApiKey();
  }, [fetchProjects, fetchSettings, checkApiKey]);

  const handleSaveApiKey = async () => {
    if (apiKey.trim()) {
      const success = await saveApiKey(apiKey);
      if (success) {
        setApiKey("");
        toast.success("API Key 已成功儲存");
      } else {
        toast.error("儲存 API Key 失敗");
      }
    }
  };

  const handleSaveSettings = async () => {
    await saveSettings(settings);
    toast.success("設定已儲存");
  };

  const handleAddProject = async () => {
    if (newProjectName.trim() && newProjectPath.trim()) {
      try {
        await createProject(newProjectName, newProjectPath);
        setNewProjectName("");
        setNewProjectPath("");
        setShowAddProject(false);
        toast.success(`專案「${newProjectName}」已新增`);
      } catch {
        toast.error("新增專案失敗");
      }
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "選擇專案資料夾",
      });
      if (selected) {
        setNewProjectPath(selected as string);
        // Auto-fill project name from folder name if empty
        if (!newProjectName.trim()) {
          const folderName = (selected as string).split("/").pop() || "";
          setNewProjectName(folderName);
        }
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Get the dropped path from dataTransfer
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // In Tauri, we can get the path from the file
      const file = files[0];
      // For directories, we need to use the path attribute
      const path = (file as unknown as { path?: string }).path || file.name;
      if (path) {
        setNewProjectPath(path);
        if (!newProjectName.trim()) {
          const folderName = path.split("/").pop() || "";
          setNewProjectName(folderName);
        }
        toast.info("資料夾路徑已填入");
      }
    }
  }, [newProjectName, toast]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateProjectStatus(id, status as ProjectStatus);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
  };

  const handleNotificationChange = (key: keyof typeof settings.notifications) => {
    updateNotifications({ [key]: !settings.notifications[key] });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="section-header text-2xl">SETTINGS</h1>
      </motion.header>

      {/* API Key Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-accent-cyan" />
          <h2 className="section-header text-lg">GROK API KEY</h2>
          {hasApiKey && (
            <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded">
              已設定
            </span>
          )}
        </div>

        <p className="text-text-secondary text-sm mb-4">
          輸入你嘅 Grok API Key 嚟啟用 AI 功能。你可以喺{" "}
          <a href="https://x.ai" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">
            x.ai
          </a>{" "}
          獲取 API Key。
        </p>

        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "輸入新 API Key 嚟更新..." : "xai-..."}
            className="terminal-input w-full pr-28"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {apiKey && (
              <button
                onClick={handleSaveApiKey}
                disabled={settingsLoading}
                className="text-accent-cyan hover:text-accent-cyan/80 transition-colors"
              >
                {settingsLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              </button>
            )}
          </div>
        </div>

        <p className="text-text-muted text-xs mt-2">
          💡 API Key 會安全儲存喺 macOS Keychain
        </p>
      </motion.section>

      {/* Projects Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-accent-cyan" />
            <h2 className="section-header text-lg">PROJECTS</h2>
          </div>
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="flex items-center gap-1 text-sm text-accent-cyan hover:text-accent-cyan/80 transition-colors"
          >
            <Plus size={16} />
            新增專案
          </button>
        </div>

        {/* Add Project Form */}
        {showAddProject && (
          <div className="mb-4 p-4 bg-bg-elevated rounded border border-border-subtle">
            <div className="space-y-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="專案名稱"
                className="terminal-input w-full"
              />
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder="專案路徑 (e.g., /Users/you/projects/myapp)"
                className="terminal-input w-full font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddProject(false)}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
                >
                  取消
                </button>
                <button
                  onClick={handleAddProject}
                  disabled={!newProjectName.trim() || !newProjectPath.trim()}
                  className="px-3 py-1.5 text-sm bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 disabled:opacity-50"
                >
                  新增
                </button>
              </div>
            </div>
          </div>
        )}

        {projectsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-accent-cyan" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p>仲未有專案</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-bg-elevated rounded hover:bg-bg-elevated/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      project.status === "active"
                        ? "bg-accent-green"
                        : project.status === "paused"
                        ? "bg-accent-amber"
                        : "bg-text-muted"
                    }`}
                  />
                  <div>
                    <p className="font-display text-text-primary text-sm">{project.name}</p>
                    <p className="text-text-muted text-xs font-mono">{project.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value)}
                    className="bg-bg-primary text-text-secondary text-xs border border-border-subtle rounded px-2 py-1"
                  >
                    <option value="active">活躍</option>
                    <option value="paused">暫停</option>
                    <option value="archived">封存</option>
                  </select>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-text-muted hover:text-accent-rose transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Notifications Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-accent-cyan" />
          <h2 className="section-header text-lg">NOTIFICATIONS</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: "daily_summary" as const, label: "每日總結", description: "每日提醒你總結當日工作" },
            { key: "todo_reminder" as const, label: "TODO 提醒", description: "TODO 過期時通知你" },
            { key: "stale_project" as const, label: "停滯專案提醒", description: "專案超過 30 日冇動時通知你" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-text-primary text-sm">{item.label}</p>
                <p className="text-text-muted text-xs">{item.description}</p>
              </div>
              <button
                onClick={() => handleNotificationChange(item.key)}
                className={`
                  w-12 h-6 rounded-full transition-all relative
                  ${settings.notifications[item.key]
                    ? "bg-accent-cyan"
                    : "bg-bg-elevated border border-border-subtle"
                  }
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                    ${settings.notifications[item.key]
                      ? "left-7"
                      : "left-1"
                    }
                  `}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end"
      >
        <button
          onClick={handleSaveSettings}
          disabled={settingsLoading}
          className={`
            px-6 py-3 rounded font-display text-sm tracking-wider transition-all
            ${saved
              ? "bg-accent-green/20 text-accent-green border border-accent-green/50"
              : "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 hover:bg-accent-cyan/30"
            }
          `}
        >
          {saved ? (
            <span className="flex items-center gap-2">
              <Check size={16} />
              已儲存
            </span>
          ) : settingsLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              儲存中...
            </span>
          ) : (
            "儲存設定"
          )}
        </button>
      </motion.div>
    </div>
  );
}
