import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@/lib/services/authService';

export default function AuthorizedPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    if (!router.isReady) return;

    const processLogin = async () => {
      try {
        // 1. Extract tokens from URL (query or hash)
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        
        const token = searchParams.get('token') || hashParams.get('token');
        const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');

        if (!token || !refreshToken) {
          setStatus('No tokens found in URL.');
          return;
        }

        setStatus('Tokens found. Storing...');

        // 2. Store tokens immediately (Shared LocalStorage Strategy)
        authService.setTokens(token, refreshToken);

        // 3. Notify Main Window
        const paramsObject: Record<string, string> = { token, refresh_token: refreshToken };
        
        // BroadcastChannel
        try {
          const channel = new BroadcastChannel('auth_channel');
          channel.postMessage({ type: 'login-success', queryParams: paramsObject });
          channel.close();
        } catch (e) {
          console.error('BroadcastChannel error', e);
        }

        // window.opener
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(
              { type: 'login-success', queryParams: paramsObject },
              window.location.origin
            );
          }
        } catch (e) {
          console.warn('Opener postMessage error', e);
        }

        setStatus('Login complete. Closing window...');

        // 4. Close Popup
        setTimeout(() => {
          window.close();
          // Fallback: if close fails, redirect to role selection
          if (!window.opener || window.opener === window) {
             router.push('/select-role');
          }
        }, 500);

      } catch (error) {
        console.error('Auth processing error:', error);
        setStatus('Authentication failed.');
      }
    };

    processLogin();
  }, [router.isReady]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-green-500 rounded-full mb-4"></div>
        <h2 className="text-xl font-semibold">{status}</h2>
        <p className="text-sm text-gray-500">Please wait...</p>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white text-[10px] p-2 font-mono break-all z-50 opacity-50">
        DEBUG: {typeof window !== 'undefined' ? window.location.href : ''}
      </div>
    </div>
  );
}
