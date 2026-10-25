/**
 * Generates a 16-digit gift certificate serial number with Luhn check digit
 * Format: 7701-XXXX-XXXX-XXXC (7701 is Moscow Dental Clinic prefix)
 */
export function generateGiftCertificateSerial(randomSeed?: number): string {
	const prefix = "7701";
	let digits = prefix;

	let cryptoBytes: Uint8Array | null = null;
	if (randomSeed === undefined && typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		cryptoBytes = new Uint8Array(11);
		crypto.getRandomValues(cryptoBytes);
	}

	for (let i = 0; i < 11; i++) {
		const rand =
			randomSeed !== undefined
				? (randomSeed * (i + 1) * 7) % 10
				: cryptoBytes
				? cryptoBytes[i]! % 10
				: Math.abs(((Date.now() + i * 17) ^ (i * 31)) % 10);
		digits += rand.toString();
	}

	// Compute Luhn checksum digit
	let sum = 0;
	for (let i = 0; i < 15; i++) {
		let d = parseInt(digits[i]!, 10);
		if (i % 2 === 0) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	const checkDigit = (10 - (sum % 10)) % 10;
	digits += checkDigit.toString();

	// Format into 4-4-4-4
	return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

/**
 * Validates 16-digit gift certificate serial number using Luhn algorithm
 */
export function validateGiftCertificateSerial(formattedSerial: string): boolean {
	const cleaned = formattedSerial.replace(/[\s-]/g, "");
	if (!/^\d{16}$/.test(cleaned)) {
		return false;
	}

	let sum = 0;
	for (let i = 0; i < 16; i++) {
		let d = parseInt(cleaned[i]!, 10);
		if (i % 2 === 0) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	return sum % 10 === 0;
}
