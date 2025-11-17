/**
 * ThemeToggle Component
 * 
 * Beautiful animated toggle button for switching between light and dark modes.
 * Features smooth transitions and icon animations.
 */

"use client";
import React from 'react';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative h-5 w-5">
        {/* Sun Icon */}
        <motion.div
          initial={false}
          animate={{
            scale: isDark ? 0 : 1,
            rotate: isDark ? 180 : 0,
            opacity: isDark ? 0 : 1,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          className="absolute inset-0"
        >
          <IconSun className="h-5 w-5 text-amber-500" />
        </motion.div>

        {/* Moon Icon */}
        <motion.div
          initial={false}
          animate={{
            scale: isDark ? 1 : 0,
            rotate: isDark ? 0 : -180,
            opacity: isDark ? 1 : 0,
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          className="absolute inset-0"
        >
          <IconMoon className="h-5 w-5 text-blue-400" />
        </motion.div>
      </div>

      {showLabel && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          {isDark ? 'Dark' : 'Light'} Mode
        </motion.span>
      )}
    </button>
  );
}

/**
 * Compact version of ThemeToggle for use in tight spaces
 */
export function ThemeToggleCompact() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full transition-all",
        "bg-neutral-200 dark:bg-neutral-700",
        "hover:bg-neutral-300 dark:hover:bg-neutral-600",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 360 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {isDark ? (
          <IconMoon className="h-5 w-5 text-blue-400" />
        ) : (
          <IconSun className="h-5 w-5 text-amber-500" />
        )}
      </motion.div>
    </button>
  );
}
