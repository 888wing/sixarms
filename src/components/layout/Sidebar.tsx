import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BarChart3,
  MessageSquare,
  Inbox,
  Settings,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: Home, label: "HOME", path: "/" },
  { icon: BarChart3, label: "DASH", path: "/dashboard" },
  { icon: MessageSquare, label: "CHAT", path: "/chat" },
  { icon: Inbox, label: "INBOX", path: "/inbox", badge: 3 },
  { icon: Settings, label: "SET", path: "/settings" },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      className="relative h-screen bg-bg-primary border-r border-border-subtle flex flex-col"
      initial={false}
      animate={{ width: isExpanded ? 240 : 64 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border-subtle">
        <motion.div
          className="flex items-center gap-3 overflow-hidden"
          animate={{ opacity: 1 }}
        >
          <img src="/logo.svg" alt="Sixarms" className="w-8 h-8" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-display font-bold text-text-primary tracking-wider whitespace-nowrap"
              >
                SIXARMS
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`
                    relative flex items-center h-12 px-4 mx-2 rounded
                    transition-all duration-150
                    ${isActive
                      ? "bg-bg-secondary text-accent-cyan"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50"
                    }
                  `}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent-cyan rounded-r"
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`
                      flex-shrink-0 w-6 h-6 flex items-center justify-center
                      ${isActive ? "text-accent-cyan" : ""}
                    `}
                  >
                    <Icon size={20} />
                  </motion.div>

                  {/* Label */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="ml-3 font-display text-sm tracking-wider whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Badge */}
                  {item.badge && (
                    <motion.span
                      className={`
                        absolute flex items-center justify-center
                        text-xs font-mono font-bold
                        ${isExpanded ? "right-3" : "top-1 right-1"}
                        ${isActive ? "text-accent-cyan" : "text-accent-rose"}
                      `}
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {isExpanded ? (
                        <span className="bg-accent-rose/20 text-accent-rose px-2 py-0.5 rounded-full ai-indicator">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="w-4 h-4 bg-accent-rose/20 text-accent-rose rounded-full flex items-center justify-center ai-indicator">
                          {item.badge}
                        </span>
                      )}
                    </motion.span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Expand indicator */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="w-4 h-4 bg-bg-secondary border border-border-subtle rounded-full flex items-center justify-center text-text-muted"
        >
          <ChevronRight size={10} />
        </motion.div>
      </div>
    </motion.aside>
  );
}
