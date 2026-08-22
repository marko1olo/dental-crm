/**
 * Marking Code & GS1 DataMatrix Validator for 54-FZ FFD 1.2 & Chestny ZNAK / MDLP.
 * Compliant with Federal Law No. 425-FZ, 54-FZ (Tags 1162, 1163, 2000), and GS1 General Specifications.
 */

import { z } from "zod";
import type { Ffd12MarkingCodeDescriptor } from "./ffd12Types.js";

export interface DentalMarkingCatalogItem {
	tradeName: string;
	category: "anesthetic" | "implant" | "bone_graft" | "membrane" | "other_med";
}

/**
 * Known Dental Medications & Medical Devices GTIN Catalog (Честный ЗНАК / МДЛП)
 */
export const DENTAL_MDLP_MARKING_CATALOG: Record<
	string,
	DentalMarkingCatalogItem
> = {
	"03664798000016": { tradeName: "Ультракаин® Д-С форте (Sanofi)", category: "anesthetic" },
	"04013054005016": { tradeName: "Ультракаин® Д-С форте 1.7 мл (Sanofi)", category: "anesthetic" },
	"04601234567893": { tradeName: "Ультракаин® Д-С форте (Р-Фарм)", category: "anesthetic" },
	"03664798000023": { tradeName: "Ультракаин® Д-С (Sanofi)", category: "anesthetic" },
	"04013054005023": { tradeName: "Ультракаин® Д-С 1.7 мл (Sanofi)", category: "anesthetic" },
	"03400930000014": { tradeName: "Септанест с адреналином 1:100 000 (Septodont)", category: "anesthetic" },
	"03400930000021": { tradeName: "Септанест с адреналином 1:200 000 (Septodont)", category: "anesthetic" },
	"04013054001018": { tradeName: "Убистезин форте (3M ESPE)", category: "anesthetic" },
	"04013054001025": { tradeName: "Убистезин 1:200 000 (3M ESPE)", category: "anesthetic" },
	"03400930000038": { tradeName: "Скандонест 3% без вазоконстриктора (Septodont)", category: "anesthetic" },
	"07612345678901": { tradeName: "Дентальный имплантат Straumann BLX", category: "implant" },
	"07612345678918": { tradeName: "Дентальный имплантат Nobel Biocare Conical", category: "implant" },
	"07612345678925": { tradeName: "Дентальный имплантат Osstem TS III", category: "implant" },
	"07612345678932": { tradeName: "Костнозамещающий материал Geistlich Bio-Oss", category: "bone_graft" },
	"07612345678949": { tradeName: "Коллагеновая мембрана Geistlich Bio-Gide", category: "membrane" },
};

/**
 * Calculates and validates GS1 Modulo 10 Checksum digit for GTIN-14 / GTIN-13 / GTIN-8.
 */
export function isValidGs1Checksum(gtin: string): boolean {
	const clean = gtin.trim();
	if (!/^\d{8}|\d{12,14}$/.test(clean)) return false;

	const digits = clean.slice(0, -1).split("").map(Number);
	const checkDigit = Number(clean.slice(-1));

	let sum = 0;
	let multiplyByThree = true;

	for (let i = digits.length - 1; i >= 0; i--) {
		sum += (digits[i] ?? 0) * (multiplyByThree ? 3 : 1);
		multiplyByThree = !multiplyByThree;
	}

	const computedCheck = (10 - (sum % 10)) % 10;
	return computedCheck === checkDigit;
}

export interface DataMatrixParseResult {
	readonly isValid: boolean;
	readonly rawString: string;
	readonly gtin?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly cryptoKey?: string | undefined;
	readonly cryptoTail?: string | undefined;
	readonly expirationDate?: string | undefined; // YYYY-MM-DD
	readonly seriesOrLot?: string | undefined;
	readonly matchedTradeName?: string | undefined;
	readonly matchedProduct?: DentalMarkingCatalogItem | undefined;
	readonly errorMessage?: string | undefined;
}

/**
 * Parses and validates GS1 DataMatrix barcode string (Честный ЗНАК / МДЛП).
 * Supports standard ASCII with GS delimiter (\x1d), plain concatenation, and human-readable (01)...(21)... formats.
 */
