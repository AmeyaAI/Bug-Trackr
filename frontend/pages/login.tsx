import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { LogoIcon } from '@/components/AppSidebar';
import dpodLogo from '@/assets/dpod.png';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { authService, AUTH_CONFIG } from '@/lib/services/authService';
import { jwtDecode } from "jwt-decode";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentUser } = useUser();
  const router = useRouter();
  const { showToast } = useToast();

  const handleOAuthLogin = (signStatus: 'signin' | 'signup') => {
    try {
      const { authServerUrl, appName, schemaId, authProvider, authRequestType, authAppName, authSchemaId } = AUTH_CONFIG;

      const authUrlWithParams = `${authServerUrl}/user_auth?app_name=${encodeURIComponent(appName)}&schema_id=${encodeURIComponent(schemaId)}&auth_provider=${encodeURIComponent(authProvider)}&request_type=${encodeURIComponent(signStatus)}&auth_request_type=${encodeURIComponent(authRequestType)}&auth_app_name=${encodeURIComponent(authAppName)}&auth_schema_id=${encodeURIComponent(authSchemaId)}`;

      console.log("Auth URL:", authUrlWithParams);

      const popup = window.open(authUrlWithParams, "oauthPopup", "width=500,height=600");
      
      const interval = setInterval(() => {
          if (popup && popup.closed) {
              clearInterval(interval);
              console.log("Popup closed");
              setIsLoading(false);
          }
      }, 1000);
      
      setIsLoading(true);

    } catch (error) {
      console.log(error);
      setIsLoading(false);
      showToast('error', 'Failed to open login popup');
    }
  };

  const postLogin = async (queryParams: any) => {
      try {
          const { token, refresh_token } = queryParams;
          
          if (!token || !refresh_token) {
              throw new Error('Tokens not found in login response');
          }
          
          authService.setTokens(token, refresh_token);
          
          // Fetch user details
          const services = getServiceContainer();
          const userRepo = services.getUserRepository();
          
          // Try to get user ID from token
          let user = null;
          try {
              const decoded = jwtDecode<any>(token);
              if (decoded.user_id) {
                  user = await userRepo.getById(decoded.user_id);
              } else if (decoded.email) {
                  user = await userRepo.getByEmail(decoded.email);
              }
          } catch (e) {
              console.warn("Error decoding token or fetching user", e);
          }

          if (user) {
              setCurrentUser(user);
              showToast('success', 'Logged in successfully');
              router.push('/');
          } else {
              showToast('success', 'Logged in successfully');
              router.push('/');
          }
      } catch (error) {
          console.error(error);
          showToast('error', 'Login failed');
          setIsLoading(false);
      }
  };

  useEffect(() => {
      const handlePopupMessage = async (event: MessageEvent) => {
          if (event.data && event.data.type === "login-success") {
              const { queryParams } = event.data;
              await postLogin(queryParams);
          }
      };

      window.addEventListener("message", handlePopupMessage);
      return () => {
          window.removeEventListener("message", handlePopupMessage);
      };
      //eslint-disable-next-line
  }, []);

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
                    <span className="bg-background px-2 text-muted-foreground">
                        Or
                    </span>
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
