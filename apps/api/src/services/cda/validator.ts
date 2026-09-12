/**
 * Strict validator for Russian Minzdrav EGISZ REMD SEMD 108:
 * - OID syntax and dictionary checks (FRMO, FRMR, FRNSI, ICD-10, Order 804n)
 * - SNILS 11-digit checksum validation (PFR Resolution No. 192p)
 * - FDI ISO 3950 tooth numbers & surface compliance
 * - INN / OGRN checksum and format checks
 */

import {
	ALL_VALID_FDI_TOOTH_NUMBERS,
	EGISZ_OIDS,
	isValidFdiToothNumber,
} from "./util.js";
import { type EgiszCdaParams, egiszCdaParamsSchema } from "./schema.js";
import {
	isValidSnils,
	normalizeSnils,
	validateRussianInn,
	validateRussianOgrn,
} from "@dental/shared";

export {
	isValidSnils,
	normalizeSnils,
	validateRussianInn,
	validateRussianOgrn,
};

/**
 * Validates OID (Object Identifier) syntax according to ITU-T X.660 / ISO 8824.
 * Root node must be 0, 1, or 2; followed by dot-delimited non-negative integers.
 */
export function validateOid(oid: string): boolean {
	if (!oid || typeof oid !== "string") return false;
	const trimmed = oid.trim();
	return /^[0-2](\.(0|[1-9][0-9]*))+$/.test(trimmed);
}

/**
 * Validates FRMO (Federal Register of Medical Organizations) MO OID.
 * Must conform to root 1.2.643.5.1.13.13.12.2...
 */
export function validateFrmoOid(oid: string): boolean {
	if (!validateOid(oid)) return false;
	const trimmed = oid.trim();
	return trimmed === EGISZ_OIDS.FRMO_MO_ROOT || trimmed.startsWith(`${EGISZ_OIDS.FRMO_MO_ROOT}.`);
}

/**
 * Validates FDI ISO 3950 Tooth Number.
 */
export function validateFdiTooth(tooth: unknown): boolean {
	return isValidFdiToothNumber(tooth);
}

/**
 * Validates ICD-10 Diagnosis Code format (e.g. K02, K02.1, K04.02, Z01.2).
 */
export function validateIcd10Code(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	return /^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/i.test(code.trim());
}

/**
 * Validates Order 804n Medical Service Nomenclature Code format (e.g. A11.07.012, A16.07.002.001, B01.065.001).
 */
export function validateOrder804nCode(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	return /^[AB][0-9]{2}\.[0-9]{2,3}\.[0-9]{2,3}(\.[0-9]{2,3})?$/i.test(code.trim());
}

/**
 * Validates Russian OGRN (13 digits for Legal Entity, 15 digits for IP).
 */
export function validateOgrn(ogrn: string): boolean {
	if (!ogrn || typeof ogrn !== "string") return false;
	const trimmed = ogrn.trim();
	if (!/^\d{13}$|^\d{15}$/.test(trimmed)) return false;
	return validateRussianOgrn(trimmed).isValid;
}

/**
 * Validates Russian INN (10 digits for Legal Entity, 12 digits for Individual/IP).
 */
export function validateInn(inn: string): boolean {
	if (!inn || typeof inn !== "string") return false;
	const trimmed = inn.trim();
	if (!/^\d{10}$|^\d{12}$/.test(trimmed)) return false;
	return validateRussianInn(trimmed).isValid;
}

export interface CdaValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Full pre-flight validator for SEMD 108 CDA generation parameters.
 */
export function validateCdaParams(params: unknown): CdaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const parseRes = egiszCdaParamsSchema.safeParse(params);
	if (!parseRes.success) {
		for (const issue of parseRes.error.issues) {
			errors.push(`Схема: ${issue.path.join(".")} — ${issue.message}`);
		}
		return { valid: false, errors, warnings };
	}

	const data = parseRes.data;

	// Patient checks
	if (!data.patientName.last || !data.patientName.first) {
		errors.push("Пациент: ФИО не должно быть пустым");
	}
	if (!isValidSnils(data.patientSnils)) {
		errors.push(`Пациент: СНИЛС "${data.patientSnils}" недействителен (ошибка контрольной суммы или формата)`);
	}
	if (!data.patientBirthDate) {
		errors.push("Пациент: Дата рождения обязательна");
	}
	if (!data.patientGender || data.patientGender === "other") {
		warnings.push("Пациент: Рекомендуется указать пол (мужской/женский) для точной идентификации в ЕГИСЗ");
	}

	// Doctor checks
	if (!data.doctorName.last || !data.doctorName.first) {
		errors.push("Врач: ФИО не должно быть пустым");
	}
	if (data.doctorSnils && !isValidSnils(data.doctorSnils)) {
		warnings.push(`Врач: СНИЛС "${data.doctorSnils}" имеет неверную контрольную сумму`);
	}
	if (data.doctorPositionCode && !/^\d+$/.test(data.doctorPositionCode)) {
		warnings.push(`Врач: Код должности "${data.doctorPositionCode}" должен соответствовать справочнику NSI 1.2.643.5.1.13.13.11.1002`);
	}

	// Clinic checks
	if (!data.clinicName.trim()) {
		errors.push("Клиника: Наименование МО обязательно");
	}
	if (data.clinicOid && !validateFrmoOid(data.clinicOid)) {
		warnings.push(`Клиника: OID "${data.clinicOid}" не соответствует формату ФРМО (1.2.643.5.1.13.13.12.2.*)`);
	}
	if (data.clinicOgrn && !validateOgrn(data.clinicOgrn)) {
		warnings.push(`Клиника: ОГРН "${data.clinicOgrn}" имеет неверную длину или контрольное число`);
	}
	if (data.clinicInn && !validateInn(data.clinicInn)) {
		warnings.push(`Клиника: ИНН "${data.clinicInn}" имеет неверную контрольную сумму`);
	}

	// Clinical diagnosis & ICD-10
	if (!validateIcd10Code(data.icd10Code)) {
		errors.push(`Диагноз: Код МКБ-10 "${data.icd10Code}" имеет некорректный формат`);
	}
	if (data.diagnosisTooth && !validateFdiTooth(data.diagnosisTooth)) {
		warnings.push(`Диагноз: Номер зуба "${data.diagnosisTooth}" не соответствует классификации FDI ISO 3950`);
	}

	// Dental status items validation
	const dentalItems = data.dentalStatus || data.odontogram || [];
	for (const item of dentalItems) {
		if (!validateFdiTooth(item.tooth)) {
			errors.push(`Зубная формула: Недопустимый номер зуба FDI "${item.tooth}"`);
		}
	}

	// Rendered services validation
	const servicesList = data.services || data.servicesRendered || [];
	for (const svc of servicesList) {
		if (!validateOrder804nCode(svc.code)) {
			warnings.push(`Услуги: Код услуги "${svc.code}" не соответствует формату номенклатуры 804н (например, A16.07.002.001)`);
		}
		if (svc.tooth && !validateFdiTooth(svc.tooth)) {
			warnings.push(`Услуги: Номер зуба "${svc.tooth}" для услуги "${svc.code}" не соответствует классификации FDI`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}
