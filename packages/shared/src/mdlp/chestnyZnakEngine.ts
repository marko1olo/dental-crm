import { z } from "zod";
import { escapeXml } from "../cda/c14n.js";
import { recognizeDentalMedication } from "./catalog.js";
import {
	computeGtinCheckDigit,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpExpirationDate,
} from "./parser.js";
import type { DentalAnestheticInfo, MdlpExpirationResult } from "./types.js";

// ─── 1. TYPE DEFINITIONS & SCHEMAS ──────────────────────────────────────────

export const chestnyZnakVerificationStatusSchema = z.enum([
	"verified",
	"warning",
	"expired",
	"invalid_checksum",
	"invalid_format",
]);
export type ChestnyZnakVerificationStatus = z.infer<
	typeof chestnyZnakVerificationStatusSchema
>;

export interface ChestnyZnakScannedItem {
	readonly id: string;
	readonly rawBarcode: string;
	readonly gtin: string;
	readonly serialNumber: string;
	readonly sgtin: string;
	readonly expirationDate: string | null;
	readonly expirationDateRaw: string | null;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly daysUntilExpiration: number | null;
	readonly series: string | null;
	readonly lot: string | null;
	readonly cryptoKey: string | null;
	readonly cryptoSignature: string | null;
	readonly status: ChestnyZnakVerificationStatus;
	readonly statusReason: string;
	readonly tradeName: string;
	readonly inn: string;
	readonly dosageForm: string;
	readonly recognizedDrug: DentalAnestheticInfo | null;
	readonly costRub: number | null;
	readonly vatRate: 0 | 10 | 20;
	readonly scannedAt: string;
}

export interface ChestnyZnakScanSummary {
	readonly totalCount: number;
	readonly verifiedCount: number;
	readonly warningCount: number;
	readonly expiredCount: number;
	readonly invalidCount: number;
	readonly totalCostRub: number;
	readonly uniqueGtinCount: number;
	readonly uniqueSeriesCount: number;
}

// ─── Schema 701 (Acceptance by UPD / 701-accept-goods) ──────────────────────

export interface MdlpSchema701Item {
	readonly sgtin: string;
	readonly gtin?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly costRub?: number | null | undefined;
	readonly vatValueRub?: number | null | undefined;
	readonly series?: string | null | undefined;
	readonly tradeName?: string | null | undefined;
}

export interface MdlpSchema701Params {
	readonly subjectId: string;
	readonly shipperId: string;
	readonly operationDate?: string | Date | null | undefined;
	readonly docNum: string;
	readonly docDate: string;
	readonly receivingType?: 1 | 2 | undefined;
	readonly items: readonly MdlpSchema701Item[];
}

export interface MdlpSchema701Document {
	readonly actionId: 701;
	readonly subjectId: string;
	readonly shipperId: string;
	readonly operationDate: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly receivingType: 1 | 2;
	readonly items: readonly MdlpSchema701Item[];
	readonly xmlContent: string;
	readonly jsonContent: Readonly<Record<string, unknown>>;
}

// ─── Schema 531 (Medical Care Write-Off / 531-withdrawal) ───────────────────

export interface MdlpSchema531Item {
	readonly sgtin: string;
	readonly gtin?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly costRub?: number | null | undefined;
	readonly vatValueRub?: number | null | undefined;
	readonly series?: string | null | undefined;
	readonly tradeName?: string | null | undefined;
}

export interface MdlpSchema531Params {
	readonly subjectId: string;
	readonly operationDate?: string | Date | null | undefined;
	readonly docNum: string;
	readonly docDate: string;
	readonly withdrawalType?: 13 | 14 | 15 | 16 | number | undefined;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly items: readonly MdlpSchema531Item[];
}

export interface MdlpSchema531Document {
	readonly actionId: 531;
	readonly subjectId: string;
	readonly operationDate: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly withdrawalType: number;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly items: readonly MdlpSchema531Item[];
	readonly xmlContent: string;
	readonly jsonContent: Readonly<Record<string, unknown>>;
}

// ─── 2. DATAMATRIX PARSING & VALIDATION ─────────────────────────────────────

