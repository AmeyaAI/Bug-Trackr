import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/router';
import { IconMoon, IconSun, IconLogout } from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { setCurrentUser } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bugtrackr_token');
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your application preferences and account settings
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-8">
          
          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how BugTrackr looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Theme</Label>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Select your preferred theme
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                  <button
                    onClick={() => theme === 'dark' && toggleTheme()}
                    className={`p-2 rounded-md transition-all ${
                      theme === 'light' 
                        ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-500' 
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                    title="Light Mode"
                  >
                    <IconSun className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => theme === 'light' && toggleTheme()}
                    className={`p-2 rounded-md transition-all ${
                      theme === 'dark' 
                        ? 'bg-white dark:bg-neutral-600 shadow-sm text-blue-400' 
                        : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                    title="Dark Mode"
                  >
                    <IconMoon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Sign Out</Label>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Sign out of your current session
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <IconLogout className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
