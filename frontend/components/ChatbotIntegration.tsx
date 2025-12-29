import { useEffect, useMemo } from "react";
import Image from "next/image";
import chatbotLogo from "../assets/chatbotlogo.png";
import { authService } from "@/lib/services/authService";
import { jwtDecode } from "jwt-decode";
import { useUser } from "@/contexts/UserContext";

interface ChatbotParams {
  token_provider: string;
  third_party_token: string;
}

interface DecodedToken {
  third_party_token?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

declare global {
  interface Window {
    toggleChatbot?: (params: ChatbotParams) => void;
  }
}

export function ChatbotIntegration() {
  const { currentUser } = useUser();

  const token = useMemo(() => {
    if (!currentUser) return null;
    
    const accessToken = authService.getAccessToken();
    if (!accessToken) return null;

    try {
      const decoded = jwtDecode<DecodedToken>(accessToken);
      if (decoded.third_party_token) {
        return decoded.third_party_token;
      }
      console.warn("third_party_token not found in JWT");
      return null;
    } catch (error) {
      console.error("Failed to decode token for chatbot", error);
      return null;
    }
  }, [currentUser]);

  useEffect(() => {
    const scriptUrl = process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_URL;
    if (!scriptUrl) {
      console.warn("Chatbot script URL not configured");
      return;
    }

    // Load the script
    const script = document.createElement("script");
    script.src = `${scriptUrl}?v=${new Date().getTime()}`;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleLaunch = () => {
    if (window.toggleChatbot && token) {
      const params = {
        token_provider: "google",
        third_party_token: token,
      };
      window.toggleChatbot(params);
    } else {
      if (!token) console.warn("Chatbot token not available");
      if (!window.toggleChatbot) console.warn("Chatbot script not loaded yet");
    }
  };

  if (!token) return null; // Don't show if we can't authenticate the chatbot

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        id="chatBotButton"
        onClick={handleLaunch}
        className="rounded-full shadow-lg hover:opacity-90 transition-opacity duration-300 w-16 h-16 p-0 border-none bg-transparent overflow-hidden"
        aria-label="Launch Chatbot"
      >
        <Image
          src={chatbotLogo}
          alt="Chatbot Logo"
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </button>
    </div>
  );
}
