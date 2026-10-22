/**
 * Phone Number Normalization & Fuzzy Match Algorithms
 */

export function normalizePhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
}

export function normalizePhone(value: string | null | undefined): string | null {
	if (!value) return null;
	const digits = String(value).replace(/\D/g, "");
	if (!digits) return null;
	if (digits.length === 10) return `+7${digits}`;
	if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
	if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
	if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
	return null;
}

export function getNationalPhoneDigits(phone: string | null | undefined): string {
	const digits = normalizePhoneDigits(phone);
	if (digits.length >= 10) {
		return digits.slice(-10);
	}
	return digits;
}

export function fuzzyMatchPhone(
	phoneA: string | null | undefined,
	phoneB: string | null | undefined,
): boolean {
	if (!phoneA || !phoneB) return false;
	const digitsA = normalizePhoneDigits(phoneA);
	const digitsB = normalizePhoneDigits(phoneB);

	if (digitsA.length === 0 || digitsB.length === 0) return false;
	if (digitsA === digitsB) return true;

	const natA = getNationalPhoneDigits(phoneA);
	const natB = getNationalPhoneDigits(phoneB);

	if (natA.length === 10 && natB.length === 10 && natA === natB) {
		return true;
	}

	if (digitsA.length >= 7 && digitsB.length >= 7) {
		const suffix7A = digitsA.slice(-7);
		const suffix7B = digitsB.slice(-7);
		if (suffix7A === suffix7B && digitsA.length <= 11 && digitsB.length <= 11) {
			if (natA.length === 10 && natB.length === 10) {
				return natA === natB;
			}
			return true;
		}
	}

	return false;
}

export function normalizePhoneToNational(value: string | null | undefined): string {
	return getNationalPhoneDigits(value);
}

export function normalizePhoneToE164(value: string | null | undefined): string | null {
	return normalizePhone(value);
}

export function isValidRussianPhone(value: string | null | undefined): boolean {
	if (!value) return false;
	const nat = getNationalPhoneDigits(value);
	return nat.length === 10 && nat.startsWith("9");
}
