/**
 * Shared auth header helper for PI and other page API calls.
 * Retrieves the JWT from localStorage and returns headers object.
 */
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
