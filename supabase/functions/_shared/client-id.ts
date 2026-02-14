
/**
 * Utility for robust client identification to prevent anonymous limit bypasses.
 * Uses a combination of IP address and browser fingerprint (User-Agent).
 */

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Use the leftmost IP (original client)
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    return ips[0] || 'unknown';
  }
  // Fallback to other headers
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

/**
 * Generates a stable fingerprint for the client.
 * This is much harder to bypass than localStorage-based IDs.
 */
export const getFingerprint = async (req: Request): Promise<string> => {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || 'unknown';
  const lang = req.headers.get('accept-language') || 'unknown';
  
  // Combine factors that are relatively stable for a session
  const fingerprintData = `${ip}|${ua}|${lang}`;
  
  const msgUint8 = new TextEncoder().encode(fingerprintData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Returns a robust tracking key for usage limits.
 * It ignores the client-provided ID if a valid fingerprint can be generated,
 * preventing bypasses via clearing local storage.
 */
export const getTrackingKey = async (req: Request): Promise<string> => {
  const fingerprint = await getFingerprint(req);
  return fingerprint;
};
