/**
 * User Context Provider
 * 
 * Manages current user state and provides user selection functionality.
 * Stores selected user in React context for global access.
 * Provides role-based permission utilities for component visibility.
 * 
 * Requirements: 3.1, 3.2, 3.4
 */

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, UserRole, getRolePermissions, RolePermissions } from '@/utils/types';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  permissions: RolePermissions | null;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // Initialize with null to avoid hydration mismatch
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage after mount to avoid hydration issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('bugtrackr_current_user');
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('bugtrackr_current_user');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('bugtrackr_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('bugtrackr_current_user');
      }
    }
  };

  // Memoize permissions to avoid recalculation on every render
  const permissions = useMemo(() => {
    if (!currentUser) return null;
    return getRolePermissions(currentUser.role as UserRole);
  }, [currentUser]);

  // Role validation utilities
  const hasRole = (role: UserRole): boolean => {
    if (!currentUser) return false;
    return currentUser.role.toLowerCase() === role.toLowerCase();
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.some(role => role.toLowerCase() === currentUser.role.toLowerCase());
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        isLoading,
        permissions,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook for role-based component visibility
 * Returns true if the current user has the specified permission
 */
export const usePermission = (permission: keyof RolePermissions): boolean => {
  const { permissions } = useUser();
  if (!permissions) return false;
  return permissions[permission];
};

/**
 * Custom hook to check if user has specific role
 */
export const useHasRole = (role: UserRole): boolean => {
  const { hasRole } = useUser();
  return hasRole(role);
};

/**
 * Custom hook to check if user has any of the specified roles
 */
export const useHasAnyRole = (roles: UserRole[]): boolean => {
  const { hasAnyRole } = useUser();
  return hasAnyRole(roles);
};
