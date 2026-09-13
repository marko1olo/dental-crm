/**
 * DENTE Dental CRM — Tax Deduction Engine (Справка для налогового вычета КНД 1151156 & Реестр ФНС КНД 1184043).
 *
 * Fully compliant with:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156 / 1184043, Формат 5.01)
 * - Приказ Минздрава России от 13.10.2017 № 804н (Номенклатура медицинских услуг)
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Перечень дорогостоящих видов лечения)
 * - Налоговый кодекс РФ (ст. 219 НК РФ: годовой лимит 150 000 ₽ для Кода 01 с 2024 года, без ограничений для Кода 02)
 */

import { z } from "zod";
import { generateQrCodeSvg, generateQrCodeDataUri, type QrSvgOptions } from "../fiscal/qrGenerator.js";
import { generateCode128Svg, generateFnsFormKnd1151156BarcodeSvg, type Code128SvgOptions } from "../fiscal/barcodeGenerator.js";
import { escapeXml } from "../cda/c14n.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";
import { formatSnils, isValidSnils, normalizeSnils } from "../utils/snils.js";

/**
 * Нормативные константы регламента ФНС России № ЕА-7-11/824@
 */
export const FNS_ORDER_824_NAME = "Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@";
export const KND_CERTIFICATE_FORM = "1151156";
export const KND_REGISTRY_ELECTRONIC_FORMAT = "1184043";
export const FNS_FORMAT_VERSION_501 = "5.01";

/**
 * Годовой лимит социального налогового вычета по обычному лечению (Код 01)
 * - С 01.01.2024: 150 000 ₽ (ст. 219 НК РФ в ред. Федерального закона от 28.04.2023 № 159-ФЗ)
 * - До 01.01.2024: 120 000 ₽
 */
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 = 150000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024 = 120000;
export const ANNUAL_TAX_DEDUCTION_LIMIT_RUB = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024;

/**
 * Коды родства налогоплательщика и пациента по Приказу ФНС № ЕА-7-11/824@ (КНД 1151156).
 */
export type TaxDeductionRelationship = "patient" | "spouse" | "parent" | "child";

export const TAX_DEDUCTION_RELATIONSHIP_MAP: Record<
	TaxDeductionRelationship,
	{ code: string; labelRu: string; shortLabelRu: string; samePatientFlag: "1" | "0" }
> = {
	patient: {
		code: "1",
		labelRu: "Пациент (сам налогоплательщик)",
		shortLabelRu: "Лично (пациент)",
		samePatientFlag: "1",
	},
	spouse: {
		code: "2",
		labelRu: "Супруг / Супруга налогоплательщика",
		shortLabelRu: "Супруг(а)",
		samePatientFlag: "0",
	},
	parent: {
		code: "3",
		labelRu: "Родитель (мать / отец) налогоплательщика",
		shortLabelRu: "Родитель",
		samePatientFlag: "0",
	},
	child: {
		code: "4",
		labelRu: "Ребенок / подопечный (до 18/24 лет при очном обучении)",
		shortLabelRu: "Ребенок",
		samePatientFlag: "0",
	},
};

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
 * Номенклатура Минздрава 804н — Коды дорогостоящих медицинских услуг (Код 02)
 * согласно Перечню Постановления Правительства РФ от 08.04.2020 № 458.
 */
export const EXPENSIVE_TREATMENT_804N_CODES: readonly string[] = [
	// Дентальная имплантация
	"A16.07.054",      // Внутрикостная дентальная имплантация
	"A16.07.054.001",  // Внутрикостная дентальная имплантация системы имплантатов
	"A16.07.054.002",  // Установка мини-имплантата ортодонтического
	"A16.07.054.003",  // Базальная имплантация
	"A16.07.054.004",  // Скуловая имплантация (Zygoma)
	"A16.07.054.005",  // Установка формирователя десны
	"A16.07.054.006",  // Установка индивидуального абатмента

	// Костная пластика и остеопластика челюстно-лицевой области
	"A16.07.041",      // Костная пластика челюстно-лицевой области
	"A16.07.041.001",  // Костная пластика с использованием титановых сеток и мембран
	"A16.07.041.002",  // Синус-лифтинг (субантральная аугментация, закрытый)
	"A16.07.041.003",  // Синус-лифтинг (открытый)

	// Пластика альвеолярного отростка
	"A16.07.040",      // Пластика альвеолярного отростка
	"A16.07.040.001",  // Аугментация альвеолярного гребня костным блоком
	"A16.07.040.002",  // Пластика мягких тканей в области дентального имплантата

	// Реконструктивные операции на альвеолярной дуге и челюстях
	"A16.07.055",      // Реконструктивные операции на альвеолярной дуге
	"A16.07.055.001",  // Остеотомия и реконструкция верхней/нижней челюсти
	"A16.07.055.002",  // Реконструкция альвеолярного отростка с остеотомией
	"A16.07.096",      // Расщепление альвеолярного гребня (split-crest)
	"A16.07.097",      // Транспозиция нижнелуночкового нерва при имплантации

	// Ортопедическое лечение с опорой на имплантаты (п. 4 Постановления № 458)
	"A16.07.006.002",  // Протезирование зубного ряда с опорой на дентальные имплантаты
	"A16.07.006.003",  // Протезирование съемными протезами с опорой на имплантаты
	"A16.07.006.004",  // Протезирование условно-съемными протезами с балочной фиксацией на имплантатах
	"A16.07.004.004",  // Восстановление зуба коронкой с фиксацией на дентальном имплантате
];

/**
 * Определение кода медицинской услуги для налогового вычета (Код 01 vs Код 02)
 * по Номенклатуре Минздрава 804н и клиническому наименованию процедуры.
 */
