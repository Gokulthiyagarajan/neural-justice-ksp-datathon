/**
 * Shared auth header helper for PI and other page API calls.
 * Retrieves the JWT from localStorage and returns headers object.
 *
 * IMPORTANT: In production (Catalyst), the Advanced I/O gateway intercepts
 * the Authorization header and validates it as a Catalyst OAuth token —
 * non-Catalyst JWTs get rejected with "invalid oauth token" before reaching
 * our FastAPI backend. Therefore, in production we send X-Demo-Session
 * instead, which the backend accepts as an auth bypass signal.
 *
 * In local dev (no VITE_API_URL), we send the Authorization header as normal.
 */
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (!token) return {};

  // Production (Catalyst) OR demo-session sentinel → bypass auth header
  // Catalyst gateway blocks non-OAuth Authorization headers.
  if (import.meta.env.VITE_API_URL || token === 'demo-session') {
    return { 'X-Demo-Session': 'true' };
  }

  // Local dev: send Authorization header for standard JWT auth
  return { Authorization: `Bearer ${token}` };
}
