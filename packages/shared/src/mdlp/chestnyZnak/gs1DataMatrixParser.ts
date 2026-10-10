import { generateSecureAlphanumericId } from "../../utils/idGenerators.js";
import { recognizeDentalMedication } from "../catalog.js";
import {
	computeGtinCheckDigit,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpExpirationDate,
} from "../parser.js";
import type { MdlpExpirationResult } from "../types.js";
import type {
	ChestnyZnakScannedItem,
	ChestnyZnakVerificationStatus,
	ParsedChestnyZnakBarcode,
} from "./types.js";

/**
 * Parses any Chestny ZNAK / MDLP DataMatrix barcode string into structured components.
 * Robust against varied GS1 representations (\x1D, <GS>, (01), concatenated fixed layouts).
 */
export function parseChestnyZnakBarcode(
	rawInput: unknown,
	referenceDate: Date = new Date(),
): ParsedChestnyZnakBarcode {
	const errors: string[] = [];
	const warnings: string[] = [];
	const parsedAIs: Record<string, string> = {};

	if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
		return {
			rawBarcode: typeof rawInput === "string" ? rawInput : "",
			gtin: "",
			serialNumber: "",
			sgtin: "",
			cryptoKey: null,
			cryptoSignature: null,
			expirationDate: null,
			expirationDateRaw: null,
			isExpired: false,
			isExpiringSoon: false,
			daysUntilExpiration: null,
			series: null,
			lot: null,
			isValidGtinChecksum: false,
			recognizedDrug: null,
			parsedAIs: {},
			status: "invalid_format",
			statusReason: "Пустая строка штрихкода",
			errors: ["Строка штрихкода не может быть пустой."],
			warnings: [],
		};
	}

	const normalized = normalizeDataMatrixSeparators(rawInput);

	// 1. Parenthesized AI parsing mode: (01)0460...(21)...(17)...
	const parenRegex = /\((\d{2,4})\)([^()]+)/g;
	let parenMatch: RegExpExecArray | null = null;
	let foundParens = false;

	while (true) {
		parenMatch = parenRegex.exec(normalized);
		if (!parenMatch) break;
		foundParens = true;
		const ai = parenMatch[1]!;
		const val = parenMatch[2]!.trim();
		parsedAIs[ai] = val;
	}

	// 2. Standard GS1 DataMatrix with Group Separators (\x1D)
	if (!foundParens) {
		let cursor = 0;
		const len = normalized.length;
		const GS = "\x1d";

		while (cursor < len) {
			if (normalized[cursor] === GS) {
				cursor++;
				continue;
			}

			// AI 01: GTIN - 14 digits
			if (
				normalized.startsWith("01", cursor) &&
				/^\d{14}/.test(normalized.slice(cursor + 2, cursor + 16))
			) {
				parsedAIs["01"] = normalized.slice(cursor + 2, cursor + 16);
				cursor += 16;
				continue;
			}

			// AI 17: Expiration Date - 6 digits YYMMDD
			if (
				normalized.startsWith("17", cursor) &&
				/^\d{6}/.test(normalized.slice(cursor + 2, cursor + 8))
			) {
				parsedAIs["17"] = normalized.slice(cursor + 2, cursor + 8);
				cursor += 8;
				continue;
			}

			// AI 21: Serial Number - variable length
			if (normalized.startsWith("21", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS, cursor);
				if (end === -1) {
					const next91 = normalized.indexOf("91", cursor);
					const next17 = normalized.indexOf("17", cursor);
					const next10 = normalized.indexOf("10", cursor);
					const candidates = [next91, next17, next10].filter((idx) => idx > cursor);
					if (candidates.length > 0) {
						end = Math.min(...candidates);
					} else if (cursor + 13 <= len) {
						end = cursor + 13;
					} else {
						end = len;
					}
				}
				parsedAIs["21"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI 91: Crypto Key - 4 characters
			if (normalized.startsWith("91", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS, cursor);
				if (end === -1 || end > cursor + 4) {
					end = Math.min(cursor + 4, len);
				}
				parsedAIs["91"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI 92: Crypto Signature - 44 characters (or until GS)
			if (normalized.startsWith("92", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS, cursor);
				if (end === -1) {
					end = Math.min(cursor + 44, len);
				}
				parsedAIs["92"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI 10: Lot / Batch - variable length
			if (normalized.startsWith("10", cursor)) {
				cursor += 2;
				let end = normalized.indexOf(GS, cursor);
				if (end === -1) {
					end = Math.min(cursor + 20, len);
				}
				parsedAIs["10"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			// AI 240: Additional product code
			if (normalized.startsWith("240", cursor)) {
				cursor += 3;
				let end = normalized.indexOf(GS, cursor);
				if (end === -1) end = len;
				parsedAIs["240"] = normalized.slice(cursor, end);
				cursor = end;
				continue;
			}

			cursor++;
		}
	}

	// 3. Fallback fixed 85-char string parsing
	if (!parsedAIs["01"] || !parsedAIs["21"]) {
		const clean = normalized.replace(/\x1d/g, "");
		if (clean.length >= 27 && clean.startsWith("01")) {
			const candGtin = clean.slice(2, 16);
			if (/^\d{14}$/.test(candGtin)) {
				parsedAIs["01"] = candGtin;
				if (clean.slice(16, 18) === "21") {
					parsedAIs["21"] = clean.slice(18, 31);
					if (clean.slice(31, 33) === "91") {
						parsedAIs["91"] = clean.slice(33, 37);
						if (clean.slice(37, 39) === "92") {
							parsedAIs["92"] = clean.slice(39, 83);
						}
					}
				}
			}
		}
	}

	const gtin = parsedAIs["01"] ?? "";
	const serialNumber = parsedAIs["21"] ?? "";
	const cryptoKey = parsedAIs["91"] ?? null;
	const cryptoSignature = parsedAIs["92"] ?? null;
	const expirationDateRaw = parsedAIs["17"] ?? null;
	const series = parsedAIs["10"] ?? null;
	const lot = series;

	const sgtin = gtin && serialNumber ? `${gtin}${serialNumber}` : "";

	// Validation checks
	let isValidGtin = false;
	if (!gtin) {
		errors.push("Отсутствует обязательный идентификатор (01) GTIN.");
	} else if (!/^\d{14}$/.test(gtin)) {
		errors.push(`Неверный формат GTIN: "${gtin}". Должно быть ровно 14 цифр.`);
	} else {
		isValidGtin = isValidGtinChecksum(gtin);
		if (!isValidGtin) {
			errors.push(
				`Неверная контрольная сумма GTIN (Modulo 10 checksum mismatch) для "${gtin}".`,
			);
		}
	}

	if (!serialNumber) {
		errors.push("Отсутствует обязательный идентификатор (21) серийного номера.");
	}

	let expiryResult: MdlpExpirationResult = {
		isoDate: null,
		isExpired: false,
		daysUntilExpiration: null,
		isExpiringSoon: false,
	};

	if (expirationDateRaw) {
		expiryResult = parseMdlpExpirationDate(expirationDateRaw, referenceDate);
		if (expiryResult.error) {
			warnings.push(expiryResult.error);
		}
	}

	if (cryptoKey && cryptoKey.length !== 4) {
		warnings.push(`Нестандартная длина криптоключа AI(91): ${cryptoKey.length} симв.`);
	}

	if (cryptoSignature && cryptoSignature.length < 4) {
		warnings.push(`Короткий криптохвост AI(92): ${cryptoSignature.length} симв.`);
	}

	const recognizedDrug = gtin ? recognizeDentalMedication(gtin) : null;

	// Determine Verification Status
	let status: ChestnyZnakVerificationStatus;
	let statusReason: string;

	if (!gtin || !serialNumber || errors.some((e) => e.includes("Отсутствует"))) {
		status = "invalid_format";
		statusReason = errors[0] ?? "Невалидный формат штрихкода маркировки";
	} else if (!isValidGtin) {
		status = "invalid_checksum";
		statusReason = "Несовпадение контрольной суммы GTIN по алгоритму Modulo 10";
	} else if (expiryResult.isExpired) {
		status = "expired";
		statusReason = `Срок годности истек: ${expiryResult.isoDate}`;
	} else if (
		expiryResult.isExpiringSoon ||
		!cryptoSignature ||
		warnings.length > 0
	) {
		status = "warning";
		if (expiryResult.isExpiringSoon) {
			statusReason = `Срок годности истекает через ${expiryResult.daysUntilExpiration} дн. (${expiryResult.isoDate})`;
		} else if (!cryptoSignature) {
			statusReason = "Отсутствует криптохвост проверки подлинности";
		} else {
			statusReason = warnings[0] ?? "Предупреждение валидации";
		}
	} else {
		status = "verified";
		statusReason = "Код маркировки полностью проверен и валиден";
	}

	return {
		rawBarcode: typeof rawInput === "string" ? rawInput : "",
		gtin,
		serialNumber,
		sgtin,
		cryptoKey,
		cryptoSignature,
		expirationDate: expiryResult.isoDate,
		expirationDateRaw,
		isExpired: expiryResult.isExpired,
		isExpiringSoon: expiryResult.isExpiringSoon,
		daysUntilExpiration: expiryResult.daysUntilExpiration,
		series,
		lot,
		isValidGtinChecksum: isValidGtin,
		recognizedDrug,
		parsedAIs,
		status,
		statusReason,
		errors,
		warnings,
	};
}

/**
 * Creates a fully initialized ChestnyZnakScannedItem from a 2D barcode scan.
 */
export function createChestnyZnakScannedItem(
	rawInput: unknown,
	options: {
		id?: string | undefined;
		costRub?: number | null | undefined;
		vatRate?: 0 | 10 | 20 | undefined;
		referenceDate?: Date | undefined;
	} = {},
): ChestnyZnakScannedItem {
	const parsed = parseChestnyZnakBarcode(rawInput, options.referenceDate);
	const id = options.id ?? `cz-${Date.now()}-${generateSecureAlphanumericId(6)}`;

	const tradeName =
		parsed.recognizedDrug?.tradeName ??
		(parsed.gtin ? `Препарат GTIN: ${parsed.gtin}` : "Нераспознанный медикамент");

	const inn = parsed.recognizedDrug?.inn ?? "—";
	const dosageForm = parsed.recognizedDrug?.dosageForm ?? "Упаковка / Флакон";
	const costRub = options.costRub != null && !Number.isNaN(options.costRub) ? options.costRub : null;
	const vatRate = options.vatRate ?? 10;

	return {
		id,
		rawBarcode: parsed.rawBarcode,
		gtin: parsed.gtin,
		serialNumber: parsed.serialNumber,
		sgtin: parsed.sgtin,
		expirationDate: parsed.expirationDate,
		expirationDateRaw: parsed.expirationDateRaw,
		isExpired: parsed.isExpired,
		isExpiringSoon: parsed.isExpiringSoon,
		daysUntilExpiration: parsed.daysUntilExpiration,
		series: parsed.series,
		lot: parsed.lot,
		cryptoKey: parsed.cryptoKey,
		cryptoSignature: parsed.cryptoSignature,
		status: parsed.status,
		statusReason: parsed.statusReason,
		tradeName,
		inn,
		dosageForm,
		recognizedDrug: parsed.recognizedDrug,
		costRub,
		vatRate,
		scannedAt: new Date().toISOString(),
	};
}

// Re-export core algorithms for unified access
export { computeGtinCheckDigit, isValidGtinChecksum };
