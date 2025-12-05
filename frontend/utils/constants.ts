/**
 * Application Constants
 * 
 * Central location for configuration values used throughout the frontend.
 * Only includes constants that are actually referenced in the codebase.
 */

/**
 * Badge Variant Mappings
 * Used by badgeHelpers.ts for consistent badge styling
 */
export const BADGE_VARIANTS = {
  STATUS: {
    Open: 'destructive' as const,
    'In Progress': 'default' as const,
    'In Review': 'secondary' as const,
    Resolved: 'secondary' as const,
    Closed: 'outline' as const,
  },
  PRIORITY: {
    Highest: 'priority-highest' as const,
    High: 'priority-high' as const,
    Medium: 'priority-medium' as const,
    Low: 'priority-low' as const,
    Lowest: 'priority-lowest' as const,
  },
  SEVERITY: {
    Blocker: 'destructive' as const,
    Major: 'default' as const,
    Minor: 'secondary' as const,
    // Suggestion
    'Nice to have': 'secondary' as const,
    'Must have': 'default' as const,
    Strategic: 'default' as const,
    // Epic/Task
    Trivial: 'outline' as const,
    Moderate: 'secondary' as const,
    Heavy: 'default' as const,
    Massive: 'destructive' as const,
  },
  ROLE: {
    admin: 'destructive' as const,
    developer: 'default' as const,
    tester: 'secondary' as const,
  },
} as const;
