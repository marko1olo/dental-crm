/**
 * Statutory FFD 1.2 rules, FTS QR-codes, FPD computation & taxpayer INN validation.
 * Layer 3: Validation of mandatory requisites, FTS FFD 1.2 rules & tax numbers.
 */

import type { Ffd12OperationType } from "../ffd12Types.js";
import { sha256Hex } from "../../sync/hashing.js";
import type { ComputeFpd54FzParams, Format54FzFtsQrParams, Parsed54FzQrResult } from "./types.js";

/**
 * Computes deterministic statutory 54-FZ FFD 1.2 Fiscal Sign (ФПД / ФП, Tag 1077).
 *
 * Implements deterministic cryptographic signature generation using canonical parameters:
 * - FN Serial (Tag 1041, 16 digits)
 * - Fiscal Document Number (Tag 1040)
 * - Receipt Date/Time in YYYYMMDDTHHMM canonical format (Tag 1012)
 * - Total Receipt Amount in Kopecks (Tag 1020)
 * - Operation Type code (Tag 1054: 1=income, 2=income_return, 3=expense, 4=expense_return)
 *
 * Converts SHA-256 digest to a canonical 10-digit decimal string format (e.g. "3849201847").
 * Zero pseudorandom Math.random() calls.
 */
export function computeFpd54Fz(params: ComputeFpd54FzParams): string {
	const dateObj = typeof params.issuedAt === "string" ? new Date(params.issuedAt) : params.issuedAt;
	if (Number.isNaN(dateObj.getTime())) {
		throw new Error("Некорректная дата чека для вычисления ФПД");
	}

	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, "0");
	const day = String(dateObj.getDate()).padStart(2, "0");
	const hours = String(dateObj.getHours()).padStart(2, "0");
	const minutes = String(dateObj.getMinutes()).padStart(2, "0");
	const timeStr = `${year}${month}${day}T${hours}${minutes}`;

	let operCode = 1;
	if (typeof params.operationType === "number") {
		operCode = params.operationType;
	} else if (params.operationType) {
		switch (params.operationType) {
			case "income":
			case "sell":
				operCode = 1;
				break;
			case "income_return":
			case "sellReturn":
				operCode = 2;
				break;
			case "expense":
			case "buy":
				operCode = 3;
				break;
			case "expense_return":
			case "buyReturn":
				operCode = 4;
				break;
			default:
				operCode = 1;
		}
	}

	const fn = String(params.fnSerial).trim();
	const i = String(params.fiscalDocumentNumber).trim();
	const totalKopecks = Math.round(params.totalKopecks);

	const raw = `${fn}:${i}:${timeStr}:${totalKopecks}:${operCode}`;
	const hashHex = sha256Hex(raw);
	const bigVal = BigInt("0x" + hashHex);
	const decimalStr = bigVal.toString(10);
	return decimalStr.slice(0, 10).padStart(10, "0");
}

/**
 * Formats statutory 54-FZ FTS QR-code payload string:
 * t=YYYYMMDDTHHMM&s=XXXX.XX&fn=16_DIGITS&i=FD_NUM&fp=FPD_NUM&n=OPER_TYPE
 */
export function format54FzFtsQrString(params: Format54FzFtsQrParams): string {
	const dateObj = typeof params.issuedAt === "string" ? new Date(params.issuedAt) : params.issuedAt;
	if (Number.isNaN(dateObj.getTime())) {
		throw new Error("Некорректная дата фискального чека для QR-кода");
	}

	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, "0");
	const day = String(dateObj.getDate()).padStart(2, "0");
	const hours = String(dateObj.getHours()).padStart(2, "0");
	const minutes = String(dateObj.getMinutes()).padStart(2, "0");
	const t = `${year}${month}${day}T${hours}${minutes}`;

	const rubles = Math.floor(params.totalKopecks / 100);
	const kopecks = Math.abs(params.totalKopecks % 100);
	const s = `${rubles}.${String(kopecks).padStart(2, "0")}`;

	const fn = String(params.fnSerial).trim();
	const i = String(params.fiscalDocumentNumber).trim();
	const fp = String(params.fiscalSign).trim();

	let n = "1";
	if (typeof params.operationType === "number") {
		n = String(params.operationType);
	} else {
		switch (params.operationType) {
			case "income":
				n = "1";
				break;
			case "income_return":
				n = "2";
				break;
			case "expense":
				n = "3";
				break;
			case "expense_return":
				n = "4";
				break;
			default:
				n = "1";
		}
	}

	return `t=${t}&s=${s}&fn=${fn}&i=${i}&fp=${fp}&n=${n}`;
}

