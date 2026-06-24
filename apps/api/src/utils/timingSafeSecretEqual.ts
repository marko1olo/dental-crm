import { timingSafeEqual, createHash } from "node:crypto";

export function timingSafeSecretEqual(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  const providedHash = createHash('sha256').update(String(providedSecret)).digest();
  const expectedHash = createHash('sha256').update(String(expectedSecret)).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
