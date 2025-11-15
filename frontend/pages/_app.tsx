import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "@/contexts/UserContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { NavbarProvider } from "@/contexts/NavbarContext";
import { AppSidebar } from "@/components/AppSidebar";
import { ToastContainer } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <ToastProvider>
        <UserProvider>
          <NavbarProvider>
            <AppSidebar>
              <Component {...pageProps} />
            </AppSidebar>
            <ToastContainer />
          </NavbarProvider>
        </UserProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