export function parseChestnyZnakDataMatrix(rawInput: string): DataMatrixParseResult {
	if (!rawInput || typeof rawInput !== "string") {
		return {
			isValid: false,
			rawString: "",
			errorMessage: "Строка DataMatrix пуста или отсутствует.",
		};
	}

	const raw = rawInput.trim();

	// Format 1: Human-readable with brackets, e.g. (01)04601234567893(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ...
	if (raw.startsWith("(01)") || raw.includes("(21)")) {
		const gtinMatch = raw.match(/\(01\)(\d{14})/);
		const serialMatch = raw.match(/\(21\)([^()]+)/);
		const cryptoKeyMatch = raw.match(/\(91\)([^()]+)/);
		const cryptoTailMatch = raw.match(/\(92\)([^()]+)/);
		const expMatch = raw.match(/\(17\)(\d{6})/);
		const lotMatch = raw.match(/\(10\)([^()]+)/);

		if (!gtinMatch || !serialMatch) {
			return {
				isValid: false,
				rawString: raw,
				errorMessage: "В скобочном формате DataMatrix отсутствуют обязательные поля (01) GTIN или (21) Серийный номер.",
			};
		}

		const gtin = gtinMatch[1] ?? "";
		const serialNumber = serialMatch[1]?.trim() ?? "";

		if (!isValidGs1Checksum(gtin)) {
			return {
				isValid: false,
				rawString: raw,
				gtin,
				serialNumber,
				errorMessage: `Неверная контрольная сумма GTIN: ${gtin}`,
			};
		}

		const catalogEntry = DENTAL_MDLP_MARKING_CATALOG[gtin];

		return {
			isValid: true,
			rawString: raw,
			gtin,
			serialNumber,
			cryptoKey: cryptoKeyMatch ? cryptoKeyMatch[1]?.trim() : undefined,
			cryptoTail: cryptoTailMatch ? cryptoTailMatch[1]?.trim() : undefined,
			expirationDate: expMatch ? parseGs1Date(expMatch[1] ?? "") : undefined,
			seriesOrLot: lotMatch ? lotMatch[1]?.trim() : undefined,
			matchedTradeName: catalogEntry ? catalogEntry.tradeName : undefined,
			matchedProduct: catalogEntry ? catalogEntry : undefined,
		};
	}

	// Format 2: Raw ASCII barcode string with GS (\x1d or \u001d) or plain AI prefix
	let cleaned = raw.replace(/[\u001D\x1D]/g, "\x1d");

	let gtin = "";
	let serialNumber = "";
	let cryptoKey: string | undefined;
	let cryptoTail: string | undefined;

	if (cleaned.startsWith("01") && cleaned.length >= 16) {
		gtin = cleaned.slice(2, 16);

		if (!/^\d{14}$/.test(gtin)) {
			return {
				isValid: false,
				rawString: raw,
				errorMessage: "Идентификатор GTIN (01) должен содержать ровно 14 цифр.",
			};
		}

		const remainder = cleaned.slice(16);
		if (remainder.startsWith("21")) {
			const afterSerialPrefix = remainder.slice(2);
			const gsIndex = afterSerialPrefix.indexOf("\x1d");

			if (gsIndex !== -1) {
				serialNumber = afterSerialPrefix.slice(0, gsIndex);
				const afterGs = afterSerialPrefix.slice(gsIndex + 1);

				// Parse 91 and 92 crypto elements
				if (afterGs.startsWith("91")) {
					const cryptoKeyPart = afterGs.slice(2);
					const nextGs = cryptoKeyPart.indexOf("\x1d");
					if (nextGs !== -1) {
						cryptoKey = cryptoKeyPart.slice(0, nextGs);
						const afterNextGs = cryptoKeyPart.slice(nextGs + 1);
						if (afterNextGs.startsWith("92")) {
							cryptoTail = afterNextGs.slice(2);
						}
					} else if (cryptoKeyPart.length >= 4) {
						cryptoKey = cryptoKeyPart.slice(0, 4);
						const potential92 = cryptoKeyPart.slice(4);
						if (potential92.startsWith("92")) {
							cryptoTail = potential92.slice(2);
						}
					}
				}
			} else {
				// Fixed 13-character serial length standard for MDLP
				if (afterSerialPrefix.length >= 13) {
					serialNumber = afterSerialPrefix.slice(0, 13);
					const rest = afterSerialPrefix.slice(13);
					if (rest.startsWith("91") && rest.length >= 6) {
						cryptoKey = rest.slice(2, 6);
						const after91 = rest.slice(6);
						if (after91.startsWith("92")) {
							cryptoTail = after91.slice(2);
						}
					}
				} else {
					serialNumber = afterSerialPrefix;
				}
			}
		}
	} else if (/^\d{14}/.test(cleaned)) {
		gtin = cleaned.slice(0, 14);
		serialNumber = cleaned.slice(14);
	}

	if (!gtin || !serialNumber) {
		return {
			isValid: false,
			rawString: raw,
			errorMessage: "Не удалось распознать GTIN и серийный номер из строки DataMatrix.",
		};
	}

	if (!isValidGs1Checksum(gtin)) {
		return {
			isValid: false,
			rawString: raw,
			gtin,
			serialNumber,
			errorMessage: `Неверная контрольная сумма GTIN: ${gtin}`,
		};
	}

	const catalogEntry = DENTAL_MDLP_MARKING_CATALOG[gtin];

	return {
		isValid: true,
		rawString: raw,
		gtin,
		serialNumber,
		cryptoKey,
		cryptoTail,
		matchedTradeName: catalogEntry ? catalogEntry.tradeName : undefined,
		matchedProduct: catalogEntry ? catalogEntry : undefined,
	};
}

/**
 * Helper to parse GS1 YYMMDD format into ISO YYYY-MM-DD.
 */
function parseGs1Date(yymmdd: string): string {
	if (!/^\d{6}$/.test(yymmdd)) return yymmdd;
	const yy = Number(yymmdd.slice(0, 2));
	const mm = yymmdd.slice(2, 4);
	const dd = yymmdd.slice(4, 6);
	const fullYear = yy >= 70 ? 1900 + yy : 2000 + yy;
	return `${fullYear}-${mm}-${dd}`;
}

/**
 * Builds statutory FFD 1.2 Tag 2000 (КТ 1.2 / Код товара) payload for KKT driver.
 */
export function buildFfd12Tag2000MarkingPayload(descriptor: Ffd12MarkingCodeDescriptor): {
	tag1162_binaryCode?: string | undefined;
	tag1163_markingCode: string;
	tag2106_checkResult: number;
	tag2107_productStatus: number;
	gtin: string;
	serialNumber: string;
} {
	return {
		tag1163_markingCode: descriptor.rawDataMatrix,
		tag2106_checkResult: descriptor.checkResultCode ?? 15, // 15 = проверка в ФН выполнена успешно
		tag2107_productStatus: descriptor.productCheckStatus ?? 1, // 1 = штучный товар, проверен
		gtin: descriptor.gtin,
		serialNumber: descriptor.serialNumber,
	};
}