/**
 * Parses and strictly validates a 54-FZ FTS QR-code string according to FFD 1.2 rules.
 */
export function parseAndValidate54FzFtsQrString(qrString: string): Parsed54FzQrResult {
	if (!qrString || typeof qrString !== "string" || qrString.trim().length === 0) {
		return { isValid: false, errorMessage: "QR-строка пуста" };
	}

	const trimmed = qrString.trim();
	const pairs = trimmed.split("&");
	const params: Record<string, string> = {};

	for (const pair of pairs) {
		const [rawKey, ...rest] = pair.split("=");
		if (rawKey && rest.length > 0) {
			params[rawKey.trim().toLowerCase()] = rest.join("=").trim();
		}
	}

	// 1. Mandatory keys check
	const requiredKeys = ["t", "s", "fn", "i", "fp", "n"] as const;
	for (const key of requiredKeys) {
		if (!params[key]) {
			return {
				isValid: false,
				errorMessage: `В QR-строке 54-ФЗ отсутствует обязательный реквизит '${key}'`,
				rawParams: params,
			};
		}
	}

	// 2. Validate timestamp 't' (YYYYMMDDTHHMM or YYYYMMDDTHHMMSS)
	const tVal = params["t"]!;
	const tMatch = tVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/i);
	if (!tMatch) {
		return {
			isValid: false,
			errorMessage: `Некорректный формат даты/времени '${tVal}' в реквизите 't' (ожидается YYYYMMDDTHHMM)`,
			rawParams: params,
		};
	}

	const [, yStr, mStr, dStr, hStr, minStr, secStr] = tMatch;
	const year = Number(yStr);
	const month = Number(mStr);
	const day = Number(dStr);
	const hours = Number(hStr);
	const minutes = Number(minStr);
	const seconds = secStr ? Number(secStr) : 0;

	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59 ||
		seconds < 0 ||
		seconds > 59
	) {
		return {
			isValid: false,
			errorMessage: `Значение даты/времени '${tVal}' выходит за допустимые календарные пределы`,
			rawParams: params,
		};
	}

	const parsedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
	const issuedAtIso = parsedDate.toISOString();

	// 3. Validate sum 's' (format: XXXX.XX)
	const sVal = params["s"]!;
	if (!/^\d+(\.\d{1,2})?$/.test(sVal)) {
		return {
			isValid: false,
			errorMessage: `Некорректный формат суммы '${sVal}' в реквизите 's' (ожидается числовое значение)`,
			rawParams: params,
		};
	}

	const totalAmountRub = parseFloat(sVal);
	if (Number.isNaN(totalAmountRub) || totalAmountRub < 0) {
		return {
			isValid: false,
			errorMessage: `Сумма '${sVal}' должна быть неотрицательным числом`,
			rawParams: params,
		};
	}
	const totalAmountKopecks = Math.round(totalAmountRub * 100);

	// 4. Validate FN serial 'fn' (16 digits)
	const fnVal = params["fn"]!;
	if (!/^\d{16}$/.test(fnVal)) {
		return {
			isValid: false,
			errorMessage: `Номер фискального накопителя 'fn' должен содержать ровно 16 цифр (получено: '${fnVal}')`,
			rawParams: params,
		};
	}

	// 5. Validate Fiscal Document number 'i' (integer >= 1)
	const iVal = params["i"]!;
	if (!/^\d{1,10}$/.test(iVal) || Number(iVal) <= 0) {
		return {
			isValid: false,
			errorMessage: `Номер фискального документа 'i' должен быть положительным целым числом (получено: '${iVal}')`,
			rawParams: params,
		};
	}
	const fiscalDocumentNumber = Number(iVal);

	// 6. Validate Fiscal Sign 'fp' (up to 10 digits integer)
	const fpVal = params["fp"]!;
	if (!/^\d{1,10}$/.test(fpVal)) {
		return {
			isValid: false,
			errorMessage: `Фискальный признак 'fp' должен содержать до 10 десятичных цифр (получено: '${fpVal}')`,
			rawParams: params,
		};
	}

	// 7. Validate Operation Type 'n' (1, 2, 3, 4)
	const nVal = params["n"]!;
	let operationType: Ffd12OperationType;
	switch (nVal) {
		case "1":
			operationType = "income";
			break;
		case "2":
			operationType = "income_return";
			break;
		case "3":
			operationType = "expense";
			break;
		case "4":
			operationType = "expense_return";
			break;
		default:
			return {
				isValid: false,
				errorMessage: `Недопустимый признак расчета 'n=${nVal}' (разрешены: 1, 2, 3, 4)`,
				rawParams: params,
			};
	}

	return {
		isValid: true,
		issuedAtIso,
		totalAmountRub,
		totalAmountKopecks,
		fnSerial: fnVal,
		fiscalDocumentNumber,
		fiscalSign: fpVal,
		operationType,
		rawParams: params,
	};
}

