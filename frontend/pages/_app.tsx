import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "@/contexts/UserContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { NavbarProvider } from "@/contexts/NavbarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppSidebar } from "@/components/AppSidebar";
import { ToastContainer } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthGuard } from "@/components/AuthGuard";
import { useRouter } from "next/router";
import { ChatbotIntegration } from "@/components/ChatbotIntegration";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';
  const isAuthorizedPage = router.pathname === '/authorized';

  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <ThemeProvider>
        <ToastProvider>
          <UserProvider>
            <NavbarProvider>
              <AuthGuard>
                {isLoginPage || isAuthorizedPage ? (
                  <Component {...pageProps} />
                ) : (
                  <AppSidebar>
                    <Component {...pageProps} />
                  </AppSidebar>
                )}
                <ToastContainer />
                <ChatbotIntegration />
              </AuthGuard>
            </NavbarProvider>
          </UserProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
