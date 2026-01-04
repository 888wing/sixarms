import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, PieChart, Award, Loader2, BarChart3 } from "lucide-react";
import { useStatsStore } from "../stores/statsStore";
import { useTodoStore } from "../stores/todoStore";
import { useProjectStore } from "../stores/projectStore";
import { ProjectSelector } from "../components/ProjectSelector";

const categoryColors: Record<string, string> = {
  feature: "accent-green",
  bugfix: "accent-rose",
  refactor: "accent-violet",
  ui: "accent-cyan",
  docs: "accent-amber",
  test: "accent-blue",
  chore: "text-muted",
  other: "text-secondary",
};

const categoryLabels: Record<string, string> = {
  feature: "Feature",
  bugfix: "Bug Fix",
  refactor: "Refactor",
  ui: "UI/UX",
  docs: "Documentation",
  test: "Testing",
  chore: "Chore",
  other: "Other",
};

export function Dashboard() {
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "year">("month");

  const {
    activityData,
    categoryDistribution,
    loading: statsLoading,
    fetchAllStats,
  } = useStatsStore();

  const { todos, fetchTodos } = useTodoStore();
  const { projects, selectedProjectId, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchAllStats();
    fetchTodos();
    fetchProjects();
  }, [fetchAllStats, fetchTodos, fetchProjects]);

  // Filter todos by selected project
  const filteredTodos = useMemo(() => {
    if (!selectedProjectId) return todos;
    return todos.filter((t) => t.project_id === selectedProjectId);
  }, [todos, selectedProjectId]);

  // Calculate todo stats from filtered todos
  const completedTodos = filteredTodos.filter((t) => t.status === "completed").length;
  const pendingTodos = filteredTodos.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;
  const totalTodos = filteredTodos.length;

  // Generate heatmap data from activity data
  const generateHeatmapData = () => {
    const chars = ["░", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Create a map of date -> count from activity data
    const activityMap = new Map<string, number>();
    activityData.forEach(([date, count]) => {
      activityMap.set(date, count);
    });

    // Generate last 52 weeks of data
    const result = days.map((day, dayIndex) => {
      const data: string[] = [];
      for (let week = 51; week >= 0; week--) {
        const date = new Date();
        date.setDate(date.getDate() - (week * 7) - ((date.getDay() + 6) % 7) + dayIndex);
        const dateStr = date.toISOString().split("T")[0];
        const count = activityMap.get(dateStr) || 0;

        // Map count to character
        const charIndex = Math.min(Math.floor(count / 2), chars.length - 1);
        data.push(chars[charIndex]);
      }
      return { day, data };
    });

    return result;
  };

  const heatmapData = generateHeatmapData();

  // Calculate distribution percentages
  const totalDistribution = categoryDistribution.reduce((sum, [, count]) => sum + count, 0);
  const distributionWithPercentage = categoryDistribution.map(([category, count]) => ({
    label: categoryLabels[category] || category,
    category,
    percentage: totalDistribution > 0 ? Math.round((count / totalDistribution) * 100) : 0,
    color: categoryColors[category] || "text-muted",
  }));

  // Generate achievements based on real data
  const achievements = [
    {
      icon: "📁",
      text: `${projects.filter((p) => p.status === "active").length} active projects`,
    },
    {
      icon: "✅",
      text: `${completedTodos} TODOs completed`,
    },
    {
      icon: "📝",
      text: `${pendingTodos} pending tasks`,
    },
    {
      icon: "📊",
      text: `${activityData.filter(([, c]) => c > 0).length} active days`,
    },
  ];

  // Generate monthly trend data from activity data
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (11 - i));
    const monthStr = month.toISOString().slice(0, 7);

    const count = activityData
      .filter(([date]) => date.startsWith(monthStr))
      .reduce((sum, [, c]) => sum + c, 0);

    return count;
  });

  const maxTrend = Math.max(...monthlyTrend, 1);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <h1 className="section-header text-2xl">DASHBOARD</h1>
        <div className="flex items-center gap-4">
          <ProjectSelector />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="terminal-input text-sm py-2"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </motion.header>

      {statsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-accent-cyan" />
        </div>
      ) : (
        <>
          {/* Activity Heatmap */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-header text-lg flex items-center gap-2">
                <Calendar size={18} className="text-accent-cyan" />
                ACTIVITY HEATMAP
              </h2>
              <span className="font-mono text-text-secondary text-sm">
                {new Date().getFullYear()}
              </span>
            </div>

            {/* Month labels */}
            <div className="mb-2 ml-12 flex justify-between text-xs text-text-muted font-mono">
              {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(
                (m, i) => (
                  <span key={`${m}-${i}`}>{m}</span>
                )
              )}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1 mb-4">
              {heatmapData.map((row) => (
                <div key={row.day} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-text-muted font-mono">
                    {row.day}
                  </span>
                  <div className="flex-1 flex gap-0.5 font-display text-sm">
                    {row.data.map((char, i) => (
                      <span
                        key={i}
                        className={`
                          cursor-pointer transition-all duration-100
                          hover:scale-150 hover:text-accent-cyan
                          ${char === "░" ? "text-text-muted" : "text-accent-cyan"}
                        `}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
              <span>░ 0</span>
              <span className="text-accent-cyan/40">▂ 1-3</span>
              <span className="text-accent-cyan/60">▄ 4-7</span>
              <span className="text-accent-cyan/80">▆ 8-12</span>
              <span className="text-accent-cyan">█ 13+</span>
            </div>
          </motion.section>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Code Trend */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="section-header text-lg flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-accent-cyan" />
                ACTIVITY TREND
              </h2>

              <div className="font-mono text-sm space-y-1">
                <div className="flex items-end h-32 gap-1 border-l border-b border-border-subtle pl-8 pb-2">
                  {monthlyTrend.map((count, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-accent-cyan/20 border-t-2 border-accent-cyan transition-all hover:bg-accent-cyan/40"
                      style={{ height: `${(count / maxTrend) * 100}%`, minHeight: "2px" }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-text-muted text-xs pl-8">
                  {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(
                    (m, i) => (
                      <span key={`trend-${m}-${i}`}>{m}</span>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-accent-cyan" /> Activity Count
                </span>
              </div>
            </motion.section>

            {/* Work Distribution */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="section-header text-lg flex items-center gap-2 mb-4">
                <PieChart size={18} className="text-accent-cyan" />
                WORK DISTRIBUTION
              </h2>

              {distributionWithPercentage.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Not enough data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {distributionWithPercentage.slice(0, 5).map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-primary">{item.label}</span>
                        <span className="font-mono text-text-secondary">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-bg-elevated rounded overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                          className="h-full rounded"
                          style={{
                            backgroundColor: `var(--${item.color})`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TODO Progress */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card p-6"
            >
              <h2 className="section-header text-lg mb-4">TODO PROGRESS</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Completed</span>
                    <span className="font-mono text-accent-green">{completedTodos}</span>
                  </div>
                  <div className="h-3 bg-bg-elevated rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0}%`,
                      }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="h-full bg-accent-green rounded"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Pending</span>
                    <span className="font-mono text-accent-amber">{pendingTodos}</span>
                  </div>
                  <div className="h-3 bg-bg-elevated rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${totalTodos > 0 ? (pendingTodos / totalTodos) * 100 : 0}%`,
                      }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      className="h-full bg-accent-amber rounded"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Total</span>
                    <span className="font-mono text-text-primary">{totalTodos}</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Stats Summary */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card p-6"
            >
              <h2 className="section-header text-lg flex items-center gap-2 mb-4">
                <Award size={18} className="text-accent-violet" />
                SUMMARY
              </h2>

              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-bg-elevated rounded"
                  >
                    <span className="text-xl">{achievement.icon}</span>
                    <span className="text-sm text-text-primary">{achievement.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </>
      )}
    </div>
  );
}
