import { getNationalPhoneDigits } from "@dental/shared";

export const normalizePhoneToNational = (value: string | null | undefined): string =>
	getNationalPhoneDigits(value);

export function normalizePhoneE164(value: string | null | undefined): string {
	const national = normalizePhoneToNational(value);
	if (national.length === 10) return `+7${national}`;
	const digits = (value ?? "").replace(/\D/g, "");
	if (digits.length >= 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7${digits.slice(1, 11)}`;
	}
	if (digits.length === 10) return `+7${digits}`;
	return digits ? `+${digits}` : "";
}
