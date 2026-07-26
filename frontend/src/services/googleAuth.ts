/**
 * Google OAuth service for Neural Justice frontend.
 *
 * Integrates with:
 *   1. Catalyst Embedded Authentication (Google social login) when available
 *   2. Google Identity Services (GIS) as fallback for direct OAuth
 *
 * The service obtains Google OAuth credentials and passes them to the
 * backend `/api/auth/google` endpoint, which validates and issues a
 * Neural Justice JWT.
 */

// Google Identity Services types (loaded via script tag in index.html)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          cancel: () => void;
        };
      };
    };
    catalyst?: any;
  }
}

export interface GoogleCredential {
  id_token?: string;
  access_token?: string;
  email?: string;
  name?: string;
  google_user_id?: string;
}

export class GoogleAuthService {
  private clientId: string;
  private initialized: boolean = false;

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  }

  /**
   * Initialize Google Identity Services.
   * Call this once on app load if a client ID is configured.
   */
  initialize(): void {
    if (this.initialized || !this.clientId) return;

    // Load Google script if not present
    if (!window.google?.accounts?.id && !document.getElementById('google-gis-script')) {
      this.loadGoogleScript();
    }

    this.initialized = true;
  }

  private loadGoogleScript(): void {
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  /**
   * Attempt login via Catalyst Embedded Authentication (Google social login).
   * Catalyst provides a native Google login flow.
   */
  async loginWithCatalyst(): Promise<GoogleCredential | null> {
    if (!window.catalyst?.auth) {
      return null;
    }

    try {
      const result = await window.catalyst.auth.loginWithGoogle(this.clientId);
      if (result?.user) {
        return {
          email: result.user.email,
          name: result.user.name,
          google_user_id: result.user.id,
          id_token: result.idToken,
        };
      }
    } catch (e) {
      console.warn('Catalyst Google login failed, falling back to GIS:', e);
    }
    return null;
  }

  /**
   * Render a Google Sign-In button using Google Identity Services.
   * Returns a cleanup function.
   */
  renderButton(
    element: HTMLElement,
    onSuccess: (credential: GoogleCredential) => void,
    onError?: (error: any) => void
  ): () => void {
    if (!window.google?.accounts?.id) {
      // Poll for script load
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          this.doRenderButton(element, onSuccess, onError);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return this.doRenderButton(element, onSuccess, onError);
  }

  private doRenderButton(
    element: HTMLElement,
    onSuccess: (credential: GoogleCredential) => void,
    onError?: (error: any) => void
  ): () => void {
    window.google!.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: any) => {
        if (response.credential) {
          onSuccess({ id_token: response.credential });
        } else if (onError) {
          onError(new Error('No credential received'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google!.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      width: element.clientWidth || 280,
      text: 'continue_with',
      logo_alignment: 'left',
    });

    return () => {
      window.google?.accounts.id.cancel();
    };
  }

  /**
   * Prompt for Google account selection (one-tap flow).
   */
  prompt(onSuccess: (credential: GoogleCredential) => void): void {
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // User needs to click the button instead
      }
    });

    // Listen for credential response
    window.google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: any) => {
        if (response.credential) {
          onSuccess({ id_token: response.credential });
        }
      },
    });
  }
}

export const googleAuth = new GoogleAuthService();
