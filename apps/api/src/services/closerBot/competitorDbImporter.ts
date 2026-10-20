/**
 * Universal Competitor Database Importer for DENTE Trojan Closer Engine.
 *
 * Ingests exports from IDENT, Infodent, 1C:Dental, Yclients, DentalPRO,
 * as well as generic CSV / Excel exports.
 *
 * Extracts:
 * - Patient Name (ФИО)
 * - Validated Phone in strict E.164 (+7XXXXXXXXXX)
 * - Abandoned Estimate / Treatment Plan sum in Rubles
 * - Consultation / Plan creation date
 * - Last clinical visit date
 * - Doctor / Clinic branch name
 * - Categorization into Closer Cadence targets (Hot, Warm, Cold, Recall Due)
 */

import { z } from "zod";
import { parseCsvRows, normalizeCsvHeader } from "../imports/csvParser.js";
import { normalizePhone, normalizePhoneDigits } from "@dental/shared";

export type CompetitorSource =
	| "ident"
	| "infodent"
	| "1c"
	| "yclients"
	| "dentalpro"
	| "generic_csv"
	| "generic_json";

export type CloserTargetCategory =
	| "abandoned_estimate_hot"   // 2-5 дней со дня консультации
	| "abandoned_estimate_warm"  // 6-10 дней со дня консультации
	| "abandoned_estimate_cold"  // 11-30 дней со дня консультации
	| "recall_due"               // 150-210 дней со дня визита (~5-7 мес)
	| "recall_overdue"           // > 210 дней со дня визита
	| "general_reactivation";    // > 30 дней смета или без четких дат

export const closerLeadCandidateSchema = z.object({
	id: z.string(),
	rawIndex: z.number().int(),
	fullName: z.string().min(1),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	middleName: z.string().optional(),
	phone: z.string(), // E.164 (+79XXXXXXXXX)
	isPhoneValid: z.boolean(),
	estimateSumRub: z.number().nonnegative(),
	consultationDate: z.string().optional().nullable(), // YYYY-MM-DD
	lastVisitDate: z.string().optional().nullable(),     // YYYY-MM-DD
	daysSinceConsultation: z.number().int().optional().nullable(),
	daysSinceLastVisit: z.number().int().optional().nullable(),
	doctorName: z.string().optional().nullable(),
	treatmentNotes: z.string().optional().nullable(),
	category: z.enum([
		"abandoned_estimate_hot",
		"abandoned_estimate_warm",
		"abandoned_estimate_cold",
		"recall_due",
		"recall_overdue",
		"general_reactivation",
	]),
	sourceSystem: z.string(),
	metadata: z.record(z.unknown()).default({}),
});

export type CloserLeadCandidate = z.infer<typeof closerLeadCandidateSchema>;

export interface CloserImportSummary {
	detectedSource: CompetitorSource;
	totalRows: number;
	validCandidatesCount: number;
	invalidPhonesCount: number;
	totalEstimateVolumeRub: number;
	averageEstimateSumRub: number;
	candidatesByCategory: Record<CloserTargetCategory, number>;
	candidates: CloserLeadCandidate[];
	warnings: string[];
	errors: string[];
}

/**
 * Словарь синонимов заголовков для нечеткого маппинга столбцов выгрузок
 */
const COLUMN_ALIASES = {
	fullName: [
		"фио",
		"пациент",
		"клиент",
		"ф.и.о.",
		"имя",
		"фиопациента",
		"контрагент",
		"full_name",
		"patient",
		"name",
		"client",
		"пациентфио",
	],
	phone: [
		"телефон",
		"моб",
		"моб.",
		"мобильный",
		"мобтелефон",
		"номер",
		"тел",
		"phone",
		"mobile",
		"contact_phone",
		"telephone",
		"номертелефона",
	],
	estimateSum: [
		"сумма",
		"суммаплана",
		"стоимость",
		"остаток",
		"остатокпоплану",
		"цена",
		"суммасметы",
		"стоимостьплана",
		"суммаруб",
		"ценаплана",
		"total",
		"amount",
		"sum",
		"estimate_sum",
		"cost",
		"планлечениясумма",
	],
	consultationDate: [
		"дата",
		"датаконсультации",
		"датасоздания",
		"датаплана",
		"создан",
		"date",
		"consultation_date",
		"created_at",
		"датадокумента",
		"датаприема",
	],
	lastVisitDate: [
		"последнийвизит",
		"датапоследнеговизита",
		"визит",
		"посещение",
		"last_visit",
		"last_visit_date",
		"датапосещения",
	],
	doctorName: [
		"врач",
		"доктор",
		"специалист",
		"лечащийврач",
		"составил",
		"менеджер",
		"doctor",
		"doctor_name",
		"specialist",
	],
	notes: [
		"услуга",
		"услуги",
		"план",
		"диагноз",
		"описание",
		"комментарий",
		"примечание",
		"services",
		"diagnosis",
		"notes",
		"comment",
	],
};

