/**
 * Cryptographic Hash & QR Code Utilities
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 2 ENGINE)
 */

import { generateQrCodeSvg, sha256Hex } from "@dental/shared";

export async function computeSha256Subtle(inputString: string): Promise<string> {
	if (typeof crypto !== "undefined" && crypto.subtle) {
		const msgUint8 = new TextEncoder().encode(inputString);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	return sha256Hex(inputString);
}

export function generateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

export { generateQrCodeSvg };