export function resolveTaxDeductionCategoryShared(code804n?: string, serviceName?: string): "1" | "2" {
	if (code804n) {
		const trimmedCode = code804n.trim();
		if (EXPENSIVE_TREATMENT_804N_CODES.includes(trimmedCode)) {
			return "2";
		}
		// Проверка по префиксам имплантации/костной пластики/остеопластики
		if (
			trimmedCode.startsWith("A16.07.054") ||
			trimmedCode.startsWith("A16.07.041") ||
			trimmedCode.startsWith("A16.07.055") ||
			trimmedCode.startsWith("A16.07.096") ||
			trimmedCode.startsWith("A16.07.040")
		) {
			return "2";
		}
	}

	if (serviceName) {
		const lower = serviceName.toLowerCase();
		if (
			lower.includes("имплант") ||
			lower.includes("имплантат") ||
			lower.includes("имплантац") ||
			lower.includes("синус-лифтинг") ||
			lower.includes("синуслифтинг") ||
			lower.includes("субантральн") ||
			lower.includes("костная пластика") ||
			lower.includes("костной пластик") ||
			lower.includes("остеопластик") ||
			lower.includes("остеотоми") ||
			lower.includes("остеосинтез") ||
			lower.includes("аугментация") ||
			lower.includes("аугментаци") ||
			lower.includes("расщепление гребня") ||
			lower.includes("расщепление альвеолярного") ||
			lower.includes("реконструкция челюсти") ||
			lower.includes("реконструктивные операции") ||
			lower.includes("костный трансплантат") ||
			lower.includes("костный блок") ||
			lower.includes("костный материал") ||
			lower.includes("костная ткань") ||
			lower.includes("костная регенерация") ||
			lower.includes("нкр") ||
			lower.includes("мембрана bio-gide") ||
			lower.includes("bio-oss") ||
			lower.includes("био-осс") ||
			lower.includes("титановая сетка") ||
			lower.includes("титановая мембрана") ||
			lower.includes("коллагеновая мембрана") ||
			lower.includes("all-on-4") ||
			lower.includes("all-on-6") ||
			lower.includes("all-on-x") ||
			lower.includes("all on 4") ||
			lower.includes("all on 6") ||
			lower.includes("all on x") ||
			lower.includes("trefoil") ||
			lower.includes("zygoma") ||
			lower.includes("зигома") ||
			lower.includes("скулов") ||
			lower.includes("мультиюнит") ||
			lower.includes("multi-unit") ||
			lower.includes("multiunit") ||
			lower.includes("протезирование на имплант") ||
			lower.includes("протез на имплант") ||
			lower.includes("коронка на имплант") ||
			lower.includes("балочный протез")
		) {
			return "2";
		}
	}

	return "1";
}

/**
 * Классификация стоматологической услуги по Номенклатуре 804н и ст. 219 НК РФ:
 * Код 02: Дорогостоящее лечение (имплантация, синус-лифтинг, костная пластика)
 * Код 01: Стандартное лечение (терапия кариеса, пульпит, ортодонтия, гигиена).
 */
export function classifyTaxDeduction804n(code804n?: string, serviceName?: string): {
	categoryCode: "1" | "2";
	categoryNameRu: string;
	isExpensiveTreatment: boolean;
	hasAnnualLimit: boolean;
	statutoryLimitRub: number;
} {
	const code = resolveTaxDeductionCategoryShared(code804n, serviceName);
	if (code === "2") {
		return {
			categoryCode: "2",
			categoryNameRu: "Дорогостоящее лечение (дентальная имплантация, синус-лифтинг, костная пластика)",
			isExpensiveTreatment: true,
			hasAnnualLimit: false,
			statutoryLimitRub: Number.POSITIVE_INFINITY,
		};
	}
	return {
		categoryCode: "1",
		categoryNameRu: "Медицинские услуги (терапия кариеса, пульпит, ортодонтия, гигиена)",
		isExpensiveTreatment: false,
		hasAnnualLimit: true,
		statutoryLimitRub: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	};
}

export interface TaxDeductionPaymentItem {
	readonly id: string;
	readonly dateIso: string;
	readonly receiptNumber: string;
	readonly fiscalDocumentNumber: string;
	readonly fiscalSign: string;
	readonly serviceName: string;
	readonly code804n?: string | undefined;
	readonly amountRub: number;
	readonly amountKopecks?: number | undefined;
	readonly taxCode?: "1" | "2" | undefined;
	readonly payerRelationship?: TaxDeductionRelationship | undefined;
}

export interface TaxDeductionYearSummary {
	readonly taxYear: number;
	readonly code01Rub: number;
	readonly code01Kopecks: number;
	readonly code02Rub: number;
	readonly code02Kopecks: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly receiptsCount: number;
	readonly code01StatutoryLimitRub: number;
	readonly code01StatutoryLimitKopecks: number;
	readonly code01EligibleRub: number;
	readonly code01EligibleKopecks: number;
	readonly refund13EstimateRub: number;
	readonly refund13EstimateKopecks: number;
	readonly refund15EstimateRub: number;
	readonly refund15EstimateKopecks: number;
}

export interface TaxDeductionCalculationResult {
	readonly yearsSummary: readonly TaxDeductionYearSummary[];
	readonly grandTotalCode01Rub: number;
	readonly grandTotalCode01Kopecks: number;
	readonly grandTotalCode02Rub: number;
	readonly grandTotalCode02Kopecks: number;
	readonly grandTotalRub: number;
	readonly grandTotalKopecks: number;
	readonly grandTotalRefund13Rub: number;
	readonly grandTotalRefund13Kopecks: number;
	readonly grandTotalRefund15Rub: number;
	readonly grandTotalRefund15Kopecks: number;
	readonly totalReceiptsCount: number;
	readonly totalAmountInWordsRu: string;
}

/**
 * Расчет сумм по годам и категориям вычета (Код 01 / Код 02) с копеечной точностью.
 */
