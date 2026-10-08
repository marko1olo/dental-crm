/**
 * DENTE Dental CRM — Tax Deduction Engine (Validators)
 * Official Russian tax identifiers validation (INN, KPP, OGRN, SNILS, Passport),
 * Certificate parameters validation & FNS XML 5.01 structural checks.
 */

import { KND_REGISTRY_ELECTRONIC_FORMAT, TAX_DEDUCTION_RELATIONSHIP_MAP } from "./constants.js";
import type { FnsTaxCertificateValidationResult, TaxDeductionCertificateParams } from "./types.js";
import { extractTaxYearFromDate } from "./calculation.js";
import { formatSnils, isValidSnils, normalizeSnils } from "../../utils/snils.js";

/**
 * Валидация 10-значного (ЮЛ) и 12-значного (ФЛ/ИП) российского ИНН по контрольным суммам ФНС.
 */
export function validateRussianInn(inn: unknown): { isValid: boolean; errorMessageRu?: string } {
	if (!inn || typeof inn !== "string") {
		return { isValid: false, errorMessageRu: "ИНН не указан" };
	}
	const cleaned = inn.trim().replace(/[\s\-_]/g, "");
	if (!/^\d+$/.test(cleaned)) {
		return { isValid: false, errorMessageRu: "ИНН должен состоять только из цифр" };
	}

	// Запрет на фиктивные ИНН из всех нулей
	if (/^0+$/.test(cleaned)) {
		return { isValid: false, errorMessageRu: "ИНН не может состоять только из нулей" };
	}

	// 10-значный ИНН (Юридические лица)
	if (cleaned.length === 10) {
		const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		const checkDigit =
			weights.reduce((sum, w, i) => sum + w * Number.parseInt(cleaned[i]!, 10), 0) % 11 % 10;
		const isValid = checkDigit === Number.parseInt(cleaned[9]!, 10);
		return isValid
			? { isValid: true }
			: { isValid: false, errorMessageRu: "Неверная контрольная сумма 10-значного ИНН организации" };
	}

	// 12-значный ИНН (Физические лица / ИП)
	if (cleaned.length === 12) {
		const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		const checkDigit11 =
			weights11.reduce((sum, w, i) => sum + w * Number.parseInt(cleaned[i]!, 10), 0) % 11 % 10;

		const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		const checkDigit12 =
			weights12.reduce((sum, w, i) => sum + w * Number.parseInt(cleaned[i]!, 10), 0) % 11 % 10;

		const isValid =
			checkDigit11 === Number.parseInt(cleaned[10]!, 10) &&
			checkDigit12 === Number.parseInt(cleaned[11]!, 10);

		return isValid
			? { isValid: true }
			: { isValid: false, errorMessageRu: "Неверная контрольная сумма 12-значного ИНН налогоплательщика" };
	}

	return { isValid: false, errorMessageRu: "ИНН должен содержать 10 цифр (для клиники) или 12 цифр (для физлица)" };
}

/**
 * Валидация 10-значного ИНН юридического лица.
 */
export function validateInnLegalEntity(inn: unknown): { isValid: boolean; errorMessageRu?: string } {
	if (!inn || typeof inn !== "string") {
		return { isValid: false, errorMessageRu: "ИНН организации не указан" };
	}
	const cleaned = inn.trim().replace(/[\s\-_]/g, "");
	if (cleaned.length !== 10) {
		return { isValid: false, errorMessageRu: "ИНН юридического лица должен содержать ровно 10 цифр" };
	}
	return validateRussianInn(cleaned);
}

/**
 * Валидация 12-значного ИНН физического лица или ИП.
 */
export function validateInnIndividual(inn: unknown): { isValid: boolean; errorMessageRu?: string } {
	if (!inn || typeof inn !== "string") {
		return { isValid: false, errorMessageRu: "ИНН физического лица не указан" };
	}
	const cleaned = inn.trim().replace(/[\s\-_]/g, "");
	if (cleaned.length !== 12) {
		return { isValid: false, errorMessageRu: "ИНН физического лица должен содержать ровно 12 цифр" };
	}
	return validateRussianInn(cleaned);
}

/**
 * Валидация 9-значного КПП российской организации.
 */
