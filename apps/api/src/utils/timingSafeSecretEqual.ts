import { createHash, timingSafeEqual } from "node:crypto";

export function timingSafeSecretEqual(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  const providedHash = createHash("sha256").update(providedSecret).digest();
  const expectedHash = createHash("sha256").update(expectedSecret).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
