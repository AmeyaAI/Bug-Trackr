/**
 * Layout Component
 * 
 * Provides consistent navigation and user selection across all pages.
 * Displays role-based user information and navigation links.
 * 
 * Requirements: 3.1, 3.4
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { UserSelector } from '@/components/UserSelector';
import { useUser } from '@/contexts/UserContext';
import { userApi } from '@/utils/apiClient';
import { User } from '@/utils/types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await userApi.getAll();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const isActive = (path: string) => {
    return router.pathname === path || router.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation bar */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and nav links */}
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
                BugTrackr
              </Link>
              
              <div className="flex items-center gap-4">
                <Link href="/bugs">
                  <Button 
                    variant={isActive('/bugs') ? 'default' : 'ghost'}
                    size="sm"
                  >
                    Bugs
                  </Button>
                </Link>
                
                <Link href="/projects">
                  <Button 
                    variant={isActive('/projects') ? 'default' : 'ghost'}
                    size="sm"
                  >
                    Projects
                  </Button>
                </Link>
              </div>
            </div>

            {/* User selector */}
            <div className="flex items-center gap-4">
              {!isLoadingUsers && users.length > 0 && (
                <UserSelector users={users} />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
};