export function calculateTaxDeductionSummary(
	payments: readonly TaxDeductionPaymentItem[]
): TaxDeductionCalculationResult {
	const yearMap = new Map<
		number,
		{ code01Kop: number; code02Kop: number; count: number }
	>();

	for (const p of payments) {
		const year = new Date(p.dateIso).getFullYear();
		const cat = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
		const amountKop =
			typeof p.amountKopecks === "number" && Number.isFinite(p.amountKopecks)
				? Math.max(0, Math.round(p.amountKopecks))
				: Number.isFinite(p.amountRub)
					? Math.max(0, Math.round(p.amountRub * 100))
					: 0;

		const current = yearMap.get(year) || { code01Kop: 0, code02Kop: 0, count: 0 };
		if (cat === "2") {
			current.code02Kop += amountKop;
		} else {
			current.code01Kop += amountKop;
		}
		current.count += 1;
		yearMap.set(year, current);
	}

	const yearsSummary: TaxDeductionYearSummary[] = Array.from(yearMap.entries())
		.sort(([yA], [yB]) => yB - yA)
		.map(([taxYear, data]) => {
			const code01Rub = kopecksToRub(data.code01Kop);
			const code02Rub = kopecksToRub(data.code02Kop);
			const totalKopecks = data.code01Kop + data.code02Kop;
			const totalRub = kopecksToRub(totalKopecks);

			// Лимит социального вычета: 150 000 ₽ с 2024 года, 120 000 ₽ до 2024 года
			const statutoryLimitRub = taxYear >= 2024 ? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
			const statutoryLimitKopecks = statutoryLimitRub * 100;
			const code01EligibleKopecks = Math.min(data.code01Kop, statutoryLimitKopecks);
			const code01EligibleRub = kopecksToRub(code01EligibleKopecks);

			// Расчетный возврат 13% и 15% в целых копейках (по Коду 01 с лимитом, по Коду 02 без ограничений)
			const refund13EstimateKopecks = Math.round((code01EligibleKopecks * 13) / 100) + Math.round((data.code02Kop * 13) / 100);
			const refund15EstimateKopecks = Math.round((code01EligibleKopecks * 15) / 100) + Math.round((data.code02Kop * 15) / 100);
			const refund13EstimateRub = kopecksToRub(refund13EstimateKopecks);
			const refund15EstimateRub = kopecksToRub(refund15EstimateKopecks);

			return {
				taxYear,
				code01Rub,
				code01Kopecks: data.code01Kop,
				code02Rub,
				code02Kopecks: data.code02Kop,
				totalRub,
				totalKopecks,
				receiptsCount: data.count,
				code01StatutoryLimitRub: statutoryLimitRub,
				code01StatutoryLimitKopecks: statutoryLimitKopecks,
				code01EligibleRub: code01EligibleRub,
				code01EligibleKopecks: code01EligibleKopecks,
				refund13EstimateRub: refund13EstimateRub,
				refund13EstimateKopecks: refund13EstimateKopecks,
				refund15EstimateRub: refund15EstimateRub,
				refund15EstimateKopecks: refund15EstimateKopecks,
			};
		});

	let grandTotalCode01Kopecks = 0;
	let grandTotalCode02Kopecks = 0;
	let grandTotalRefund13Kopecks = 0;
	let grandTotalRefund15Kopecks = 0;
	let totalReceiptsCount = 0;

	for (const y of yearsSummary) {
		grandTotalCode01Kopecks += y.code01Kopecks;
		grandTotalCode02Kopecks += y.code02Kopecks;
		grandTotalRefund13Kopecks += y.refund13EstimateKopecks;
		grandTotalRefund15Kopecks += y.refund15EstimateKopecks;
		totalReceiptsCount += y.receiptsCount;
	}

	const grandTotalKopecks = grandTotalCode01Kopecks + grandTotalCode02Kopecks;

	return {
		yearsSummary,
		grandTotalCode01Rub: kopecksToRub(grandTotalCode01Kopecks),
		grandTotalCode01Kopecks,
		grandTotalCode02Rub: kopecksToRub(grandTotalCode02Kopecks),
		grandTotalCode02Kopecks,
		grandTotalRub: kopecksToRub(grandTotalKopecks),
		grandTotalKopecks,
		grandTotalRefund13Rub: kopecksToRub(grandTotalRefund13Kopecks),
		grandTotalRefund13Kopecks,
		grandTotalRefund15Rub: kopecksToRub(grandTotalRefund15Kopecks),
		grandTotalRefund15Kopecks,
		totalReceiptsCount,
		totalAmountInWordsRu: amountToWordsRu(grandTotalKopecks),
	};
}

/**
 * Перевод суммы в копейках в официальную сумму прописью на русском языке.
 * Пример: 15432050 -> "Сто пятьдесят четыре тысячи триста двадцать рублей 50 копеек"
 */
export function amountToWordsRu(kopecks: number): string {
	if (kopecks <= 0 || !Number.isFinite(kopecks)) return "Ноль рублей 00 копеек";

	const rub = Math.floor(kopecks / 100);
	const kop = Math.abs(kopecks % 100);

	const unitsM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
	const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

	function tripletToWords(n: number, isFemale: boolean): string {
		const h = Math.floor(n / 100);
		const rem = n % 100;
		const t = Math.floor(rem / 10);
		const u = rem % 10;

		const parts: string[] = [];
		if (h > 0) parts.push(hundreds[h]!);

		if (rem >= 10 && rem <= 19) {
			parts.push(teens[rem - 10]!);
		} else {
			if (t > 0) parts.push(tens[t]!);
			if (u > 0) parts.push(isFemale ? unitsF[u]! : unitsM[u]!);
		}

		return parts.join(" ");
	}

	function getDeclension(n: number, form1: string, form2: string, form5: string): string {
		const rem100 = Math.abs(n) % 100;
		const rem10 = rem100 % 10;
		if (rem100 >= 11 && rem100 <= 19) return form5;
		if (rem10 === 1) return form1;
		if (rem10 >= 2 && rem10 <= 4) return form2;
		return form5;
	}

	const parts: string[] = [];

	// Миллионы
	const millions = Math.floor(rub / 1000000);
	if (millions > 0) {
		const mStr = tripletToWords(millions, false);
		const decl = getDeclension(millions, "миллион", "миллиона", "миллионов");
		parts.push(`${mStr} ${decl}`);
	}

	// Тысячи
	const thousands = Math.floor((rub % 1000000) / 1000);
	if (thousands > 0) {
		const thStr = tripletToWords(thousands, true);
		const decl = getDeclension(thousands, "тысяча", "тысячи", "тысяч");
		parts.push(`${thStr} ${decl}`);
	}

	// Единицы рублей
	const unitsRub = rub % 1000;
	if (unitsRub > 0) {
		const uStr = tripletToWords(unitsRub, false);
		const decl = getDeclension(unitsRub, "рубль", "рубля", "рублей");
		parts.push(`${uStr} ${decl}`);
	} else if (parts.length === 0) {
		parts.push("ноль рублей");
	} else {
		const decl = getDeclension(rub, "рубль", "рубля", "рублей");
		parts.push(decl);
	}

	const rubText = parts.join(" ").trim();
	const capitalizedRub = rubText.charAt(0).toUpperCase() + rubText.slice(1);
	const kopStr = kop.toString().padStart(2, "0");
	const kopDecl = getDeclension(kop, "копейка", "копейки", "копеек");

	return `${capitalizedRub} ${kopStr} ${kopDecl}`;
}