export interface ParsedChestnyZnakBarcode {
	readonly rawBarcode: string;
	readonly gtin: string;
	readonly serialNumber: string;
	readonly sgtin: string;
	readonly cryptoKey: string | null;
	readonly cryptoSignature: string | null;
	readonly expirationDate: string | null;
	readonly expirationDateRaw: string | null;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly daysUntilExpiration: number | null;
	readonly series: string | null;
	readonly lot: string | null;
	readonly isValidGtinChecksum: boolean;
	readonly recognizedDrug: DentalAnestheticInfo | null;
	readonly parsedAIs: Readonly<Record<string, string>>;
	readonly status: ChestnyZnakVerificationStatus;
	readonly statusReason: string;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

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
	const id = options.id ?? `cz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

// ─── 3. SCHEMA 701 (ACCEPTANCE BY UPD) GENERATOR & PARSER ───────────────────

/**
 * Validates parameters for Schema 701 (Acceptance of goods by invoice / UPD).
 */
export function validateMdlpSchema701Params(
	params: MdlpSchema701Params,
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!params.subjectId || params.subjectId.trim().length === 0) {
		errors.push("Идентификатор субъекта обращения - получателя (subjectId) обязателен.");
	}

	if (!params.shipperId || params.shipperId.trim().length === 0) {
		errors.push("Идентификатор грузоотправителя / поставщика (shipperId) обязателен.");
	}

	if (!params.docNum || params.docNum.trim().length === 0) {
		errors.push("Номер первичного документа / УПД (docNum) обязателен.");
	}

	if (!params.docDate || params.docDate.trim().length === 0) {
		errors.push("Дата первичного документа / УПД (docDate) обязательна.");
	}

	if (!params.items || params.items.length === 0) {
		errors.push("Список принимаемых позиций (items) не может быть пустым.");
	} else {
		params.items.forEach((it, idx) => {
			if (!it.sgtin || it.sgtin.trim().length === 0) {
				errors.push(`Позиция #${idx + 1}: отсутствует обязательный SGTIN.`);
			} else if (it.sgtin.length < 18) {
				errors.push(
					`Позиция #${idx + 1}: некорректная длина SGTIN "${it.sgtin}" (ожидается >= 18 символов).`,
				);
			}
			if (it.costRub != null && (Number.isNaN(it.costRub) || it.costRub < 0)) {
				errors.push(`Позиция #${idx + 1}: некорректная цена товара (${it.costRub}).`);
			}
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Generates an official MDLP Schema 701 XML Document
 * "Регистрация в ИС МДЛП сведений об акцептовании лекарственных препаратов получателем" (701-accept-goods).
 */
