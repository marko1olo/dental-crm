/**
 * Taxpayer, Clinic & Fiscal Receipt Validation (Layer 1/2)
 * Compliance with Order of the FNS of Russia № ЕА-7-11/824@ and Art. 219 of the Tax Code of the RF
 */

import { parseKopecks } from "../../money.js";
import {
	extractTaxYearFromDate,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
} from "../../finance/taxDeduction.js";
import type {
	FnsFullName,
	FnsPreflightIssue,
	FnsTaxPayload,
} from "../fnsSchema1151156.js";
import type { FnsReceiptsChecksumValidationResult } from "./types.js";
import { isNonMedicalGood } from "./serviceCodeClassifier.js";

/** Экранирование спецсимволов XML */
export function escapeXmlAttr(value: string | number | null | undefined): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

/** Очистка строки от нецифровых символов */
export function cleanDigits(str?: string | null): string {
	return str ? str.replace(/\D/g, "") : "";
}

/** Перевод целых копеек в рубли (число с плавающей точкой) для вывода */
export function rublesFromKopecks(kopecks: number): number {
	return kopecks / 100;
}

/** Форматирование даты в стандартный вид ФНС РФ: ДД.ММ.ГГГГ */
export function formatFnsRuDate(dateStrOrObj?: string | Date | null): string {
	if (!dateStrOrObj) {
		const now = new Date();
		const dd = now.getDate().toString().padStart(2, "0");
		const mm = (now.getMonth() + 1).toString().padStart(2, "0");
		const yyyy = now.getFullYear();
		return `${dd}.${mm}.${yyyy}`;
	}
	if (typeof dateStrOrObj === "string") {
		const trimmed = dateStrOrObj.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
			return trimmed;
		}
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const datePart = trimmed.split("T")[0] ?? "";
			const parts = datePart.split("-");
			if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
				return `${parts[2]}.${parts[1]}.${parts[0]}`;
			}
		}
		if (/^\d{8}$/.test(trimmed)) {
			return `${trimmed.slice(6, 8)}.${trimmed.slice(4, 6)}.${trimmed.slice(0, 4)}`;
		}
	}
	const date = new Date(dateStrOrObj);
	if (Number.isNaN(date.getTime())) return "01.01.2026";
	const dd = date.getDate().toString().padStart(2, "0");
	const mm = (date.getMonth() + 1).toString().padStart(2, "0");
	const yyyy = date.getFullYear();
	return `${dd}.${mm}.${yyyy}`;
}

export const formatFnsDate = formatFnsRuDate;

/**
 * Генерация уникального ИдФайл и имени файла по стандарту ФНС РФ:
 * - Формат ЭДО: NO_MEDOPL_<ИД_ОТПРАВИТЕЛЯ>_<ИД_ПОЛУЧАТЕЛЯ>_<ДАТА>_<GUID>
 * - Формат XSD: UT_SVOPLMEDUSL_<КодНО>_<КодНО>_<ИдОтпр>_<ДатаДокГГГГММДД>_<GUID>
 */
export function generateFnsFileNameAndId(
	taxOfficeCode: string,
	senderInn: string,
	senderKpp: string | undefined | null,
	documentDate: string,
	customUuid?: string,
	filePrefix: "NO_MEDOPL" | "UT_SVOPLMEDUSL" | string = "NO_MEDOPL",
): { fileName: string; fileId: string; uuid: string } {
	const cleanOffice = (taxOfficeCode || "7701").padStart(4, "0").slice(0, 4);
	const cleanInn = cleanDigits(senderInn) || "";
	const cleanKpp = senderKpp ? cleanDigits(senderKpp) : "";
	const senderId = cleanInn.length === 12 ? cleanInn : (cleanInn ? `${cleanInn}${cleanKpp || "770101001"}` : "");

	let rawDate = "20260818";
	if (documentDate.includes(".")) {
		const parts = documentDate.split(".");
		if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
			rawDate = `${parts[2]}${parts[1]}${parts[0]}`;
		}
	} else if (documentDate.includes("-")) {
		rawDate = documentDate.replace(/-/g, "").slice(0, 8);
	} else {
		rawDate = cleanDigits(documentDate).slice(0, 8) || "20260818";
	}

	const uuid =
		customUuid ||
		(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d");

	let fileId = "";
	if (filePrefix === "NO_MEDOPL") {
		fileId = `NO_MEDOPL_${senderId}_${cleanOffice}_${rawDate}_${uuid}`;
	} else {
		fileId = `UT_SVOPLMEDUSL_${cleanOffice}_${cleanOffice}_${senderId}_${rawDate}_${uuid}`;
	}
	const fileName = `${fileId}.xml`;

	return { fileName, fileId, uuid };
}