export function validateRussianKpp(kpp: string): { isValid: boolean; errorMessageRu?: string } {
	const trimmed = kpp.trim();
	if (!trimmed) {
		return { isValid: false, errorMessageRu: "КПП не указан" };
	}
	if (!/^[0-9]{4}[0-9A-Z]{2}[0-9]{3}$/.test(trimmed)) {
		return { isValid: false, errorMessageRu: "КПП должен содержать 9 символов формата 770101001" };
	}
	return { isValid: true };
}

/**
 * Валидация 13-значного ОГРН юридического лица или 15-значного ОГРНИП.
 */
export function validateRussianOgrn(ogrn: string): { isValid: boolean; errorMessageRu?: string } {
	const clean = ogrn.replace(/\D/g, "");
	if (clean.length === 13) {
		// ОГРН ЮЛ: остаток от деления 12-значного числа на 11, младший разряд равен 13-й цифре
		const num12 = BigInt(clean.slice(0, 12));
		const checkDigit = Number(num12 % 11n % 10n);
		const isValid = checkDigit === Number(clean[12]);
		return isValid
			? { isValid: true }
			: { isValid: false, errorMessageRu: "Неверная контрольная сумма 13-значного ОГРН организации" };
	}
	if (clean.length === 15) {
		// ОГРНИП: остаток от деления 14-значного числа на 13, младший разряд равен 15-й цифре
		const num14 = BigInt(clean.slice(0, 14));
		const checkDigit = Number(num14 % 13n % 10n);
		const isValid = checkDigit === Number(clean[14]);
		return isValid
			? { isValid: true }
			: { isValid: false, errorMessageRu: "Неверная контрольная сумма 15-значного ОГРНИП" };
	}
	return { isValid: false, errorMessageRu: "ОГРН должен содержать 13 цифр (ЮЛ) или 15 цифр (ОГРНИП)" };
}

/**
 * Валидация 11-значного СНИЛС по контрольным суммам ПФР / СФР.
 */
export function validateRussianSnils(snils: string): { isValid: boolean; normalized?: string; errorMessageRu?: string } {
	const clean = normalizeSnils(snils);
	if (clean.length !== 11) {
		return { isValid: false, errorMessageRu: "СНИЛС должен содержать 11 цифр (XXX-XXX-XXX YY)" };
	}

	// Запрет на фиктивный СНИЛС из всех нулей
	if (/^0+$/.test(clean) || clean.slice(0, 9) === "000000000" || /^(\d)\1{10}$/.test(clean)) {
		return { isValid: false, errorMessageRu: "СНИЛС не может состоять только из нулей" };
	}

	if (!isValidSnils(clean)) {
		return { isValid: false, errorMessageRu: "Неверная контрольная сумма СНИЛС" };
	}

	return { isValid: true, normalized: formatSnils(clean) };
}

/**
 * Валидация паспортных данных РФ (серия 4 цифры, номер 6 цифр).
 */
export function validateRussianPassport(docNumber: string): { isValid: boolean; normalized?: string; errorMessageRu?: string } {
	const clean = docNumber.replace(/\D/g, "");
	if (clean.length === 10) {
		const series = clean.slice(0, 4);
		const number = clean.slice(4);
		return { isValid: true, normalized: `${series} ${number}` };
	}
	if (clean.length === 0) {
		return { isValid: false, errorMessageRu: "Паспортные данные не указаны" };
	}
	return { isValid: false, errorMessageRu: "Серия и номер паспорта РФ должны содержать 10 цифр (4 серия + 6 номер)" };
}

/**
 * Full structural validation of tax certificate parameters according to FNS Order 824@.
 */