export interface TaxDeductionClinicParams {
	readonly legalName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly licenseDate?: string | undefined;
	readonly address: string;
	readonly chiefDoctorName?: string | undefined;
	readonly isSoleProprietor?: boolean | undefined;
}

export interface TaxDeductionPersonParams {
	readonly fullName: string;
	readonly inn?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly identityDocumentSeries?: string | undefined;
	readonly identityDocumentNumber?: string | undefined;
	readonly identityDocumentIssuedBy?: string | undefined;
	readonly identityDocumentIssueDate?: string | undefined;
	readonly subdivisionCode?: string | undefined;
	readonly snils?: string | undefined;
}

export interface TaxDeductionCertificateParams {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly taxOfficeCode?: string | undefined;
	readonly clinic: TaxDeductionClinicParams;
	readonly payer: TaxDeductionPersonParams & {
		readonly relationship: TaxDeductionRelationship;
	};
	readonly patient: TaxDeductionPersonParams;
	readonly payments: readonly TaxDeductionPaymentItem[];
	readonly signer?: {
		readonly signerType?: "1" | "2" | undefined; // 1 = руководитель/ИП, 2 = представитель
		readonly fullName?: string | undefined;
		readonly authorityDoc?: string | undefined;
	} | undefined;
}

export interface TaxDeductionBatchParams {
	readonly batchId?: string | undefined;
	readonly taxYear: number;
	readonly taxOfficeCode: string;
	readonly clinic: TaxDeductionClinicParams;
	readonly certificates: readonly TaxDeductionCertificateParams[];
	readonly signer?: {
		readonly signerType?: "1" | "2" | undefined;
		readonly fullName?: string | undefined;
		readonly authorityDoc?: string | undefined;
	} | undefined;
}

/**
 * Генерация верификационного QR-кода для справки КНД 1151156 (Приказ 824@).
 * Содержит верификационный URL или структурированный payload для проверки налоговым инспектором.
 */
export function generateTaxCertificateQrPayload(params: TaxDeductionCertificateParams): string {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Kopecks: 0,
		code02Kopecks: 0,
		totalKopecks: 0,
	};

	const code01Str = (targetYear.code01Kopecks / 100).toFixed(2);
	const code02Str = (targetYear.code02Kopecks / 100).toFixed(2);
	const totalStr = (targetYear.totalKopecks / 100).toFixed(2);
	const issueDate = params.issueDateIso.slice(0, 10);

	// Официальный верификационный URI для налогового инспектора и ЛК ФНС
	return `https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=${encodeURIComponent(params.clinic.inn)}&cert=${encodeURIComponent(params.certificateNumber)}&date=${issueDate}&year=${params.taxYear}&payerInn=${encodeURIComponent(params.payer.inn || "")}&c1=${code01Str}&c2=${code02Str}&sum=${totalStr}`;
}

/**
 * Генерация SVG строки QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrSvg(
	params: TaxDeductionCertificateParams,
	options: QrSvgOptions = {}
): string {
	const payload = generateTaxCertificateQrPayload(params);
	return generateQrCodeSvg(payload, {
		size: options.size ?? 120,
		margin: options.margin ?? 2,
		title: options.title ?? `Справка КНД 1151156 № ${params.certificateNumber}`,
		...options,
	});
}

/**
 * Генерация base64 Data-URI QR-кода верификации справки КНД 1151156.
 */
export function generateTaxCertificateQrDataUri(
	params: TaxDeductionCertificateParams,
	options: QrSvgOptions = {}
): string {
	const payload = generateTaxCertificateQrPayload(params);
	return generateQrCodeDataUri(payload, {
		size: options.size ?? 120,
		margin: options.margin ?? 2,
		...options,
	});
}

/**
 * Генерация официального XML-файла реестра сведений для прямой отправки в ФНС по ТКС
 * (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@, КНД 1184043, Формат 5.01).
 */
export function generateFnsTaxDeductionXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Rub: 0,
		code01Kopecks: 0,
		code02Rub: 0,
		code02Kopecks: 0,
		totalRub: 0,
		totalKopecks: 0,
	};

	const relationshipInfo = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	const samePatientFlag = relationshipInfo.samePatientFlag;
	const taxOfficeCode = (params.taxOfficeCode || "7701").trim();
	const now = new Date();
	const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
	const randomSuffix =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
			: String(Date.now() % 100000000).padStart(8, "0");

	// Формат ИдФайл по Приказу 824@: VO_SPRRECH_КодНО_ИНН_ГГГГММДД_GUID
	const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
	const safeInn = String(params.clinic.inn || "").replace(/[^0-9]/g, "");
	const safeKpp = params.clinic.kpp ? `_${String(params.clinic.kpp).replace(/[^A-Za-z0-9]/g, "")}` : "";
	const clinicId = `${safeInn}${safeKpp}`;
	const fileId = `VO_SPRRECH_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
	const fileName = `${fileId}.xml`;

	const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
	const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
	const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);

	const issueDateFormatted = formatDateToRussian(params.issueDateIso);
	const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "";
	const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "";

	const signerType = params.signer?.signerType || "1";
	const signerName = params.signer?.fullName || params.clinic.chiefDoctorName || "Главный врач";

	// Чеки по 54-ФЗ за отчетный год
	const yearPayments = params.payments.filter(
		(p) => new Date(p.dateIso).getFullYear() === params.taxYear
	);

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсПрог="DENTE Dental CRM 2.0" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}">
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" КодНО="${escapeXml(taxOfficeCode)}" ОтчГод="${escapeXml(String(params.taxYear))}" НомКорр="0" ПоПруч="1">
    <СвНП ИННЮЛ="${escapeXml(params.clinic.inn)}" КПП="${escapeXml(params.clinic.kpp || "770101001")}" НаимОрг="${escapeXml(params.clinic.legalName)}" ОГРН="${escapeXml(params.clinic.ogrn || "")}">
      <Лицензия Номер="${escapeXml(params.clinic.licenseNumber || "")}" Дата="${escapeXml(params.clinic.licenseDate || "")}" />
    </СвНП>
    <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${params.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(params.signer.authorityDoc)}"` : ""} />
    <СведРасхУсл НомерСвед="${escapeXml(params.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" НомКорр="0" ПрПациент="${escapeXml(samePatientFlag)}">
      <НППлатМедУсл ФИО="${escapeXml(params.payer.fullName)}"${params.payer.inn ? ` ИННФЛ="${escapeXml(params.payer.inn)}"` : ""}${payerBirthDateFormatted ? ` ДатаРожд="${escapeXml(payerBirthDateFormatted)}"` : ""}>
        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml((params.payer.identityDocumentSeries || "") + " " + (params.payer.identityDocumentNumber || "")).trim()}" />
      </НППлатМедУсл>
      ${
				samePatientFlag === "0"
					? `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(relationshipInfo.code)}" />`
					: ""
			}
      <СуммаРасх ${targetYearSummary.code01Kopecks > 0 ? `СуммаКод1="${code01Str}"` : ""} ${targetYearSummary.code02Kopecks > 0 ? `СуммаКод2="${code02Str}"` : ""} СуммаВсего="${totalStr}">
        ${yearPayments
					.map(
						(pay, idx) =>
							`<ТаблРасх НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаВремяЧек="${escapeXml(pay.dateIso.slice(0, 10))}" СуммаЧек="${pay.amountRub.toFixed(2)}" КодУсл="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`
					)
					.join("\n        ")}
      </СуммаРасх>
    </СведРасхУсл>
  </Документ>
</Файл>`;

	return { fileName, fileId, xmlContent };
}

/**
 * Генерация пакетного XML-реестра сведений по нескольким справкам для прямой загрузки через ТКС
 * (Контур.Экстерн, СБИС, 1С-Отчетность, Такском, Калуга Астрал).
 */
export function generateFnsTaxDeductionBatchXml(batch: TaxDeductionBatchParams): {
	fileName: string;
	fileId: string;
	certificatesCount: number;
	xmlContent: string;
} {
	const taxOfficeCode = (batch.taxOfficeCode || "7701").trim();
	const now = new Date();
	const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
	const randomSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();

	const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
	const safeInn = String(batch.clinic.inn || "").replace(/[^0-9]/g, "");
	const safeKpp = batch.clinic.kpp ? `_${String(batch.clinic.kpp).replace(/[^A-Za-z0-9]/g, "")}` : "";
	const clinicId = `${safeInn}${safeKpp}`;
	const fileId = `VO_SPRRECH_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
	const fileName = `${fileId}.xml`;

	const signerType = batch.signer?.signerType || "1";
	const signerName = batch.signer?.fullName || batch.clinic.chiefDoctorName || "Главный врач";

	const recordsXml = batch.certificates
		.map((cert) => {
			const summary = calculateTaxDeductionSummary(cert.payments);
			const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === batch.taxYear) || {
				code01Rub: 0,
				code01Kopecks: 0,
				code02Rub: 0,
				code02Kopecks: 0,
				totalRub: 0,
				totalKopecks: 0,
			};

			const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[cert.payer.relationship];
			const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
			const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
			const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);

			const issueDateFormatted = formatDateToRussian(cert.issueDateIso);
			const payerBday = cert.payer.birthDate ? formatDateToRussian(cert.payer.birthDate) : "";
			const patientBday = cert.patient.birthDate ? formatDateToRussian(cert.patient.birthDate) : "";

			const yearPayments = cert.payments.filter(
				(p) => new Date(p.dateIso).getFullYear() === batch.taxYear
			);

			return `    <СведРасхУсл НомерСвед="${escapeXml(cert.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" НомКорр="0" ПрПациент="${escapeXml(rel.samePatientFlag)}">
      <НППлатМедУсл ФИО="${escapeXml(cert.payer.fullName)}"${cert.payer.inn ? ` ИННФЛ="${escapeXml(cert.payer.inn)}"` : ""}${payerBday ? ` ДатаРожд="${escapeXml(payerBday)}"` : ""}>
        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml((cert.payer.identityDocumentSeries || "") + " " + (cert.payer.identityDocumentNumber || "")).trim()}" />
      </НППлатМедУсл>
      ${
				rel.samePatientFlag === "0"
					? `<Пациент ФИО="${escapeXml(cert.patient.fullName)}"${patientBday ? ` ДатаРожд="${escapeXml(patientBday)}"` : ""}${cert.patient.inn ? ` ИННФЛ="${escapeXml(cert.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}" />`
					: ""
			}
      <СуммаРасх ${targetYearSummary.code01Kopecks > 0 ? `СуммаКод1="${code01Str}"` : ""} ${targetYearSummary.code02Kopecks > 0 ? `СуммаКод2="${code02Str}"` : ""} СуммаВсего="${totalStr}">
        ${yearPayments
					.map(
						(pay, idx) =>
							`<ТаблРасх НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаВремяЧек="${escapeXml(pay.dateIso.slice(0, 10))}" СуммаЧек="${pay.amountRub.toFixed(2)}" КодУсл="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`
					)
					.join("\n        ")}
      </СуммаРасх>
    </СведРасхУсл>`;
		})
		.join("\n");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсПрог="DENTE Dental CRM 2.0" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}">
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" КодНО="${escapeXml(taxOfficeCode)}" ОтчГод="${escapeXml(String(batch.taxYear))}" НомКорр="0" ПоПруч="1">
    <СвНП ИННЮЛ="${escapeXml(batch.clinic.inn)}" КПП="${escapeXml(batch.clinic.kpp || "770101001")}" НаимОрг="${escapeXml(batch.clinic.legalName)}" ОГРН="${escapeXml(batch.clinic.ogrn || "")}">
      <Лицензия Номер="${escapeXml(batch.clinic.licenseNumber || "")}" Дата="${escapeXml(batch.clinic.licenseDate || "")}" />
    </СвНП>
    <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${batch.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(batch.signer.authorityDoc)}"` : ""} />