/**
 * Очистка и парсинг числовой суммы в рублях
 */
export function parseRublesAmount(value: unknown): number {
	if (typeof value === "number") {
		return Number.isFinite(value) && value > 0 ? value : 0;
	}
	if (!value || typeof value !== "string") return 0;

	// Убираем пробелы, неразрывные пробелы, символы валюты
	let cleaned = value
		.replace(/[\s\u00A0\u2007\u202F]/g, "")
		.replace(/₽|руб\.?|rub/gi, "");

	// Проверяем наличие точки и запятой
	if (cleaned.includes(".") && cleaned.includes(",")) {
		const lastDot = cleaned.lastIndexOf(".");
		const lastComma = cleaned.lastIndexOf(",");
		if (lastDot < lastComma) {
			// Формат 125.000,50 -> точки тысячи, запятая копейки
			cleaned = cleaned.replace(/\./g, "").replace(",", ".");
		} else {
			// Формат 125,000.50 -> запятые тысячи, точка копейки
			cleaned = cleaned.replace(/,/g, "");
		}
	} else if (cleaned.includes(".")) {
		// Если только точки: проверяем, разделитель ли это тысяч (ровно 3 цифры в конце: 85.500 или 1.250.000)
		if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
			cleaned = cleaned.replace(/\./g, "");
		}
	} else if (cleaned.includes(",")) {
		// Только запятая: проверяем, если несколько запятых 1,250,000
		if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
			cleaned = cleaned.replace(/,/g, "");
		} else {
			cleaned = cleaned.replace(",", ".");
		}
	}

	const parsed = Number.parseFloat(cleaned);
	return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
}


/**
 * Нормализация и парсинг даты из различных российских форматов в ISO YYYY-MM-DD
 */
export function parseRuDateToIso(value: unknown): string | null {
	if (!value) return null;
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	// Формат DD.MM.YYYY или DD.MM.YYYY HH:mm
	const ruMatch = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
	if (ruMatch) {
		const day = String(ruMatch[1]).padStart(2, "0");
		const month = String(ruMatch[2]).padStart(2, "0");
		const year = ruMatch[3];
		const iso = `${year}-${month}-${day}`;
		const d = new Date(iso);
		if (!Number.isNaN(d.getTime())) return iso;
	}

	// Формат YYYY-MM-DD
	const isoMatch = trimmed.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
	if (isoMatch) {
		const year = isoMatch[1];
		const month = String(isoMatch[2]).padStart(2, "0");
		const day = String(isoMatch[3]).padStart(2, "0");
		const iso = `${year}-${month}-${day}`;
		const d = new Date(iso);
		if (!Number.isNaN(d.getTime())) return iso;
	}

	return null;
}

/**
 * Вычисление разницы в днях между датой и сегодняшним днем
 */
