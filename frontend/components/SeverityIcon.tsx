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
      default:
        return null;
    }
  };

  return <>{getIconPath()}</>;
};
