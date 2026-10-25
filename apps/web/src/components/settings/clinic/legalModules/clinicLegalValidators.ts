import type { RequisiteValidationResult } from "./clinicLegalTypes";

export function validateInn(inn: string | undefined | null): RequisiteValidationResult {
	if (!inn) return { isValid: false, message: "ИНН не указан" };
	const clean = inn.trim().replace(/[^\d]/g, "");
	if (clean.length === 0) return { isValid: false, message: "ИНН должен содержать только цифры" };

	if (clean.length === 10) {
		const coeff = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		let sum = 0;
		for (let i = 0; i < 9; i++) sum += Number(clean[i] ?? "0") * (coeff[i] ?? 0);
		const checkDigit = (sum % 11) % 10;
		if (checkDigit === Number(clean[9] ?? "0")) return { isValid: true, type: "juridical" };
		return { isValid: false, message: "Неверная контрольная сумма ИНН юрлица", type: "juridical" };
	}

	if (clean.length === 12) {
		const c11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		let s11 = 0;
		for (let i = 0; i < 10; i++) s11 += Number(clean[i] ?? "0") * (c11[i] ?? 0);
		if ((s11 % 11) % 10 !== Number(clean[10] ?? "0")) {
			return { isValid: false, message: "Неверная контрольная сумма 11-й цифры ИНН ИП", type: "physical" };
		}
		const c12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		let s12 = 0;
		for (let i = 0; i < 11; i++) s12 += Number(clean[i] ?? "0") * (c12[i] ?? 0);
		if ((s12 % 11) % 10 !== Number(clean[11] ?? "0")) {
			return { isValid: false, message: "Неверная контрольная сумма 12-й цифры ИНН ИП", type: "physical" };
		}
		return { isValid: true, type: "physical" };
	}

	return { isValid: false, message: `Длина ИНН должна быть 10 (для ООО) или 12 (для ИП) цифр (сейчас ${clean.length})` };
}

export function validateKpp(kpp: string | undefined | null, isIp = false): RequisiteValidationResult {
	if (isIp) return { isValid: true, message: "У индивидуальных предпринимателей КПП отсутствует" };
	if (!kpp || !kpp.trim()) return { isValid: true, message: "КПП не указан (допустимо для ИП)" };
	if (/^[0-9]{4}[0-9A-Z]{2}[0-9]{3}$/.test(kpp.trim())) return { isValid: true };
	return { isValid: false, message: "КПП должен состоять из 9 символов (например, 770101001)" };
}

export function validateOgrn(ogrn: string | undefined | null): RequisiteValidationResult {
	if (!ogrn) return { isValid: false, message: "ОГРН/ОГРНИП не указан" };
	const clean = ogrn.trim().replace(/[^\d]/g, "");
	if (clean.length === 13) {
		const num = BigInt(clean.slice(0, 12));
		if (Number(num % 11n % 10n) === Number(clean[12])) return { isValid: true, type: "ogrn" };
		return { isValid: false, message: "Неверная контрольная сумма ОГРН юрлица", type: "ogrn" };
	}
	if (clean.length === 15) {
		const num = BigInt(clean.slice(0, 14));
		if (Number(num % 13n % 10n) === Number(clean[14])) return { isValid: true, type: "ogrnip" };
		return { isValid: false, message: "Неверная контрольная сумма ОГРНИП", type: "ogrnip" };
	}
	return { isValid: false, message: `Длина ОГРН должна быть 13 цифр (ООО) или 15 цифр (ОГРНИП для ИП) (сейчас ${clean.length})` };
}

export function validateBik(bik: string | undefined | null): RequisiteValidationResult {
	if (!bik) return { isValid: false, message: "БИК не указан" };
	const clean = bik.trim().replace(/[^\d]/g, "");
	if (clean.length !== 9) return { isValid: false, message: `БИК должен состоять из 9 цифр (сейчас ${clean.length})` };
	if (!clean.startsWith("04")) return { isValid: false, message: "БИК банков РФ должен начинаться с 04" };
	return { isValid: true };
}

export function validateCheckingAccount(account: string | undefined | null, bik?: string | null): RequisiteValidationResult {
	if (!account) return { isValid: false, message: "Расчетный счет не указан" };
	const cleanAcc = account.trim().replace(/[^\d]/g, "");
	if (cleanAcc.length !== 20) return { isValid: false, message: `Расчетный счет должен содержать 20 цифр (сейчас ${cleanAcc.length})` };
	if (bik && bik.trim().length === 9) {
		const cleanBik = bik.trim().replace(/[^\d]/g, "");
		const bikAccountPart = cleanBik.slice(6, 9) + cleanAcc;
		const weights = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1];
		let sum = 0;
		for (let i = 0; i < 23; i++) sum += (Number(bikAccountPart[i] ?? "0") * (weights[i] ?? 0)) % 10;
		if (sum % 10 === 0) return { isValid: true };
		return { isValid: false, message: "Контрольный ключ расчетного счета не совпадает с БИК" };
	}
	return { isValid: true };
}

export function validateMedicalLicense(license: string | undefined | null): RequisiteValidationResult {
	if (!license || !license.trim()) return { isValid: false, message: "Лицензия не указана" };
	const val = license.trim();
	const isL041 = /^Л041-[0-9]{5}-[0-9]{2}\/[0-9]{8}$/i.test(val);
	const isClassic = /^ЛО-[0-9]{2}-[0-9]{2}-[0-9]{6}$/i.test(val);
	if (isL041 || isClassic) return { isValid: true, type: isL041 ? "L041_Roszdravnadzor" : "Classic_LO" };
	if (val.length >= 6) return { isValid: true, message: "Номер лицензии введен в свободном формате" };
	return { isValid: false, message: "Номер лицензии слишком короткий (минимум 6 знаков)" };
}

export function validateEgiszOid(oid: string | undefined | null): RequisiteValidationResult {
	if (!oid || !oid.trim()) return { isValid: false, message: "OID организации ЕГИСЗ не указан" };
	if (/^1\.2\.643\.5\.1\.13\.[0-9.]+$/.test(oid.trim())) return { isValid: true };
	return { isValid: false, message: "OID ЕГИСЗ должен начинаться с 1.2.643.5.1.13." };
}
