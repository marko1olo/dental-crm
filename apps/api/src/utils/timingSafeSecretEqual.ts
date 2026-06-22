import { timingSafeEqual } from "node:crypto";

export function timingSafeSecretEqual(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
