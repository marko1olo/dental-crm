import { sha256Hex } from "@dental/shared";

export async function calculateSha256Subtle(inputString: string): Promise<string> {
	if (typeof crypto !== "undefined" && crypto.subtle) {
		const msgUint8 = new TextEncoder().encode(inputString);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	return sha256Hex(inputString);
}

export function calculateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

export { calculateCrc16Ccitt as calculateCrc16CcittFalse } from "@dental/shared";

export function kopecksToRubles(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

export function rublesToKopecks(rubles: number): number {
	return Math.round((Number(rubles) || 0) * 100);
}

export function formatKopecksToCurrencyRu(kopecks: number): string {
	const rub = kopecksToRubles(kopecks);
	return rub.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}) + " ₽";
}
