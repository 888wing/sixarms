import { useState, useEffect } from 'react';
import { Tag, Milestone as MilestoneIcon, Plus, X, Link, Calendar, GitBranch } from 'lucide-react';
import { useVersionStore } from '../stores/versionStore';
import { useProjectStore } from '../stores/projectStore';
import type { MilestoneStatus } from '../lib/types';

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

export function VersionTracking() {
  const { gitTags, milestones, loading, fetchGitTags, addMilestone, updateMilestoneStatus, deleteMilestone, linkTagToMilestone } = useVersionStore();
  const { projects, selectedProject } = useProjectStore();
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'tags' | 'milestones'>('tags');

  const currentProject = selectedProject
    ? projects.find((p) => p.id === selectedProject)
    : projects[0];

  useEffect(() => {
    if (currentProject?.path) {
      fetchGitTags(currentProject.path);
    }
  }, [currentProject?.path, fetchGitTags]);

  const handleAddMilestone = () => {
    if (!newTitle.trim() || !currentProject) return;

    addMilestone({
      project_id: currentProject.id,
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

  const projectMilestones = milestones.filter(
    (m) => m.project_id === currentProject?.id
  );

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
        {currentProject && (
          <span className="text-sm text-gray-400">{currentProject.name}</span>
        )}
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
          {loading ? (
            <div className="text-center py-8 text-gray-400">載入中...</div>
          ) : gitTags.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>尚無 Git 標籤</p>
              <p className="text-sm mt-1">使用 git tag 命令建立標籤</p>
            </div>
          ) : (
            gitTags.map((tag) => (
              <div
                key={tag.name}
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
            ))
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {/* Add Milestone Button */}
          {!showNewMilestone && (
            <button
              onClick={() => setShowNewMilestone(true)}
              className="w-full p-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
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
          {projectMilestones.length === 0 && !showNewMilestone ? (
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
                      {milestone.version && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                          {milestone.version}
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
