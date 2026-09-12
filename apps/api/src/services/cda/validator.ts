/**
 * apps/api/src/services/cda/validator.ts
 *
 * Facade delegating statutory validation of Russian Minzdrav EGISZ REMD SEMD
 * documents to canonical @dental/shared per Mandates 8s and 8j.
 */

import {
	isValidSnils,
	normalizeSnils,
	validateFdiToothNumber,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOid,
	validateOrder804nCode,
	validateRussianInn,
	validateRussianOgrn,
	type CdaValidationResult,
} from "@dental/shared";
import { egiszCdaParamsSchema } from "./schema.js";

export {
	isValidSnils,
	normalizeSnils,
	validateFdiToothNumber,
	validateFdiToothNumber as validateFdiTooth,
	validateFrmoOid,
	validateIcd10Code,
	validateInn,
	validateOgrn,
	validateOid,
	validateOrder804nCode,
	validateRussianInn,
	validateRussianOgrn,
	type CdaValidationResult,
};

/**
 * Pre-flight validator for SEMD 108 CDA generation parameters.
 * Delegates all format & checksum checks to canonical @dental/shared validators.
 */
export function validateCdaParams(params: unknown): CdaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const issues: Array<{
		path: string;
		field: string;
		message: string;
		severity: "error" | "warning";
	}> = [];

	const parseRes = egiszCdaParamsSchema.safeParse(params);
	if (!parseRes.success) {
		for (const issue of parseRes.error.issues) {
			const pathStr = issue.path.join(".");
			const msg = `Схема: ${pathStr} — ${issue.message}`;
			errors.push(msg);
			issues.push({
				path: pathStr,
				field: issue.path[issue.path.length - 1]?.toString() || "field",
				message: issue.message,
				severity: "error",
			});
		}
		return { valid: false, errors, warnings, issues };
	}

	const data = parseRes.data;

	// Patient checks
	if (!data.patientName.last || !data.patientName.first) {
		errors.push("Пациент: ФИО не должно быть пустым");
	}
	if (!isValidSnils(data.patientSnils)) {
		errors.push(
			`Пациент: СНИЛС "${data.patientSnils}" недействителен (ошибка контрольной суммы или формата)`,
		);
	}
	if (!data.patientBirthDate) {
		errors.push("Пациент: Дата рождения обязательна");
	}
	if (!data.patientGender || data.patientGender === "other") {
		warnings.push(
			"Пациент: Рекомендуется указать пол (мужской/женский) для точной идентификации в ЕГИСЗ",
		);
	}

	// Doctor checks
	if (!data.doctorName.last || !data.doctorName.first) {
		errors.push("Врач: ФИО не должно быть пустым");
	}
	if (data.doctorSnils && !isValidSnils(data.doctorSnils)) {
		warnings.push(
			`Врач: СНИЛС "${data.doctorSnils}" имеет неверную контрольную сумму`,
		);
	}
	if (data.doctorPositionCode && !/^\d+$/.test(data.doctorPositionCode)) {
		warnings.push(
			`Врач: Код должности "${data.doctorPositionCode}" должен соответствовать справочнику NSI 1.2.643.5.1.13.13.11.1002`,
		);
	}

	// Clinic checks
	if (!data.clinicName.trim()) {
		errors.push("Клиника: Наименование МО обязательно");
	}
	if (data.clinicOid && !validateFrmoOid(data.clinicOid)) {
		warnings.push(
			`Клиника: OID "${data.clinicOid}" не соответствует формату ФРМО (1.2.643.5.1.13.13.12.2.*)`,
		);
	}
	if (data.clinicOgrn && !validateOgrn(data.clinicOgrn)) {
		warnings.push(
			`Клиника: ОГРН "${data.clinicOgrn}" имеет неверную длину или контрольное число`,
		);
	}
	if (data.clinicInn && !validateInn(data.clinicInn)) {
		warnings.push(
			`Клиника: ИНН "${data.clinicInn}" имеет неверную контрольную сумму`,
		);
	}

	// Clinical diagnosis & ICD-10
	if (!validateIcd10Code(data.icd10Code)) {
		errors.push(`Диагноз: Код МКБ-10 "${data.icd10Code}" имеет некорректный формат`);
	}
	if (data.diagnosisTooth && !validateFdiToothNumber(data.diagnosisTooth)) {
		warnings.push(
			`Диагноз: Номер зуба "${data.diagnosisTooth}" не соответствует классификации FDI ISO 3950`,
		);
	}

	// Dental status items validation
	const dentalItems = data.dentalStatus || data.odontogram || [];
	for (const item of dentalItems) {
		if (!validateFdiToothNumber(item.tooth)) {
			errors.push(
				`Зубная формула: Недопустимый номер зуба FDI "${item.tooth}"`,
			);
		}
	}

	// Rendered services validation
	const servicesList = data.services || data.servicesRendered || [];
	for (const svc of servicesList) {
		if (!validateOrder804nCode(svc.code)) {
			warnings.push(
				`Услуги: Код услуги "${svc.code}" не соответствует формату номенклатуры 804н (например, A16.07.002.001)`,
			);
		}
		if (svc.tooth && !validateFdiToothNumber(svc.tooth)) {
			warnings.push(
				`Услуги: Номер зуба "${svc.tooth}" для услуги "${svc.code}" не соответствует классификации FDI`,
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		issues,
	};
}

