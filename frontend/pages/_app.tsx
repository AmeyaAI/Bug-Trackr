import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  );
}
