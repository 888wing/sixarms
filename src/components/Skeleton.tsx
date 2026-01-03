import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClass = "bg-bg-elevated animate-pulse rounded";

  const getVariantClass = () => {
    switch (variant) {
      case "circular":
        return "rounded-full";
      case "rectangular":
        return "rounded";
      case "text":
      default:
        return "rounded h-4";
    }
  };

  const style: React.CSSProperties = {
    width: width || (variant === "text" ? "100%" : undefined),
    height: height || (variant === "text" ? "1rem" : undefined),
  };

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} ${getVariantClass()}`}
            style={{
              ...style,
              width: i === lines - 1 ? "75%" : "100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClass} ${getVariantClass()} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton patterns
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 bg-bg-elevated rounded border border-border-subtle ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1">
          <Skeleton width="60%" height={14} className="mb-2" />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton lines={2} />
    </div>
  );
}

export function SkeletonProjectItem() {
  return (
    <div className="flex items-center justify-between p-3 bg-bg-elevated rounded">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={8} height={8} />
        <div>
          <Skeleton width={120} height={14} className="mb-1" />
          <Skeleton width={200} height={12} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={60} height={24} />
        <Skeleton variant="circular" width={16} height={16} />
      </div>
    </div>
  );
}

export function SkeletonTodoItem() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 bg-bg-elevated rounded"
    >
      <Skeleton variant="circular" width={18} height={18} />
      <Skeleton width="70%" height={14} />
    </motion.div>
  );
}

export function SkeletonInboxItem() {
  return (
    <div className="p-4 bg-bg-elevated rounded border border-border-subtle">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton width={80} height={16} />
      </div>
      <Skeleton lines={2} className="mb-3" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} />
        <Skeleton width={60} height={32} />
        <Skeleton width={60} height={32} />
      </div>
    </div>
  );
}

export function SkeletonChartCard() {
  return (
    <div className="p-6 bg-bg-elevated rounded border border-border-subtle">
      <Skeleton width={120} height={18} className="mb-4" />
      <Skeleton variant="rectangular" height={200} />
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="p-4 bg-bg-elevated rounded border border-border-subtle">
      <Skeleton width={60} height={12} className="mb-2" />
      <Skeleton width={80} height={28} className="mb-1" />
      <Skeleton width={100} height={12} />
    </div>
  );
}
