/**
 * SeverityIcon Component
 * 
 * Displays icons for bug severity levels
 */

import React from 'react';
import { BugSeverity } from '@/utils/types';

interface SeverityIconProps {
  severity: BugSeverity;
  className?: string;
}

export const SeverityIcon: React.FC<SeverityIconProps> = ({ severity, className = "" }) => {
  const getIconPath = () => {
    switch (severity) {
      case BugSeverity.BLOCKER:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <circle cx="8" cy="8" r="7" fill="#DC2626" stroke="#DC2626" strokeWidth="1"/>
            <path d="M8 4.5V9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r="0.75" fill="white"/>
          </svg>
        );
      case BugSeverity.MAJOR:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <path d="M8 2L14.928 13H1.072L8 2Z" fill="#EA580C" stroke="#EA580C" strokeWidth="0.5"/>
            <path d="M8 6.5V10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11.5" r="0.75" fill="white"/>
          </svg>
        );
      case BugSeverity.MINOR:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <circle cx="8" cy="8" r="7" fill="#16A34A" stroke="#16A34A" strokeWidth="1"/>
            <path d="M5 8.5L7 10.5L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      // Suggestion Severities
      case BugSeverity.NICE_TO_HAVE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <circle cx="8" cy="8" r="7" fill="#3B82F6" stroke="#3B82F6" strokeWidth="1"/>
            <path d="M8 4V12M4 8H12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case BugSeverity.MUST_HAVE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <circle cx="8" cy="8" r="7" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"/>
            <path d="M8 3L9.5 6.5H13L10 9L11.5 13L8 10.5L4.5 13L6 9L3 6.5H6.5L8 3Z" fill="white"/>
          </svg>
        );
      case BugSeverity.STRATEGIC:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <rect x="3" y="3" width="10" height="10" transform="rotate(45 8 8)" fill="#8B5CF6" stroke="#8B5CF6" strokeWidth="1"/>
            <circle cx="8" cy="8" r="2" fill="white"/>
          </svg>
        );
      // Epic/Task Severities
      case BugSeverity.TRIVIAL:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <circle cx="8" cy="8" r="7" fill="#9CA3AF" stroke="#9CA3AF" strokeWidth="1"/>
            <circle cx="8" cy="8" r="2" fill="white"/>
          </svg>
        );
      case BugSeverity.MODERATE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <rect x="3" y="3" width="10" height="10" rx="2" fill="#3B82F6" stroke="#3B82F6" strokeWidth="1"/>
            <path d="M5 8H11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case BugSeverity.HEAVY:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <rect x="3" y="3" width="10" height="10" rx="2" fill="#F97316" stroke="#F97316" strokeWidth="1"/>
            <path d="M8 4V12M4 8H12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case BugSeverity.MASSIVE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <path d="M8 1L15 5V11L8 15L1 11V5L8 1Z" fill="#DC2626" stroke="#DC2626" strokeWidth="1"/>
            <path d="M8 4V12M4 8H12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return <>{getIconPath()}</>;
};
