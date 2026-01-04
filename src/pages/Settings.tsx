import { useState, useEffect, useCallback, DragEvent } from "react";
import { motion } from "framer-motion";
import { Key, FolderOpen, Bell, Eye, EyeOff, Plus, X, Check, Loader2, Upload, Timer, Bot, Play } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "../stores/projectStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToast } from "../components/Toast";
import { SkeletonProjectItem } from "../components/Skeleton";
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
    createProjectsBatch,
    updateProjectStatus,
    deleteProject,
  } = useProjectStore();

  const {
    settings,
    hasApiKey,
    schedulerStatus,
    loading: settingsLoading,
    saved,
    fetchSettings,
    saveSettings,
    updateNotifications,
    updateScan,
    setApiKey: saveApiKey,
    checkApiKey,
    fetchSchedulerStatus,
    triggerManualScan,
  } = useSettingsStore();

  useEffect(() => {
    fetchProjects();
    fetchSettings();
    checkApiKey();
    fetchSchedulerStatus();
  }, [fetchProjects, fetchSettings, checkApiKey, fetchSchedulerStatus]);

  const handleSaveApiKey = async () => {
    if (apiKey.trim()) {
      const success = await saveApiKey(apiKey);
      if (success) {
        setApiKey("");
        toast.success("API Key saved successfully");
      } else {
        toast.error("Failed to save API Key");
      }
    }
  };

  const handleSaveSettings = async () => {
    await saveSettings(settings);
    toast.success("Settings saved");
  };

  const handleAddProject = async () => {
    if (newProjectName.trim() && newProjectPath.trim()) {
      try {
        await createProject(newProjectName, newProjectPath);
        setNewProjectName("");
        setNewProjectPath("");
        setShowAddProject(false);
        toast.success(`Project "${newProjectName}" added`);
      } catch {
        toast.error("Failed to add project");
      }
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: true,
        title: "Select Project Folders (hold Cmd/Ctrl for multi-select)",
      });
      if (selected) {
        // Handle both single and multiple selection
        const paths = Array.isArray(selected) ? selected : [selected];
        if (paths.length === 1) {
          // Single selection - fill form
          setNewProjectPath(paths[0]);
          if (!newProjectName.trim()) {
            const folderName = paths[0].split("/").pop() || "";
            setNewProjectName(folderName);
          }
        } else if (paths.length > 1) {
          // Multiple selection - batch create directly
          const projectsToCreate: [string, string][] = paths.map((path) => {
            const name = path.split("/").pop() || path;
            return [name, path];
          });
          const created = await createProjectsBatch(projectsToCreate);
          if (created.length > 0) {
            toast.success(`Added ${created.length} projects`);
            setShowAddProject(false);
            setNewProjectName("");
            setNewProjectPath("");
          } else {
            toast.error("Failed to add projects");
          }
        }
      }
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
      toast.error("Failed to select folders");
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
        toast.info("Folder path filled");
      }
    }
  }, [newProjectName, toast]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateProjectStatus(id, status as ProjectStatus);
    toast.success("Project status updated");
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    toast.success("Project deleted");
  };

  const handleNotificationChange = (key: keyof typeof settings.notifications) => {
    updateNotifications({ [key]: !settings.notifications[key] });
  };

  const handleScanChange = (key: keyof typeof settings.scan, value: boolean | number) => {
    updateScan({ [key]: value });
  };

  const handleManualScan = async () => {
    try {
      await triggerManualScan();
      toast.success("Manual scan triggered");
    } catch {
      toast.error("Manual scan failed");
    }
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
              Configured
            </span>
          )}
        </div>

        <p className="text-text-secondary text-sm mb-4">
          Enter your Grok API Key to enable AI features. You can get one from{" "}
          <a href="https://x.ai" target="_blank" rel="noopener noreferrer" className="text-accent-cyan hover:underline">
            x.ai
          </a>
        </p>

        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKey ? "Enter new API Key to update..." : "xai-..."}
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
          API Key is securely stored in macOS Keychain
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
            Add Project
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
                placeholder="Project Name"
                className="terminal-input w-full"
              />

              {/* Folder Path with Browse and Drag-Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative rounded border-2 border-dashed transition-all
                  ${isDragOver
                    ? "border-accent-cyan bg-accent-cyan/10"
                    : "border-border-subtle hover:border-accent-cyan/50"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    placeholder="Drop folder or click Browse..."
                    className="terminal-input flex-1 border-0 bg-transparent"
                  />
                  <button
                    onClick={handleBrowseFolder}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-2 mr-1 text-sm text-accent-cyan hover:bg-accent-cyan/10 rounded transition-colors"
                  >
                    <FolderOpen size={16} />
                    Browse
                  </button>
                </div>

                {/* Drag overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-accent-cyan/10 rounded pointer-events-none">
                    <div className="flex items-center gap-2 text-accent-cyan">
                      <Upload size={20} />
                      <span className="text-sm font-medium">Drop to select folder</span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-text-muted text-xs flex items-center gap-1">
                <span>💡</span>
                <span>Hold Cmd (Mac) / Ctrl (Win) to select multiple folders at once</span>
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddProject(false);
                    setNewProjectName("");
                    setNewProjectPath("");
                  }}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProject}
                  disabled={!newProjectName.trim() || !newProjectPath.trim()}
                  className="px-3 py-1.5 text-sm bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 disabled:opacity-50 transition-colors"
                >
                  Add Project
                </button>
              </div>
            </div>
          </div>
        )}

        {projectsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <SkeletonProjectItem key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-cyan/10 mb-4">
              <FolderOpen size={28} className="text-accent-cyan" />
            </div>
            <p className="text-text-primary font-medium mb-1">No projects yet</p>
            <p className="text-text-muted text-sm mb-4">Add a project to start tracking your development progress</p>
            <button
              onClick={() => setShowAddProject(true)}
              className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded text-sm hover:bg-accent-cyan/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus size={16} />
                Add Project
              </span>
            </button>
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
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
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
            { key: "daily_summary" as const, label: "Daily Summary", description: "Daily reminder to summarize your work" },
            { key: "todo_reminder" as const, label: "TODO Reminder", description: "Notify when TODOs are overdue" },
            { key: "stale_project" as const, label: "Stale Project Alert", description: "Notify when a project has no activity for 30 days" },
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

      {/* Scan Settings Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer size={18} className="text-accent-cyan" />
            <h2 className="section-header text-lg">AUTO SCAN</h2>
            {schedulerStatus?.is_running && (
              <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
                Running
              </span>
            )}
          </div>
          <button
            onClick={handleManualScan}
            disabled={settingsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-cyan hover:bg-accent-cyan/10 rounded transition-colors"
          >
            {settingsLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Manual Scan
          </button>
        </div>

        {schedulerStatus?.last_scan && (
          <p className="text-text-muted text-xs mb-4">
            Last scan: {new Date(schedulerStatus.last_scan).toLocaleString('en-US')}
          </p>
        )}

        <div className="space-y-4">
          {/* Enable Auto Scan Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary text-sm">Enable Auto Scan</p>
              <p className="text-text-muted text-xs">Periodically scan projects and analyze changes</p>
            </div>
            <button
              onClick={() => handleScanChange("enabled", !settings.scan.enabled)}
              className={`
                w-12 h-6 rounded-full transition-all relative
                ${settings.scan.enabled
                  ? "bg-accent-cyan"
                  : "bg-bg-elevated border border-border-subtle"
                }
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                  ${settings.scan.enabled ? "left-7" : "left-1"}
                `}
              />
            </button>
          </div>

          {/* Scan Interval */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary text-sm">Scan Interval</p>
              <p className="text-text-muted text-xs">How often to scan for changes</p>
            </div>
            <select
              value={settings.scan.interval_minutes}
              onChange={(e) => handleScanChange("interval_minutes", parseInt(e.target.value))}
              className="bg-bg-primary text-text-secondary text-sm border border-border-subtle rounded px-3 py-1.5"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Scan on Startup Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary text-sm">Scan on Startup</p>
              <p className="text-text-muted text-xs">Automatically scan all projects when app starts</p>
            </div>
            <button
              onClick={() => handleScanChange("scan_on_startup", !settings.scan.scan_on_startup)}
              className={`
                w-12 h-6 rounded-full transition-all relative
                ${settings.scan.scan_on_startup
                  ? "bg-accent-cyan"
                  : "bg-bg-elevated border border-border-subtle"
                }
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                  ${settings.scan.scan_on_startup ? "left-7" : "left-1"}
                `}
              />
            </button>
          </div>

          {/* AI Features Header */}
          <div className="pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-accent-purple" />
              <p className="text-text-primary text-sm font-medium">AI Features</p>
            </div>

            {/* Auto Classify Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-text-primary text-sm">Auto Classification</p>
                <p className="text-text-muted text-xs">AI automatically categorizes changes (feature/bugfix/refactor...)</p>
              </div>
              <button
                onClick={() => handleScanChange("auto_classify", !settings.scan.auto_classify)}
                className={`
                  w-12 h-6 rounded-full transition-all relative
                  ${settings.scan.auto_classify
                    ? "bg-accent-purple"
                    : "bg-bg-elevated border border-border-subtle"
                  }
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                    ${settings.scan.auto_classify ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>

            {/* Auto Summarize Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary text-sm">Auto Summary</p>
                <p className="text-text-muted text-xs">AI automatically generates daily work summaries</p>
              </div>
              <button
                onClick={() => handleScanChange("auto_summarize", !settings.scan.auto_summarize)}
                className={`
                  w-12 h-6 rounded-full transition-all relative
                  ${settings.scan.auto_summarize
                    ? "bg-accent-purple"
                    : "bg-bg-elevated border border-border-subtle"
                  }
                `}
              >
                <span
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                    ${settings.scan.auto_summarize ? "left-7" : "left-1"}
                  `}
                />
              </button>
            </div>
          </div>
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
              Saved
            </span>
          ) : settingsLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Settings"
          )}
        </button>
      </motion.div>
    </div>
  );
}