${recordsXml}
  </Документ>
</Файл>`;

	return {
		fileName,
		fileId,
		certificatesCount: batch.certificates.length,
		xmlContent,
	};
}

export function formatDateToRussian(isoString: string): string {
	const d = new Date(isoString);
	if (Number.isNaN(d.getTime())) return isoString.slice(0, 10);
	const day = d.getDate().toString().padStart(2, "0");
	const month = (d.getMonth() + 1).toString().padStart(2, "0");
	const year = d.getFullYear().toString();
	return `${day}.${month}.${year}`;
}

/**
 * Генерация официального XML-файла реестра сведений в формате NO_MEDOPL 5.01 / КНД 1184043
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ для прямой отправки по ТКС.
 */
export function generateFnsNoMedoplXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Rub: 0,
		code01Kopecks: 0,
		code02Rub: 0,
		code02Kopecks: 0,
		totalRub: 0,
		totalKopecks: 0,
	};

	const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	const taxOfficeCode = (params.taxOfficeCode || "7701").trim();
	const now = new Date();
	const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
	const randomSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();

	// Каноническое имя файла ФНС: NO_MEDOPL_КодНО_ИННЮЛ+КПП_ГГГГММДД_N (санитизация для валидного имени файла)
	const safeTaxOffice = taxOfficeCode.replace(/[^A-Za-z0-9]/g, "");
	const safeInn = String(params.clinic.inn || "").replace(/[^0-9]/g, "");
	const safeKpp = params.clinic.kpp ? `_${String(params.clinic.kpp).replace(/[^A-Za-z0-9]/g, "")}` : "";
	const clinicId = `${safeInn}${safeKpp}`;
	const fileId = `NO_MEDOPL_${safeTaxOffice}_${clinicId}_${dateStamp}_${randomSuffix}`;
	const fileName = `${fileId}.xml`;

	const code01Str = (targetYearSummary.code01Kopecks / 100).toFixed(2);
	const code02Str = (targetYearSummary.code02Kopecks / 100).toFixed(2);
	const totalStr = (targetYearSummary.totalKopecks / 100).toFixed(2);

	const issueDateFormatted = formatDateToRussian(params.issueDateIso);
	const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "";
	const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "";

	const signerType = params.signer?.signerType || "1";
	const signerName = params.signer?.fullName || params.clinic.chiefDoctorName || "Главный врач";

	const yearPayments = params.payments.filter(
		(p) => new Date(p.dateIso).getFullYear() === params.taxYear
	);

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileId)}" ВерсФорм="${escapeXml(FNS_FORMAT_VERSION_501)}" ВерсПрог="DenteCRM 1.0">
  <СвНО КодНО="${escapeXml(taxOfficeCode)}" />
  <СвМО ИННЮЛ="${escapeXml(params.clinic.inn)}" КПП="${escapeXml(params.clinic.kpp || "770101001")}" НаимОрг="${escapeXml(params.clinic.legalName)}" ОГРН="${escapeXml(params.clinic.ogrn || "")}">
    <Лицензия Номер="${escapeXml(params.clinic.licenseNumber || "")}" Дата="${escapeXml(params.clinic.licenseDate || "")}" />
  </СвМО>
  <Подписант ПрПодп="${escapeXml(signerType)}" ФИО="${escapeXml(signerName)}"${params.signer?.authorityDoc ? ` ДокумПодтв="${escapeXml(params.signer.authorityDoc)}"` : ""} />
  <Документ КНД="${escapeXml(KND_REGISTRY_ELECTRONIC_FORMAT)}" ОтчГод="${escapeXml(String(params.taxYear))}" НомКорр="0">
    <СведСправка НомерСвед="${escapeXml(params.certificateNumber)}" ДатаСвед="${escapeXml(issueDateFormatted)}" ПрПациент="${escapeXml(rel.samePatientFlag)}">
      <СвФЛ ФИО="${escapeXml(params.payer.fullName)}"${params.payer.inn ? ` ИННФЛ="${escapeXml(params.payer.inn)}"` : ""}${payerBirthDateFormatted ? ` ДатаРожд="${escapeXml(payerBirthDateFormatted)}"` : ""}>
        <УдЛичнФЛ КодВидДок="21" СерНомДок="${escapeXml((params.payer.identityDocumentSeries || "") + " " + (params.payer.identityDocumentNumber || "")).trim()}" />
      </СвФЛ>
      ${
				rel.samePatientFlag === "0"
					? `<Пациент ФИО="${escapeXml(params.patient.fullName)}"${patientBirthDateFormatted ? ` ДатаРожд="${escapeXml(patientBirthDateFormatted)}"` : ""}${params.patient.inn ? ` ИННФЛ="${escapeXml(params.patient.inn)}"` : ""} КодРодств="${escapeXml(rel.code)}" />`
					: ""
			}
      <РасчетСумм>
        ${targetYearSummary.code01Kopecks > 0 ? `<СумОплМедУсл КодУслуги="1" СумОпл="${code01Str}" />` : ""}
        ${targetYearSummary.code02Kopecks > 0 ? `<СумОплМедУсл КодУслуги="2" СумОпл="${code02Str}" />` : ""}
        <СумОплВсего СумОпл="${totalStr}" />
      </РасчетСумм>
      <ДетализацияЧеков>
        ${yearPayments
					.map(
						(pay, idx) =>
							`<Чек НомЧек="${idx + 1}" НомФД="${escapeXml(pay.fiscalDocumentNumber || String(idx + 1))}" ФПД="${escapeXml(pay.fiscalSign || "")}" ДатаЧек="${escapeXml(pay.dateIso.slice(0, 10))}" Сумма="${pay.amountRub.toFixed(2)}" КодУслуги="${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}" />`
					)
					.join("\n        ")}
      </ДетализацияЧеков>
    </СведСправка>
  </Документ>
</Файл>`;

	return { fileName, fileId, xmlContent };
}