export function generateMdlpSchema701Payload(
	params: MdlpSchema701Params,
	options: { version?: "1.37" | "1.38" | string | undefined } = {},
): MdlpSchema701Document {
	const validation = validateMdlpSchema701Params(params);
	if (!validation.isValid) {
		throw new Error(`Ошибка формирования схемы 701: ${validation.errors.join("; ")}`);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	const receivingType = params.receivingType ?? 1;
	const schemaVersion = options.version ?? "1.38";

	const sgtinTags = params.items
		.map((it) => {
			const costTag =
				it.costRub != null
					? `\n        <cost>${it.costRub.toFixed(2)}</cost>`
					: "";
			const vatTag =
				it.vatValueRub != null
					? `\n        <vat_value>${it.vatValueRub.toFixed(2)}</vat_value>`
					: "";
			return `      <union>\n        <sgtin>${escapeXml(it.sgtin)}</sgtin>${costTag}${vatTag}\n      </union>`;
		})
		.join("\n");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<documents version="${schemaVersion}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <accept_goods action_id="701">
    <subject_id>${escapeXml(params.subjectId)}</subject_id>
    <shipper_id>${escapeXml(params.shipperId)}</shipper_id>
    <operation_date>${escapeXml(opDate)}</operation_date>
    <doc_num>${escapeXml(params.docNum)}</doc_num>
    <doc_date>${escapeXml(params.docDate)}</doc_date>
    <receiving_type>${receivingType}</receiving_type>
    <order_details>
${sgtinTags}
    </order_details>
  </accept_goods>
</documents>`;

	const jsonContent: Record<string, unknown> = {
		action_id: 701,
		subject_id: params.subjectId,
		shipper_id: params.shipperId,
		operation_date: opDate,
		doc_num: params.docNum,
		doc_date: params.docDate,
		receiving_type: receivingType,
		order_details: params.items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin ?? it.sgtin.slice(0, 14),
			serial_number: it.serialNumber ?? it.sgtin.slice(14),
			cost: it.costRub != null ? Number(it.costRub.toFixed(2)) : null,
			vat_value: it.vatValueRub != null ? Number(it.vatValueRub.toFixed(2)) : null,
		})),
	};

	return {
		actionId: 701,
		subjectId: params.subjectId,
		shipperId: params.shipperId,
		operationDate: opDate,
		docNum: params.docNum,
		docDate: params.docDate,
		receivingType,
		items: params.items,
		xmlContent,
		jsonContent,
	};
}

/**
 * Parses an MDLP Schema 701 XML document back into structured parameters.
 */
export function parseMdlpSchema701Xml(xml: string): MdlpSchema701Params {
	if (!xml || typeof xml !== "string" || !xml.includes('action_id="701"')) {
		throw new Error("Невалидный XML-документ схемы 701 МДЛП.");
	}

	const subjectMatch = xml.match(/<subject_id>([^<]+)<\/subject_id>/);
	const shipperMatch = xml.match(/<shipper_id>([^<]+)<\/shipper_id>/);
	const opDateMatch = xml.match(/<operation_date>([^<]+)<\/operation_date>/);
	const docNumMatch = xml.match(/<doc_num>([^<]+)<\/doc_num>/);
	const docDateMatch = xml.match(/<doc_date>([^<]+)<\/doc_date>/);
	const receivingTypeMatch = xml.match(/<receiving_type>([^<]+)<\/receiving_type>/);

	const subjectId = subjectMatch ? subjectMatch[1]!.trim() : "";
	const shipperId = shipperMatch ? shipperMatch[1]!.trim() : "";
	const operationDate = opDateMatch ? opDateMatch[1]!.trim() : new Date().toISOString();
	const docNum = docNumMatch ? docNumMatch[1]!.trim() : "";
	const docDate = docDateMatch ? docDateMatch[1]!.trim() : "";
	const receivingType = (receivingTypeMatch ? Number.parseInt(receivingTypeMatch[1]!.trim(), 10) : 1) as 1 | 2;

	const items: MdlpSchema701Item[] = [];
	const unionRegex = /<union>([\s\S]*?)<\/union>/g;
	let match: RegExpExecArray | null;

	while ((match = unionRegex.exec(xml)) !== null) {
		const block = match[1]!;
		const sgtinMatch = block.match(/<sgtin>([^<]+)<\/sgtin>/);
		const costMatch = block.match(/<cost>([^<]+)<\/cost>/);
		const vatMatch = block.match(/<vat_value>([^<]+)<\/vat_value>/);

		if (sgtinMatch) {
			const sgtin = sgtinMatch[1]!.trim();
			const costRub = costMatch ? Number.parseFloat(costMatch[1]!.trim()) : undefined;
			const vatValueRub = vatMatch ? Number.parseFloat(vatMatch[1]!.trim()) : undefined;
			const gtin = sgtin.slice(0, 14);
			const serialNumber = sgtin.slice(14);

			items.push({
				sgtin,
				gtin,
				serialNumber,
				costRub: Number.isNaN(costRub) ? undefined : costRub,
				vatValueRub: Number.isNaN(vatValueRub) ? undefined : vatValueRub,
			});
		}
	}

	return {
		subjectId,
		shipperId,
		operationDate,
		docNum,
		docDate,
		receivingType,
		items,
	};
}

export type SafeParseMdlpSchema701Result =
	| { success: true; data: MdlpSchema701Params }
	| { success: false; errors: string[] };

/**
 * Gracefully parses an MDLP Schema 701 XML document without throwing unhandled exceptions.
 */
export function safeParseMdlpSchema701Xml(xml: unknown): SafeParseMdlpSchema701Result {
	if (!xml || typeof xml !== "string") {
		return {
			success: false,
			errors: ["Входные данные XML отсутствуют или не являются строкой."],
		};
	}

	if (!xml.includes('action_id="701"') && !xml.includes("701")) {
		return {
			success: false,
			errors: ['Документ не содержит идентификатор действия схемы 701 МДЛП (action_id="701").'],
		};
	}

	try {
		const parsed = parseMdlpSchema701Xml(xml);
		const validation = validateMdlpSchema701Params(parsed);
		if (!validation.isValid) {
			return { success: false, errors: validation.errors };
		}
		return { success: true, data: parsed };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Неизвестная ошибка разбора XML схемы 701";
		return { success: false, errors: [message] };
	}
}

// ─── 4. SCHEMA 531 (DISPOSAL FOR MEDICAL CARE) GENERATOR & PARSER ───────────

/**
 * Validates parameters for Schema 531 (Disposal of drugs for medical care).
 */
export function validateMdlpSchema531Params(
	params: MdlpSchema531Params,
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!params.subjectId || params.subjectId.trim().length === 0) {
		errors.push("Идентификатор субъекта обращения МДЛП (subjectId) обязателен.");
	}

	if (!params.docNum || params.docNum.trim().length === 0) {
		errors.push("Номер первичного медицинского документа (docNum) обязателен.");
	}

	if (!params.docDate || params.docDate.trim().length === 0) {
		errors.push("Дата первичного медицинского документа (docDate) обязательна.");
	}

	if (!params.items || params.items.length === 0) {
		errors.push("Список списываемых медикаментов (items) не может быть пустым.");
	} else {
		params.items.forEach((it, idx) => {
			if (!it.sgtin || it.sgtin.trim().length === 0) {
				errors.push(`Позиция #${idx + 1}: отсутствует обязательный SGTIN.`);
			} else if (it.sgtin.length < 18) {
				errors.push(
					`Позиция #${idx + 1}: некорректная длина SGTIN "${it.sgtin}" (ожидается >= 18 символов).`,
				);
			}
			if (it.costRub != null && (Number.isNaN(it.costRub) || it.costRub < 0)) {
				errors.push(`Позиция #${idx + 1}: некорректная стоимость препарата (${it.costRub}).`);
			}
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Generates an official MDLP Schema 531 XML Document
 * "Регистрация в ИС МДЛП сведений о выводе из оборота лекарственных препаратов для оказания медицинской помощи" (531-withdrawal).
 */
export function generateMdlpSchema531Payload(
	params: MdlpSchema531Params,
	options: { version?: "1.37" | "1.38" | string | undefined } = {},
): MdlpSchema531Document {
	const validation = validateMdlpSchema531Params(params);
	if (!validation.isValid) {
		throw new Error(`Ошибка формирования схемы 531: ${validation.errors.join("; ")}`);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	const withdrawalType = params.withdrawalType ?? 13;
	const schemaVersion = options.version ?? "1.38";

	const sgtinTags = params.items
		.map((it) => {
			const costTag =
				it.costRub != null
					? `\n        <cost>${it.costRub.toFixed(2)}</cost>`
					: "";
			const vatTag =
				it.vatValueRub != null
					? `\n        <vat_value>${it.vatValueRub.toFixed(2)}</vat_value>`
					: "";
			return `      <union>\n        <sgtin>${escapeXml(it.sgtin)}</sgtin>${costTag}${vatTag}\n      </union>`;
		})
		.join("\n");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<documents version="${schemaVersion}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <withdrawal action_id="531">
    <subject_id>${escapeXml(params.subjectId)}</subject_id>
    <operation_date>${escapeXml(opDate)}</operation_date>
    <doc_num>${escapeXml(params.docNum)}</doc_num>
    <doc_date>${escapeXml(params.docDate)}</doc_date>
    <withdrawal_type>${withdrawalType}</withdrawal_type>
    <order_details>
${sgtinTags}
    </order_details>
  </withdrawal>
</documents>`;

	const jsonContent: Record<string, unknown> = {
		action_id: 531,
		subject_id: params.subjectId,
		operation_date: opDate,
		doc_num: params.docNum,
		doc_date: params.docDate,
		withdrawal_type: withdrawalType,
		patient_id: params.patientId ?? null,
		visit_id: params.visitId ?? null,
		doctor_id: params.doctorId ?? null,
		notes: params.notes ?? null,
		order_details: params.items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin ?? it.sgtin.slice(0, 14),
			serial_number: it.serialNumber ?? it.sgtin.slice(14),
			cost: it.costRub != null ? Number(it.costRub.toFixed(2)) : null,
			vat_value: it.vatValueRub != null ? Number(it.vatValueRub.toFixed(2)) : null,
		})),
	};

	return {
		actionId: 531,
		subjectId: params.subjectId,
		operationDate: opDate,
		docNum: params.docNum,
		docDate: params.docDate,
		withdrawalType,
		patientId: params.patientId ?? null,
		visitId: params.visitId ?? null,
		doctorId: params.doctorId ?? null,
		items: params.items,
		xmlContent,
		jsonContent,
	};
}

/**
 * Parses an MDLP Schema 531 XML document back into structured parameters.
 */
export function parseMdlpSchema531Xml(xml: string): MdlpSchema531Params {
	if (!xml || typeof xml !== "string" || !xml.includes('action_id="531"')) {
		throw new Error("Невалидный XML-документ схемы 531 МДЛП.");
	}

	const subjectMatch = xml.match(/<subject_id>([^<]+)<\/subject_id>/);
	const opDateMatch = xml.match(/<operation_date>([^<]+)<\/operation_date>/);
	const docNumMatch = xml.match(/<doc_num>([^<]+)<\/doc_num>/);
	const docDateMatch = xml.match(/<doc_date>([^<]+)<\/doc_date>/);
	const withdrawalTypeMatch = xml.match(/<withdrawal_type>([^<]+)<\/withdrawal_type>/);

	const subjectId = subjectMatch ? subjectMatch[1]!.trim() : "";
	const operationDate = opDateMatch ? opDateMatch[1]!.trim() : new Date().toISOString();
	const docNum = docNumMatch ? docNumMatch[1]!.trim() : "";
	const docDate = docDateMatch ? docDateMatch[1]!.trim() : "";
	const withdrawalType = withdrawalTypeMatch ? Number.parseInt(withdrawalTypeMatch[1]!.trim(), 10) : 13;

	const items: MdlpSchema531Item[] = [];
	const unionRegex = /<union>([\s\S]*?)<\/union>/g;
	let match: RegExpExecArray | null;

	while ((match = unionRegex.exec(xml)) !== null) {
		const block = match[1]!;
		const sgtinMatch = block.match(/<sgtin>([^<]+)<\/sgtin>/);
		const costMatch = block.match(/<cost>([^<]+)<\/cost>/);
		const vatMatch = block.match(/<vat_value>([^<]+)<\/vat_value>/);

		if (sgtinMatch) {
			const sgtin = sgtinMatch[1]!.trim();
			const costRub = costMatch ? Number.parseFloat(costMatch[1]!.trim()) : undefined;
			const vatValueRub = vatMatch ? Number.parseFloat(vatMatch[1]!.trim()) : undefined;
			const gtin = sgtin.slice(0, 14);
			const serialNumber = sgtin.slice(14);

			items.push({
				sgtin,
				gtin,
				serialNumber,
				costRub: Number.isNaN(costRub) ? undefined : costRub,
				vatValueRub: Number.isNaN(vatValueRub) ? undefined : vatValueRub,
			});
		}
	}

	return {
		subjectId,
		operationDate,
		docNum,
		docDate,
		withdrawalType,
		items,
	};
}

export type SafeParseMdlpSchema531Result =
	| { success: true; data: MdlpSchema531Params }
	| { success: false; errors: string[] };

/**
 * Gracefully parses an MDLP Schema 531 XML document without throwing exceptions.
 */
export function safeParseMdlpSchema531Xml(xml: unknown): SafeParseMdlpSchema531Result {
	if (!xml || typeof xml !== "string") {
		return {
			success: false,
			errors: ["Входные данные XML отсутствуют или не являются строкой."],
		};
	}

	if (!xml.includes('action_id="531"') && !xml.includes("531")) {
		return {
			success: false,
			errors: ['Документ не содержит идентификатор действия схемы 531 МДЛП (action_id="531").'],
		};
	}

	try {
		const parsed = parseMdlpSchema531Xml(xml);
		const validation = validateMdlpSchema531Params(parsed);
		if (!validation.isValid) {
			return { success: false, errors: validation.errors };
		}
		return { success: true, data: parsed };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Неизвестная ошибка разбора XML схемы 531";
		return { success: false, errors: [message] };
	}
}

// ─── 5. SCANNING AGGREGATION & REPORTING ─────────────────────────────────────

/**
 * Calculates live summary and statistics for a list of scanned Chestny ZNAK items.
 */
export function calculateChestnyZnakSummary(
	items: readonly ChestnyZnakScannedItem[],
): ChestnyZnakScanSummary {
	let verifiedCount = 0;
	let warningCount = 0;
	let expiredCount = 0;
	let invalidCount = 0;
	let totalCostRub = 0;

	const gtinSet = new Set<string>();
	const seriesSet = new Set<string>();

	for (const item of items) {
		if (item.status === "verified") {
			verifiedCount++;
		} else if (item.status === "warning") {
			warningCount++;
		} else if (item.status === "expired") {
			expiredCount++;
		} else {
			invalidCount++;
		}

		if (item.costRub != null && item.costRub > 0) {
			totalCostRub += item.costRub;
		}

		if (item.gtin) {
			gtinSet.add(item.gtin);
		}
		if (item.series) {
			seriesSet.add(item.series);
		}
	}

	return {
		totalCount: items.length,
		verifiedCount,
		warningCount,
		expiredCount,
		invalidCount,
		totalCostRub: Math.round(totalCostRub * 100) / 100,
		uniqueGtinCount: gtinSet.size,
		uniqueSeriesCount: seriesSet.size,
	};
}

// Re-export core algorithms for unified access
export { computeGtinCheckDigit, isValidGtinChecksum };
