/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Real-world Visigraph File Intake (EzDent-i, Romexis, Sidexis, CliniView)
 * DICOM & Filename Parser, FDI Tooth Mapping, Visit Matcher & Image Normalizer
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { parseDicomDataset, type ParsedDicomDataset } from "../imaging/dicomParser.js";
import {
	applyClahe16Bit,
	applyInvertFilter16Bit,
	applyUnsharpMask16Bit,
	map16BitTo8BitGrayscale,
	map16BitToRgbaClamped,
	type ClinicalFilterPreset,
	applyClinicalRadiologyPreset,
} from "./radiologyFilterEngine.js";

// ─── 1. ТИПЫ И ПЕРЕЧИСЛЕНИЯ ──────────────────────────────────────────────────

export type RadiologySoftwareVendor =
	| "ezdent_i" // Vatech EzDent-i
	| "romexis" // Planmeca Romexis
	| "sidexis" // Dentsply Sirona Sidexis
	| "cliniview" // Instrumentarium / KaVo CliniView
	| "vixwin" // Gendex VixWin
	| "handydental" // Handy Dental
	| "fona" // Fona OrisWin
	| "generic";

export type DentalStudyType =
	| "PERIAPICAL" // Прицельный снимок визиографа (RVG / intraoral)
	| "PANORAMIC" // ОПТГ / панорамный снимок
	| "CBCT" // КЛКТ-срез / 3D-томограмма
	| "BITEWING" // Интерпроксимальный / прикусной
	| "OCCLUSAL" // Окклюзионный снимок
	| "CEPHALOMETRIC" // ТРГ (телерентгенограмма)
	| "UNKNOWN";

export type HotFolderQuarantineReason =
	| "ZERO_BYTE_FILE"
	| "UNSUPPORTED_EXTENSION"
	| "CORRUPTED_DICOM_HEADER"
	| "DUPLICATE_INGESTION"
	| "IMAGE_DECODE_FAILED"
	| "INVALID_BUFFER_LENGTH";

export type VisitMatchStrategy =
	| "EXACT_BARCODE"
	| "EXACT_VISIT_ID"
	| "EXACT_PATIENT_CARD"
	| "EXACT_NAME_MATCH"
	| "FUZZY_NAME_AND_TOOTH_MATCH"
	| "FUZZY_NAME_MATCH"
	| "CABINET_TIME_WINDOW_FALLBACK"
	| "UNASSIGNED";

export interface ActiveVisitContext {
	readonly visitId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientCardNumber?: string | undefined;
	readonly visitBarcode?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly scheduledStartIso?: string | undefined;
	readonly scheduledEndIso?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly chairId?: string | undefined;
	readonly assignedToothList?: readonly number[] | undefined;
	readonly status?: "planned" | "in_treatment" | "arrived" | "completed" | undefined;
}

export interface ExtractedRadiologyMetadata {
	readonly patientId: string | null;
	readonly patientCardNumber: string | null;
	readonly patientLastName: string | null;
	readonly patientFirstName: string | null;
	readonly patientMiddleName: string | null;
	readonly patientFullName: string | null;
	readonly visitId: string | null;
	readonly visitBarcode: string | null;
	readonly toothFdiList: readonly number[];
	readonly studyType: DentalStudyType;
	readonly modalityCode: string;
	readonly acquisitionDate: string; // YYYYMMDD or ISO
	readonly acquisitionTime: string | null; // HHmmss
	readonly isControlStudy: boolean;
	readonly vendorSoftwareHint: RadiologySoftwareVendor;
	readonly dicomStudyUid?: string | undefined;
	readonly dicomSeriesUid?: string | undefined;
	readonly dicomSopInstanceUid?: string | undefined;
	readonly windowCenter?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly rows?: number | undefined;
	readonly columns?: number | undefined;
	readonly bitsAllocated?: number | undefined;
}

export interface StudyVisitMatchResult {
	readonly isMatched: boolean;
	readonly matchedVisit: ActiveVisitContext | null;
	readonly confidenceScore: number; // 0.0 to 1.0
	readonly matchStrategy: VisitMatchStrategy;
	readonly matchDetails: string;
	readonly candidateCount: number;
}

export interface NormalizedImageBuffer {
	readonly width: number;
	readonly height: number;
	readonly bitDepth: 8 | 16;
	readonly grayscale8Bit: Uint8Array;
	readonly rgba32Bit: Uint8ClampedArray;
	readonly appliedWindowCenter: number;
	readonly appliedWindowWidth: number;
	readonly appliedBrightness: number;
	readonly appliedContrast: number;
	readonly appliedInvert: boolean;
	readonly appliedGamma: number;
}

export interface IngestedHotFolderStudy {
	readonly id: string;
	readonly sourceFileName: string;
	readonly fileSizeBytes: number;
	readonly fileSha256: string;
	readonly fileExtension: string;
	readonly isDicom: boolean;
	readonly metadata: ExtractedRadiologyMetadata;
	readonly embeddedDicom?: ParsedDicomDataset | undefined;
	readonly matchResult: StudyVisitMatchResult;
	readonly normalizedPreview?: NormalizedImageBuffer | undefined;
	readonly ingestionTimestamp: number;
	readonly status: "SUCCESS" | "QUARANTINED";
	readonly quarantineReason?: HotFolderQuarantineReason | undefined;
}

// ─── 2. ZOD-СХЕМЫ ДЛЯ ВАЛИДАЦИИ ──────────────────────────────────────────────

