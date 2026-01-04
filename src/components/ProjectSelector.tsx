import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useProjectStore } from "../stores/projectStore";

interface ProjectSelectorProps {
  /** Label for "All Projects" option. Default: "All Projects" */
  allLabel?: string;
  /** Accent color class. Default: "text-accent-cyan" */
  accentColor?: string;
  /** Callback when project changes */
  onProjectChange?: (projectId: string | null) => void;
  /** Show only active projects. Default: true */
  activeOnly?: boolean;
  /** Custom class for the button */
  className?: string;
}

export function ProjectSelector({
  allLabel = "All Projects",
  accentColor = "text-accent-cyan",
  onProjectChange,
  activeOnly = true,
  className = "",
}: ProjectSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { projects, selectedProjectId, selectProject, fetchProjects } =
    useProjectStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const filteredProjects = useMemo(
    () => (activeOnly ? projects.filter((p) => p.status === "active") : projects),
    [projects, activeOnly]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string | null) => {
    selectProject(id);
    setShowMenu(false);
    onProjectChange?.(id);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-text-secondary hover:text-accent-cyan transition-colors"
      >
        <span className="text-lg">{selectedProject ? "📁" : "🌐"}</span>
        <span className="font-mono text-sm">
          {selectedProject?.name ?? allLabel}
        </span>
        <ChevronDown size={16} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-bg-elevated border border-border-subtle rounded shadow-lg z-10 min-w-[200px]">
          <button
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary transition-colors ${
              !selectedProjectId ? accentColor : "text-text-secondary"
            }`}
          >
            🌐 {allLabel}
          </button>
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project.id)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-bg-secondary transition-colors ${
                selectedProjectId === project.id
                  ? accentColor
                  : "text-text-secondary"
              }`}
            >
              📁 {project.name}
            </button>
          ))}
          {filteredProjects.length === 0 && (
            <div className="px-4 py-2 text-sm text-text-muted">
              No active projects
            </div>
          )}
        </div>
      )}
    </div>
  );
}
