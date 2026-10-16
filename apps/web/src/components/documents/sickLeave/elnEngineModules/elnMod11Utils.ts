/**
 * STATUTORY ELN MOD 11 UTILITIES
 * SFR (FSS) EIIS "Socstrakh" specification (MOD 11)
 */

export const ELN_MOD11_WEIGHTS = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;

export function computeElnCheckDigit(elevenDigits: string): number {
	const clean = (elevenDigits || "").replace(/\D/g, "");
	if (clean.length < 11) {
		throw new Error(
			`ELN check digit calculation requires at least 11 digits, received: "${elevenDigits}"`,
		);
	}
	const target = clean.slice(0, 11);
	let sum = 0;
	for (let i = 0; i < 11; i++) {
		sum += Number.parseInt(target[i]!, 10) * ELN_MOD11_WEIGHTS[i]!;
	}
	const remainder = sum % 11;
	return remainder === 10 ? 0 : remainder;
}

export function validateElnNumber(eln: string): boolean {
	if (!eln || typeof eln !== "string") return false;
	const clean = eln.replace(/\D/g, "");
	if (clean.length !== 12) return false;
	const elevenDigits = clean.slice(0, 11);
	const checkDigit = Number.parseInt(clean[11]!, 10);
	return computeElnCheckDigit(elevenDigits) === checkDigit;
}

let elnSequenceCounter = 0;

export function generateElnNumber(
	prefix = "999",
	sequenceNumber?: number | string | null | undefined,
): string {
	const cleanPrefix = (prefix || "999").replace(/\D/g, "").slice(0, 3).padEnd(3, "9");
	let seqStr: string;

	if (
		sequenceNumber !== undefined &&
		sequenceNumber !== null &&
		String(sequenceNumber).trim() !== ""
	) {
		const digitsOnly = String(sequenceNumber).replace(/\D/g, "");
		seqStr = (digitsOnly || "1").padStart(8, "0").slice(-8);
	} else {
		elnSequenceCounter = (elnSequenceCounter + 1) % 10000;
		if (elnSequenceCounter === 0) elnSequenceCounter = 1;
		const now = new Date();
		const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
		const secondsOfYear = Math.floor((now.getTime() - startOfYear) / 1000);
		const composite = (secondsOfYear % 10000) * 10000 + elnSequenceCounter;
		seqStr = String(composite).padStart(8, "0").slice(-8);
	}

	const first11 = `${cleanPrefix}${seqStr}`;
	const checkDigit = computeElnCheckDigit(first11);
	return `${first11}${checkDigit}`;
}