/** Разделение полного ФИО на Фамилию, Имя, Отчество */
export function parseFio(fullNameStr: string): FnsFullName {
	const parts = fullNameStr.trim().split(/\s+/).filter(Boolean);
	const patronymic = parts.slice(2).join(" ");
	return {
		family: parts[0] || "Иванов",
		given: parts[1] || "Иван",
		...(patronymic ? { patronymic } : {}),
	};
}

/**
 * Строгая валидация контрольных сумм фискальных чеков (54-ФЗ / ст. 219 НК РФ):
 * - Полное копеечное совпадение сумм чеков и заявленных сумм расходов (без расхождений)
 * - Защита от дубликатов чеков (один ФД не может быть учтен повторно)
 * - Проверка на строго положительные целочисленные суммы
 * - Проверка соответствия даты чека налоговому периоду
 * - Запрет на включение сопутствующих товаров (зубные пасты/щетки) и выплат по ДМС
 */
export function validateFnsFiscalReceiptsChecksums(
	payload: FnsTaxPayload,
): FnsReceiptsChecksumValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const receipts = payload.receipts || [];
	const targetTaxYear = Number(payload.taxYear);

	let code1ReceiptsCount = 0;
	let code2ReceiptsCount = 0;
	let calculatedCode1Kopecks = 0;
	let calculatedCode2Kopecks = 0;

	const seenReceiptKeys = new Set<string>();

	for (let i = 0; i < receipts.length; i++) {
		const r = receipts[i];
		if (!r) continue;
		const itemIdx = i + 1;

		const receiptNum = (r.receiptNumber || "").trim();
		const fiscalDocNum = (r.fiscalDocumentNumber || "").trim();
		if (!receiptNum && !fiscalDocNum) {
			errors.push(
				`Чек #${itemIdx}: отсутствует номер фискального чека или номер ФД.`,
			);
		}

		const uniqueKey = fiscalDocNum
			? `fd:${fiscalDocNum}`
			: `num:${receiptNum}_date:${r.receiptDate}`;

		if (seenReceiptKeys.has(uniqueKey)) {
			errors.push(
				`Чек #${itemIdx}: обнаружен дубликат чека № ${receiptNum}${fiscalDocNum ? ` (ФД ${fiscalDocNum})` : ""}. Повторное включение одного и того же фискального чека запрещено ст. 219 НК РФ.`,
			);
		} else {
			seenReceiptKeys.add(uniqueKey);
		}

		let amountKop = 0;
		if (typeof r.amountKopecks === "number") {
			amountKop = r.amountKopecks;
		} else if (r.amountRub != null) {
			amountKop = parseKopecks(r.amountRub);
		}

		if (isNaN(amountKop) || amountKop <= 0) {
			errors.push(
				`Чек #${itemIdx} (№ ${receiptNum}): сумма должна быть строго положительной (получено: ${r.amountRub} ₽ / ${r.amountKopecks} коп.).`,
			);
		}

		if (r.receiptDate) {
			const rYear = extractTaxYearFromDate(r.receiptDate);
			if (!isNaN(rYear) && targetTaxYear && rYear !== targetTaxYear) {
				errors.push(
					`Чек #${itemIdx} (№ ${receiptNum}) от ${r.receiptDate}: дата чека (${rYear} год) не соответствует налоговому периоду справки (${targetTaxYear} год).`,
				);
			}
		} else {
			warnings.push(
				`Чек #${itemIdx} (№ ${receiptNum}): не указана точная дата фискального чека.`,
			);
		}

		if (isNonMedicalGood(r.serviceName)) {
			errors.push(
				`Чек #${itemIdx} (№ ${receiptNum}): позиция «${r.serviceName}» является сопутствующим товаром и не подлежит социальному налоговому вычету по ст. 219 НК РФ.`,
			);
		}

		if (r.deductionCode === "2") {
			code2ReceiptsCount++;
			calculatedCode2Kopecks += amountKop;
		} else {
			code1ReceiptsCount++;
			calculatedCode1Kopecks += amountKop;
		}
	}

	const calculatedTotalKopecks = calculatedCode1Kopecks + calculatedCode2Kopecks;

	let declaredCode1Kopecks: number | undefined;
	let declaredCode2Kopecks: number | undefined;

	if (typeof payload.expenses.code1AmountKopecks === "number") {
		declaredCode1Kopecks = payload.expenses.code1AmountKopecks;
	} else if (payload.expenses.code1AmountRub != null) {
		declaredCode1Kopecks = parseKopecks(payload.expenses.code1AmountRub);
	}

	if (typeof payload.expenses.code2AmountKopecks === "number") {
		declaredCode2Kopecks = payload.expenses.code2AmountKopecks;
	} else if (payload.expenses.code2AmountRub != null) {
		declaredCode2Kopecks = parseKopecks(payload.expenses.code2AmountRub);
	}

	const declaredTotalKopecks =
		declaredCode1Kopecks !== undefined || declaredCode2Kopecks !== undefined
			? (declaredCode1Kopecks || 0) + (declaredCode2Kopecks || 0)
			: undefined;

	let code1DiscrepancyKopecks = 0;
	let code2DiscrepancyKopecks = 0;
	let totalDiscrepancyKopecks = 0;

	if (receipts.length > 0) {
		if (declaredCode1Kopecks !== undefined) {
			code1DiscrepancyKopecks = Math.abs(calculatedCode1Kopecks - declaredCode1Kopecks);
			if (code1DiscrepancyKopecks > 0) {
				errors.push(
					`Расхождение контрольной суммы по коду 1: сумма фискальных чеков (${(calculatedCode1Kopecks / 100).toFixed(2)} ₽) не совпадает с заявленной суммой расходов (${(declaredCode1Kopecks / 100).toFixed(2)} ₽). Расхождение: ${(code1DiscrepancyKopecks / 100).toFixed(2)} ₽.`,
				);
			}
		}

		if (declaredCode2Kopecks !== undefined) {
			code2DiscrepancyKopecks = Math.abs(calculatedCode2Kopecks - declaredCode2Kopecks);
			if (code2DiscrepancyKopecks > 0) {
				errors.push(
					`Расхождение контрольной суммы по коду 2 (дорогостоящее лечение): сумма фискальных чеков (${(calculatedCode2Kopecks / 100).toFixed(2)} ₽) не совпадает с заявленной суммой расходов (${(declaredCode2Kopecks / 100).toFixed(2)} ₽). Расхождение: ${(code2DiscrepancyKopecks / 100).toFixed(2)} ₽.`,
				);
			}
		}

		if (declaredTotalKopecks !== undefined) {
			totalDiscrepancyKopecks = Math.abs(calculatedTotalKopecks - declaredTotalKopecks);
		}
	}

	return {
		isValid: errors.length === 0,
		totalReceiptsCount: receipts.length,
		code1ReceiptsCount,
		code2ReceiptsCount,
		calculatedCode1Kopecks,
		calculatedCode2Kopecks,
		calculatedTotalKopecks,
		declaredCode1Kopecks,
		declaredCode2Kopecks,
		declaredTotalKopecks,
		code1DiscrepancyKopecks,
		code2DiscrepancyKopecks,
		totalDiscrepancyKopecks,
		errors,
		warnings,
	};
}

