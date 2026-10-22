/**
 * remdStatutoryValidators.ts — Statutory Russian Checksum Validators (SNILS, OGRN, INN, OID)
 */

import { formatSnils, isValidSnils, normalizeSnils } from "../../../utils/snils";

export function validateRussianSnils(rawSnils: string): { isValid: boolean; clean: string; formatted: string; error?: string } {
	const clean = normalizeSnils(rawSnils);
	if (!clean || clean.length !== 11) {
		return { isValid: false, clean: "", formatted: "", error: "СНИЛС должен содержать ровно 11 цифр" };
	}
	if (!isValidSnils(clean)) {
		return { isValid: false, clean, formatted: formatSnils(clean), error: "Неверное контрольное число СНИЛС" };
	}
	return { isValid: true, clean, formatted: formatSnils(clean) };
}

export function validateRussianOgrn(ogrn: string): boolean {
	const clean = ogrn.replace(/\D/g, "");
	if (clean.length === 13) {
		const num = BigInt(clean.slice(0, 12));
		const checkDigit = Number(clean[12]);
		return Number((num % 11n) % 10n) === checkDigit;
	}
	if (clean.length === 15) {
		const num = BigInt(clean.slice(0, 14));
		const checkDigit = Number(clean[14]);
		return Number((num % 13n) % 10n) === checkDigit;
	}
	return false;
}

export function validateRussianInn(inn: string): boolean {
	const clean = inn.replace(/\D/g, "");
	if (clean.length === 10) {
		const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum = weights.reduce((acc, w, idx) => acc + w * Number(clean[idx]), 0);
		return (sum % 11) % 10 === Number(clean[9]);
	}
	if (clean.length === 12) {
		const w11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum11 = w11.reduce((acc, w, idx) => acc + w * Number(clean[idx]), 0);
		const c11 = (sum11 % 11) % 10;
		if (c11 !== Number(clean[10])) return false;

		const w12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum12 = w12.reduce((acc, w, idx) => acc + w * Number(clean[idx]), 0);
		const c12 = (sum12 % 11) % 10;
		return c12 === Number(clean[11]);
	}
	return false;
}

export function validateOidFormat(oid: string): boolean {
	if (!oid || typeof oid !== "string") return false;
	return /^[0-2](\.(0|[1-9]\d*))+$/.test(oid.trim());
}
