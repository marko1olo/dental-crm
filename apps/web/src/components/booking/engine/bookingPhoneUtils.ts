import {
	cleanPhoneDigits,
	formatPhoneNumber,
	formatRussianPhone as canonicalFormatRussianPhone,
	isValidRussianPhone as canonicalIsValidRussianPhone,
} from "../../../utils/formatters";

export const formatRussianPhone = canonicalFormatRussianPhone;
export const isValidRussianPhone = canonicalIsValidRussianPhone;
export const cleanDigits = cleanPhoneDigits;
export const formatRuPhone = formatPhoneNumber;

export function isValidRuMobile(phone: string): boolean {
	const clean = cleanPhoneDigits(phone);
	const last10 = clean.slice(-10);
	return last10.length === 10 && last10.startsWith("9");
}

export function isValidPatientName(name: string): boolean {
	const trimmed = name.trim();
	return trimmed.length >= 2 && trimmed.length <= 100;
}
