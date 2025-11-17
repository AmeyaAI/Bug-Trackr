/**
 * SidebarUserSelector Component
 * 
 * User selection component optimized for sidebar usage.
 * Renders inline without portals to maintain sidebar focus.
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { User } from '@/utils/types';
import { getInitials } from '@/lib/utils';
import { getRoleBadgeVariant, formatRole } from '@/utils/badgeHelpers';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarUserSelectorProps {
  users: User[];
  onUserChange?: (user: User | null) => void;
  isOpen?: boolean;
}

export const SidebarUserSelector: React.FC<SidebarUserSelectorProps> = ({
  users,
  onUserChange,
  isOpen = true,
}) => {
  const { currentUser, setCurrentUser } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-select first user if no user is selected
  React.useEffect(() => {
    if (!currentUser && users.length > 0) {
      setCurrentUser(users[0]);
      if (onUserChange) {
        onUserChange(users[0]);
      }
    } else if (currentUser && users.length > 0) {
      // Check if current user still exists in the users list
      const userExists = users.some(u => u._id === currentUser._id);
      if (!userExists) {
        // User was deleted, select first available user
        setCurrentUser(users[0]);
        if (onUserChange) {
          onUserChange(users[0]);
        }
      }
    }
  }, [users, currentUser, setCurrentUser, onUserChange]);

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setIsExpanded(false);
    if (onUserChange) {
      onUserChange(user);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative w-full">
      {/* Current User Display */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      >
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials(currentUser.name)}
          </AvatarFallback>
        </Avatar>
        
        {isOpen && (
          <>
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
            
            <div className="shrink-0">
              {isExpanded ? (
                <IconChevronUp className="h-4 w-4 text-neutral-500" />
              ) : (
                <IconChevronDown className="h-4 w-4 text-neutral-500" />
              )}
            </div>
          </>
        )}
      </button>

      {/* Dropdown List - Rendered inline, not in portal */}
      <AnimatePresence>
        {isExpanded && isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg">
              {users.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserSelect(user)}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                    user._id === currentUser._id
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : ''
                  }`}
                >
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {user.name}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {user.email}
                    </span>
                  </div>
                  <Badge
                    variant={getRoleBadgeVariant(user.role)}
                    className="text-xs shrink-0"
                  >
                    {formatRole(user.role)}
                  </Badge>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
