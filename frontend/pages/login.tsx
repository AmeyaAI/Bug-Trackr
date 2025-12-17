import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { LogoIcon } from '@/components/AppSidebar';
import dpodLogo from '@/assets/dpod.png';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { authService, AUTH_CONFIG } from '@/lib/services/authService';
import { jwtDecode } from 'jwt-decode';
 
export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser } = useUser();
  const router = useRouter();
  const { showToast } = useToast();
 
  useEffect(() => {
    if (!router.isReady) return;
    // This effect is now merged into the main logic below to avoid race conditions
  }, [router.isReady]);

  const postLogin = async (queryParams: any) => {
    try {
      const { token, refresh_token } = queryParams;
 
      if (!token || !refresh_token) {
        throw new Error('Tokens not found in login response');
      }
 
      console.log(token, refresh_token)
 
      authService.setTokens(token, refresh_token);
 
      const services = getServiceContainer();
      const userRepo = services.getUserRepository();
 
      let user = null;
      try {
        const decoded = jwtDecode<any>(token);
        if (decoded.user_id) {
          user = await userRepo.getById(decoded.user_id);
        } else if (decoded.email) {
          user = await userRepo.getByEmail(decoded.email);
        }
      } catch (e) {
        console.warn('Error decoding token or fetching user', e);
      }
 
      console.log('user', user)
 
      setCurrentUser(user);
      showToast('success', 'Logged in successfully');
      router.push('/');
    } catch (error) {
      console.error("login_error", error);
      showToast('error', 'Login failed');
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    // Handle login success message (main window mode)
    const handlePopupMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'login-success') {
        await postLogin(event.data.queryParams);
      }
    };

    // Listen on BroadcastChannel
    const channel = new BroadcastChannel('auth_channel');
    channel.onmessage = async (event) => {
      if (event.data && event.data.type === 'login-success') {
        const { queryParams } = event.data;
        await postLogin(queryParams);
      }
    };

    // Listen for Storage events (fallback if messaging fails)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dpod-token' && e.newValue) {
        const t = JSON.parse(e.newValue);
        const r = authService.getRefreshToken();
        if (t && r) {
           postLogin({ token: t, refresh_token: r });
        }
      }
    };

    window.addEventListener('message', handlePopupMessage);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('message', handlePopupMessage);
      window.removeEventListener('storage', handleStorageChange);
      channel.close();
    };
  }, []);
 
 
  const handleOAuthLogin = (signStatus: 'signin' | 'signup') => {
    try {
      const {
        authServerUrl,
        appName,
        schemaId,
        authProvider,
        authRequestType,
        authAppName,
        authSchemaId
      } = AUTH_CONFIG;
 
      const authUrl =
        `${authServerUrl}/user_auth` +
        `?app_name=${encodeURIComponent(appName)}` +
        `&schema_id=${encodeURIComponent(schemaId)}` +
        `&auth_provider=${encodeURIComponent(authProvider)}` +
        `&request_type=${encodeURIComponent(signStatus)}` +
        `&auth_request_type=${encodeURIComponent(authRequestType)}` +
        `&auth_app_name=${encodeURIComponent(authAppName)}` +
        `&auth_schema_id=${encodeURIComponent(authSchemaId)}`;
 
      const popup = window.open(authUrl, 'oauthPopup', 'width=500,height=600');
 
      // We cannot poll popup.closed due to Cross-Origin-Opener-Policy (COOP) restrictions.
      // Instead, we rely on the popup sending a message back or the storage event.
      // We set a long timeout to reset the loading state just in case.
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 60000 * 2); // 2 minutes timeout

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeout);
 
      setIsLoading(true);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      showToast('error', 'Failed to open login popup');
    }
  };
 
 
  if (isLoading) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-blue-500 rounded-full mb-4"></div>
                <h2 className="text-xl font-semibold">Processing Login...</h2>
                <p className="text-sm text-gray-500">Please wait while we verify your credentials.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
      <div className="mb-8">
        <Image
          src={dpodLogo}
          alt="DPOD Logo"
          width={200}
          height={100}
          className="h-16 w-auto"
          priority
        />
      </div>
 
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="mb-4 scale-150 p-2">
            <LogoIcon />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
 
        <CardContent className="space-y-4 flex flex-col items-center w-full">
          <Button
            className="w-full"
            onClick={() => handleOAuthLogin('signin')}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Sign in with Google'}
          </Button>
 
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
 
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin('signup')}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Sign up with Google'}
          </Button>
        </CardContent>
 
        <CardFooter className="justify-center">
          <p className="text-xs text-muted-foreground">
            By clicking continue, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}