export function getDaysDifference(isoDate: string | null | undefined, now: Date = new Date()): number | null {
	if (!isoDate) return null;
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return null;

	const diffTime = now.getTime() - date.getTime();
	return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Разбор ФИО на составляющие
 */
export function splitFullName(rawName: string): {
	fullName: string;
	lastName?: string | undefined;
	firstName?: string | undefined;
	middleName?: string | undefined;
} {
	const cleaned = rawName.trim().replace(/\s+/g, " ");
	const parts = cleaned.split(" ");
	if (parts.length === 1) {
		return { fullName: cleaned, firstName: parts[0] };
	}
	if (parts.length === 2) {
		return { fullName: cleaned, lastName: parts[0], firstName: parts[1] };
	}
	return {
		fullName: cleaned,
		lastName: parts[0],
		firstName: parts[1],
		middleName: parts.slice(2).join(" "),
	};
}

/**
 * Определение категории кандидата на дожим
 */
export function classifyCloserCandidate(
	daysConsultation: number | null,
	daysLastVisit: number | null,
	estimateSum: number,
): CloserTargetCategory {
	// Если есть свежая смета
	if (daysConsultation !== null && estimateSum > 0) {
		if (daysConsultation >= 2 && daysConsultation <= 5) {
			return "abandoned_estimate_hot";
		}
		if (daysConsultation >= 6 && daysConsultation <= 10) {
			return "abandoned_estimate_warm";
		}
		if (daysConsultation >= 11 && daysConsultation <= 30) {
			return "abandoned_estimate_cold";
		}
	}

	// Если есть дата последнего визита (профосмотр)
	if (daysLastVisit !== null) {
		if (daysLastVisit >= 150 && daysLastVisit <= 210) {
			return "recall_due";
		}
		if (daysLastVisit > 210) {
			return "recall_overdue";
		}
	}

	return "general_reactivation";
}

/**
 * Определение источника экспорта по заголовкам и сигнатурам
 */
export function detectCompetitorSource(headers: string[], rawContentSample: string): CompetitorSource {
	const norm = headers.map(normalizeCsvHeader).join(" ");
	const lower = rawContentSample.toLowerCase();

	if (norm.includes("ident") || lower.includes("ident") || (norm.includes("остатокпоплану") && norm.includes("составил"))) {
		return "ident";
	}
	if (norm.includes("инфодент") || lower.includes("инфодент") || norm.includes("инфоклиника")) {
		return "infodent";
	}
	if (norm.includes("контрагент") && (norm.includes("договор") || norm.includes("1с") || lower.includes("1с"))) {
		return "1c";
	}
	if (norm.includes("yclients") || lower.includes("yclients")) {
		return "yclients";
	}
	if (norm.includes("dentalpro") || lower.includes("dentalpro")) {
		return "dentalpro";
	}

	return "generic_csv";
}

/**
 * Автоматический маппинг колонок по синонимам
 */
function mapHeaderIndices(headers: string[]): Record<keyof typeof COLUMN_ALIASES, number> {
	const result: Record<keyof typeof COLUMN_ALIASES, number> = {
		fullName: -1,
		phone: -1,
		estimateSum: -1,
		consultationDate: -1,
		lastVisitDate: -1,
		doctorName: -1,
		notes: -1,
	};

	const normHeaders = headers.map((h) => normalizeCsvHeader(h));

	for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as [keyof typeof COLUMN_ALIASES, string[]][]) {
		for (let i = 0; i < normHeaders.length; i++) {
			const col = normHeaders[i];
			if (!col) continue;
			if (aliases.some((alias) => col === alias || col.includes(alias))) {
				result[key] = i;
				break;
			}
		}
	}

	return result;
}

/**
 * Универсальный импортер баз конкурентов
 */