export function validateTaxCertificateParams(
	params: TaxDeductionCertificateParams,
): FnsTaxCertificateValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Certificate number & year
	if (!params.certificateNumber || !params.certificateNumber.trim()) {
		errors.push("Не указан номер справки");
	}
	if (!params.taxYear || params.taxYear < 2020 || params.taxYear > 2030) {
		errors.push("Указан некорректный налоговый период (отчетный год)");
	}

	// Clinic checks
	if (!params.clinic.legalName || !params.clinic.legalName.trim()) {
		errors.push("Не указано наименование медицинской организации");
	}
	const clinicInnRes = validateInnLegalEntity(params.clinic.inn);
	if (!clinicInnRes.isValid) {
		errors.push(`ИНН клиники: ${clinicInnRes.errorMessageRu || "некорректен"}`);
	}
	if (params.clinic.kpp) {
		const kppRes = validateRussianKpp(params.clinic.kpp);
		if (!kppRes.isValid) {
			errors.push(`КПП клиники: ${kppRes.errorMessageRu || "некорректен"}`);
		}
	}
	if (params.clinic.ogrn) {
		const ogrnRes = validateRussianOgrn(params.clinic.ogrn);
		if (!ogrnRes.isValid) {
			warnings.push(`ОГРН клиники: ${ogrnRes.errorMessageRu || "некорректен"}`);
		}
	}

	// Payer checks
	if (!params.payer.fullName || !params.payer.fullName.trim()) {
		errors.push("Не указано ФИО налогоплательщика");
	}
	if (params.payer.inn) {
		const payerInnRes = validateInnIndividual(params.payer.inn);
		if (!payerInnRes.isValid) {
			errors.push(`ИНН налогоплательщика: ${payerInnRes.errorMessageRu || "некорректен"}`);
		}
	}
	const passportDoc = `${params.payer.identityDocumentSeries || ""}${params.payer.identityDocumentNumber || ""}`;
	if (passportDoc) {
		const passportRes = validateRussianPassport(passportDoc);
		if (!passportRes.isValid) {
			warnings.push(`Паспорт плательщика: ${passportRes.errorMessageRu || "некорректен"}`);
		}
	}

	// Patient checks (if not self)
	const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	if (rel.samePatientFlag === "0") {
		if (!params.patient.fullName || !params.patient.fullName.trim()) {
			errors.push("Не указано ФИО пациента при оформлении справки на родственника");
		}
	}

	// Payments check
	const yearPayments = params.payments.filter(
		(p) => extractTaxYearFromDate(p.dateIso) === params.taxYear,
	);
	if (yearPayments.length === 0) {
		warnings.push(`Отсутствуют фискальные чеки за ${params.taxYear} год`);
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Validates the XML syntax and mandatory tags of the generated FNS 824@ XML.
 */
export function validateFnsTaxXmlStructure(xmlContent: string): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];
	if (!xmlContent || !xmlContent.trim()) {
		return { isValid: false, errors: ["XML контент пуст"] };
	}

	if (!xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
		errors.push("Отсутствует стандартный XML-пролог UTF-8");
	}
	if (!xmlContent.includes("<Файл") || !xmlContent.includes("</Файл>")) {
		errors.push("Отсутствует корневой тег <Файл>");
	}
	if (!xmlContent.includes('ВерсФорм="5.01"')) {
		errors.push("Версия формата должна быть 5.01");
	}
	if (!xmlContent.includes("<Документ") || !xmlContent.includes("</Документ>")) {
		errors.push("Отсутствует секция <Документ>");
	}
	if (!xmlContent.includes(`КНД="${KND_REGISTRY_ELECTRONIC_FORMAT}"`)) {
		errors.push(`Отсутствует атрибут КНД="${KND_REGISTRY_ELECTRONIC_FORMAT}"`);
	}
	if (!xmlContent.includes("<Подписант")) {
		errors.push("Отсутствуют сведения о подписанте (<Подписант>)");
	}
	if (!xmlContent.includes("<СвНП") && !xmlContent.includes("<СвМО") && !xmlContent.includes("<СвОргМ")) {
		errors.push("Отсутствуют сведения о медицинской организации или ИП");
	}
	if (!xmlContent.includes("<СуммаРасх") && !xmlContent.includes("<СведРасхУсл") && !xmlContent.includes("<РасчетСумм")) {
		errors.push("Отсутствуют сведения о расходах по кодам вычета");
	}

	for (const token of ["undefined", "NaN", "Infinity", "[object Object]"]) {
		if (xmlContent.includes(token)) {
			errors.push(`XML содержит некорректное техническое значение "${token}"`);
		}
	}

	if (xmlContent.includes('СерНомДок=""')) {
		errors.push('XML содержит пустой атрибут СерНомДок=""');
	}
	if (xmlContent.includes('<Лицензия Номер=""')) {
		errors.push('XML содержит пустой тег лицензии с Номер=""');
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
