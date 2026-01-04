import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tag,
  Milestone as MilestoneIcon,
  Plus,
  X,
  Link,
  Calendar,
  GitBranch,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useVersionStore } from '../stores/versionStore';
import { useProjectStore } from '../stores/projectStore';
import type { MilestoneStatus, MilestoneSource } from '../lib/types';

const statusColors: Record<MilestoneStatus, string> = {
  planned: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const statusLabels: Record<MilestoneStatus, string> = {
  planned: '計劃中',
  in_progress: '進行中',
  completed: '已完成',
  cancelled: '已取消',
};

const sourceLabels: Record<MilestoneSource, string> = {
  manual: '手動',
  tag: 'Git',
  ai: 'AI',
};

const sourceColors: Record<MilestoneSource, string> = {
  manual: 'bg-gray-500/20 text-gray-400',
  tag: 'bg-blue-500/20 text-blue-400',
  ai: 'bg-green-500/20 text-green-400',
};

export function VersionTracking() {
  const {
    gitTags,
    milestones,
    tagsLoading,
    milestonesLoading,
    fetchGitTags,
    fetchMilestones,
    addMilestone,
    updateMilestoneStatus,
    deleteMilestone,
  } = useVersionStore();
  const {
    projects,
    selectedProjectId,
    selectProject,
    fetchProjects,
  } = useProjectStore();
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'tags' | 'milestones'>('tags');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;
  const isAllProjects = !selectedProjectId;
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === 'active'),
    [projects]
  );
  const projectsForTags = useMemo(
    () => (selectedProjectId ? projects : activeProjects),
    [selectedProjectId, projects, activeProjects]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchMilestones(selectedProjectId ?? undefined);
  }, [selectedProjectId, fetchMilestones]);

  useEffect(() => {
    if (!selectedProject) {
      setShowNewMilestone(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (projectsForTags.length > 0) {
      fetchGitTags(projectsForTags, selectedProjectId);
    }
  }, [projectsForTags, selectedProjectId, fetchGitTags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddMilestone = async () => {
    if (!newTitle.trim() || !selectedProject) return;

    await addMilestone({
      project_id: selectedProject.id,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      version: newVersion.trim() || undefined,
      status: 'planned',
    });

    setNewTitle('');
    setNewVersion('');
    setNewDescription('');
    setShowNewMilestone(false);
  };

  const projectMilestones = isAllProjects
    ? milestones
    : milestones.filter((m) => m.project_id === selectedProjectId);

  const tagsByProject = useMemo(() => {
    type TagGroup = { projectId: string; projectName: string; tags: typeof gitTags };
    const groups = new Map<string, TagGroup>();
    gitTags.forEach((tag) => {
      const entry = groups.get(tag.project_id) ?? {
        projectId: tag.project_id,
        projectName: tag.project_name,
        tags: [] as typeof gitTags,
      };
      entry.tags.push(tag);
      groups.set(tag.project_id, entry);
    });
    return Array.from(groups.values()).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [gitTags]);

  const projectNameById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project.name]));
  }, [projects]);

  const handleProjectSelect = (id: string | null) => {
    selectProject(id);
    setShowProjectMenu(false);
    setShowNewMilestone(false);
  };

  const handleRefreshTags = () => {
    fetchGitTags(projectsForTags, selectedProjectId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-HK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">版本追蹤</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshTags}
            disabled={tagsLoading}
            className={`px-2 py-1 text-xs border rounded transition-colors flex items-center gap-1 ${
              tagsLoading
                ? 'text-gray-600 border-gray-800 cursor-not-allowed'
                : 'text-gray-400 border-gray-700 hover:border-purple-500 hover:text-purple-400'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            重新整理
          </button>
          <div className="relative" ref={projectMenuRef}>
            <button
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
            >
              <span className="text-sm">{selectedProject ? '📁' : '🌐'}</span>
              <span className="text-sm">
                {selectedProject?.name ?? '全部專案'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showProjectMenu && (
              <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded shadow-lg z-10 min-w-[200px]">
                <button
                  onClick={() => handleProjectSelect(null)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                    !selectedProjectId ? 'text-purple-400' : 'text-gray-300'
                  }`}
                >
                  🌐 全部專案
                </button>
                {activeProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${
                      selectedProjectId === project.id ? 'text-purple-400' : 'text-gray-300'
                    }`}
                  >
                    📁 {project.name}
                  </button>
                ))}
                {activeProjects.length === 0 && (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    沒有可用專案
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tags'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Git 標籤 ({gitTags.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'milestones'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <MilestoneIcon className="w-4 h-4" />
            里程碑 ({projectMilestones.length})
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tags' && (
        <div className="space-y-3">
          {tagsLoading ? (
            <div className="text-center py-8 text-gray-400">載入中...</div>
          ) : gitTags.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>尚無 Git 標籤</p>
              <p className="text-sm mt-1">使用 git tag 命令建立標籤</p>
            </div>
          ) : (
            (isAllProjects ? tagsByProject : [{ projectId: selectedProject?.id ?? '', projectName: selectedProject?.name ?? '', tags: gitTags }])
              .filter((group) => group.tags.length > 0)
              .map((group) => (
                <div
                  key={group.projectId || group.projectName || 'current-project'}
                  className="space-y-3"
                >
                  {isAllProjects && (
                    <div className="text-sm text-gray-400">{group.projectName}</div>
                  )}
                  {group.tags.map((tag) => (
                    <div
                      key={`${group.projectId}-${tag.name}`}
                      className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-purple-400" />
                          <span className="font-mono text-purple-400">{tag.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                          {tag.commit_hash}
                        </span>
                      </div>
                      {tag.message && (
                        <p className="mt-2 text-sm text-gray-300">{tag.message}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(tag.date)}
                      </div>
                    </div>
                  ))}
                </div>
              ))
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {/* Add Milestone Button */}
          {!showNewMilestone && (
            <button
              onClick={() => selectedProject && setShowNewMilestone(true)}
              disabled={!selectedProject}
              className={`w-full p-3 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2 ${
                selectedProject
                  ? 'border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-400'
                  : 'border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              新增里程碑
            </button>
          )}

          {/* New Milestone Form */}
          {showNewMilestone && (
            <div className="p-4 bg-gray-800 rounded-lg border border-purple-500 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">新增里程碑</h3>
                <button
                  onClick={() => setShowNewMilestone(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="里程碑名稱"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="版本號 (例如: v1.0.0)"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="描述 (選填)"
                rows={2}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewMilestone(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMilestone}
                  disabled={!newTitle.trim()}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  建立
                </button>
              </div>
            </div>
          )}

          {/* Milestones List */}
          {milestonesLoading ? (
            <div className="text-center py-8 text-gray-400">載入中...</div>
          ) : projectMilestones.length === 0 && !showNewMilestone ? (
            <div className="text-center py-8 text-gray-400">
              <MilestoneIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>尚無里程碑</p>
              <p className="text-sm mt-1">建立里程碑來追蹤專案進度</p>
            </div>
          ) : (
            projectMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${statusColors[milestone.status]}`}
                      />
                      <span className="font-medium text-white">
                        {milestone.title}
                      </span>
                      {isAllProjects && (
                        <span className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-300 rounded">
                          {projectNameById.get(milestone.project_id) ?? '未知專案'}
                        </span>
                      )}
                      {milestone.version && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                          {milestone.version}
                        </span>
                      )}
                      {milestone.source && (
                        <span className={`px-2 py-0.5 text-xs rounded ${sourceColors[milestone.source]}`}>
                          {sourceLabels[milestone.source]}
                        </span>
                      )}
                    </div>
                    {milestone.description && (
                      <p className="mt-1 text-sm text-gray-400">
                        {milestone.description}
                      </p>
                    )}
                    {milestone.git_tag && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
                        <Link className="w-3 h-3" />
                        連結至 {milestone.git_tag}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={milestone.status}
                      onChange={(e) =>
                        updateMilestoneStatus(
                          milestone.id,
                          e.target.value as MilestoneStatus
                        )
                      }
                      className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteMilestone(milestone.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>建立於 {formatDate(milestone.created_at)}</span>
                  {milestone.completed_at && (
                    <span>完成於 {formatDate(milestone.completed_at)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