export function importCompetitorPatientDb(
	contentOrRows: string | Record<string, unknown>[],
	options: {
		now?: Date;
		fallbackSource?: CompetitorSource;
	} = {},
): CloserImportSummary {
	const now = options.now ?? new Date();
	const warnings: string[] = [];
	const errors: string[] = [];

	let headers: string[] = [];
	let rawMatrix: string[][] = [];
	let source: CompetitorSource = options.fallbackSource ?? "generic_csv";

	if (typeof contentOrRows === "string") {
		const parsed = parseCsvRows(contentOrRows);
		if (parsed.length === 0) {
			return {
				detectedSource: source,
				totalRows: 0,
				validCandidatesCount: 0,
				invalidPhonesCount: 0,
				totalEstimateVolumeRub: 0,
				averageEstimateSumRub: 0,
				candidatesByCategory: {
					abandoned_estimate_hot: 0,
					abandoned_estimate_warm: 0,
					abandoned_estimate_cold: 0,
					recall_due: 0,
					recall_overdue: 0,
					general_reactivation: 0,
				},
				candidates: [],
				warnings: ["Пустой файл или отсутствуют строки данных"],
				errors: [],
			};
		}

		headers = parsed[0] ?? [];
		rawMatrix = parsed.slice(1);
		source = detectCompetitorSource(headers, contentOrRows.slice(0, 500));
	} else if (Array.isArray(contentOrRows)) {
		source = "generic_json";
		if (contentOrRows.length === 0) {
			return {
				detectedSource: source,
				totalRows: 0,
				validCandidatesCount: 0,
				invalidPhonesCount: 0,
				totalEstimateVolumeRub: 0,
				averageEstimateSumRub: 0,
				candidatesByCategory: {
					abandoned_estimate_hot: 0,
					abandoned_estimate_warm: 0,
					abandoned_estimate_cold: 0,
					recall_due: 0,
					recall_overdue: 0,
					general_reactivation: 0,
				},
				candidates: [],
				warnings: ["Пустой массив JSON"],
				errors: [],
			};
		}

		const firstObj = contentOrRows[0] ?? {};
		headers = Object.keys(firstObj);
		rawMatrix = contentOrRows.map((row) =>
			headers.map((h) => String(row[h] ?? "")),
		);
	}

	const colMap = mapHeaderIndices(headers);

	if (colMap.fullName === -1) {
		warnings.push("Колонка с ФИО не найдена автоматически по стандартным синонимам");
	}
	if (colMap.phone === -1) {
		warnings.push("Колонка с телефоном не найдена автоматически по стандартным синонимам");
	}

	const candidates: CloserLeadCandidate[] = [];
	let invalidPhonesCount = 0;
	let totalEstimateVolumeRub = 0;

	const candidatesByCategory: Record<CloserTargetCategory, number> = {
		abandoned_estimate_hot: 0,
		abandoned_estimate_warm: 0,
		abandoned_estimate_cold: 0,
		recall_due: 0,
		recall_overdue: 0,
		general_reactivation: 0,
	};

	for (let i = 0; i < rawMatrix.length; i++) {
		const row = rawMatrix[i];
		if (!row || row.every((c) => !c.trim())) continue;

		const rawName = colMap.fullName >= 0 ? (row[colMap.fullName] ?? "") : (row[0] ?? "");
		const rawPhone = colMap.phone >= 0 ? (row[colMap.phone] ?? "") : (row[1] ?? "");
		const rawSum = colMap.estimateSum >= 0 ? (row[colMap.estimateSum] ?? "") : (row[2] ?? "");
		const rawConsultDate = colMap.consultationDate >= 0 ? (row[colMap.consultationDate] ?? "") : "";
		const rawLastVisit = colMap.lastVisitDate >= 0 ? (row[colMap.lastVisitDate] ?? "") : "";
		const rawDoctor = colMap.doctorName >= 0 ? (row[colMap.doctorName] ?? "") : "";
		const rawNotes = colMap.notes >= 0 ? (row[colMap.notes] ?? "") : "";

		const cleanedName = rawName.trim();
		if (!cleanedName || cleanedName.length < 2) {
			warnings.push(`Строка ${i + 2}: пропущено ФИО или слишком короткое значение ("${rawName}")`);
			continue;
		}

		const nameParts = splitFullName(cleanedName);
		const normalizedPhone = normalizePhone(rawPhone);
		const digits = normalizePhoneDigits(rawPhone);
		const isPhoneValid = Boolean(normalizedPhone && digits.length >= 10);

		if (!isPhoneValid) {
			invalidPhonesCount++;
			warnings.push(`Строка ${i + 2} (${cleanedName}): невалидный телефон "${rawPhone}"`);
		}

		const estimateSumRub = parseRublesAmount(rawSum);
		const consultationDate = parseRuDateToIso(rawConsultDate);
		const lastVisitDate = parseRuDateToIso(rawLastVisit);

		const daysSinceConsultation = getDaysDifference(consultationDate, now);
		const daysSinceLastVisit = getDaysDifference(lastVisitDate, now);

		const category = classifyCloserCandidate(
			daysSinceConsultation,
			daysSinceLastVisit,
			estimateSumRub,
		);

		const candidate: CloserLeadCandidate = {
			id: `cand_${i + 1}_${digits.slice(-6) || "no_phone"}`,
			rawIndex: i + 1,
			fullName: nameParts.fullName,
			...(nameParts.firstName !== undefined ? { firstName: nameParts.firstName } : {}),
			...(nameParts.lastName !== undefined ? { lastName: nameParts.lastName } : {}),
			...(nameParts.middleName !== undefined ? { middleName: nameParts.middleName } : {}),
			phone: normalizedPhone ?? rawPhone.trim(),
			isPhoneValid,
			estimateSumRub,
			consultationDate,
			lastVisitDate,
			daysSinceConsultation,
			daysSinceLastVisit,
			doctorName: rawDoctor.trim() || null,
			treatmentNotes: rawNotes.trim() || null,
			category,
			sourceSystem: source,
			metadata: {},
		};

		candidates.push(candidate);
		totalEstimateVolumeRub += estimateSumRub;
		candidatesByCategory[category]++;
	}

	const validCandidatesCount = candidates.filter((c) => c.isPhoneValid).length;
	const averageEstimateSumRub =
		candidates.length > 0
			? Math.round((totalEstimateVolumeRub / candidates.length) * 100) / 100
			: 0;

	return {
		detectedSource: source,
		totalRows: rawMatrix.length,
		validCandidatesCount,
		invalidPhonesCount,
		totalEstimateVolumeRub,
		averageEstimateSumRub,
		candidatesByCategory,
		candidates,
		warnings,
		errors,
	};
}
