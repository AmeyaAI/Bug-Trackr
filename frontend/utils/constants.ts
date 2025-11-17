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
    Resolved: 'secondary' as const,
    Closed: 'outline' as const,
  },
  PRIORITY: {
    Highest: 'destructive' as const,
    High: 'destructive' as const,
    Medium: 'default' as const,
    Low: 'default' as const,
    Lowest: 'secondary' as const,
  },
  SEVERITY: {
    Blocker: 'destructive' as const,
    Major: 'default' as const,
    Minor: 'secondary' as const,
  },
  ROLE: {
    admin: 'destructive' as const,
    developer: 'default' as const,
    tester: 'secondary' as const,
  },
} as const;
