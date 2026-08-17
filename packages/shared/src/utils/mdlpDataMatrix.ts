import { z } from "zod";

// ─── Dental Anesthetic & Medication Types ────────────────────────────────────

export const dentalAnestheticVasoconstrictorSchema = z.enum([
	"none",
	"1:100000",
	"1:200000",
	"1:50000",
]);
export type DentalAnestheticVasoconstrictor = z.infer<
	typeof dentalAnestheticVasoconstrictorSchema
>;

export interface DentalAnestheticInfo {
	id: string;
	tradeName: string;
	tradeNameLatin: string;
	inn: string;
	innLatin: string;
	activeSubstance: string;
	concentrationPct: number;
	vasoconstrictor: DentalAnestheticVasoconstrictor;
	vasoconstrictorName: string;
	carpuleVolumeMl: number;
	dosageForm: string;
	manufacturer: string;
	atxCode: string;
	gtinMatches: string[];
	isPrescriptionOnly: boolean;
}

// ─── Recognized Dental Anesthetics Catalog (MDLP) ───────────────────────────

export const DENTAL_ANESTHETICS_CATALOG: readonly DentalAnestheticInfo[] = [
	{
		id: "ultracain-ds-forte",
		tradeName: "Ультракаин® Д-С форте",
		tradeNameLatin: "Ultracain D-S forte",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.010 мг/мл (1:100 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "Sanofi-Aventis Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: [
			"03664798000016",
			"04013054005016",
			"04601234567893",
			"04607008360011",
			"04013054001018",
		],
		isPrescriptionOnly: true,
	},
	{
		id: "ultracain-ds",
		tradeName: "Ультракаин® Д-С",
		tradeNameLatin: "Ultracain D-S",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.005 мг/мл (1:200 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "Sanofi-Aventis Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: [
			"03664798000023",
			"04013054005023",
			"04607008360028",
			"04013054001025",
		],
		isPrescriptionOnly: true,
	},
	{
		id: "septanest-1-100000",
		tradeName: "Септанест с адреналином 1:100 000",
		tradeNameLatin: "Septanest with Adrenaline 1:100,000",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Адреналина тартрат 0.010 мг/мл (1:100 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB58",
		gtinMatches: [
			"03400930000014",
			"03660000000018",
			"03400935517228",
		],
		isPrescriptionOnly: true,
	},
	{
		id: "septanest-1-200000",
		tradeName: "Септанест с адреналином 1:200 000",
		tradeNameLatin: "Septanest with Adrenaline 1:200,000",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Адреналина тартрат 0.005 мг/мл (1:200 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB58",
		gtinMatches: [
			"03400930000021",
			"03660000000025",
			"03400935517457",
		],
		isPrescriptionOnly: true,
	},
	{
		id: "scandonest-3-plain",
		tradeName: "Скандонест 3% без вазоконстриктора",
		tradeNameLatin: "Scandonest 3% plain",
		inn: "Мепивакаин",
		innLatin: "Mepivacaine",
		activeSubstance:
			"Мепивакаина гидрохлорид 30 мг/мл (3%), Без вазоконстриктора",
		concentrationPct: 3.0,
		vasoconstrictor: "none",
		vasoconstrictorName: "Без вазоконстриктора",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB03",
		gtinMatches: [
			"03400930000038",
			"03660000000032",
			"03400935517686",
		],
		isPrescriptionOnly: true,
	},
	{
		id: "scandonest-2-special",
		tradeName: "Скандонест 2% специальный",
		tradeNameLatin: "Scandonest 2% special",
		inn: "Мепивакаин + Эпинефрин",
		innLatin: "Mepivacaine + Epinephrine",
		activeSubstance:
			"Мепивакаина гидрохлорид 20 мг/мл (2%), Эпинефрина гидрохлорид 1:100 000",
		concentrationPct: 2.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в картриджах 1.7 мл",
		manufacturer: "Septodont, Франция",
		atxCode: "N01BB53",
		gtinMatches: ["03400930000045", "03660000000049"],
		isPrescriptionOnly: true,
	},
	{
		id: "ubistesin-1-200000",
		tradeName: "Убистезин",
		tradeNameLatin: "Ubistesin",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.005 мг/мл (1:200 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:200000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "3M Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: ["04046719000012", "04046719012347"],
		isPrescriptionOnly: true,
	},
	{
		id: "ubistesin-forte",
		tradeName: "Убистезин форте",
		tradeNameLatin: "Ubistesin forte",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрина гидрохлорид 0.010 мг/мл (1:100 000)",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "3M Deutschland GmbH, Германия",
		atxCode: "N01BB58",
		gtinMatches: ["04046719000029", "04046719012354"],
		isPrescriptionOnly: true,
	},
	{
		id: "articaine-generic",
		tradeName: "Артикаин с адреналином (Бинофарм / Органика)",
		tradeNameLatin: "Articaine with Adrenaline",
		inn: "Артикаин + Эпинефрин",
		innLatin: "Articaine + Epinephrine",
		activeSubstance:
			"Артикаина гидрохлорид 40 мг/мл (4%), Эпинефрин 1:100 000 / 1:200 000",
		concentrationPct: 4.0,
		vasoconstrictor: "1:100000",
		vasoconstrictorName: "Эпинефрин (Адреналин)",
		carpuleVolumeMl: 1.7,
		dosageForm: "раствор для инъекций в карпулах 1.7 мл",
		manufacturer: "ОАО Синтез / Бинофарм Групп / Органика, Россия",
		atxCode: "N01BB58",
		gtinMatches: [
			"04602509000015",
			"04605077000016",
			"04602509000022",
		],
		isPrescriptionOnly: true,
	},
];

// ─── GTIN Checksum & Helpers ────────────────────────────────────────────────

/**
 * Calculates GS1 Modulo 10 check digit for a 13-digit string.
 * For a 14-digit GTIN, the first 13 digits are multiplied by weights 3 and 1 alternating:
 * Positions 1, 3, 5, 7, 9, 11, 13 (indices 0, 2, 4, 6, 8, 10, 12) have weight 3.
 * Positions 2, 4, 6, 8, 10, 12 (indices 1, 3, 5, 7, 9, 11) have weight 1.
 */
export function computeGtinCheckDigit(gtin13: string): number {
	if (!/^\d{13}$/.test(gtin13)) {
		throw new Error(
			`Некорректная длина или символы для вычисления контрольного числа GTIN: "${gtin13}". Требуется ровно 13 цифр.`,
		);
	}
	let sum = 0;
	for (let i = 0; i < 13; i++) {
		const digit = Number.parseInt(gtin13[i]!, 10);
		const weight = i % 2 === 0 ? 3 : 1;
		sum += digit * weight;
	}
	const mod = sum % 10;
	return mod === 0 ? 0 : 10 - mod;
}

/**
 * Validates a 14-digit GTIN according to GS1 Modulo 10 check digit rules.
 */
export function isValidGtinChecksum(gtin: string | null | undefined): boolean {
	if (!gtin || typeof gtin !== "string") return false;
	const trimmed = gtin.trim();
	if (!/^\d{14}$/.test(trimmed)) return false;

	const gtin13 = trimmed.slice(0, 13);
	const expectedCheckDigit = computeGtinCheckDigit(gtin13);
	const actualCheckDigit = Number.parseInt(trimmed[13]!, 10);

	return expectedCheckDigit === actualCheckDigit;
}

// ─── Expiration Date Validation ─────────────────────────────────────────────

export interface MdlpExpirationResult {
	isoDate: string | null;
	isExpired: boolean;
	daysUntilExpiration: number | null;
	isExpiringSoon: boolean;
	error?: string;
}

/**
 * Parses GS1 AI (17) date format `YYMMDD`.
 * If day is `00`, the expiration date is set to the last calendar day of the given month.
 */
export function parseMdlpExpirationDate(
	rawYYMMDD: string | null | undefined,
	referenceDate: Date = new Date(),
): MdlpExpirationResult {
	if (!rawYYMMDD || typeof rawYYMMDD !== "string") {
		return {
			isoDate: null,
			isExpired: false,
			daysUntilExpiration: null,
			isExpiringSoon: false,
		};
	}

	const trimmed = rawYYMMDD.trim();
	if (!/^\d{6}$/.test(trimmed)) {
		return {
			isoDate: null,
			isExpired: false,
			daysUntilExpiration: null,
			isExpiringSoon: false,
			error: `Неверный формат даты срока годности GS1 (требуется 6 цифр ГГММДД): "${rawYYMMDD}"`,
		};
	}

	const yy = Number.parseInt(trimmed.slice(0, 2), 10);
	const mm = Number.parseInt(trimmed.slice(2, 4), 10);
	const dd = Number.parseInt(trimmed.slice(4, 6), 10);

	if (mm < 1 || mm > 12) {
		return {
			isoDate: null,
			isExpired: false,
			daysUntilExpiration: null,
			isExpiringSoon: false,
			error: `Некорректный месяц в дате срока годности: ${mm}`,
		};
	}

	// In modern pharma GS1, YY is 2000 + YY
	const year = 2000 + yy;

	let day = dd;
	if (day === 0) {
		// Day '00' means the last day of the month
		day = new Date(Date.UTC(year, mm, 0)).getUTCDate();
	} else {
		// Validate day range for the given month
		const maxDaysInMonth = new Date(Date.UTC(year, mm, 0)).getUTCDate();
		if (day > maxDaysInMonth) {
			return {
				isoDate: null,
				isExpired: false,
				daysUntilExpiration: null,
				isExpiringSoon: false,
				error: `Некорректный день месяца (${day}) для ${year}-${String(mm).padStart(2, "0")}`,
			};
		}
	}

	const isoDate = `${year}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	const expiryUtc = new Date(Date.UTC(year, mm - 1, day, 23, 59, 59, 999));
	const refUtc = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth(),
			referenceDate.getUTCDate(),
		),
	);

	const diffMs = expiryUtc.getTime() - refUtc.getTime();
	const daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = daysUntilExpiration < 0;
	const isExpiringSoon = !isExpired && daysUntilExpiration <= 90;

	return {
		isoDate,
		isExpired,
		daysUntilExpiration,
		isExpiringSoon,
	};
}

// ─── Medication Recognition ─────────────────────────────────────────────────

/**
 * Searches the catalog of dental anesthetics by GTIN, trade name, or INN.
 */
export function recognizeDentalMedication(
	gtin: string,
	searchHint?: string | null,
): DentalAnestheticInfo | null {
	const normalizedGtin = gtin.trim();

	// 1. Direct GTIN match
	const matchByGtin = DENTAL_ANESTHETICS_CATALOG.find((drug) =>
		drug.gtinMatches.includes(normalizedGtin),
	);
	if (matchByGtin) return matchByGtin;

	// 2. Search hint matching if provided
	if (searchHint && searchHint.trim().length > 0) {
		const rawWords = searchHint
			.toLowerCase()
			.replace(/[®™\-_.,/()]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length > 0);

		if (rawWords.length > 0) {
			const matchByHint = DENTAL_ANESTHETICS_CATALOG.find((drug) => {
				const corpus = `${drug.tradeName} ${drug.tradeNameLatin} ${drug.inn} ${drug.innLatin} ${drug.id}`
					.toLowerCase()
					.replace(/[®™\-_.,/()]/g, " ");

				// Match if all search terms exist in the drug corpus
				return rawWords.every((word) => corpus.includes(word));
			});
			if (matchByHint) return matchByHint;
		}
	}

	return null;
}

// ─── DataMatrix Parsing Core ────────────────────────────────────────────────

export interface MdlpParsedBarcode {
	rawBarcode: string;
	gtin: string;
	serialNumber: string;
	cryptoKey: string;
	cryptoSignature: string;
	sgtin: string;
	expirationDate: string | null;
	expirationDateRaw: string | null;
	series: string | null;
	lot: string | null;
	isValidGtinChecksum: boolean;
	isExpired: boolean;
	daysUntilExpiration: number | null;
	isExpiringSoon: boolean;
	recognizedDrug: DentalAnestheticInfo | null;
	parsedAIs: Record<string, string>;
	errors: string[];
	warnings: string[];
	isValid: boolean;
}

/**
 * Standard GS1 Group Separators used across scanners:
 * ASCII 29 (`\x1d` / `\u001d`), string literal `<GS>`, `[GS]`, `{GS}`, `~d029`.
 */
const GS_CHAR = "\x1d";

export function normalizeDataMatrixSeparators(rawInput: string): string {
	let str = rawInput.trim();
	// Remove leading symbology identifiers like ]d2, ]d1, ]Q3 if present
	str = str.replace(/^\][dD][123]|^\][qQ][123]/, "");
	// Normalize common textual representations of GS
	str = str
		.replace(/<GS>/gi, GS_CHAR)
		.replace(/\[GS\]/gi, GS_CHAR)
		.replace(/\{GS\}/gi, GS_CHAR)
		.replace(/\\x1[dD]/g, GS_CHAR)
		.replace(/\\u001[dD]/g, GS_CHAR)
		.replace(/~d029/g, GS_CHAR);
	return str;
}

/**
 * Parses GS1 DataMatrix 2D barcode used in Russian Pharma / Chestny Znak (Честный Знак МДЛП).
 */
export function parseMdlpDataMatrix(
	rawInput: string,
	referenceDate: Date = new Date(),
): MdlpParsedBarcode {
	const errors: string[] = [];
	const warnings: string[] = [];
	const parsedAIs: Record<string, string> = {};

	if (!rawInput || typeof rawInput !== "string" || rawInput.trim().length === 0) {
		return {
			rawBarcode: "",
			gtin: "",
			serialNumber: "",
			cryptoKey: "",
			cryptoSignature: "",
			sgtin: "",
			expirationDate: null,
			expirationDateRaw: null,
			series: null,
			lot: null,
			isValidGtinChecksum: false,
			isExpired: false,
			daysUntilExpiration: null,
			isExpiringSoon: false,
			recognizedDrug: null,
			parsedAIs: {},
			errors: ["Пустая строка штрихкода DataMatrix."],
			warnings: [],
			isValid: false,
		};
	}

	const normalized = normalizeDataMatrixSeparators(rawInput);

	// ─── Mode 1: Parentheses Format (01)...(21)...(91)...(92)... ─────────────
	if (normalized.includes("(") && normalized.includes(")")) {
		const regex = /\((\d{2,4})\)([^()]+)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(normalized)) !== null) {
			const ai = match[1]!;
			const value = match[2]!.trim();
			parsedAIs[ai] = value;
		}
	}

	// ─── Mode 2: Standard Sequential / Stream Parser ─────────────────────────
	if (Object.keys(parsedAIs).length === 0) {
		let cursor = 0;
		const len = normalized.length;

		while (cursor < len) {
			// Skip leading GS separators if any
			while (cursor < len && normalized[cursor] === GS_CHAR) {
				cursor++;
			}
			if (cursor >= len) break;

			// AI (01): GTIN - exactly 14 digits
			if (
				normalized.startsWith("01", cursor) &&
				/^\d{14}/.test(normalized.slice(cursor + 2, cursor + 16))
			) {
				parsedAIs["01"] = normalized.slice(cursor + 2, cursor + 16);
				cursor += 16;
				continue;
			}

			// AI (17): Expiration Date - exactly 6 digits YYMMDD
			if (
				normalized.startsWith("17", cursor) &&
				/^\d{6}/.test(normalized.slice(cursor + 2, cursor + 8))
			) {
				parsedAIs["17"] = normalized.slice(cursor + 2, cursor + 8);
				cursor += 8;
				continue;
			}

			// AI (21): Serial Number - variable length (up to 13 chars standard for MDLP)
			if (normalized.startsWith("21", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS_CHAR, cursor);
				if (end === -1) {
					// Check if next known fixed AI (91) is present
					const next91 = normalized.indexOf("91", cursor);
					// For Russian pharma, serial is typically 13 chars
					if (cursor + 13 <= len && (next91 === cursor + 13 || end === -1)) {
						end = cursor + 13;
					} else if (next91 !== -1) {
						end = next91;
					} else {
						end = len;
					}
				}
				parsedAIs["21"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI (91): Crypto Key - exactly 4 characters
			if (normalized.startsWith("91", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS_CHAR, cursor);
				if (end === -1 || end > cursor + 4) {
					end = Math.min(cursor + 4, len);
				}
				parsedAIs["91"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI (92): Crypto Signature - 44 characters (Base64)
			if (normalized.startsWith("92", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS_CHAR, cursor);
				if (end === -1) {
					end = Math.min(cursor + 44, len);
				}
				parsedAIs["92"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI (10): Lot / Batch Number - variable length up to 20 chars
			if (normalized.startsWith("10", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS_CHAR, cursor);
				if (end === -1) {
					end = Math.min(cursor + 20, len);
				}
				parsedAIs["10"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI (240): Additional Identification
			if (normalized.startsWith("240", cursor)) {
				cursor += 3;
				let end = normalized.indexOf(GS_CHAR, cursor);
				if (end === -1) end = len;
				parsedAIs["240"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// Fallback: advance cursor by 1 if unparsed character
			cursor++;
		}
	}

	// ─── Mode 3: Plain concatenated 85-char Fixed Layout Fallback ────────────
	if (!parsedAIs["01"] || !parsedAIs["21"]) {
		const cleanFixed = normalized.replace(new RegExp(GS_CHAR, "g"), "");
		if (cleanFixed.length >= 85 && cleanFixed.startsWith("01")) {
			const candidateGtin = cleanFixed.slice(2, 16);
			if (/^\d{14}$/.test(candidateGtin) && cleanFixed.slice(16, 18) === "21") {
				parsedAIs["01"] = candidateGtin;
				parsedAIs["21"] = cleanFixed.slice(18, 31);
				if (cleanFixed.slice(31, 33) === "91") {
					parsedAIs["91"] = cleanFixed.slice(33, 37);
					if (cleanFixed.slice(37, 39) === "92") {
						parsedAIs["92"] = cleanFixed.slice(39, 83);
					}
				}
			}
		}
	}

	// ─── Extraction and Field Validation ─────────────────────────────────────

	const gtin = parsedAIs["01"] ?? "";
	const serialNumber = parsedAIs["21"] ?? "";
	const cryptoKey = parsedAIs["91"] ?? "";
	const cryptoSignature = parsedAIs["92"] ?? "";
	const expirationDateRaw = parsedAIs["17"] ?? null;
	const series = parsedAIs["10"] ?? null;
	const lot = series;

	// SGTIN: GTIN (14 digits) + Serial Number
	const sgtin = gtin && serialNumber ? `${gtin}${serialNumber}` : "";

	// 1. GTIN validation
	let isValidGtin = false;
	if (!gtin) {
		errors.push("Отсутствует обязательный идентификатор применения (01) GTIN.");
	} else if (!/^\d{14}$/.test(gtin)) {
		errors.push(
			`Некорректный формат GTIN: "${gtin}". Ожидается ровно 14 цифровых знаков.`,
		);
	} else {
		isValidGtin = isValidGtinChecksum(gtin);
		if (!isValidGtin) {
			errors.push(
				`Неверная контрольная сумма GTIN (Modulo 10 checksum mismatch) для "${gtin}".`,
			);
		}
	}

	// 2. Serial Number validation
	if (!serialNumber) {
		errors.push(
			"Отсутствует обязательный идентификатор применения (21) Серийный номер.",
		);
	} else if (serialNumber.length < 5 || serialNumber.length > 20) {
		warnings.push(
			`Нестандартная длина серийного номера (${serialNumber.length} симв.). Для фармпрепаратов МДЛП стандарт — 13 знаков.`,
		);
	}

	// 3. Crypto key & signature validation
	if (!cryptoKey) {
		warnings.push(
			"Отсутствует криптографический ключ проверки (AI 91). Код может быть неполным.",
		);
	} else if (cryptoKey.length !== 4) {
		warnings.push(
			`Нестандартная длина криптоключа AI (91): ${cryptoKey.length} симв. (ожидается 4).`,
		);
	}

	if (!cryptoSignature) {
		warnings.push(
			"Отсутствует электронная криптоподпись/криптохвост (AI 92). Проверка подлинности невозможна.",
		);
	} else if (cryptoSignature.length !== 44) {
		warnings.push(
			`Нестандартная длина криптохвоста AI (92): ${cryptoSignature.length} симв. (стандарт МДЛП — 44 знака).`,
		);
	}

	// 4. Expiration date
	const expiryResult = parseMdlpExpirationDate(
		expirationDateRaw,
		referenceDate,
	);
	if (expiryResult.error) {
		warnings.push(expiryResult.error);
	}
	if (expiryResult.isExpired) {
		warnings.push(
			`Внимание! Срок годности препарата истёк: ${expiryResult.isoDate}. Применение запрещено.`,
		);
	} else if (expiryResult.isExpiringSoon) {
		warnings.push(
			`Предупреждение: Срок годности препарата истекает в ближайшие 90 дней (${expiryResult.isoDate}).`,
		);
	}

	// 5. Drug recognition
	const recognizedDrug = gtin ? recognizeDentalMedication(gtin) : null;

	const isValid = errors.length === 0 && isValidGtin && Boolean(serialNumber);

	return {
		rawBarcode: rawInput,
		gtin,
		serialNumber,
		cryptoKey,
		cryptoSignature,
		sgtin,
		expirationDate: expiryResult.isoDate,
		expirationDateRaw,
		series,
		lot,
		isValidGtinChecksum: isValidGtin,
		isExpired: expiryResult.isExpired,
		daysUntilExpiration: expiryResult.daysUntilExpiration,
		isExpiringSoon: expiryResult.isExpiringSoon,
		recognizedDrug,
		parsedAIs,
		errors,
		warnings,
		isValid,
	};
}

// ─── MDLP Schema 10560 Generator (Medical Care Write-Off) ───────────────────

export interface MdlpDisposalItem {
	sgtin: string;
	gtin: string;
	serialNumber: string;
	series?: string | null | undefined;
	lot?: string | null | undefined;
	expirationDate?: string | null | undefined;
	costRub?: number | null | undefined;
}

export interface MdlpDisposalParams {
	subjectId: string;
	operationDate?: string | Date | null | undefined;
	docNum: string;
	docDate: string;
	withdrawalType?: number | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	notes?: string | null | undefined;
	items: MdlpDisposalItem[];
}

export interface MdlpSchema10560Document {
	actionId: 10560;
	subjectId: string;
	operationDate: string;
	docNum: string;
	docDate: string;
	withdrawalType: 13;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	doctorId?: string | null | undefined;
	items: MdlpDisposalItem[];
	xmlContent: string;
	jsonContent: Record<string, unknown>;
}

/**
 * Escapes XML special characters for safety.
 */
function escapeXml(unsafe: string | null | undefined): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Generates an official MDLP Schema 10560 Document
 * "Регистрация в ИС МДЛП сведений о выводе из оборота лекарственных препаратов для оказания медицинской помощи"
 */
export function generateMdlpSchema10560Payload(
	params: MdlpDisposalParams,
): MdlpSchema10560Document {
	if (!params.subjectId || params.subjectId.trim().length === 0) {
		throw new Error(
			"Идентификатор субъекта обращения МДЛП (subjectId) обязателен для формирования схемы 10560.",
		);
	}
	if (!params.docNum || params.docNum.trim().length === 0) {
		throw new Error(
			"Номер первичного медицинского документа (docNum) обязателен для списания медикаментов.",
		);
	}
	if (!params.docDate || params.docDate.trim().length === 0) {
		throw new Error(
			"Дата первичного документа (docDate) обязательна для списания медикаментов.",
		);
	}
	if (!params.items || params.items.length === 0) {
		throw new Error(
			"Список списываемых медикаментов (items) не может быть пустым.",
		);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	// XML Document Structure according to MDLP XSD schema 10560
	const sgtinTags = params.items
		.map(
			(it) => `      <union>
        <sgtin>${escapeXml(it.sgtin)}</sgtin>${
					it.costRub != null
						? `\n        <cost>${it.costRub.toFixed(2)}</cost>`
						: ""
				}
      </union>`,
		)
		.join("\n");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<documents version="1.37" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <withdrawal action_id="10560">
    <subject_id>${escapeXml(params.subjectId)}</subject_id>
    <operation_date>${escapeXml(opDate)}</operation_date>
    <doc_num>${escapeXml(params.docNum)}</doc_num>
    <doc_date>${escapeXml(params.docDate)}</doc_date>
    <withdrawal_type>13</withdrawal_type>
    <order_details>
${sgtinTags}
    </order_details>
  </withdrawal>
</documents>`;

	const jsonContent: Record<string, unknown> = {
		action_id: 10560,
		subject_id: params.subjectId,
		operation_date: opDate,
		doc_num: params.docNum,
		doc_date: params.docDate,
		withdrawal_type: 13,
		patient_id: params.patientId ?? null,
		visit_id: params.visitId ?? null,
		doctor_id: params.doctorId ?? null,
		order_details: params.items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin,
			serial_number: it.serialNumber,
			series: it.series ?? null,
			lot: it.lot ?? null,
			cost: it.costRub ?? null,
		})),
	};

	return {
		actionId: 10560,
		subjectId: params.subjectId,
		operationDate: opDate,
		docNum: params.docNum,
		docDate: params.docDate,
		withdrawalType: 13,
		patientId: params.patientId ?? null,
		visitId: params.visitId ?? null,
		doctorId: params.doctorId ?? null,
		items: params.items,
		xmlContent,
		jsonContent,
	};
}
