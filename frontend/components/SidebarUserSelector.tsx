/**
 * SidebarUserSelector Component
 * 
 * User selection component optimized for sidebar usage.
 * Renders inline without portals to maintain sidebar focus.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { User } from '@/utils/types';
import { getInitials } from '@/lib/utils';
import { getRoleBadgeVariant, formatRole } from '@/utils/badgeHelpers';

interface SidebarUserSelectorProps {
  users?: User[];
  onUserChange?: (user: User | null) => void;
  isOpen?: boolean;
}

export const SidebarUserSelector: React.FC<SidebarUserSelectorProps> = ({
  isOpen = true,
}) => {
  const { currentUser } = useUser();

  if (!currentUser) return null;

  return (
    <div className="relative w-full">
      {/* Current User Display */}
      <div
        className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-default"
      >
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials(currentUser.name)}
          </AvatarFallback>
        </Avatar>
        
        {isOpen && (
          <div className="flex flex-col flex-1 min-w-0 text-left">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {currentUser.name}
            </span>
            <Badge
              variant={getRoleBadgeVariant(currentUser.role)}
              className="text-xs w-fit"
            >
              {formatRole(currentUser.role)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};
