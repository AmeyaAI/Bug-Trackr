/**
 * PriorityIcon Component
 * 
 * Displays SVG icons for bug priority levels
 */

import React from 'react';
import { BugPriority } from '@/utils/types';

interface PriorityIconProps {
  priority: BugPriority;
  className?: string;
}

export const PriorityIcon: React.FC<PriorityIconProps> = ({ priority, className = "" }) => {
  const getIconPath = () => {
    switch (priority) {
      case BugPriority.HIGHEST:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <path fillRule="evenodd" clipRule="evenodd" d="M7.5874 7.62378L2.0874 11.2488L2.91287 12.5012L8.00014 9.14825L13.0874 12.5012L13.9129 11.2488L8.41287 7.62378C8.16246 7.45874 7.83781 7.45874 7.5874 7.62378ZM7.5874 3.12378L2.0874 6.74878L2.91287 8.00122L8.00014 4.64825L13.0874 8.00122L13.9129 6.74878L8.41287 3.12378C8.16246 2.95874 7.83781 2.95874 7.5874 3.12378Z" fill="#F15B50"/>
          </svg>
        );
      case BugPriority.HIGH:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="16" height="16" className={className}>
            <path fill="#F15B50" d="m14.53 6.03-6 6a.75.75 0 0 1-1.004.052l-.056-.052-6-6 1.06-1.06L8 10.44l5.47-5.47z" transform="rotate(180 8 8)"/>
          </svg>
        );
      case BugPriority.MEDIUM:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <path fillRule="evenodd" clipRule="evenodd" d="M14 6.5L2 6.5L2 5L14 5L14 6.5ZM14 11L2 11L2 9.5L14 9.5L14 11Z" fill="#E06C00"/>
          </svg>
        );
      case BugPriority.LOW:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="16" height="16" className={className}>
            <path fill="#1868DB" d="m14.53 6.03-6 6a.75.75 0 0 1-1.004.052l-.056-.052-6-6 1.06-1.06L8 10.44l5.47-5.47z"/>
          </svg>
        );
      case BugPriority.LOWEST:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
            <path fillRule="evenodd" clipRule="evenodd" d="M7.5874 7.62378L2.0874 11.2488L2.91287 12.5012L8.00014 9.14825L13.0874 12.5012L13.9129 11.2488L8.41287 7.62378C8.16246 7.45874 7.83781 7.45874 7.5874 7.62378ZM7.5874 3.12378L2.0874 6.74878L2.91287 8.00122L8.00014 4.64825L13.0874 8.00122L13.9129 6.74878L8.41287 3.12378C8.16246 2.95874 7.83781 2.95874 7.5874 3.12378Z" fill="#1868DB" transform="rotate(180 8 8)"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return <>{getIconPath()}</>;
};
