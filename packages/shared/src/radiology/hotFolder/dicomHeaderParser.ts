/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Layer 1: DICOM & Filename Parser, Transliteration & FDI Tooth Mapping
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { type ParsedDicomDataset } from "../../imaging/dicomParser.js";
import type {
	DentalStudyType,
	ExtractedRadiologyMetadata,
	RadiologySoftwareVendor,
} from "./types.js";

// ─── 1. ТРАНСЛИТЕРАЦИЯ И СРАВНЕНИЕ РУССКИХ ФИО ───────────────────────────────

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

// ─── 2. ПАРСЕР ИМЁН ФАЙЛОВ И DICOM МЕТАДАННЫХ ─────────────────────────────────

export function isValidToothFdi(tooth: number): boolean {
	if (!Number.isInteger(tooth)) return false;
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
	const isoDateMatch = cleanName.match(/(?:^|[^0-9])(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?![0-9])/);
	if (isoDateMatch && isoDateMatch[1] && isoDateMatch[2] && isoDateMatch[3]) {
		acquisitionDate = `${isoDateMatch[1]}${isoDateMatch[2]}${isoDateMatch[3]}`;
		dateMonth = isoDateMatch[2];
		dateDay = isoDateMatch[3];
	} else {
		const ruDateMatch = cleanName.match(/(?:^|[^0-9])(0[1-9]|[12]\d|3[01])[-_.](0[1-9]|1[0-2])[-_.](20\d{2})(?![0-9])/);
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
