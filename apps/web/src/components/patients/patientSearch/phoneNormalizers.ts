import { getNationalPhoneDigits, normalizePhone } from "@dental/shared";

export const normalizePhoneToNational = (value: string | null | undefined): string =>
	getNationalPhoneDigits(value);

export function normalizePhoneE164(value: string | null | undefined): string {
	return normalizePhone(value) ?? "";
}
