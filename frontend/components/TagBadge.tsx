/**
 * TagBadge Component
 *
 * Apple-style badge for displaying bug tags with appropriate color coding.
 * Each tag category has its own semantic color scheme.
 *
 * Color Mapping:
 * - EPIC: Purple (strategic, big-picture)
 * - TASK: Blue (actionable, standard work)
 * - SUGGESTION: Green (helpful, positive)
 * - BUG_FRONTEND: Amber (UI/visual layer)
 * - BUG_BACKEND: Red (system/technical)
 * - BUG_TEST: Indigo (QA/testing layer)
 */

import React from "react";
import { BugTag } from "@/lib/models/bug";

interface TagBadgeProps {
  tag: BugTag;
  className?: string;
}

/**
 * Get Tailwind classes for each tag type
 * Supports light and dark mode with Apple-style aesthetics
 */
const getTagStyles = (tag: BugTag): string => {
  const baseStyles = "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-all duration-200 ease-in-out hover:shadow-sm hover:opacity-90";
  
  switch (tag) {
    case BugTag.EPIC:
      return `${baseStyles} text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300`;
    case BugTag.TASK:
      return `${baseStyles} text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300`;
    case BugTag.SUGGESTION:
      return `${baseStyles} text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300`;
    case BugTag.BUG_FRONTEND:
      return `${baseStyles} text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300`;
    case BugTag.BUG_BACKEND:
      return `${baseStyles} text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300`;
    case BugTag.BUG_TEST:
      return `${baseStyles} text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300`;
    default:
      return `${baseStyles} text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-300`;
  }
};

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, className = "" }) => {
  return (
    <span className={`${getTagStyles(tag)} ${className}`}>
      {tag}
    </span>
  );
};
