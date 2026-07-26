import { TOTP, Secret } from 'otpauth';

const STORAGE_PREFIX = 'nj_totp_';

/** Build a storage key from username + role so each role gets its own enrollment */
function storageKey(username: string, role?: string | null): string {
  return role ? `${username}_${role}` : username;
}

/** Generate a cryptographically random base32 TOTP secret */
export function generateTOTPSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** Build an otpauth:// URI for QR code display */
export function buildOTPAuthURI(
  secret: string,
  username: string = 'admin',
  issuer: string = 'NeuralJustice',
  role?: string | null,
): string {
  // Include role in label so authenticator app shows role context
  const label = role ? `${username} (${role})` : username;
  const totp = new TOTP({
    issuer,
    label,
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  return totp.toString();
}

/**
 * Verify a TOTP code against a stored secret.
 * Uses a +/-1 window (3 total attempts) to handle clock skew.
 */
export function verifyTOTPCode(secret: string, code: string): boolean {
  try {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

/** Get the current valid TOTP code for a secret (useful for dev/debug) */
export function getCurrentTOTPCode(secret: string): string {
  const totp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  return totp.generate();
}

/** Store a TOTP secret for a user+role (localStorage) */
export function storeTOTPSecret(username: string, secret: string, role?: string | null): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${storageKey(username, role)}`, secret);
  } catch {
    // localStorage might be full or unavailable
  }
}

/** Retrieve a stored TOTP secret for a user+role */
export function getStoredTOTPSecret(username: string, role?: string | null): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${storageKey(username, role)}`);
  } catch {
    return null;
  }
}

/** Check if a user+role has already enrolled in TOTP */
export function hasTOTPEnrolled(username: string, role?: string | null): boolean {
  return getStoredTOTPSecret(username, role) !== null;
}

/** Remove a stored TOTP secret (for testing/reset) */
export function clearTOTPSecret(username: string, role?: string | null): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${storageKey(username, role)}`);
  } catch {
    // ignore
  }
}