/**
 * Statutory validation of Russian Taxpayer Identification Numbers (ИНН):
 * - Legal entity (ЮЛ): 10 digits with Modulo 11 checksum
 * - Individual / Sole proprietor (ФЛ / ИП): 12 digits with 2-level Modulo 11 checksum
 */
export function validateRussianTaxpayerInn(inn: string | null | undefined): {
	isValid: boolean;
	kind: "ul" | "fl" | null;
	digits: string;
	errorMessage?: string | undefined;
} {
	if (!inn) {
		return { isValid: false, kind: null, digits: "", errorMessage: "ИНН не указан" };
	}
	const clean = inn.trim().replace(/\D/g, "");
	if (clean.length !== 10 && clean.length !== 12) {
		return {
			isValid: false,
			kind: null,
			digits: clean,
			errorMessage: "ИНН должен содержать ровно 10 цифр (ЮЛ) или 12 цифр (ФЛ/ИП)",
		};
	}

	const digitsArr = clean.split("").map(Number);

	if (clean.length === 10) {
		// 10-digit INN (Legal Entity): checksum on 10th digit
		const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		const sum = weights.reduce((acc, w, idx) => acc + w * (digitsArr[idx] ?? 0), 0);
		const checkDigit = (sum % 11) % 10;
		const isValid = checkDigit === digitsArr[9];
		return {
			isValid,
			kind: "ul",
			digits: clean,
			errorMessage: isValid ? undefined : "Неверная контрольная сумма 10-значного ИНН ЮЛ",
		};
	}

	// 12-digit INN (Individual / Sole proprietor): checksums on 11th and 12th digits
	const weights11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
	const weights12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

	const sum11 = weights11.reduce((acc, w, idx) => acc + w * (digitsArr[idx] ?? 0), 0);
	const checkDigit11 = (sum11 % 11) % 10;

	const sum12 = weights12.reduce((acc, w, idx) => acc + w * (digitsArr[idx] ?? 0), 0);
	const checkDigit12 = (sum12 % 11) % 10;

	const isValid = checkDigit11 === digitsArr[10] && checkDigit12 === digitsArr[11];
	return {
		isValid,
		kind: "fl",
		digits: clean,
		errorMessage: isValid ? undefined : "Неверная контрольная сумма 12-значного ИНН ФЛ/ИП",
	};
}