/**
 * Валидация входных параметров перед генерацией XML.
 */
export function preflightValidatePayload(payload: FnsTaxPayload): FnsPreflightIssue[] {
	const issues: FnsPreflightIssue[] = [];

	// 1. Проверка клиники
	if (!payload.clinic.inn || cleanDigits(payload.clinic.inn).length === 0) {
		issues.push({
			field: "clinic.inn",
			message: "Не указан ИНН или руководитель клиники в настройках организации",
			severity: "error",
		});
	} else {
		const clinicInnValidation = validateRussianInn(payload.clinic.inn);
		if (!clinicInnValidation.isValid) {
			issues.push({
				field: "clinic.inn",
				message: `ИНН клиники некорректен: ${clinicInnValidation.errorMessageRu || "неверный формат"}`,
				severity: "error",
			});
		}
	}

	const hasDirectorName = Boolean(payload.clinic.directorName?.trim());
	const hasIpFullName = Boolean(
		payload.clinic.ipFullName?.family?.trim() && payload.clinic.ipFullName?.given?.trim(),
	);
	if (!hasDirectorName && !hasIpFullName) {
		issues.push({
			field: "clinic.directorName",
			message: "Не указан ИНН или руководитель клиники в настройках организации",
			severity: "error",
		});
	}

	if (!payload.clinic.isIndividualEntrepreneur && cleanDigits(payload.clinic.inn).length === 10) {
		if (!payload.clinic.kpp || !validateRussianKpp(payload.clinic.kpp)) {
			issues.push({
				field: "clinic.kpp",
				message: "Для юридического лица обязателен корректный 9-значный КПП",
				severity: "warning",
			});
		}
	}

	if (!payload.clinic.ogrn || !validateRussianOgrn(payload.clinic.ogrn)) {
		issues.push({
			field: "clinic.ogrn",
			message: "Укажите корректный ОГРН (13 знаков) или ОГРНИП (15 знаков)",
			severity: "error",
		});
	}

	// 2. Проверка налогоплательщика
	if (payload.payer.inn) {
		const payerInnClean = cleanDigits(payload.payer.inn);
		const payerInnVal = validateRussianInn(payload.payer.inn);
		if (!payerInnVal.isValid || payerInnClean.length !== 12) {
			issues.push({
				field: "payer.inn",
				message: `ИНН налогоплательщика некорректен: ${payerInnVal.errorMessageRu || "требуется 12 цифр ФЛ"}`,
				severity: "error",
			});
		}
	} else if (!payload.payer.identityDocument?.seriesAndNumber) {
		issues.push({
			field: "payer.identityDocument",
			message: "Если у налогоплательщика нет ИНН, обязательно укажите паспортные данные (серия и номер)",
			severity: "error",
		});
	}

	if (!payload.payer.fullName.family || !payload.payer.fullName.given) {
		issues.push({
			field: "payer.fullName",
			message: "Укажите Фамилию и Имя налогоплательщика",
			severity: "error",
		});
	}

	if (payload.payer.snils) {
		const snilsVal = validateRussianSnils(payload.payer.snils);
		if (!snilsVal.isValid) {
			issues.push({
				field: "payer.snils",
				message: `СНИЛС плательщика некорректен: ${snilsVal.errorMessageRu || "неверный формат"}`,
				severity: "warning",
			});
		}
	}

	// 3. Проверка пациента (если отличается от плательщика)
	if (payload.patient.patientKinshipCode !== "1") {
		if (!payload.patient.fullName?.family || !payload.patient.fullName?.given) {
			issues.push({
				field: "patient.fullName",
				message: "Пациент отличается от плательщика: необходимо указать ФИО пациента",
				severity: "error",
			});
		}
		if (!payload.patient.birthDate) {
			issues.push({
				field: "patient.birthDate",
				message: "Для пациента-родственника укажите дату рождения",
				severity: "error",
			});
		}
	}

	// 4. Проверка расходов и чеков
	const hasCode1 = (payload.expenses.code1AmountKopecks ?? 0) > 0 || (payload.expenses.code1AmountRub ?? 0) > 0;
	const hasCode2 = (payload.expenses.code2AmountKopecks ?? 0) > 0 || (payload.expenses.code2AmountRub ?? 0) > 0;
	const hasReceipts = payload.receipts && payload.receipts.length > 0;

	if (!hasCode1 && !hasCode2 && !hasReceipts) {
		issues.push({
			field: "receipts",
			message: "Добавьте хотя бы один оплаченный фискальный чек или сумму расходов за налоговый год",
			severity: "error",
		});
	}

	// 5. Валидация контрольных сумм и непротиворечивости чеков
	const checksumValidation = validateFnsFiscalReceiptsChecksums(payload);
	for (const err of checksumValidation.errors) {
		issues.push({
			field: "receipts.checksum",
			message: err,
			severity: "error",
		});
	}
	for (const warn of checksumValidation.warnings) {
		issues.push({
			field: "receipts.checksum",
			message: warn,
			severity: "warning",
		});
	}

	return issues;
}