export interface FnsTaxCertificateValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
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
		(p) => new Date(p.dateIso).getFullYear() === params.taxYear,
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

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * BigInt-safe ruble to kopecks converter.
 */
export function rubToKopecksBigInt(rub: number | string): bigint {
	const numeric = typeof rub === "string" ? Number.parseFloat(rub) : rub;
	if (!Number.isFinite(numeric)) {
		return 0n;
	}
	return BigInt(Math.round(numeric * 100));
}

/**
 * BigInt-safe kopecks to rubles converter.
 */
export function kopecksBigIntToRub(kopecks: bigint): number {
	return Number(kopecks) / 100;
}

/**
 * Exact Tax Split breakdown using integer BigInt kopecks.
 */
export interface ExactTaxSplitKopecks {
	readonly code01Kopecks: bigint;
	readonly code01Rub: number;
	readonly code02Kopecks: bigint;
	readonly code02Rub: number;
	readonly totalKopecks: bigint;
	readonly totalRub: number;
	readonly code01StatutoryLimitKopecks: bigint;
	readonly code01StatutoryLimitRub: number;
	readonly code01EligibleKopecks: bigint;
	readonly code01EligibleRub: number;
	readonly code01Refund13Kopecks: bigint;
	readonly code01Refund13Rub: number;
	readonly code02Refund13Kopecks: bigint;
	readonly code02Refund13Rub: number;
	readonly refund13Kopecks: bigint;
	readonly refund13Rub: number;
	readonly refund15Kopecks: bigint;
	readonly refund15Rub: number;
	readonly isCode01Capped: boolean;
	readonly receiptsCount: number;
}

/**
 * Computes exact tax deduction split for a single tax year strictly using BigInt kopecks.
 */
export function calculateExactTaxSplitKopecks(
	payments: readonly TaxDeductionPaymentItem[],
	targetYear: number,
	customLimitRub?: number,
): ExactTaxSplitKopecks {
	const summary = calculateTaxDeductionSummary(payments);
	const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === targetYear);
	const code01Kop = BigInt(targetYearSummary?.code01Kopecks ?? 0);
	const code02Kop = BigInt(targetYearSummary?.code02Kopecks ?? 0);
	const receiptsCount = targetYearSummary?.receiptsCount ?? 0;

	const statutoryLimitRub =
		customLimitRub !== undefined && customLimitRub > 0
			? customLimitRub
			: targetYear >= 2024
				? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
				: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;

	const limitKop = BigInt(Math.round(statutoryLimitRub * 100));
	const isCode01Capped = code01Kop > limitKop;
	const code01EligibleKop = isCode01Capped ? limitKop : code01Kop;

	const code01Refund13Kop = (code01EligibleKop * 13n + 50n) / 100n;
	const code02Refund13Kop = (code02Kop * 13n + 50n) / 100n;
	const refund13Kop = code01Refund13Kop + code02Refund13Kop;

	const code01Refund15Kop = (code01EligibleKop * 15n + 50n) / 100n;
	const code02Refund15Kop = (code02Kop * 15n + 50n) / 100n;
	const refund15Kop = code01Refund15Kop + code02Refund15Kop;

	const totalKop = code01Kop + code02Kop;

	return {
		code01Kopecks: code01Kop,
		code01Rub: Number(code01Kop) / 100,
		code02Kopecks: code02Kop,
		code02Rub: Number(code02Kop) / 100,
		totalKopecks: totalKop,
		totalRub: Number(totalKop) / 100,
		code01StatutoryLimitKopecks: limitKop,
		code01StatutoryLimitRub: statutoryLimitRub,
		code01EligibleKopecks: code01EligibleKop,
		code01EligibleRub: Number(code01EligibleKop) / 100,
		code01Refund13Kopecks: code01Refund13Kop,
		code01Refund13Rub: Number(code01Refund13Kop) / 100,
		code02Refund13Kopecks: code02Refund13Kop,
		code02Refund13Rub: Number(code02Refund13Kop) / 100,
		refund13Kopecks: refund13Kop,
		refund13Rub: Number(refund13Kop) / 100,
		refund15Kopecks: refund15Kop,
		refund15Rub: Number(refund15Kop) / 100,
		isCode01Capped,
		receiptsCount,
	};
}

export interface PlanServiceItemForTax {
	readonly id?: string | undefined;
	readonly code804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly name?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly priceKopecks?: number | undefined;
	readonly quantity?: number | undefined;
	readonly taxCode?: "1" | "2" | undefined;
}

export interface PlanTaxItemDeduction {
	readonly id?: string | undefined;
	readonly code804n?: string | undefined;
	readonly serviceName: string;
	readonly categoryCode: "1" | "2";
	readonly isExpensive: boolean;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly eligibleRub: number;
	readonly eligibleKopecks: number;
	readonly refund13Rub: number;
	readonly refund13Kopecks: number;
}

export interface PlanTaxDeductionCalculation {
	readonly code01TotalRub: number;
	readonly code01TotalKopecks: number;
	readonly code01EligibleRub: number;
	readonly code01EligibleKopecks: number;
	readonly code01Refund13Rub: number;
	readonly code01Refund13Kopecks: number;
	readonly code01StatutoryLimitRub: number;
	readonly isCode01Capped: boolean;

	readonly code02TotalRub: number;
	readonly code02TotalKopecks: number;
	readonly code02EligibleRub: number;
	readonly code02EligibleKopecks: number;
	readonly code02Refund13Rub: number;
	readonly code02Refund13Kopecks: number;

	readonly grandTotalRub: number;
	readonly grandTotalKopecks: number;
	readonly grandTotalRefund13Rub: number;
	readonly grandTotalRefund13Kopecks: number;
	readonly netPriceWithRefundRub: number;
	readonly netPriceWithRefundKopecks: number;

	readonly items: readonly PlanTaxItemDeduction[];
	readonly hasCode02ExpensiveServices: boolean;
}

