/**
 * Universal Client IP Resolution Utility
 * Accurately extracts the real client IP across Cloudflare, Nginx reverse proxies,
 * AWS ALB/Traefik load balancers, and direct connections.
 */

/**
 * Strips IPv4-mapped IPv6 prefix (::ffff:) if present.
 * @param {string} ip
 * @returns {string|null}
 */
const cleanIp = (ip) => {
  if (!ip || typeof ip !== 'string') return null;
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  return cleaned || null;
};

/**
 * Resolves the client's public IP address accurately across:
 * 1. Cloudflare ('cf-connecting-ip')
 * 2. Cloudflare Enterprise / Akamai ('true-client-ip')
 * 3. Reverse Proxies / Nginx / Caddy / Traefik ('x-real-ip')
 * 4. Multi-hop load balancers ('x-forwarded-for') - picks the first (origin client) IP
 * 5. Direct socket connection ('req.ip' / 'req.socket.remoteAddress')
 *
 * @param {import('express').Request} req
 * @param {string|null} fallback
 * @returns {string|null}
 */
export const getClientIp = (req, fallback = null) => {
  if (!req) return fallback;

  // 1. Cloudflare edge header (most authoritative when behind Cloudflare)
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) {
    const raw = Array.isArray(cfIp) ? cfIp[0] : cfIp;
    const cleaned = cleanIp(raw);
    if (cleaned) return cleaned;
  }

  // 2. Akamai / Cloudflare Enterprise
  const trueClientIp = req.headers?.['true-client-ip'];
  if (trueClientIp) {
    const raw = Array.isArray(trueClientIp) ? trueClientIp[0] : trueClientIp;
    const cleaned = cleanIp(raw);
    if (cleaned) return cleaned;
  }

  // 3. Nginx / reverse proxy X-Real-IP
  const xRealIp = req.headers?.['x-real-ip'];
  if (xRealIp) {
    const raw = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    const cleaned = cleanIp(raw);
    if (cleaned) return cleaned;
  }

  // 4. X-Forwarded-For: client, proxy1, proxy2
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = raw.split(',')[0].trim();
    const cleaned = cleanIp(firstIp);
    if (cleaned) return cleaned;
  }

  // 5. Express req.ip
  if (req.ip) {
    const cleaned = cleanIp(req.ip);
    if (cleaned) return cleaned;
  }

  // 6. Direct socket remote address
  if (req.socket?.remoteAddress) {
    const cleaned = cleanIp(req.socket.remoteAddress);
    if (cleaned) return cleaned;
  }

  return fallback;
};
