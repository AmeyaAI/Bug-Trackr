import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/contexts/UserContext';
import { LoadingState } from '@/components/LoadingState';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { currentUser, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    // Allow /authorized page to load without user (it handles the login process)
    if (!isLoading && !currentUser && router.pathname !== '/login' && router.pathname !== '/authorized') {
      router.push('/login');
    }
    // If logged in and on login page, redirect to home
    if (!isLoading && currentUser && router.pathname === '/login') {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  // If not logged in and not on login/authorized page, don't render anything (waiting for redirect)
  if (!currentUser && router.pathname !== '/login' && router.pathname !== '/authorized') {
    return null;
  }

  // If logged in and on login page, don't render anything (waiting for redirect)
  if (currentUser && router.pathname === '/login') {
    return null;
  }

  return <>{children}</>;
};