export const activeVisitContextSchema = z.object({
	visitId: z.string().min(1, "Идентификатор приёма обязателен"),
	patientId: z.string().min(1, "Идентификатор пациента обязателен"),
	patientFullName: z.string().min(1, "ФИО пациента обязательно"),
	patientCardNumber: z.string().optional(),
	visitBarcode: z.string().optional(),
	doctorId: z.string().optional(),
	doctorFullName: z.string().optional(),
	scheduledStartIso: z.string().optional(),
	scheduledEndIso: z.string().optional(),
	cabinetName: z.string().optional(),
	chairId: z.string().optional(),
	assignedToothList: z.array(z.number().int()).optional(),
	status: z.enum(["planned", "in_treatment", "arrived", "completed"]).optional(),
});

export const hotFolderSyncConfigSchema = z.object({
	watchDirectory: z.string().min(1).default("C:/DentalRadiology/HotFolder"),
	processedDirectory: z.string().optional(),
	quarantineDirectory: z.string().optional(),
	autoMatchWithActiveVisits: z.boolean().default(true),
	minimumMatchConfidence: z.number().min(0).max(1).default(0.6),
	maxFileSizeBytes: z.number().int().min(1024).default(500 * 1024 * 1024),
	defaultWindowCenter: z.number().default(2048),
	defaultWindowWidth: z.number().default(4096),
});
export type HotFolderSyncConfig = z.infer<typeof hotFolderSyncConfigSchema>;

export const imageNormalizationOptionsSchema = z.object({
	windowCenter: z.number().optional(),
	windowWidth: z.number().optional(),
	brightness: z.number().min(-100).max(100).default(0),
	contrast: z.number().min(-100).max(100).default(0),
	invert: z.boolean().default(false),
	gamma: z.number().min(0.1).max(4.0).default(1.0),
	clahePreset: z
		.enum([
			"STANDARD_DIAGNOSTIC",
			"ROOT_CANAL_ENDODONTIC",
			"CARIES_ENAMEL_DETECTION",
			"PERIODONTAL_BONE_MARGIN",
			"IMPLANT_TRABECULAR_DENSITY",
		])
		.optional(),
});
export type ImageNormalizationOptions = z.input<typeof imageNormalizationOptionsSchema>;
export type ImageNormalizationResolvedOptions = z.output<typeof imageNormalizationOptionsSchema>;

// ─── 3. ТРАНСЛИТЕРАЦИЯ И СРАВНЕНИЕ РУССКИХ ФИО ───────────────────────────────

const LATIN_TO_CYRILLIC_TRIGRAPHS: Array<[string, string]> = [
	["shch", "щ"],
];

const LATIN_TO_CYRILLIC_DIGRAPHS: Array<[string, string]> = [
	["zh", "ж"],
	["kh", "х"],
	["ts", "ц"],
	["ch", "ч"],
	["sh", "ш"],
	["yu", "ю"],
	["ya", "я"],
	["yo", "е"],
	["ye", "е"],
	["ey", "еи"],
	["ay", "аи"],
	["oy", "ои"],
	["uy", "уи"],
	["iy", "ии"],
];

const LATIN_TO_CYRILLIC_SINGLES: Record<string, string> = {
	"a": "а", "b": "б", "v": "в", "w": "в", "g": "г", "d": "д", "e": "е",
	"z": "з", "i": "и", "j": "и", "y": "и", "k": "к", "l": "л", "m": "м",
	"n": "н", "o": "о", "p": "п", "r": "р", "s": "с", "t": "т", "u": "у",
	"f": "ф", "h": "х", "c": "к", "x": "кс", "q": "к",
};

const IGNORED_FILENAME_KEYWORDS = new Set([
	"export", "import", "snapshot", "capture", "scan", "screen", "slice",
	"image", "study", "patient", "vatech", "romexis", "sidexis", "cliniview",
	"planmeca", "sirona", "gendex", "kavo", "dcm", "tiff", "tif", "jpeg",
	"jpg", "png", "bmp", "tooth", "visit", "karta", "card", "shot", "optg",
	"pano", "panoram", "cbct", "periapical", "bitewing", "kontrol", "postop",
	"post_op", "obturation",
]);

/**
 * Нормализует русское или латинское ФИО к единому кириллическому фонетическому представлению.
 */
export function normalizeCyrillicName(input: string | null | undefined): string {
	if (!input) return "";
	let text = input.trim().toLowerCase().replace(/[^a-zа-яё\s]/g, " ");

	// Заменяем буквы 'й' и 'ё' для унификации сравнения русских ФИО
	text = text.replace(/й/g, "и").replace(/ё/g, "е");

	// 1. Замена триграфов
	for (const [lat, cyr] of LATIN_TO_CYRILLIC_TRIGRAPHS) {
		text = text.replaceAll(lat, cyr);
	}
	// 2. Замена диграфов
	for (const [lat, cyr] of LATIN_TO_CYRILLIC_DIGRAPHS) {
		text = text.replaceAll(lat, cyr);
	}
	// 3. Замена одиночных латинских букв
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const char = text[i]!;
		if (char in LATIN_TO_CYRILLIC_SINGLES) {
			out += LATIN_TO_CYRILLIC_SINGLES[char];
		} else {
			out += char;
		}
	}

	return out.replace(/\s+/g, " ").trim();
}

/**
 * Вычисляет расстояние Левенштейна между двумя строками.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const matrix: number[][] = [];
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0]![j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
			matrix[i]![j] = Math.min(
				matrix[i - 1]![j]! + 1,
				matrix[i]![j - 1]! + 1,
				matrix[i - 1]![j - 1]! + cost,
			);
		}
	}

	return matrix[b.length]![a.length]!;
}

// ─── 4. ПАРСЕР ИМЁН ФАЙЛОВ И DICOM МЕТАДАННЫХ ─────────────────────────────────

export function isValidToothFdi(tooth: number): boolean {
	return (
		(tooth >= 11 && tooth <= 18) ||
		(tooth >= 21 && tooth <= 28) ||
		(tooth >= 31 && tooth <= 38) ||
		(tooth >= 41 && tooth <= 48) ||
		(tooth >= 51 && tooth <= 55) ||
		(tooth >= 61 && tooth <= 65) ||
		(tooth >= 71 && tooth <= 75) ||
		(tooth >= 81 && tooth <= 85)
	);
}

/**
 * Определяет производителя штатного рентген-софта по характерным маркерам пути или имени файла.
 */
