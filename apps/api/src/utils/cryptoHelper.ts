import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

/**
 * Hash a password or PIN code with a random per-credential salt.
 * Format: salt:hash (hex:hex)
 */
export async function hashCredential(value: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const hashBuf = await pbkdf2Async(value, salt, ITERATIONS, KEYLEN, DIGEST);
  const hash = hashBuf.toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext credential against a stored hash (salt:hash format).
 * Falls back to simple equality check for legacy plain-stored values.
 */
export async function verifyCredential(
  plain: string,
  stored: string,
): Promise<boolean> {
  try {
    if (stored.includes(":")) {
      const [salt, hash] = stored.split(":");
      if (!salt || !hash) return false;
      const candidateBuf = await pbkdf2Async(
        plain,
        salt,
        ITERATIONS,
        KEYLEN,
        DIGEST,
      );
      const candidate = candidateBuf.toString("hex");
      const a = Buffer.from(candidate, "utf8");
      const b = Buffer.from(hash, "utf8");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    }
    // Legacy: plain equality for initial seeding
    return plain === stored;
  } catch {
    return false;
  }
}

/**
 * Cryptographically signs a token payload with an expiry.
 * Format: base64(payload).base64(sig)
 */
export function signToken(
  payload: object,
  secret: string,
  ttlSeconds = 60 * 60 * 12,
): string {
  const full = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    iat: Math.floor(Date.now() / 1000),
  };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies a token's signature and expiry, returns payload or null.
 */
export function verifyToken(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;
    const expectedSig = createHmac("sha256", secret)
      .update(data)
      .digest("base64url");
    const a = Buffer.from(expectedSig, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    // Check expiry
    if (
      typeof payload.exp === "number" &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
