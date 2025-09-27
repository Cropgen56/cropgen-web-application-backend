// src/utils/emailValidation.js
import dns from "node:dns/promises";

export const isLikelyValidEmail = (email = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

// Optional: check MX records (network call; use a short timeout!)
export async function hasMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}

export async function isDeliverableEmail(email) {
  if (!isLikelyValidEmail(email)) return false;
  const domain = email.split("@")[1].toLowerCase();
  // quick reject of obviously fake/dev domains (customize as needed)
  const blocked = ["example.com", "test.com", "invalid", "local", "localhost"];
  if (blocked.some((d) => domain.endsWith(d))) return false;

  // Optional MX check (guard with env to avoid slowing down)
  if (process.env.EMAIL_VALIDATE_MX === "true") {
    return await hasMx(domain);
  }
  return true;
}