export function detectRadiologySoftwareVendor(filename: string): RadiologySoftwareVendor {
	const lower = filename.toLowerCase();
	if (lower.includes("ezdent") || lower.includes("vatech") || lower.includes("easyident")) {
		return "ezdent_i";
	}
	if (lower.includes("romexis") || lower.includes("planmeca") || lower.includes("dimaxis")) {
		return "romexis";
	}
	if (lower.includes("sidexis") || lower.includes("sirona") || lower.includes("dentsply")) {
		return "sidexis";
	}
	if (lower.includes("cliniview") || lower.includes("instrumentarium") || lower.includes("kavo")) {
		return "cliniview";
	}
	if (lower.includes("vixwin") || lower.includes("gendex")) {
		return "vixwin";
	}
	if (lower.includes("handy") || lower.includes("handydental")) {
		return "handydental";
	}
	if (lower.includes("fona") || lower.includes("oriswin")) {
		return "fona";
	}
	return "generic";
}

/**
 * Извлекает клинические метаданные из имени файла и бинарного DICOM-заголовка.
 */
export function extractRadiologyMetadata(
	filename: string,
	dicomDataset?: ParsedDicomDataset | undefined,
): ExtractedRadiologyMetadata {
	const cleanName = filename.replace(/\.[^/.]+$/, "");
	const tokens = cleanName.split(/[\s_\-#.]+/).filter((t) => t.length > 0);
	const upper = cleanName.toUpperCase();

	let patientId: string | null = null;
	let patientCardNumber: string | null = null;
	let patientLastName: string | null = null;
	let patientFirstName: string | null = null;
	let patientMiddleName: string | null = null;
	let visitId: string | null = null;
	let visitBarcode: string | null = null;
	const teeth = new Set<number>();
	let studyType: DentalStudyType = "UNKNOWN";
	let acquisitionDate = "";
	let acquisitionTime: string | null = null;
	let isControlStudy = false;

	const vendor = detectRadiologySoftwareVendor(filename);

	// 1. Поиск штрихкода визита (BARCODE_123456, VIS-2026-10492, BC-101, BC990142, 6-12 цифр)
	const barcodeMatch =
		cleanName.match(/(?:VIS|VIZIT|VISIT|BARCODE|BC|V)[-_]?([0-9]{1,14}(?:[-_][0-9]{1,10})*)/i) ||
		cleanName.match(/\b(990\d{3,8})\b/) ||
		cleanName.match(/\b(2026\d{4,8})\b/);
	if (barcodeMatch) {
		visitBarcode = barcodeMatch[0].toUpperCase();
	}

	// 2. Поиск ID визита
	const visitMatch = cleanName.match(/(?:VIS|VISIT|VIZIT)[-_]?([0-9]{1,14}(?:[-_][0-9]{1,10})*)/i);
	if (visitMatch) {
		visitId = visitMatch[0].toUpperCase();
	}

	// 3. Поиск номера карты/ID пациента (PAT-..., KARTA-..., CARD-..., ID-...)
	const cardMatch = cleanName.match(/(?:PAT|PATIENT|KARTA|CARD|ID|SNILS)[-_]?([0-9A-ZА-Я]{2,14})/i);
	if (cardMatch) {
		patientCardNumber = cardMatch[0].toUpperCase();
		patientId = cardMatch[0].toUpperCase();
	}

	// 4. Поиск даты съемки (ГГГГММДД или ГГГГ-ММ-ДД или ДД.ММ.ГГГГ)
	let dateDay = "";
	let dateMonth = "";
	const isoDateMatch = cleanName.match(/\b(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])\b/);
	if (isoDateMatch && isoDateMatch[1] && isoDateMatch[2] && isoDateMatch[3]) {
		acquisitionDate = `${isoDateMatch[1]}${isoDateMatch[2]}${isoDateMatch[3]}`;
		dateMonth = isoDateMatch[2];
		dateDay = isoDateMatch[3];
	} else {
		const ruDateMatch = cleanName.match(/\b(0[1-9]|[12]\d|3[01])[-_.](0[1-9]|1[0-2])[-_.](20\d{2})\b/);
		if (ruDateMatch && ruDateMatch[1] && ruDateMatch[2] && ruDateMatch[3]) {
			acquisitionDate = `${ruDateMatch[3]}${ruDateMatch[2]}${ruDateMatch[1]}`;
			dateDay = ruDateMatch[1];
			dateMonth = ruDateMatch[2];
		}
	}

	// 5. Определение типа снимка (RVG, ОПТГ, КЛКТ, ТРГ)
	if (upper.includes("OPTG") || upper.includes("PANO") || upper.includes("ПАНОРАМ") || upper.includes("OPG")) {
		studyType = "PANORAMIC";
	} else if (upper.includes("CBCT") || upper.includes("КЛКТ") || upper.includes("3D") || upper.includes("CT") || upper.includes("SLICE")) {
		studyType = "CBCT";
	} else if (upper.includes("BITEWING") || upper.includes("BW") || upper.includes("ИНТРАПРОКС")) {
		studyType = "BITEWING";
	} else if (upper.includes("CEPH") || upper.includes("ТРГ") || upper.includes("LATERAL")) {
		studyType = "CEPHALOMETRIC";
	} else if (upper.includes("OCCLUSAL") || upper.includes("ОККЛЮЗИОН")) {
		studyType = "OCCLUSAL";
	} else if (upper.includes("PERIAPICAL") || upper.includes("PA") || upper.includes("RVG") || upper.includes("ПРИЦЕЛЬН") || upper.includes("ВИЗИО")) {
		studyType = "PERIAPICAL";
	}

	// 6. Контрольный снимок
	if (
		upper.includes("KONTROL") ||
		upper.includes("КОНТРОЛЬ") ||
		upper.includes("OBTUR") ||
		upper.includes("ПЛОМБ") ||
		upper.includes("POST_OP") ||
		upper.includes("POSTOP")
	) {
		isControlStudy = true;
	}

	// 7. Поиск номеров зубов FDI (11–48, 51–85, диапазоны T11-12, T11-13, T46_48, зуб_36, d24)
	const rangeMatches = Array.from(
		cleanName.matchAll(/(?:^|[^0-9A-Za-zА-Яа-яЁё])(?:T|TOOTH|ZUB|ЗУБ|D|FDI)?([1-4][1-8]|[5-8][1-5])-([1-4][1-8]|[5-8][1-5])(?![0-9])/gi),
	);
	let hasRanges = false;
	for (const rm of rangeMatches) {
		const start = Number.parseInt(rm[1]!, 10);
		const end = Number.parseInt(rm[2]!, 10);
		if (start <= end && isValidToothFdi(start) && isValidToothFdi(end)) {
			hasRanges = true;
			for (let t = start; t <= end; t++) {
				if (isValidToothFdi(t)) teeth.add(t);
			}
		}
	}

	for (const token of tokens) {
		const explicitMatch = token.match(/^(?:T|TOOTH|ZUB|ЗУБ|D|FDI)([1-4][1-8]|[5-8][1-5])$/i);
		if (explicitMatch && explicitMatch[1]) {
			const num = Number.parseInt(explicitMatch[1], 10);
			if (isValidToothFdi(num)) teeth.add(num);
			continue;
		}

		const bareMatch = token.match(/^([1-4][1-8]|[5-8][1-5])$/);
		if (bareMatch && bareMatch[1]) {
			const num = Number.parseInt(bareMatch[1], 10);
			const isDateDayOrMonth = (dateDay && bareMatch[1] === dateDay) || (dateMonth && bareMatch[1] === dateMonth);
			const isCardOrBarcode = (visitBarcode && visitBarcode.includes(bareMatch[1])) || (patientCardNumber && patientCardNumber.includes(bareMatch[1]));
			if (!hasRanges && !isDateDayOrMonth && !isCardOrBarcode && isValidToothFdi(num)) {
				teeth.add(num);
			}
		}
	}

	// 7. Поиск ФИО пациента в токенах с фильтрацией системных ключевых слов
	for (const token of tokens) {
		const lowerToken = token.toLowerCase();
		if (IGNORED_FILENAME_KEYWORDS.has(lowerToken)) continue;

		if (/^[A-ZА-ЯЁ][a-zа-яё]{1,25}$/.test(token) || /^[A-ZА-ЯЁ]$/.test(token)) {
			if (!patientLastName && token.length >= 2) {
				patientLastName = token;
			} else if (!patientFirstName && token.length <= 15) {
				patientFirstName = token;
			} else if (!patientMiddleName && token.length <= 15) {
				patientMiddleName = token;
			}
		}
	}

	// 8. Обогащение данными из бинарного DICOM-заголовка
	let modalityCode = studyType === "CBCT" ? "CT" : studyType === "PANORAMIC" ? "PX" : "IO";
	let dicomStudyUid: string | undefined;
	let dicomSeriesUid: string | undefined;
	let dicomSopInstanceUid: string | undefined;
	let windowCenter: number | undefined;
	let windowWidth: number | undefined;
	let rows: number | undefined;
	let columns: number | undefined;
	let bitsAllocated: number | undefined;

	if (dicomDataset) {
		if (dicomDataset.patientId && !patientId) {
			patientId = dicomDataset.patientId;
			if (!patientCardNumber) patientCardNumber = dicomDataset.patientId;
		}
		if (dicomDataset.patientName) {
			const cleanDicomName = dicomDataset.patientName.replace(/\^/g, " ").trim();
			const dicomTokens = cleanDicomName.split(/\s+/);
			if (dicomTokens.length >= 1 && dicomTokens[0] && !patientLastName) {
				patientLastName = dicomTokens[0];
			}
			if (dicomTokens.length >= 2 && dicomTokens[1] && !patientFirstName) {
				patientFirstName = dicomTokens[1];
			}
			if (dicomTokens.length >= 3 && dicomTokens[2] && !patientMiddleName) {
				patientMiddleName = dicomTokens[2];
			}
		}
		if (dicomDataset.studyDate && !acquisitionDate) {
			acquisitionDate = dicomDataset.studyDate;
		}
		if (dicomDataset.modality) {
			modalityCode = dicomDataset.modality;
			if (modalityCode === "CT") studyType = "CBCT";
			else if (modalityCode === "PX" || modalityCode === "OPG") studyType = "PANORAMIC";
			else if (modalityCode === "IO") studyType = "PERIAPICAL";
		}
		dicomStudyUid = dicomDataset.studyInstanceUid ?? undefined;
		dicomSeriesUid = dicomDataset.seriesInstanceUid ?? undefined;
		dicomSopInstanceUid = dicomDataset.sopInstanceUid ?? undefined;
		windowCenter = dicomDataset.windowCenter;
		windowWidth = dicomDataset.windowWidth;
		rows = dicomDataset.rows;
		columns = dicomDataset.columns;
		bitsAllocated = dicomDataset.bitsAllocated;
	}

	if (studyType === "UNKNOWN" && teeth.size > 0) {
		studyType = "PERIAPICAL";
	}

	let patientFullName: string | null = null;
	if (patientLastName) {
		patientFullName = [patientLastName, patientFirstName, patientMiddleName].filter(Boolean).join(" ");
	}

	if (!acquisitionDate) {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const d = String(now.getDate()).padStart(2, "0");
		acquisitionDate = `${y}${m}${d}`;
	}

	return {
		patientId,
		patientCardNumber,
		patientLastName,
		patientFirstName,
		patientMiddleName,
		patientFullName,
		visitId,
		visitBarcode,
		toothFdiList: Array.from(teeth).sort((a, b) => a - b),
		studyType,
		modalityCode,
		acquisitionDate,
		acquisitionTime,
		isControlStudy,
		vendorSoftwareHint: vendor,
		dicomStudyUid,
		dicomSeriesUid,
		dicomSopInstanceUid,
		windowCenter,
		windowWidth,
		rows,
		columns,
		bitsAllocated,
	};
}

// ─── 5. БЫСТРОЕ СОПОСТАВЛЕНИЕ СО СНИМКОМ И ПРИЁМОМ ────────────────────────────

/**
 * Сопоставляет извлеченные метаданные снимка со списком активных приёмов клиники.
 */
export function matchRadiologyStudyWithVisits(
	metadata: ExtractedRadiologyMetadata,
	activeVisits: readonly ActiveVisitContext[],
	options?: { minimumConfidence?: number | undefined },
): StudyVisitMatchResult {
	if (!activeVisits || activeVisits.length === 0) {
		return {
			isMatched: false,
			matchedVisit: null,
			confidenceScore: 0,
			matchStrategy: "UNASSIGNED",
			matchDetails: "Нет активных приёмов в системе",
			candidateCount: 0,
		};
	}

	const minConfidence = options?.minimumConfidence ?? 0.6;

	// Стратегия 1: Точное совпадение по штрихкоду визита
	if (metadata.visitBarcode) {
		const normBarcode = metadata.visitBarcode.toUpperCase().replace(/[^0-9A-ZА-Я]/g, "");
		const matched = activeVisits.find((v) => {
			if (!v.visitBarcode) return false;
			const vNorm = v.visitBarcode.toUpperCase().replace(/[^0-9A-ZА-Я]/g, "");
			return (
				vNorm.length > 0 &&
				(vNorm === normBarcode ||
					(vNorm.length >= 3 && normBarcode.includes(vNorm)) ||
					(normBarcode.length >= 3 && vNorm.includes(normBarcode)))
			);
		});
		if (matched) {
			return {
				isMatched: true,
				matchedVisit: matched,
				confidenceScore: 1.0,
				matchStrategy: "EXACT_BARCODE",
				matchDetails: `Точное совпадение по штрихкоду визита: ${metadata.visitBarcode}`,
				candidateCount: 1,
			};
		}
	}

	// Стратегия 2: Точное совпадение по ID визита
	if (metadata.visitId) {
		const normVisitId = metadata.visitId.toUpperCase();
		const matched = activeVisits.find((v) => v.visitId.toUpperCase() === normVisitId);
		if (matched) {
			return {
				isMatched: true,
				matchedVisit: matched,
				confidenceScore: 1.0,
				matchStrategy: "EXACT_VISIT_ID",
				matchDetails: `Точное совпадение по идентификатору визита: ${metadata.visitId}`,
				candidateCount: 1,
			};
		}
	}

	// Стратегия 3: Точное совпадение по номеру карты / ID пациента
	if (metadata.patientCardNumber || metadata.patientId) {
		const targetCard = (metadata.patientCardNumber || metadata.patientId || "").toUpperCase();
		const matched = activeVisits.find(
			(v) =>
				(v.patientCardNumber && v.patientCardNumber.toUpperCase() === targetCard) ||
				v.patientId.toUpperCase() === targetCard,
		);
		if (matched) {
			return {
				isMatched: true,
				matchedVisit: matched,
				confidenceScore: 0.95,
				matchStrategy: "EXACT_PATIENT_CARD",
				matchDetails: `Точное совпадение по номеру карты пациента: ${targetCard}`,
				candidateCount: 1,
			};
		}
	}

	// Стратегия 4 & 5: Сопоставление по ФИО (точное и нечеткое)
	if (metadata.patientLastName || metadata.patientFullName) {
		const targetNorm = normalizeCyrillicName(metadata.patientFullName || metadata.patientLastName);
		const targetTokens = targetNorm.split(/\s+/).filter(Boolean);

		let bestVisit: ActiveVisitContext | null = null;
		let bestScore = 0;
		let bestStrategy: VisitMatchStrategy = "UNASSIGNED";
		let bestDetails = "";
		let candidateCount = 0;

		for (const visit of activeVisits) {
			const visitNorm = normalizeCyrillicName(visit.patientFullName);
			const visitTokens = visitNorm.split(/\s+/).filter(Boolean);

			// Полное совпадение нормализованного ФИО
			if (targetNorm === visitNorm) {
				return {
					isMatched: true,
					matchedVisit: visit,
					confidenceScore: 0.9,
					matchStrategy: "EXACT_NAME_MATCH",
					matchDetails: `Полное совпадение ФИО: ${visit.patientFullName}`,
					candidateCount: 1,
				};
			}

			// Проверка совпадения фамилии
			const targetLastName = targetTokens[0] ?? "";
			const visitLastName = visitTokens[0] ?? "";
			const dist = calculateLevenshteinDistance(targetLastName, visitLastName);

			if (dist === 0 || (dist <= 2 && targetLastName.length >= 4)) {
				candidateCount++;
				let score = 0.75;
				let details = `Нечеткое совпадение по фамилии (${targetLastName} ~ ${visitLastName})`;

				// Проверка совпадения инициала имени
				const targetInit = targetTokens[1]?.[0];
				const visitInit = visitTokens[1]?.[0];
				if (targetInit && visitInit && targetInit === visitInit) {
					score += 0.05;
					details += `, совпадает инициал (${targetInit}.)`;
				}

				// Проверка пересечения номеров зубов в приёме
				if (metadata.toothFdiList.length > 0 && visit.assignedToothList && visit.assignedToothList.length > 0) {
					const hasToothOverlap = metadata.toothFdiList.some((t) => visit.assignedToothList!.includes(t));
					if (hasToothOverlap) {
						score += 0.1;
						details += `, совпадает зуб FDI (${metadata.toothFdiList.join(", ")})`;
					}
				}

				if (score > bestScore) {
					bestScore = score;
					bestVisit = visit;
					bestStrategy = metadata.toothFdiList.length > 0 ? "FUZZY_NAME_AND_TOOTH_MATCH" : "FUZZY_NAME_MATCH";
					bestDetails = details;
				}
			}
		}

		if (bestVisit && bestScore >= minConfidence) {
			return {
				isMatched: true,
				matchedVisit: bestVisit,
				confidenceScore: Math.min(0.95, bestScore),
				matchStrategy: bestStrategy,
				matchDetails: bestDetails,
				candidateCount,
			};
		}
	}

	// Стратегия 6: Фоллбэк — единственный активный приём в кабинете в данный момент
	const inTreatmentVisits = activeVisits.filter((v) => v.status === "in_treatment");
	if (inTreatmentVisits.length === 1 && inTreatmentVisits[0]) {
		const singleVisit = inTreatmentVisits[0];
		return {
			isMatched: true,
			matchedVisit: singleVisit,
			confidenceScore: 0.6,
			matchStrategy: "CABINET_TIME_WINDOW_FALLBACK",
			matchDetails: `Единственный пациент в статусе «в кресле»: ${singleVisit.patientFullName}`,
			candidateCount: 1,
		};
	}

	return {
		isMatched: false,
		matchedVisit: null,
		confidenceScore: 0,
		matchStrategy: "UNASSIGNED",
		matchDetails: "Снимок не удалось сопоставить ни с одним открытым приёмом",
		candidateCount: 0,
	};
}

// ─── 6. НОРМАЛИЗАЦИЯ И ПОДГОТОВКА К ОТОБРАЖЕНИЮ ───────────────────────────────

/**
 * Вычисляет оптимальные уровни окна (WL/WW) на основе 1-го и 99-го перцентилей гистограммы.
 */
export function calculateAutoContrastLevels(
	pixels: Uint16Array | Uint8Array,
): { windowCenter: number; windowWidth: number } {
	if (!pixels || pixels.length === 0) {
		return { windowCenter: 128, windowWidth: 256 };
	}

	let min = Number.MAX_SAFE_INTEGER;
	let max = Number.MIN_SAFE_INTEGER;
	for (let i = 0; i < pixels.length; i++) {
		const v = pixels[i]!;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	if (min >= max) {
		return { windowCenter: min, windowWidth: 1 };
	}

	const is16Bit = max > 255;
	const numBins = is16Bit ? 1024 : 256;
	const binShift = is16Bit ? 6 : 0;
	const hist = new Uint32Array(numBins);

	for (let i = 0; i < pixels.length; i++) {
		const bin = Math.min(numBins - 1, pixels[i]! >> binShift);
		hist[bin] = (hist[bin] ?? 0) + 1;
	}

	const totalPixels = pixels.length;
	const p1Count = Math.floor(totalPixels * 0.01);
	const p99Count = Math.floor(totalPixels * 0.99);

	let cum = 0;
	let lowVal = min;
	let highVal = max;

	for (let b = 0; b < numBins; b++) {
		cum += hist[b]!;
		if (cum >= p1Count && lowVal === min) {
			lowVal = b << binShift;
		}
		if (cum >= p99Count) {
			highVal = b << binShift;
			break;
		}
	}

	const windowWidth = Math.max(1, highVal - lowVal);
	const windowCenter = Math.round(lowVal + windowWidth / 2);

	return { windowCenter, windowWidth };
}

/**
 * Нормализует 16-битный или 8-битный монохромный буфер рентгенограммы с применением яркости, контрастности, инверсии и гаммы.
 */
export function normalizeRadiologyBuffer(
	rawBuffer: Uint16Array | Uint8Array,
	width: number,
	height: number,
	options?: Partial<ImageNormalizationOptions> | undefined,
): NormalizedImageBuffer {
	const totalPixels = width * height;
	let pixels16: Uint16Array;
	const is16Bit = rawBuffer instanceof Uint16Array;

	if (rawBuffer instanceof Uint16Array) {
		pixels16 = rawBuffer;
	} else {
		pixels16 = new Uint16Array(totalPixels);
		for (let i = 0; i < totalPixels; i++) {
			pixels16[i] = rawBuffer[i]! * 256; // upscale 8-bit to 16-bit
		}
	}

	// 1. Применение клинического пресета фильтрации (если задан)
	let filteredPixels = pixels16;
	if (options?.clahePreset) {
		filteredPixels = applyClinicalRadiologyPreset(pixels16, width, height, options.clahePreset, 16);
	}

	// 2. Расчет уровней окна (WL/WW)
	let wl = options?.windowCenter;
	let ww = options?.windowWidth;

	if (wl === undefined || ww === undefined) {
		const autoLevels = calculateAutoContrastLevels(filteredPixels);
		wl = autoLevels.windowCenter;
		ww = autoLevels.windowWidth;
	}

	// 3. Коррекция контрастности и яркости (-100..+100)
	const contrastMultiplier = options?.contrast ? (100 + options.contrast) / 100 : 1.0;
	const brightnessOffset = options?.brightness ? (options.brightness / 100) * (ww / 2) : 0;

	const effectiveWw = Math.max(1, ww / Math.max(0.1, contrastMultiplier));
	const effectiveWl = wl - brightnessOffset;
	const invert = Boolean(options?.invert);
	const gamma = Math.max(0.1, Math.min(4.0, options?.gamma ?? 1.0));

	// 4. Преобразование в 8-битный grayscale
	const grayscale8Bit = map16BitTo8BitGrayscale(filteredPixels, {
		windowCenter: effectiveWl,
		windowWidth: effectiveWw,
		invert,
		gamma,
		maxBitDepth: 16,
	});

	// 5. Построение 32-битного RGBA-буфера (Uint8ClampedArray для Canvas ImageData)
	const rgba32Bit = new Uint8ClampedArray(totalPixels * 4);
	for (let i = 0; i < totalPixels; i++) {
		const g = grayscale8Bit[i]!;
		const idx = i * 4;
		rgba32Bit[idx] = g;
		rgba32Bit[idx + 1] = g;
		rgba32Bit[idx + 2] = g;
		rgba32Bit[idx + 3] = 255;
	}

	return {
		width,
		height,
		bitDepth: is16Bit ? 16 : 8,
		grayscale8Bit,
		rgba32Bit,
		appliedWindowCenter: effectiveWl,
		appliedWindowWidth: effectiveWw,
		appliedBrightness: options?.brightness ?? 0,
		appliedContrast: options?.contrast ?? 0,
		appliedInvert: invert,
		appliedGamma: gamma,
	};
}

// ─── 7. HOT FOLDER SYNC ENGINE (ГЛАВНЫЙ КЛАСС) ────────────────────────────────

export class HotFolderSyncEngine {
	private config: HotFolderSyncConfig;
	private activeVisits: ActiveVisitContext[] = [];
	private ingestedStudies: IngestedHotFolderStudy[] = [];
	private quarantinedStudies: IngestedHotFolderStudy[] = [];
	private knownHashes = new Set<string>();

	private onStudyIngestedListeners: ((study: IngestedHotFolderStudy) => void)[] = [];
	private onStudyMatchedListeners: ((study: IngestedHotFolderStudy) => void)[] = [];
	private onQuarantineListeners: ((study: IngestedHotFolderStudy) => void)[] = [];
	private onErrorListeners: ((err: Error) => void)[] = [];

	constructor(config?: Partial<HotFolderSyncConfig>) {
		this.config = hotFolderSyncConfigSchema.parse(config ?? {});
	}

	public getConfig(): HotFolderSyncConfig {
		return this.config;
	}

	public setActiveVisits(visits: readonly ActiveVisitContext[]): void {
		this.activeVisits = visits.map((v) => activeVisitContextSchema.parse(v));
	}

	public addActiveVisit(visit: ActiveVisitContext): void {
		this.activeVisits.push(activeVisitContextSchema.parse(visit));
	}

	public getActiveVisits(): readonly ActiveVisitContext[] {
		return this.activeVisits;
	}

	public getIngestedStudies(): readonly IngestedHotFolderStudy[] {
		return this.ingestedStudies;
	}

	public getQuarantinedStudies(): readonly IngestedHotFolderStudy[] {
		return this.quarantinedStudies;
	}

	public onStudyIngested(listener: (study: IngestedHotFolderStudy) => void): () => void {
		this.onStudyIngestedListeners.push(listener);
		return () => {
			this.onStudyIngestedListeners = this.onStudyIngestedListeners.filter((l) => l !== listener);
		};
	}

	public onStudyMatched(listener: (study: IngestedHotFolderStudy) => void): () => void {
		this.onStudyMatchedListeners.push(listener);
		return () => {
			this.onStudyMatchedListeners = this.onStudyMatchedListeners.filter((l) => l !== listener);
		};
	}

	public onQuarantine(listener: (study: IngestedHotFolderStudy) => void): () => void {
		this.onQuarantineListeners.push(listener);
		return () => {
			this.onQuarantineListeners = this.onQuarantineListeners.filter((l) => l !== listener);
		};
	}

	public onError(listener: (err: Error) => void): () => void {
		this.onErrorListeners.push(listener);
		return () => {
			this.onErrorListeners = this.onErrorListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Прием и разбор единичного файла снимка из hot-folder с автоматическим сопоставлением.
	 */
	public ingestFile(
		filePathOrName: string,
		fileBuffer: Uint8Array,
		options?: { normalization?: Partial<ImageNormalizationOptions> | undefined },
	): IngestedHotFolderStudy {
		const filename = filePathOrName.split(/[\/\\]/).pop() || filePathOrName;
		const extMatch = filename.match(/\.[^/.]+$/);
		const ext = extMatch ? extMatch[0].toLowerCase() : "";

		// 1. Проверка нулевого размера
		if (!fileBuffer || fileBuffer.length === 0) {
			return this.recordQuarantine(filename, fileBuffer?.length ?? 0, ext, "ZERO_BYTE_FILE");
		}

		// 2. Проверка поддерживаемого формата (.dcm, .dicom, .tif, .tiff, .png, .jpg, .jpeg, .bmp)
		const supportedExts = new Set([".dcm", ".dicom", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".bmp"]);
		if (!supportedExts.has(ext)) {
			return this.recordQuarantine(filename, fileBuffer.length, ext, "UNSUPPORTED_EXTENSION");
		}

		// 3. Хеширование и дедупликация
		const fileHash = this.calculateBufferHash(fileBuffer);
		if (this.knownHashes.has(fileHash)) {
			return this.recordQuarantine(filename, fileBuffer.length, ext, "DUPLICATE_INGESTION", fileHash);
		}

		// 4. Парсинг DICOM (если применимо)
		const isDicom = ext === ".dcm" || ext === ".dicom";
		let dicomDataset: ParsedDicomDataset | undefined;

		if (isDicom) {
			try {
				dicomDataset = parseDicomDataset(fileBuffer);
				const hasValidDicom = Boolean(
					dicomDataset &&
						(dicomDataset.hasPreamble ||
							dicomDataset.transferSyntaxUid ||
							dicomDataset.sopInstanceUid ||
							dicomDataset.studyInstanceUid ||
							dicomDataset.patientName ||
							dicomDataset.patientId ||
							dicomDataset.modality),
				);
				if (!dicomDataset || !hasValidDicom) {
					return this.recordQuarantine(filename, fileBuffer.length, ext, "CORRUPTED_DICOM_HEADER", fileHash);
				}
			} catch (e) {
				return this.recordQuarantine(filename, fileBuffer.length, ext, "CORRUPTED_DICOM_HEADER", fileHash);
			}
		}

		// 5. Извлечение клинических метаданных
		const metadata = extractRadiologyMetadata(filename, dicomDataset);

		// 6. Сопоставление с открытыми визитами
		const matchResult = this.config.autoMatchWithActiveVisits
			? matchRadiologyStudyWithVisits(metadata, this.activeVisits, {
					minimumConfidence: this.config.minimumMatchConfidence,
				})
			: {
					isMatched: false,
					matchedVisit: null,
					confidenceScore: 0,
					matchStrategy: "UNASSIGNED" as const,
					matchDetails: "Автосопоставление отключено в конфигурации",
					candidateCount: 0,
				};

		// 7. Построение нормализованного превью (если переданы размеры или из DICOM)
		let normalizedPreview: NormalizedImageBuffer | undefined;
		const width = metadata.columns || 512;
		const height = metadata.rows || 512;

		if (fileBuffer.length >= width * height) {
			try {
				normalizedPreview = normalizeRadiologyBuffer(
					fileBuffer.subarray(0, width * height),
					width,
					height,
					options?.normalization,
				);
			} catch (e) {
				// Ошибка превью не блокирует сохранение снимка
			}
		}

		// 8. Успешная регистрация
		const study: IngestedHotFolderStudy = {
			id: `STUDY_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
			sourceFileName: filename,
			fileSizeBytes: fileBuffer.length,
			fileSha256: fileHash,
			fileExtension: ext,
			isDicom,
			metadata,
			embeddedDicom: dicomDataset,
			matchResult,
			normalizedPreview,
			ingestionTimestamp: Date.now(),
			status: "SUCCESS",
		};

		this.knownHashes.add(fileHash);
		this.ingestedStudies.push(study);

		// Вызов слушателей
		for (const l of this.onStudyIngestedListeners) {
			try {
				l(study);
			} catch (err) {
				console.error("[HotFolderSyncEngine] StudyIngested listener error:", err);
			}
		}

		if (study.matchResult.isMatched) {
			for (const l of this.onStudyMatchedListeners) {
				try {
					l(study);
				} catch (err) {
					console.error("[HotFolderSyncEngine] StudyMatched listener error:", err);
				}
			}
		}

		return study;
	}

	/**
	 * Пакетный прием файлов из рабочей папки визиографа.
	 */
	public ingestBatch(
		files: ReadonlyArray<{ name: string; buffer: Uint8Array }>,
	): readonly IngestedHotFolderStudy[] {
		const results: IngestedHotFolderStudy[] = [];
		for (const file of files) {
			try {
				const study = this.ingestFile(file.name, file.buffer);
				results.push(study);
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				for (const l of this.onErrorListeners) {
					try {
						l(err);
					} catch {}
				}
			}
		}
		return results;
	}

	public getStats(): {
		totalIngested: number;
		matchedCount: number;
		unassignedCount: number;
		quarantinedCount: number;
		duplicateCount: number;
	} {
		const matchedCount = this.ingestedStudies.filter((s) => s.matchResult.isMatched).length;
		const unassignedCount = this.ingestedStudies.length - matchedCount;
		const duplicateCount = this.quarantinedStudies.filter((s) => s.quarantineReason === "DUPLICATE_INGESTION").length;

		return {
			totalIngested: this.ingestedStudies.length,
			matchedCount,
			unassignedCount,
			quarantinedCount: this.quarantinedStudies.length,
			duplicateCount,
		};
	}

	public reset(): void {
		this.activeVisits = [];
		this.ingestedStudies = [];
		this.quarantinedStudies = [];
		this.knownHashes.clear();
	}

	private calculateBufferHash(buffer: Uint8Array): string {
		let h1 = 0x811c9dc5;
		let h2 = 0x5a176882;
		const len = buffer.length;

		for (let i = 0; i < len; i += 4) {
			const byte = buffer[i]!;
			h1 = Math.imul(h1 ^ byte, 0x01000193);
			if (i + 1 < len) {
				const b2 = buffer[i + 1]!;
				h2 = Math.imul(h2 ^ b2, 0x01000193);
			}
		}

		const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
		const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
		return `RAD_${hex1}_${hex2}_${len.toString(16).padStart(8, "0")}`;
	}

	private recordQuarantine(
		filename: string,
		fileSizeBytes: number,
		ext: string,
		reason: HotFolderQuarantineReason,
		hash?: string,
	): IngestedHotFolderStudy {
		const metadata = extractRadiologyMetadata(filename);
		const quarantined: IngestedHotFolderStudy = {
			id: `QUARANTINE_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
			sourceFileName: filename,
			fileSizeBytes,
			fileSha256: hash || "UNHASHED",
			fileExtension: ext,
			isDicom: ext === ".dcm" || ext === ".dicom",
			metadata,
			matchResult: {
				isMatched: false,
				matchedVisit: null,
				confidenceScore: 0,
				matchStrategy: "UNASSIGNED",
				matchDetails: `Файл помещен в карантин: ${reason}`,
				candidateCount: 0,
			},
			ingestionTimestamp: Date.now(),
			status: "QUARANTINED",
			quarantineReason: reason,
		};

		this.quarantinedStudies.push(quarantined);

		for (const l of this.onQuarantineListeners) {
			try {
				l(quarantined);
			} catch (err) {
				console.error("[HotFolderSyncEngine] Quarantine listener error:", err);
			}
		}

		return quarantined;
	}
}
