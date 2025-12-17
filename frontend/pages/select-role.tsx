import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@/contexts/UserContext';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { authService } from '@/lib/services/authService';
import { User, UserRole } from '@/lib/models/user';
import { jwtDecode } from 'jwt-decode';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { Loader2, Shield, Code, Bug } from 'lucide-react';

export default function SelectRolePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { setCurrentUser } = useUser();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const token = authService.getAccessToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const services = getServiceContainer();
        const userRepo = services.getUserRepository();

        let fetchedUser: User | null = null;
        try {
          const decoded = jwtDecode<any>(token);
          const email = decoded.email || decoded.unique_name;
          
          if (email) {
            fetchedUser = await userRepo.getByEmail(email);
          } else if (decoded.user_id) {
             fetchedUser = await userRepo.getById(decoded.user_id);
          }
        } catch (e) {
          console.error('Error fetching user', e);
          throw new Error('Failed to verify user identity');
        }

        if (!fetchedUser) {
            throw new Error('User not found');
        }

        setUser(fetchedUser);

        // If user has 0 or 1 role, auto-select and redirect
        if (!fetchedUser.availableRoles || fetchedUser.availableRoles.length <= 1) {
            setCurrentUser(fetchedUser);
            router.push('/');
            return;
        }

        // If multiple roles, stay on page to let user select
        setIsLoading(false);

      } catch (error: any) {
        console.error('Role selection init error:', error);
        showToast('error', error.message || 'Failed to load user data');
        authService.clearTokens();
        router.push('/login');
      }
    };

    init();
  }, [router, setCurrentUser, showToast]);

  const handleRoleSelect = (role: UserRole) => {
    if (!user) return;

    // Create a new user object with the selected role
    const updatedUser = {
        ...user,
        role: role
    };

    setCurrentUser(updatedUser);
    showToast('success', `Active role set to ${role}`);
    router.push('/');
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield className="w-6 h-6 mb-2" />;
      case UserRole.DEVELOPER: return <Code className="w-6 h-6 mb-2" />;
      case UserRole.TESTER: return <Bug className="w-6 h-6 mb-2" />;
      default: return <Shield className="w-6 h-6 mb-2" />;
    }
  };

  const getRoleDescription = (role: UserRole) => {
      switch (role) {
          case UserRole.ADMIN: return "Manage users, projects, and system settings.";
          case UserRole.DEVELOPER: return "Fix bugs, manage sprints, and view code tasks.";
          case UserRole.TESTER: return "Report bugs, verify fixes, and run test cases.";
          default: return "";
      }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Select Your Role</CardTitle>
          <CardDescription>
            You have access to multiple roles. Please select how you want to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {user?.availableRoles?.map((role) => (
              <Button
                key={role}
                variant="outline"
                className="h-auto flex flex-col items-center p-6 hover:bg-accent hover:text-accent-foreground transition-all"
                onClick={() => handleRoleSelect(role)}
              >
                {getRoleIcon(role)}
                <span className="font-semibold capitalize text-lg">{role}</span>
                <span className="text-xs text-muted-foreground mt-2 text-center font-normal whitespace-normal">
                    {getRoleDescription(role)}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