export interface StagedPaymentScheduleBreakdown {
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly stage1AdvanceTherapyKopecks: number; // 30%
	readonly stage1AdvanceTherapyRub: number;
	readonly stage2SurgeryImplantKopecks: number; // 40%
	readonly stage2SurgeryImplantRub: number;
	readonly stage3OrthopedicsKopecks: number; // 30%
	readonly stage3OrthopedicsRub: number;
	readonly isBalanced: boolean;
	readonly partsKopecks: readonly [number, number, number];
}

/**
 * Точный расчет возврата 13% НДФЛ по плану лечения с разделением на Код 01 (до 150 000 ₽) и Код 02 (дорогостоящее без лимита).
 */
export function calculatePlanTaxDeductionBreakdown(
	items: readonly PlanServiceItemForTax[],
	statutoryLimitRub: number = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
): PlanTaxDeductionCalculation {
	let code01TotalKopecks = 0;
	let code02TotalKopecks = 0;

	const mappedItems: PlanTaxItemDeduction[] = items.map((item) => {
		const rawName = item.serviceName || item.name || "Медицинская услуга";
		const catCode = item.taxCode || resolveTaxDeductionCategoryShared(item.code804n, rawName);
		const isExp = catCode === "2";

		const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
		const unitKopecks =
			typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)
				? Math.max(0, Math.round(item.priceKopecks))
				: typeof item.priceRub === "number" && Number.isFinite(item.priceRub)
					? Math.max(0, rubToKopecks(item.priceRub))
					: 0;

		const lineTotalKopecks = unitKopecks * qty;
		const lineTotalRub = kopecksToRub(lineTotalKopecks);

		if (isExp) {
			code02TotalKopecks += lineTotalKopecks;
		} else {
			code01TotalKopecks += lineTotalKopecks;
		}

		const itemRefund13Kopecks = Math.round((lineTotalKopecks * 13) / 100);

		return {
			id: item.id,
			code804n: item.code804n,
			serviceName: rawName,
			categoryCode: catCode,
			isExpensive: isExp,
			totalRub: lineTotalRub,
			totalKopecks: lineTotalKopecks,
			eligibleRub: lineTotalRub,
			eligibleKopecks: lineTotalKopecks,
			refund13Rub: kopecksToRub(itemRefund13Kopecks),
			refund13Kopecks: itemRefund13Kopecks,
		};
	});

	const limitKopecks = Math.max(0, Math.round(statutoryLimitRub * 100));
	const code01EligibleKopecks = Math.min(code01TotalKopecks, limitKopecks);
	const isCode01Capped = code01TotalKopecks > limitKopecks;
	const code01Refund13Kopecks = Math.round((code01EligibleKopecks * 13) / 100);

	const code02EligibleKopecks = code02TotalKopecks;
	const code02Refund13Kopecks = Math.round((code02EligibleKopecks * 13) / 100);

	const grandTotalKopecks = code01TotalKopecks + code02TotalKopecks;
	const grandTotalRefund13Kopecks = code01Refund13Kopecks + code02Refund13Kopecks;
	const netPriceWithRefundKopecks = Math.max(0, grandTotalKopecks - grandTotalRefund13Kopecks);

	return {
		code01TotalRub: kopecksToRub(code01TotalKopecks),
		code01TotalKopecks,
		code01EligibleRub: kopecksToRub(code01EligibleKopecks),
		code01EligibleKopecks,
		code01Refund13Rub: kopecksToRub(code01Refund13Kopecks),
		code01Refund13Kopecks,
		code01StatutoryLimitRub: statutoryLimitRub,
		isCode01Capped,

		code02TotalRub: kopecksToRub(code02TotalKopecks),
		code02TotalKopecks,
		code02EligibleRub: kopecksToRub(code02EligibleKopecks),
		code02EligibleKopecks,
		code02Refund13Rub: kopecksToRub(code02Refund13Kopecks),
		code02Refund13Kopecks,

		grandTotalRub: kopecksToRub(grandTotalKopecks),
		grandTotalKopecks,
		grandTotalRefund13Rub: kopecksToRub(grandTotalRefund13Kopecks),
		grandTotalRefund13Kopecks,
		netPriceWithRefundRub: kopecksToRub(netPriceWithRefundKopecks),
		netPriceWithRefundKopecks,

		items: mappedItems,
		hasCode02ExpensiveServices: code02TotalKopecks > 0,
	};
}

/**
 * Расчет графика поэтапной оплаты (30% аванс/санация, 40% хирургия, 30% ортопедия) с точной балансировкой копеек.
 */
export function calculateStaged304030Schedule(
	totalRubOrKopecks: number,
	isKopecksInput = false,
): StagedPaymentScheduleBreakdown {
	const totalKopecks = Math.max(
		0,
		isKopecksInput
			? Math.round(totalRubOrKopecks || 0)
			: rubToKopecks(totalRubOrKopecks || 0),
	);

	if (totalKopecks === 0) {
		return {
			totalKopecks: 0,
			totalRub: 0,
			stage1AdvanceTherapyKopecks: 0,
			stage1AdvanceTherapyRub: 0,
			stage2SurgeryImplantKopecks: 0,
			stage2SurgeryImplantRub: 0,
			stage3OrthopedicsKopecks: 0,
			stage3OrthopedicsRub: 0,
			isBalanced: true,
			partsKopecks: [0, 0, 0],
		};
	}

	const stage1Kopecks = Math.round(totalKopecks * 0.3);
	const stage2Kopecks = Math.round(totalKopecks * 0.4);
	const stage3Kopecks = totalKopecks - stage1Kopecks - stage2Kopecks;

	return {
		totalKopecks,
		totalRub: kopecksToRub(totalKopecks),
		stage1AdvanceTherapyKopecks: stage1Kopecks,
		stage1AdvanceTherapyRub: kopecksToRub(stage1Kopecks),
		stage2SurgeryImplantKopecks: stage2Kopecks,
		stage2SurgeryImplantRub: kopecksToRub(stage2Kopecks),
		stage3OrthopedicsKopecks: stage3Kopecks,
		stage3OrthopedicsRub: kopecksToRub(stage3Kopecks),
		isBalanced: stage1Kopecks + stage2Kopecks + stage3Kopecks === totalKopecks,
		partsKopecks: [stage1Kopecks, stage2Kopecks, stage3Kopecks],
	};
}

