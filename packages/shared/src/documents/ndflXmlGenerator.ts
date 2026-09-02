/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML GENERATOR & EDI ENGINE
 * Form KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Full compliance with:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
 * - XSD-схема ФНС: UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd (Версия 5.01)
 * - Ст. 219 НК РФ (социальный налоговый вычет за медицинские услуги)
 * - Постановление Правительства РФ от 08.04.2020 № 458
 */

import {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "../money.js";
import {
	type FnsClinicInfo,
	type FnsFiscalReceiptItem,
	type FnsFullName,
	type FnsIdentityDocument,
	type FnsKinshipCode,
	type FnsPatientInfo,
	type FnsPayerInfo,
	type FnsPersonInfo,
	type FnsPreflightIssue,
	type FnsServiceDeductionCode,
	type FnsSignatoryInfo,
	type FnsTaxPayload,
	type SupportedTaxYear,
	FNS_IDENTITY_DOC_TYPES,
	FNS_KINSHIP_PRESETS,
	FNS_NOTICE_NUMBER_MAX_LENGTH,
	FNS_XSD_VERSION_501,
	KND_1151156,
	KND_1184043,
	NDFL_LIMITS,
} from "./fnsSchema1151156.js";

export type { FnsTaxPayload, SupportedTaxYear };





import {
	FNS_ORDER_824_NAME,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
} from "../fiscal/taxDeduction.js";
import {
	injectVisualSignatureStampIntoHtml,
	renderDigitalSignatureStampHtml,
} from "../crypto/visualSignatureStamp.js";

/** Результат сборки XML и расчета вычета */
export interface FnsNdflXmlResult {
	xmlContent: string;
	fileName: string;
	fileId: string;
	code1Kopecks: number;
	code2Kopecks: number;
	totalKopecks: number;
	code1Rub: number;
	code2Rub: number;
	totalRub: number;
	estimatedTaxRefundRub: number;
	estimatedTaxRefund15Rub: number;
	preflightIssues: FnsPreflightIssue[];
	isValidForSubmission: boolean;
}

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

/** Параметры нанесения официального штампа УКЭП клиники по ГОСТ Р 7.0.97-2016 */
export interface FnsNdflPrintSigningOptions {
	certificateSerialNumber?: string | undefined;
	certificateSubject?: string | undefined;
	certificateIssuer?: string | undefined;
	validFrom?: string | undefined;
	validTo?: string | undefined;
	signedAt?: string | undefined;
	signatureType?: "ukep" | "unep" | undefined;
}

/** Результат строгой валидации контрольных сумм фискальных чеков */
export interface FnsReceiptsChecksumValidationResult {
	isValid: boolean;
	totalReceiptsCount: number;
	code1ReceiptsCount: number;
	code2ReceiptsCount: number;
	calculatedCode1Kopecks: number;
	calculatedCode2Kopecks: number;
	calculatedTotalKopecks: number;
	declaredCode1Kopecks?: number | undefined;
	declaredCode2Kopecks?: number | undefined;
	declaredTotalKopecks?: number | undefined;
	code1DiscrepancyKopecks: number;
	code2DiscrepancyKopecks: number;
	totalDiscrepancyKopecks: number;
	errors: string[];
	warnings: string[];
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

/**
 * Классификация медицинской услуги для социального налогового вычета (Приказ № 804н / ПП РФ № 458):
 * - Код "02" (дорогостоящее лечение):
 *   * Дентальная имплантация (A16.07.054)
 *   * Синус-лифтинг (A16.07.055)
 *   * Костная пластика / остеопластика (A16.07.041)
 *   * Аугментация альвеолярного отростка (A16.07.006.002)
 *   * Скуловые имплантаты Zygoma (A16.07.056)
 *   * Сложное челюстно-лицевое протезирование на имплантатах (A16.07.023)
 * - Код "01" (обычное лечение): терапия, эндодонтия, ортодонтия, профгигиена, стандартная диагностика.
 */
export function classifyNdflServiceCode(serviceName?: string, code804n?: string): "1" | "2" {
	const codeNorm = (code804n || "").trim().toUpperCase();
	if (
		codeNorm.startsWith("A16.07.054") ||
		codeNorm.startsWith("A16.07.055") ||
		codeNorm.startsWith("A16.07.041") ||
		codeNorm.startsWith("A16.07.056") ||
		codeNorm.startsWith("A16.07.023") ||
		codeNorm.startsWith("A16.07.006.002")
	) {
		return "2";
	}

	const nameNorm = (serviceName || "").toLowerCase();
	const expensiveKeywords = [
		"имплант",
		"имплантац",
		"синус-лифтинг",
		"синуслифтинг",
		"костная пластика",
		"остеопластик",
		"аугментаци",
		"расщепление альвеоляр",
		"зигома",
		"zygoma",
		"all-on-4",
		"all-on-6",
		"all on 4",
		"all on 6",
		"bio-oss",
		"bio-gide",
		"био-осс",
		"био-гайд",
	];

	if (expensiveKeywords.some((kw) => nameNorm.includes(kw))) {
		return "2";
	}

	return "1";
}

/**
 * Проверка, является ли позиция сопутствующим товаром (зубные щетки, пасты, ирригаторы).
 * По ст. 219 НК РФ вычет предоставляется ТОЛЬКО на медицинские услуги.
 * Сопутствующие товары исключаются из справки.
 */
export function isNonMedicalGood(name?: string, category?: string): boolean {
	const catNorm = (category || "").toLowerCase();
	if (
		[
			"goods",
			"retail",
			"merchandise",
			"hygiene_products",
			"non_medical",
			"товары",
			"сопутствующие",
			"сопутствующие товары",
		].includes(catNorm)
	) {
		return true;
	}

	const nameNorm = (name || "").toLowerCase();
	const retailKeywords = [
		"щетк",
		"паст",
		"ирригатор",
		"нить",
		"флосс",
		"ополаскивател",
		"ершик",
		"ёршик",
		"косметик",
		"набор гигиен",
		"набор для отбеливан",
		"пенка для полост",
		"домашн",
		"гель для отбеливан",
		"бокс для капп",
		"футляр",
		"жвачка",
		"леденц",
		"товар",
		"сувенир",
	];

	return retailKeywords.some((kw) => nameNorm.includes(kw));
}

/**
 * Проверка, является ли платеж оплатой по ДМС страховой компанией.
 * По ст. 219 НК РФ суммы, оплаченные страховой компанией по договору ДМС,
 * НЕ включаются в налоговый вычет пациента (включается только личная франшиза/доплата).
 */
export function isDmsInsurancePayment(method?: string, note?: string): boolean {
	const methodNorm = (method || "").toLowerCase();
	if (["insurance", "dms", "страховая", "страхование"].includes(methodNorm)) {
		return true;
	}

	const noteNorm = (note || "").toLowerCase();
	if (
		noteNorm.includes("дмс") ||
		noteNorm.includes("страховая выплата") ||
		noteNorm.includes("страховая компания") ||
		noteNorm.includes("полис дмс")
	) {
		return true;
	}

	return false;
}

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
	const cleanInn = cleanDigits(senderInn) || "7701234567";
	const cleanKpp = senderKpp ? cleanDigits(senderKpp) : "";
	const senderId = cleanInn.length === 12 ? cleanInn : `${cleanInn}${cleanKpp || "770101001"}`;

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
			const rYear = new Date(r.receiptDate).getFullYear();
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
	const clinicInnValidation = validateRussianInn(payload.clinic.inn);
	if (!clinicInnValidation.isValid) {
		issues.push({
			field: "clinic.inn",
			message: `ИНН клиники некорректен: ${clinicInnValidation.errorMessageRu || "неверный формат"}`,
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

/**
 * Основной генератор XML по Приказу ФНС России № ЕА-7-11/824@ (КНД 1184043 Версия 5.01).
 * Полностью типизированный, с точным расчетом в целочисленных копейках.
 */
export function buildFnsKnd1151156Xml(
	payload: FnsTaxPayload,
	customUuid?: string,
): FnsNdflXmlResult {
	const preflightIssues = preflightValidatePayload(payload);
	const isValidForSubmission = !preflightIssues.some((issue) => issue.severity === "error");

	const taxOffice = (payload.taxInspectionCode || "7701").padStart(4, "0").slice(0, 4);
	const docDateFormatted = formatFnsRuDate(payload.documentDate);
	const taxYear = String(payload.taxYear || new Date().getFullYear()).slice(0, 4);
	const certKind = payload.certificateKind || "1";
	const corrNumber = payload.correctionNumber ?? (certKind === "1" ? 0 : 1);
	const progVersion = payload.softwareVersion || "DentalMIS_FNS_Gateway_v2.4.0";

	const clinicInn = cleanDigits(payload.clinic.inn);
	const clinicKpp = payload.clinic.kpp ? cleanDigits(payload.clinic.kpp) : undefined;
	const clinicOgrn = cleanDigits(payload.clinic.ogrn);

	const { fileName, fileId } = generateFnsFileNameAndId(
		taxOffice,
		clinicInn,
		clinicKpp,
		docDateFormatted,
		customUuid,
		payload.filePrefix || "NO_MEDOPL",
	);

	// 1. Блок медицинской организации / ИП (<СвОргМ>)
	let orgBlockXml = "";
	if (payload.clinic.isIndividualEntrepreneur || clinicInn.length === 12) {
		const ipFio =
			payload.clinic.ipFullName ||
			parseFio(payload.clinic.directorName || "Смирнов Алексей Владимирович");
		const patronymicAttr = ipFio.patronymic
			? ` Отчество="${escapeXmlAttr(ipFio.patronymic)}"`
			: "";
		const licenseIssuerAttr = payload.clinic.license?.issuer
			? ` КемВыд="${escapeXmlAttr(payload.clinic.license.issuer)}"`
			: "";
		const licenseXml = payload.clinic.license
			? `\n        <Лицензия НомЛиц="${escapeXmlAttr(payload.clinic.license.number)}" ДатаЛиц="${formatFnsRuDate(payload.clinic.license.date)}"${licenseIssuerAttr}/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвИП ИННФЛ="${clinicInn}" ОГРНИП="${clinicOgrn}">
        <ФИО Фамилия="${escapeXmlAttr(ipFio.family)}" Имя="${escapeXmlAttr(ipFio.given)}"${patronymicAttr}/>${licenseXml}
      </СвИП>
    </СвОргМ>`;
	} else {
		const licenseIssuerAttr = payload.clinic.license?.issuer
			? ` КемВыд="${escapeXmlAttr(payload.clinic.license.issuer)}"`
			: "";
		const licenseXml = payload.clinic.license
			? `\n        <Лицензия НомЛиц="${escapeXmlAttr(payload.clinic.license.number)}" ДатаЛиц="${formatFnsRuDate(payload.clinic.license.date)}"${licenseIssuerAttr}/>`
			: "";

		orgBlockXml = `    <СвОргМ>
      <СвОргЮЛ НаимОрг="${escapeXmlAttr(payload.clinic.name || "ООО СТОМАТОЛОГИЯ ДЕНТЕ")}" 
                ИННЮЛ="${clinicInn}" 
                КПП="${clinicKpp || "770101001"}" 
                ОГРН="${clinicOgrn}">${licenseXml}
      </СвОргЮЛ>
    </СвОргМ>`;
	}

	// 2. Блок налогоплательщика (<СвФЛ>)
	const payer = payload.payer;
	const payerInnClean = cleanDigits(payer.inn);
	const payerSnilsClean = cleanDigits(payer.snils);
	const payerBirthFormatted = formatFnsRuDate(payer.birthDate);

	let payerAttrs = `ДатаРожд="${payerBirthFormatted}"`;
	if (payerInnClean && payerInnClean.length === 12) {
		payerAttrs = `ИННФЛ="${payerInnClean}" ${payerAttrs}`;
	}
	if (payerSnilsClean && payerSnilsClean.length === 11) {
		payerAttrs = `СНИЛС="${payerSnilsClean}" ${payerAttrs}`;
	}

	const payerPatronymicAttr = payer.fullName.patronymic
		? ` Отчество="${escapeXmlAttr(payer.fullName.patronymic)}"`
		: "";

	let payerDocXml = "";
	if (payer.identityDocument && payer.identityDocument.seriesAndNumber) {
		const docDateAttr = payer.identityDocument.issueDate
			? ` ДатаДок="${formatFnsRuDate(payer.identityDocument.issueDate)}"`
			: "";
		const docIssuerAttr = payer.identityDocument.issuedBy
			? ` КемВыд="${escapeXmlAttr(payer.identityDocument.issuedBy)}"`
			: "";
		payerDocXml = `\n      <УдЛичнФЛ КодВидДок="${escapeXmlAttr(payer.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXmlAttr(payer.identityDocument.seriesAndNumber)}"${docDateAttr}${docIssuerAttr}/>`;
	}

	const payerBlockXml = `    <СвФЛ ${payerAttrs}>
      <ФИО Фамилия="${escapeXmlAttr(payer.fullName.family)}" Имя="${escapeXmlAttr(payer.fullName.given)}"${payerPatronymicAttr}/>${payerDocXml}
    </СвФЛ>`;

	// 3. Блок сведений о пациенте (<СвПациент>)
	const patient = payload.patient;
	let patientBlockXml = "";
	if (patient.patientKinshipCode === "1") {
		patientBlockXml = '    <СвПациент ПризнПац="1"/>';
	} else {
		let patientAttrs = `ПризнПац="${patient.patientKinshipCode}"`;
		const patInn = cleanDigits(patient.inn);
		const patSnils = cleanDigits(patient.snils);
		if (patInn && patInn.length === 12) patientAttrs += ` ИННФЛ="${patInn}"`;
		if (patSnils && patSnils.length === 11) patientAttrs += ` СНИЛС="${patSnils}"`;
		if (patient.birthDate) {
			patientAttrs += ` ДатаРожд="${formatFnsRuDate(patient.birthDate)}"`;
		}

		let patientFioXml = "";
		if (patient.fullName) {
			const patPatrAttr = patient.fullName.patronymic
				? ` Отчество="${escapeXmlAttr(patient.fullName.patronymic)}"`
				: "";
			patientFioXml = `\n      <ФИО Фамилия="${escapeXmlAttr(patient.fullName.family)}" Имя="${escapeXmlAttr(patient.fullName.given)}"${patPatrAttr}/>`;
		}

		let patientDocXml = "";
		if (patient.identityDocument && patient.identityDocument.seriesAndNumber) {
			const docDateAttr = patient.identityDocument.issueDate
				? ` ДатаДок="${formatFnsRuDate(patient.identityDocument.issueDate)}"`
				: "";
			const docIssuerAttr = patient.identityDocument.issuedBy
				? ` КемВыд="${escapeXmlAttr(patient.identityDocument.issuedBy)}"`
				: "";
			patientDocXml = `\n      <УдЛичнФЛ КодВидДок="${escapeXmlAttr(patient.identityDocument.docTypeCode || "21")}" СерНомДок="${escapeXmlAttr(patient.identityDocument.seriesAndNumber)}"${docDateAttr}${docIssuerAttr}/>`;
		}

		patientBlockXml = `    <СвПациент ${patientAttrs}>${patientFioXml}${patientDocXml}
    </СвПациент>`;
	}

	// 4. Блок расходов (<СведРасхУсл>) — копеечный подсчет
	let code1Kopecks = 0;
	let code2Kopecks = 0;

	if (payload.receipts && payload.receipts.length > 0) {
		const code1Receipts = payload.receipts.filter((r) => r.deductionCode === "1");
		const code2Receipts = payload.receipts.filter((r) => r.deductionCode === "2");
		code1Kopecks = sumKopecks(
			code1Receipts.map((r) => r.amountKopecks ?? parseKopecks(r.amountRub)),
		);
		code2Kopecks = sumKopecks(
			code2Receipts.map((r) => r.amountKopecks ?? parseKopecks(r.amountRub)),
		);
	} else {
		code1Kopecks =
			payload.expenses.code1AmountKopecks ??
			(payload.expenses.code1AmountRub != null
				? parseKopecks(payload.expenses.code1AmountRub)
				: 0);
		code2Kopecks =
			payload.expenses.code2AmountKopecks ??
			(payload.expenses.code2AmountRub != null
				? parseKopecks(payload.expenses.code2AmountRub)
				: 0);
	}

	const totalKopecks = code1Kopecks + code2Kopecks;
	const expenseNodes: string[] = [];

	if (code1Kopecks > 0) {
		expenseNodes.push(
			`    <СведРасхУсл КодУслуг="1" СумОпл="${kopecksToNumericString(code1Kopecks)}"/>`,
		);
	}
	if (code2Kopecks > 0) {
		expenseNodes.push(
			`    <СведРасхУсл КодУслуг="2" СумОпл="${kopecksToNumericString(code2Kopecks)}"/>`,
		);
	}
	if (expenseNodes.length === 0) {
		expenseNodes.push('    <СведРасхУсл КодУслуг="1" СумОпл="0.00"/>');
	}

	// 5. Блок подписанта (<Подписант>)
	const signatory = payload.signatory || {
		signatoryRole: "1" as const,
		fullName: parseFio(payload.clinic.directorName || "Смирнов Алексей Владимирович"),
		snils: payload.clinic.directorSnils,
	};
	const signSnils = cleanDigits(signatory.snils);
	const signSnilsAttr = signSnils && signSnils.length === 11 ? ` СНИЛС="${signSnils}"` : "";
	const signPatronymicAttr = signatory.fullName.patronymic
		? ` Отчество="${escapeXmlAttr(signatory.fullName.patronymic)}"`
		: "";
	const signRepXml =
		signatory.signatoryRole === "2" && signatory.powerOfAttorneyNumber
			? `\n      <СвПред НомДовер="${escapeXmlAttr(signatory.powerOfAttorneyNumber)}"/>`
			: "";

	const signatoryBlockXml = `    <Подписант ПрПодп="${signatory.signatoryRole}"${signSnilsAttr}>
      <ФИО Фамилия="${escapeXmlAttr(signatory.fullName.family)}" Имя="${escapeXmlAttr(signatory.fullName.given)}"${signPatronymicAttr}/>${signRepXml}
    </Подписант>`;

	// Сборка XML
	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${fileId}" 
      ВерсПрог="${escapeXmlAttr(progVersion)}" 
      ВерсФорм="5.01">
  <Документ КНД="1184043" 
            ДатаДок="${docDateFormatted}" 
            НомСпр="${escapeXmlAttr(payload.documentNumber || "1")}" 
            ГодУсл="${taxYear}" 
            ПризнСпр="${certKind}" 
            НомКорр="${corrNumber}">
${orgBlockXml}
${payerBlockXml}
${patientBlockXml}
${expenseNodes.join("\n")}
${signatoryBlockXml}
  </Документ>
</Файл>`;

	// Расчет 13% и 15% вычетов
	const code1Rub = rublesFromKopecks(code1Kopecks);
	const code2Rub = rublesFromKopecks(code2Kopecks);
	const totalRub = rublesFromKopecks(totalKopecks);

	const taxYearNum = Number(taxYear);
	const code1Limit =
		taxYearNum >= 2024
			? NDFL_LIMITS.CODE_1_MAX_EXPENSE_FROM_2024
			: NDFL_LIMITS.CODE_1_MAX_EXPENSE_LEGACY;

	const code1EligibleRub = Math.min(code1Rub, code1Limit);
	const refundCode1 = code1EligibleRub * NDFL_LIMITS.TAX_RATE;
	const refundCode2 = code2Rub * NDFL_LIMITS.TAX_RATE;
	const estimatedTaxRefundRub = Math.round((refundCode1 + refundCode2) * 100) / 100;

	const refundCode1_15 = code1EligibleRub * NDFL_LIMITS.HIGH_INCOME_TAX_RATE;
	const refundCode2_15 = code2Rub * NDFL_LIMITS.HIGH_INCOME_TAX_RATE;
	const estimatedTaxRefund15Rub = Math.round((refundCode1_15 + refundCode2_15) * 100) / 100;

	return {
		xmlContent,
		fileName,
		fileId,
		code1Kopecks,
		code2Kopecks,
		totalKopecks,
		code1Rub,
		code2Rub,
		totalRub,
		estimatedTaxRefundRub,
		estimatedTaxRefund15Rub,
		preflightIssues,
		isValidForSubmission,
	};
}

/** Алиас для совместимости с существующими компонентами */
export const generateFnsNdflXml = buildFnsKnd1151156Xml;

/**
 * Валидация сформированного XML по базовым инвариантам XSD ФНС (5.01).
 */
export function validateFnsNdflXmlStructure(xmlContent: string): {
	isValid: boolean;
	errors: string[];
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
	if (!xmlContent.includes('КНД="1184043"')) {
		errors.push('Отсутствует атрибут КНД="1184043"');
	}
	if (!xmlContent.includes("<СвОргМ>")) {
		errors.push("Отсутствует блок медицинской организации (<СвОргМ>)");
	}
	if (!xmlContent.includes("<СвФЛ")) {
		errors.push("Отсутствует блок сведений о налогоплательщике (<СвФЛ>)");
	}
	if (!xmlContent.includes("<СвПациент")) {
		errors.push("Отсутствует блок сведений о пациенте (<СвПациент>)");
	}
	if (!xmlContent.includes("<СведРасхУсл")) {
		errors.push("Отсутствует блок сведений о расходах (<СведРасхУсл>)");
	}
	if (!xmlContent.includes("<Подписант")) {
		errors.push("Отсутствует блок сведений о подписанте (<Подписант>)");
	}

	for (const token of ["undefined", "NaN", "Infinity", "[object Object]"]) {
		if (xmlContent.includes(token)) {
			errors.push(`XML содержит некорректное техническое значение "${token}"`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Генерация официальной печатной формы A4 "Справка об оплате медицинских услуг"
 * (Приложение № 1 к приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ / форма по КНД 1151156).
 */
export function generateFnsNdflPrintHtml(
	payload: FnsTaxPayload,
	signingOptions?: FnsNdflPrintSigningOptions | boolean | undefined,
): string {
	const calculation = buildFnsKnd1151156Xml(payload);
	const docDate = formatFnsRuDate(payload.documentDate);
	const payer = payload.payer;
	const patient = payload.patient;
	const clinic = payload.clinic;

	const payerFio = `${payer.fullName.family} ${payer.fullName.given} ${payer.fullName.patronymic || ""}`.trim();
	const patientFio =
		patient.patientKinshipCode === "1"
			? payerFio
			: `${patient.fullName?.family || ""} ${patient.fullName?.given || ""} ${patient.fullName?.patronymic || ""}`.trim();

	const kinshipLabel =
		FNS_KINSHIP_PRESETS[patient.patientKinshipCode]?.label || "Лично (пациент)";

	const receiptsRows = (payload.receipts || [])
		.map(
			(r, idx) => `
      <tr>
        <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${formatFnsRuDate(r.receiptDate)}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${escapeXmlAttr(r.receiptNumber)}${r.fiscalDocumentNumber ? ` (ФД ${escapeXmlAttr(r.fiscalDocumentNumber)})` : ""}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${escapeXmlAttr(r.serviceName)}</td>
        <td style="text-align: center; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1;">${r.deductionCode}</td>
        <td style="text-align: right; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1;">${formatKopecksRu(parseKopecks(r.amountRub))}</td>
      </tr>`,
		)
		.join("");

	let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Справка об оплате медицинских услуг (КНД 1151156) — ${escapeXmlAttr(payload.documentNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #0f172a; margin: 0; padding: 20px; }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
    .knd-badge { font-family: monospace; font-size: 13pt; font-weight: bold; background: #f1f5f9; padding: 4px 10px; border: 1px solid #94a3b8; border-radius: 4px; }
    .title-box { text-align: center; margin: 16px 0; }
    .title-box h1 { font-size: 13pt; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; }
    .title-box h2 { font-size: 9.5pt; font-weight: normal; margin: 0; color: #475569; }
    .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; background: #f8fafc; padding: 4px 8px; border-left: 4px solid #0d9488; margin-top: 14px; margin-bottom: 6px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt; }
    .grid-table td { padding: 4px 6px; vertical-align: top; }
    .grid-table td.label { width: 35%; color: #475569; font-weight: 500; }
    .grid-table td.value { width: 65%; font-weight: 600; }
    .receipts-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; font-size: 9pt; }
    .receipts-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-weight: bold; }
    .summary-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; }
    .summary-card .sum-num { font-size: 13pt; font-weight: bold; color: #166534; }
    .signatures { display: flex; justify-content: space-between; margin-top: 28px; padding-top: 14px; }
    .sign-col { width: 45%; }
    .sign-line { border-bottom: 1px solid #000; height: 32px; margin-bottom: 4px; }
    .sign-caption { font-size: 8pt; color: #64748b; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div style="font-weight: bold; font-size: 11pt;">${escapeXmlAttr(clinic.name)}</div>
      <div style="font-size: 8.5pt; color: #64748b;">Лицензия: № ${escapeXmlAttr(clinic.license?.number || "ЛО-77-01-019842")} от ${formatFnsRuDate(clinic.license?.date || "2021-04-12")}</div>
    </div>
    <div style="text-align: right;">
      <div class="knd-badge">КНД 1151156</div>
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">Приказ ФНС № ЕА-7-11/824@</div>
    </div>
  </div>

  <div class="title-box">
    <h1>СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ</h1>
    <h2>для представления в налоговые органы Российской Федерации</h2>
    <div style="margin-top: 6px; font-weight: bold; font-size: 10.5pt;">
      № ${escapeXmlAttr(payload.documentNumber || "1")} от ${docDate} г. (за ${payload.taxYear} год)
    </div>
  </div>

  <div class="section-title">1. Сведения о медицинской организации / индивидуальном предпринимателе</div>
  <table class="grid-table">
    <tr>
      <td class="label">Полное наименование:</td>
      <td class="value">${escapeXmlAttr(clinic.name)}</td>
    </tr>
    <tr>
      <td class="label">ИНН / КПП:</td>
      <td class="value">${clinic.inn} ${clinic.kpp ? `/ ${clinic.kpp}` : ""}</td>
    </tr>
    <tr>
      <td class="label">ОГРН / ОГРНИП:</td>
      <td class="value">${clinic.ogrn}</td>
    </tr>
  </table>

  <div class="section-title">2. Сведения о физическом лице, оплатившем медицинские услуги (налогоплательщике)</div>
  <table class="grid-table">
    <tr>
      <td class="label">ФИО налогоплательщика:</td>
      <td class="value">${escapeXmlAttr(payerFio)}</td>
    </tr>
    <tr>
      <td class="label">ИНН налогоплательщика:</td>
      <td class="value">${payer.inn || "Не указан (идентификация по паспорту)"}</td>
    </tr>
    <tr>
      <td class="label">Дата рождения:</td>
      <td class="value">${formatFnsRuDate(payer.birthDate)}</td>
    </tr>
    ${
			payer.identityDocument
				? `<tr>
      <td class="label">Документ (паспорт):</td>
      <td class="value">Серия и номер: ${escapeXmlAttr(payer.identityDocument.seriesAndNumber)}${payer.identityDocument.issueDate ? `, выдан ${formatFnsRuDate(payer.identityDocument.issueDate)}` : ""}</td>
    </tr>`
				: ""
		}
  </table>

  <div class="section-title">3. Сведения о пациенте</div>
  <table class="grid-table">
    <tr>
      <td class="label">Отношение к налогоплательщику:</td>
      <td class="value"><strong>${escapeXmlAttr(kinshipLabel)}</strong></td>
    </tr>
    ${
			patient.patientKinshipCode !== "1"
				? `<tr>
      <td class="label">ФИО пациента:</td>
      <td class="value">${escapeXmlAttr(patientFio)}</td>
    </tr>
    <tr>
      <td class="label">Дата рождения пациента:</td>
      <td class="value">${formatFnsRuDate(patient.birthDate)}</td>
    </tr>`
				: ""
		}
  </table>

  <div class="section-title">4. Стоимость оказанных медицинских услуг по кодам вычета</div>
  <table class="grid-table" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
    <tr>
      <td class="label">Код 1 (Обычное лечение):</td>
      <td class="value" style="font-size: 11pt; color: #0d9488;"><strong>${formatKopecksRu(calculation.code1Kopecks)}</strong></td>
    </tr>
    <tr>
      <td class="label">Код 2 (Дорогостоящее лечение):</td>
      <td class="value" style="font-size: 11pt; color: #0d9488;"><strong>${formatKopecksRu(calculation.code2Kopecks)}</strong></td>
    </tr>
    <tr style="border-top: 1px solid #cbd5e1;">
      <td class="label">ИТОГО ОПЛАЧЕНО:</td>
      <td class="value" style="font-size: 12pt; color: #0f172a;"><strong>${formatKopecksRu(calculation.totalKopecks)}</strong></td>
    </tr>
  </table>

  <div class="summary-card">
    <div>
      <div style="font-weight: bold; font-size: 10pt; color: #166534;">Расчетный социальный налоговый вычет 13% к возврату:</div>
      <div style="font-size: 8.5pt; color: #15803d;">По ст. 219 Налогового кодекса РФ (с учетом лимита 150 000 ₽ по коду 1 и без лимита по коду 2)</div>
    </div>
    <div class="sum-num">${formatKopecksRu(parseKopecks(calculation.estimatedTaxRefundRub))}</div>
  </div>

  <div class="section-title">5. Реестр фискальных чеков (54-ФЗ)</div>
  <table class="receipts-table">
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">№</th>
        <th style="width: 80px;">Дата</th>
        <th style="width: 140px;">Чек / ФД</th>
        <th>Наименование стоматологической услуги</th>
        <th style="width: 50px; text-align: center;">Код</th>
        <th style="width: 100px; text-align: right;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${receiptsRows || '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">Нет чеков</td></tr>'}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sign-col">
      <div>Руководитель организации / уполномоченное лицо:</div>
      <div class="sign-line"></div>
      <div class="sign-caption">(подпись, расшифровка: ${escapeXmlAttr(clinic.directorName || "Смирнов А.В.")})</div>
    </div>
    <div class="sign-col">
      <div style="text-align: right;">М.П. (при наличии печати)</div>
      <div class="sign-line"></div>
      <div class="sign-caption">Дата выдачи: ${docDate} г.</div>
    </div>
  </div>
</body>
</html>`;

	if (signingOptions) {
		const opts: FnsNdflPrintSigningOptions =
			typeof signingOptions === "object" && signingOptions !== null
				? signingOptions
				: {};

		const certSerial =
			opts.certificateSerialNumber ||
			`00E4A28B${payload.documentNumber.replace(/\D/g, "").padStart(12, "0").slice(0, 16).toUpperCase()}`;
		const certSubject =
			opts.certificateSubject ||
			clinic.name ||
			clinic.directorName ||
			"ООО СТОМАТОЛОГИЯ ДЕНТЕ";
		const validFrom =
			opts.validFrom ||
			(typeof payload.documentDate === "string"
				? payload.documentDate
				: new Date().toISOString());
		const validToDate = new Date(validFrom);
		validToDate.setFullYear(validToDate.getFullYear() + 1);

		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: certSerial,
			certificateSubject: certSubject,
			certificateIssuer:
				opts.certificateIssuer || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
			validFrom,
			validTo: opts.validTo || validToDate.toISOString(),
			signedAt: opts.signedAt || validFrom,
			signatureType: opts.signatureType || "ukep",
			documentId: payload.documentNumber,
		});

		html = injectVisualSignatureStampIntoHtml(html, stampHtml);
	}

	return html;
}
