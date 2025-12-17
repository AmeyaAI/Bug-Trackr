import { jwtDecode } from "jwt-decode";

// Configuration constants
export const AUTH_CONFIG = {
  authServerUrl: "https://auth-sandbox.ameya.ai",
  appName: "Ameya",
  schemaId: "ameya_appflyte",
  authProvider: "google",
  authRequestType: "project_level",
  authAppName: "BugTracker",
  authSchemaId: "7f6242d2-de2e-482d-bc67-78ae3abc476f",
};

interface TokenPayload {
  exp: number;
  user_id?: string;
  provider?: string;
  subscription_id?: string;
  [key: string]: any;
}

interface RefreshResponse {
  token: string;
  refresh_token: string;
}

class AuthService {
  private static instance: AuthService;
  // Default to schema ID if no token is present yet, but we should try to get it from token
  private defaultSubscriptionId: string = AUTH_CONFIG.authSchemaId;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('dpod-token');
    try {
        return token ? JSON.parse(token) : null;
    } catch (e) {
        return token; // In case it's not JSON stringified
    }
  }

  public getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('refresh-token');
    try {
        return token ? JSON.parse(token) : null;
    } catch (e) {
        return token;
    }
  }

  public setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dpod-token', JSON.stringify(accessToken));
    localStorage.setItem('refresh-token', JSON.stringify(refreshToken));
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('dpod-token');
    localStorage.removeItem('refresh-token');
    localStorage.removeItem('bugtrackr_token'); // Clear old token if any
  }

  public isTokenExpiredOrAboutToExpire(jwtToken: string): 'expired' | 'about-to-expire' | 'valid' {
    try {
      const token = jwtDecode<TokenPayload>(jwtToken);
      const tokenExpireTime = token.exp;
      const currentTime = Math.floor(Date.now() / 1000);

      if (currentTime >= tokenExpireTime) {
        return "expired";
      }

      if ((tokenExpireTime - currentTime) <= 600) {
        return "about-to-expire";
      }

      return "valid";
    } catch (error) {
      console.error("Invalid token:", error);
      return "expired";
    }
  }

  public async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return null;
    }

    try {
      const jwtIdToken = this.getAccessToken();
      // If we don't have an access token, we might not be able to get user_id/provider
      // But usually refresh flow needs refresh token. The user's code uses access token to get params.
      
      let userId = 'unknown';
      let provider = AUTH_CONFIG.authProvider;
      let subscriptionId = this.defaultSubscriptionId;

      if (jwtIdToken) {
          try {
            const decodedToken = jwtDecode<TokenPayload>(jwtIdToken);
            userId = decodedToken.user_id || userId;
            provider = decodedToken.provider || provider;
            subscriptionId = decodedToken.subscription_id || subscriptionId;
          } catch (e) {
              console.warn("Could not decode old access token for refresh params", e);
          }
      }

      // Construct URL
      const url = `${AUTH_CONFIG.authServerUrl.replace(/\/$/, '')}/refresh/${subscriptionId}/${provider}/${AUTH_CONFIG.schemaId}/${userId}?refresh_token=${refreshToken}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data: RefreshResponse = await response.json();
      if (data && data.token) {
        this.setTokens(data.token, data.refresh_token);
        return data.token;
      } else {
        this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      this.clearTokens();
      return null;
    }
  }

  public async ensureValidToken(): Promise<string | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    const status = this.isTokenExpiredOrAboutToExpire(token);
    if (status === 'valid') return token;

    console.log(`Token is ${status}, refreshing...`);
    return await this.refreshAccessToken();
  }
}

export const authService = AuthService.getInstance();
