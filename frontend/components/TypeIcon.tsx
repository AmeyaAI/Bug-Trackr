import React from 'react';
import { BugType } from '@/utils/types';
import { Bug, Zap, CheckSquare, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypeIconProps {
  type: BugType;
  className?: string;
}

export const TypeIcon: React.FC<TypeIconProps> = ({ type, className = "w-4 h-4" }) => {
  switch (type) {
    case 'bug':
      return <Bug className={cn("text-red-500", className)} />;
    case 'epic':
      return <Zap className={cn("text-purple-500", className)} />;
    case 'task':
      return <CheckSquare className={cn("text-blue-500", className)} />;
    case 'suggestion':
      return <Lightbulb className={cn("text-green-500", className)} />;
    default:
      return <Bug className={cn("text-red-500", className)} />;
  }
};
