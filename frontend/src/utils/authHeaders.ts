/**
 * Shared auth header helper for PI and other page API calls.
 * Retrieves the JWT from localStorage and returns headers object.
 *
 * IMPORTANT: In demo mode (token === 'demo-session'), we send a custom
 * header X-Demo-Session instead of Authorization. Catalyst's gateway
 * intercepts and rejects non-JWT Authorization headers, so we must not
 * send 'Bearer demo-session' through the Authorization header.
 */
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (!token) return {};
  if (token === 'demo-session') {
    return { 'X-Demo-Session': 'true' };
  }
  return { Authorization: `Bearer ${token}` };
}
