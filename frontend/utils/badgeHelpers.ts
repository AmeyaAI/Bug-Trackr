/**
 * Badge Helper Utilities
 * 
 * Centralized badge variant mapping functions to ensure consistency
 * across the application and reduce code duplication.
 */

import { BugStatus, BugPriority, BugSeverity } from './types';
import { BugType } from '@/lib/models/bug';
import { BADGE_VARIANTS } from './constants';

/**
 * Get badge variant based on bug status
 * 
 * @param status - Bug status enum value
 * @returns Badge variant string
 */
export function getStatusBadgeVariant(
  status: BugStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return BADGE_VARIANTS.STATUS[status] || 'outline';
}

/**
 * Get border class based on bug type
 * 
 * @param type - Bug type enum value
 * @returns Tailwind border class string
 */
export function getBugTypeBorderClass(type: BugType | string): string {
  const normalizedType = (type || '').toLowerCase().trim();
  
  if (normalizedType.includes('epic')) {
    return 'border-l-4 border-l-purple-500';
  }
  if (normalizedType.includes('task')) {
    return 'border-l-4 border-l-blue-500';
  }
  if (normalizedType.includes('suggestion')) {
    return 'border-l-4 border-l-green-500';
  }
  if (normalizedType.includes('bug')) {
    return 'border-l-4 border-l-red-500';
  }
  
  return 'border-l-4 border-l-gray-300';
}

/**
 * Get badge variant based on bug priority
 * 
 * @param priority - Bug priority enum value
 * @returns Badge variant string
 */
export function getPriorityBadgeVariant(
  priority: BugPriority
): 'default' | 'secondary' | 'destructive' | 'outline' | 'priority-highest' | 'priority-high' | 'priority-medium' | 'priority-low' | 'priority-lowest' {
  return BADGE_VARIANTS.PRIORITY[priority] || 'outline';
}

/**
 * Get badge variant based on bug severity
 * 
 * @param severity - Bug severity enum value
 * @returns Badge variant string
 */
export function getSeverityBadgeVariant(
  severity: BugSeverity
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return BADGE_VARIANTS.SEVERITY[severity] || 'outline';
}

/**
 * Get badge variant based on user role
 * 
 * @param role - User role string
 * @returns Badge variant string
 */
export function getRoleBadgeVariant(
  role: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalizedRole = role.toLowerCase() as keyof typeof BADGE_VARIANTS.ROLE;
  return BADGE_VARIANTS.ROLE[normalizedRole] || 'outline';
}

/**
 * Format role string for display (capitalize first letter)
 * 
 * @param role - User role string
 * @returns Formatted role string
 */
export function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

/**
 * Format relative time from date string
 * Handles various time ranges with appropriate units
 * 
 * @param dateString - ISO date string
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Helper to find user name from users array
 * 
 * @param userId - User ID to look up
 * @param users - Array of users to search
 * @returns User name or 'Unknown User'
 */
export function getUserName(userId: string, users: Array<{ id: string; name: string }>): string {
  const user = users.find(u => u.id === userId);
  return user?.name || 'Unknown User';
}

/**
 * Helper to find project name from projects array
 * 
 * @param projectId - Project ID to look up
 * @param projects - Array of projects to search
 * @returns Project name or 'Unknown Project'
 */
export function getProjectName(projectId: string, projects: Array<{ id: string; name: string }>): string {
  const project = projects.find(p => p.id === projectId);
  return project?.name || 'Unknown Project';
}
