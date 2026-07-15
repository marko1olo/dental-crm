import { createHash, timingSafeEqual } from "node:crypto";

export function timingSafeSecretEqual(
	providedSecret: string | null,
	expectedSecret: string | null | undefined,
): boolean {
	if (!providedSecret || !expectedSecret) return false;
	const providedHash = createHash("sha256")
		.update(String(providedSecret))
		.digest();
	const expectedHash = createHash("sha256")
		.update(String(expectedSecret))
		.digest();
	return timingSafeEqual(providedHash, expectedHash);
}
