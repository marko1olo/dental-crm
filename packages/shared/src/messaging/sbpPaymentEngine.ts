/**
 * sbpPaymentEngine.ts — Fast Payment System (СБП НСПК) & Dynamic QR Engine.
 *
 * Implements:
 * 1. ГОСТ Р 58092-2018 / EMVCo QR Code Specification for Payment Systems (TLV encoding & decoding).
 * 2. ГОСТ Р 56042-2014 CRC16-CCITT checksum computation and verification.
 * 3. Dynamic NSPK URL generation (https://qr.nspk.ru/...) with exact integer kopecks.
 * 4. Mobile deep linking (sbp://...) and multi-channel payment message formatting.
 * 5. Full backward compatibility with SbpQrEngine.
 */

import { z } from "zod";
import {
	formatKopecksRu,
	formatKopecksToRubles,
	kopecksToNumericString,
	kopecksToRubles,
	rublesToKopecks,
	type Kopecks,
} from "../money.js";

// ─── Enums & Schemas ───

export const sbpQrTypeSchema = z.enum(["01", "02"]); // 01 = Static, 02 = Dynamic
export type SbpQrType = z.infer<typeof sbpQrTypeSchema>;

export const generateSbpDynamicQrSchema = z.object({
	operationId: z.string().trim().min(1).max(64),
	bankMemberId: z
		.string()
		.trim()
		.min(1)
		.max(32)
		.optional()
		.default("100000000111"), // Sberbank/NSPK ID
	amountKopecks: z
		.number()
		.int()
		.positive("Сумма должна быть положительной в копейках"),
	currency: z.literal("RUB").optional().default("RUB"),
	description: z.string().trim().max(140).optional().nullable(),
	ttlSeconds: z.number().int().min(60).max(86400).optional().default(1800), // 30 min default
	invoiceId: z.string().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	merchantName: z.string().optional().default("DENTE CLINIC"),
	merchantCity: z.string().optional().default("MOSCOW"),
	mcc: z.string().optional().default("8021"), // 8021 = Стоматологические услуги
}).strict();
export type GenerateSbpDynamicQrInput = z.input<typeof generateSbpDynamicQrSchema>;
export type GenerateSbpDynamicQrOutput = z.output<typeof generateSbpDynamicQrSchema>;

export interface EmvCoSubtag {
	tag: string;
	value: string;
}

export interface EmvCoTag {
	tag: string;
	value: string;
	subtags?: Record<string, string> | undefined;
}

export interface ParsedEmvCoQr {
	isValid: boolean;
	payloadFormatIndicator: string;
	pointOfInitiation: "static" | "dynamic";
	merchantAccountInfo?: {
		guid?: string | undefined;
		paymentLink?: string | undefined;
		bankMemberId?: string | undefined;
	} | undefined;
	mcc?: string | undefined;
	currencyCode?: string | undefined;
	transactionAmountRubles?: number | undefined;
	transactionAmountKopecks?: number | undefined;
	countryCode?: string | undefined;
	merchantName?: string | undefined;
	merchantCity?: string | undefined;
	additionalData?: {
		billId?: string | undefined;
		purpose?: string | undefined;
		reference?: string | undefined;
	} | undefined;
	crc16?: string | undefined;
	rawTags: Record<string, string>;
}

export interface SbpPaymentPackage {
	operationId: string;
	invoiceId: string;
	amountKopecks: Kopecks;
	amountRublesFormatted: string;
	nspkUrl: string;
	sbpDeepLink: string;
	emvCoTlvPayload: string;
	qrCodePayload: string;
	purpose: string;
	expiresAt: string;
	crc16: string;
	patientMessageText: string;
}

// ─── Core Mathematical CRC16 Engine ───

/**
 * Computes CRC16-CCITT according to ГОСТ Р 56042-2014 & EMVCo (Polynomial 0x1021, Init 0xFFFF).
 */
export function computeCrc16Ccitt(str: string): string {
	let crc = 0xffff;
	for (let i = 0; i < str.length; i++) {
		crc ^= (str.charCodeAt(i) << 8) & 0xffff;
		for (let j = 0; j < 8; j++) {
			if ((crc & 0x8000) !== 0) {
				crc = ((crc << 1) ^ 0x1021) & 0xffff;
			} else {
				crc = (crc << 1) & 0xffff;
			}
		}
	}
	return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ─── EMVCo / ГОСТ Р 58092-2018 TLV Formatter ───

/**
 * Formats single TLV tag: ID (2 chars) + Length (2 chars) + Value.
 */
function formatTlv(tag: string, value: string): string {
	let val = value;
	let byteLen = Buffer.byteLength(val, "utf8");
	if (byteLen > 99) {
		while (Buffer.byteLength(val, "utf8") > 99) {
			val = val.slice(0, -1);
		}
		byteLen = Buffer.byteLength(val, "utf8");
	}
	const len = String(byteLen).padStart(2, "0");
	return `${tag}${len}${val}`;
}

/**
 * Builds nested TLV structure from map of subtags.
 */
function formatNestedTlv(parentTag: string, subtags: Record<string, string>): string {
	let inner = "";
	for (const [subtag, val] of Object.entries(subtags)) {
		if (val !== undefined && val !== null && val !== "") {
			inner += formatTlv(subtag, val);
		}
	}
	return formatTlv(parentTag, inner);
}

/**
 * Generates standard ГОСТ Р 58092-2018 / EMVCo QR TLV payload with CRC16-CCITT tag 63.
 */
export function buildEmvCoSbpQrString(params: {
	operationId: string;
	bankMemberId: string;
	amountKopecks: number;
	currency?: string | undefined;
	invoiceId?: string | null | undefined;
	merchantName?: string | undefined;
	merchantCity?: string | undefined;
	mcc?: string | undefined;
	description?: string | null | undefined;
	isDynamic?: boolean | undefined;
}): string {
	const {
		operationId,
		bankMemberId,
		amountKopecks,
		currency = "RUB",
		invoiceId,
		merchantName = "DENTE CLINIC",
		merchantCity = "MOSCOW",
		mcc = "8021",
		description,
		isDynamic = true,
	} = params;

	const cleanOpId = operationId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	const nspkShortUrl = `https://qr.nspk.ru/${cleanOpId}`;

	let tlv = "";

	// Tag 00: Payload Format Indicator ("01")
	tlv += formatTlv("00", "01");

	// Tag 01: Point of Initiation Method ("12" = Dynamic, "11" = Static)
	tlv += formatTlv("01", isDynamic ? "12" : "11");

	// Tag 26: Merchant Account Information (НСПК СБП)
	tlv += formatNestedTlv("26", {
		"00": "RU.NSPK.SBP",
		"01": nspkShortUrl,
		"02": bankMemberId,
	});

	// Tag 52: Merchant Category Code (MCC)
	tlv += formatTlv("52", mcc);

	// Tag 53: Transaction Currency (643 = RUB)
	tlv += formatTlv("53", "643");

	// Tag 54: Transaction Amount in Rubles ("1500.50")
	const rublesStr = kopecksToNumericString(amountKopecks);
	tlv += formatTlv("54", rublesStr);

	// Tag 58: Country Code ("RU")
	tlv += formatTlv("58", "RU");

	// Tag 59: Merchant Name
	tlv += formatTlv("59", merchantName.slice(0, 25));

	// Tag 60: Merchant City
	tlv += formatTlv("60", merchantCity.slice(0, 15));

	// Tag 62: Additional Data Field Template
	const additionalData: Record<string, string> = {};
	if (invoiceId) {
		additionalData["01"] = invoiceId.slice(0, 25);
	}
	if (description) {
		additionalData["08"] = description.slice(0, 70);
	} else {
		additionalData["08"] = `Оплата стоматологических услуг (${invoiceId || cleanOpId})`;
	}
	tlv += formatNestedTlv("62", additionalData);

	// Tag 63: CRC16 Checksum
	const prefixForCrc = `${tlv}6304`;
	const crc = computeCrc16Ccitt(prefixForCrc);
	const finalTlv = `${prefixForCrc}${crc}`;

	return finalTlv;
}

/**
 * Parses and verifies EMVCo TLV QR string using exact byte-level decoding.
 */
export function parseEmvCoTlv(tlvString: string): ParsedEmvCoQr {
	const rawTags: Record<string, string> = {};
	const buf = Buffer.from(tlvString, "utf8");
	let cursor = 0;

	try {
		while (cursor < buf.length) {
			if (cursor + 4 > buf.length) break;
			const tag = buf.subarray(cursor, cursor + 2).toString("utf8");
			const lenStr = buf.subarray(cursor + 2, cursor + 4).toString("utf8");
			const len = parseInt(lenStr, 10);
			cursor += 4;
			if (Number.isNaN(len) || cursor + len > buf.length) {
				return {
					isValid: false,
					payloadFormatIndicator: "",
					pointOfInitiation: "dynamic",
					merchantAccountInfo: undefined,
					mcc: undefined,
					currencyCode: undefined,
					transactionAmountRubles: undefined,
					transactionAmountKopecks: undefined,
					countryCode: undefined,
					merchantName: undefined,
					merchantCity: undefined,
					additionalData: undefined,
					crc16: undefined,
					rawTags,
				};
			}
			const value = buf.subarray(cursor, cursor + len).toString("utf8");
			cursor += len;
			rawTags[tag] = value;
		}

		// Verify CRC if tag 63 present
		const crcVal = rawTags["63"];
		let isCrcValid = true;
		if (crcVal && tlvString.includes("6304")) {
			const textBeforeCrc = tlvString.slice(0, tlvString.indexOf("6304") + 4);
			const expectedCrc = computeCrc16Ccitt(textBeforeCrc);
			isCrcValid = expectedCrc.toUpperCase() === crcVal.toUpperCase();
		}

		const poi = rawTags["01"] === "11" ? "static" : "dynamic";
		const amountRubles = rawTags["54"] ? parseFloat(rawTags["54"]) : undefined;
		const amountKopecks = amountRubles !== undefined && !Number.isNaN(amountRubles) ? rublesToKopecks(amountRubles) : undefined;

		// Parse subtag 26 (Merchant Account)
		let merchantInfo: ParsedEmvCoQr["merchantAccountInfo"] = undefined;
		if (rawTags["26"]) {
			const sub26 = parseSubtags(rawTags["26"]);
			merchantInfo = {
				guid: sub26["00"] ?? undefined,
				paymentLink: sub26["01"] ?? undefined,
				bankMemberId: sub26["02"] ?? undefined,
			};
		}

		// Parse subtag 62 (Additional Data)
		let addData: ParsedEmvCoQr["additionalData"] = undefined;
		if (rawTags["62"]) {
			const sub62 = parseSubtags(rawTags["62"]);
			addData = {
				billId: sub62["01"] ?? undefined,
				reference: sub62["05"] ?? undefined,
				purpose: sub62["08"] ?? undefined,
			};
		}

		return {
			isValid: isCrcValid && rawTags["00"] === "01",
			payloadFormatIndicator: rawTags["00"] || "01",
			pointOfInitiation: poi,
			merchantAccountInfo: merchantInfo,
			mcc: rawTags["52"] ?? undefined,
			currencyCode: rawTags["53"] ?? undefined,
			transactionAmountRubles: amountRubles,
			transactionAmountKopecks: amountKopecks,
			countryCode: rawTags["58"] ?? undefined,
			merchantName: rawTags["59"] ?? undefined,
			merchantCity: rawTags["60"] ?? undefined,
			additionalData: addData,
			crc16: crcVal ?? undefined,
			rawTags,
		};
	} catch {
		return {
			isValid: false,
			payloadFormatIndicator: "",
			pointOfInitiation: "dynamic",
			merchantAccountInfo: undefined,
			mcc: undefined,
			currencyCode: undefined,
			transactionAmountRubles: undefined,
			transactionAmountKopecks: undefined,
			countryCode: undefined,
			merchantName: undefined,
			merchantCity: undefined,
			additionalData: undefined,
			crc16: undefined,
			rawTags: {},
		};
	}
}

function parseSubtags(content: string): Record<string, string> {
	const map: Record<string, string> = {};
	const buf = Buffer.from(content, "utf8");
	let cursor = 0;
	while (cursor < buf.length) {
		if (cursor + 4 > buf.length) break;
		const subtag = buf.subarray(cursor, cursor + 2).toString("utf8");
		const lenStr = buf.subarray(cursor + 2, cursor + 4).toString("utf8");
		const len = parseInt(lenStr, 10);
		cursor += 4;
		if (Number.isNaN(len) || cursor + len > buf.length) break;
		const val = buf.subarray(cursor, cursor + len).toString("utf8");
		cursor += len;
		map[subtag] = val;
	}
	return map;
}

// ─── SbpQrEngine Compatibility Class ───

export class SbpQrEngine {
	/**
	 * Вычисляет контрольную сумму CRC16-CCITT (ГОСТ Р 56042-2014, полином 0x1021, init 0xFFFF)
	 */
	static computeCrc16Ccitt(str: string): string {
		return computeCrc16Ccitt(str);
	}

	/**
	 * Формирует стандартную платежную ссылку НСПК СБП (B2C Dynamic QR)
	 * Пример: https://qr.nspk.ru/AD100004ABC12345?type=02&bank=100000000111&sum=150000&cur=RUB&crc=A4F2
	 */
	static buildNspkDynamicPayload(params: {
		operationId: string;
		bankMemberId: string;
		amountKopecks: number;
		currency?: string;
	}): {
		payloadUrl: string;
		cleanOperationId: string;
		crc16: string;
	} {
		const cleanOperationId = params.operationId
			.replace(/[^A-Za-z0-9]/g, "")
			.toUpperCase();
		const cur = params.currency || "RUB";
		const baseQuery = `https://qr.nspk.ru/${cleanOperationId}?type=02&bank=${params.bankMemberId}&sum=${params.amountKopecks}&cur=${cur}`;
		const crc16 = this.computeCrc16Ccitt(baseQuery);
		const payloadUrl = `${baseQuery}&crc=${crc16}`;
		return { payloadUrl, cleanOperationId, crc16 };
	}

	/**
	 * Проверяет подлинность и контрольную сумму URL СБП
	 */
	static verifyNspkPayload(payloadUrl: string): {
		isValid: boolean;
		operationId: string | null;
		amountKopecks: number | null;
		bankMemberId: string | null;
	} {
		try {
			const url = new URL(payloadUrl);
			if (!url.hostname.includes("nspk.ru")) {
				return {
					isValid: false,
					operationId: null,
					amountKopecks: null,
					bankMemberId: null,
				};
			}
			const pathParts = url.pathname.split("/").filter(Boolean);
			const operationId = pathParts[0] || null;
			const bank = url.searchParams.get("bank");
			const sumStr = url.searchParams.get("sum");
			const crc = url.searchParams.get("crc");
			if (!operationId || !bank || !sumStr || !crc) {
				return {
					isValid: false,
					operationId,
					amountKopecks: null,
					bankMemberId: bank,
				};
			}
			const sum = parseInt(sumStr, 10);
			const cur = url.searchParams.get("cur") || "RUB";
			const baseQuery = `https://qr.nspk.ru/${operationId}?type=02&bank=${bank}&sum=${sum}&cur=${cur}`;
			const expectedCrc = this.computeCrc16Ccitt(baseQuery);
			const isValid = expectedCrc.toUpperCase() === crc.toUpperCase();
			return {
				isValid,
				operationId,
				amountKopecks: sum,
				bankMemberId: bank,
			};
		} catch {
			return {
				isValid: false,
				operationId: null,
				amountKopecks: null,
				bankMemberId: null,
			};
		}
	}
}

export const SbpPaymentEngine = SbpQrEngine;
export type SbpPaymentEngine = SbpQrEngine;

// ─── High-Level Payment Package Generator ───

/**
 * Generates a complete ready-to-send SBP payment package with EMVCo QR and instant mobile payment links.
 */
export function generateSbpPaymentPackage(
	input: GenerateSbpDynamicQrInput,
): SbpPaymentPackage {
	const parsed = generateSbpDynamicQrSchema.parse(input);
	const cleanOperationId = parsed.operationId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	const invoiceId = parsed.invoiceId || `INV-${cleanOperationId.slice(0, 10)}`;
	const amountKop = parsed.amountKopecks;
	const amountFormatted = formatKopecksRu(amountKop);

	const purpose =
		parsed.description?.trim() ||
		`Оплата стоматологических услуг по счету № ${invoiceId}`;

	// 1. NSPK Dynamic URL & CRC
	const nspkPayload = SbpQrEngine.buildNspkDynamicPayload({
		operationId: cleanOperationId,
		bankMemberId: parsed.bankMemberId,
		amountKopecks: amountKop,
		currency: parsed.currency,
	});

	// 2. Mobile Deep Link (sbp://)
	const sbpDeepLink = nspkPayload.payloadUrl.replace(/^https:\/\//, "sbp://");

	// 3. EMVCo / ГОСТ Р 58092-2018 TLV Payload
	const emvCoTlvPayload = buildEmvCoSbpQrString({
		operationId: cleanOperationId,
		bankMemberId: parsed.bankMemberId,
		amountKopecks: amountKop,
		currency: parsed.currency,
		invoiceId,
		merchantName: parsed.merchantName,
		merchantCity: parsed.merchantCity,
		mcc: parsed.mcc,
		description: purpose,
		isDynamic: true,
	});

	const now = new Date();
	const expiresAtDate = new Date(now.getTime() + parsed.ttlSeconds * 1000);
	const expiresAt = expiresAtDate.toISOString();

	// Patient Notification Text in Russian
	const patientMessageText =
		`💳 <b>Счет на оплату медицинских услуг</b>\n\n` +
		`Счет: <b>${invoiceId}</b>\n` +
		`Сумма к оплате: <b>${amountFormatted}</b>\n` +
		`Назначение: ${purpose}\n\n` +
		`⚡ <b>Мгновенная оплата через СБП без комиссии:</b>\n` +
		`<a href="${nspkPayload.payloadUrl}">👉 Нажмите здесь для оплаты в мобильном банке</a>\n\n` +
		`<i>Ссылка и QR-код действуют в течение 30 минут. Кассовый чек 54-ФЗ будет отправлен автоматически после подтверждения банком.</i>`;

	return {
		operationId: cleanOperationId,
		invoiceId,
		amountKopecks: amountKop,
		amountRublesFormatted: amountFormatted,
		nspkUrl: nspkPayload.payloadUrl,
		sbpDeepLink,
		emvCoTlvPayload,
		qrCodePayload: nspkPayload.payloadUrl,
		purpose,
		expiresAt,
		crc16: nspkPayload.crc16,
		patientMessageText,
	};
}

// ─── Extended SBP Split Tender & Dynamic QR Models (Consolidated SSOT) ───

export interface SbpDynamicQrParams {
	readonly sumRub: number;
	readonly orderId: string;
	readonly purpose?: string | undefined;
	readonly merchantId?: string | undefined;
	readonly bankId?: string | undefined;
	readonly sbpMemberId?: string | undefined;
	readonly ttlMinutes?: number | undefined;
	readonly clinicName?: string | undefined;
}

export interface SbpDynamicQrResult {
	readonly qrId: string;
	readonly orderId: string;
	readonly sumRub: number;
	readonly sumKopecks: number;
	readonly sumFormattedRu: string;
	readonly purpose: string;
	readonly nspkUrl: string;
	readonly crc16Hex: string;
	readonly expiresAtIso: string;
	readonly emvPayload: string;
	readonly deepLinkAppUrl: string;
}

export interface SbpSplitTenderDraft {
	readonly totalAmountRub: number;
	readonly depositAvailableRub: number;
	readonly orderId?: string | undefined;
	readonly purpose?: string | undefined;
	readonly clinicName?: string | undefined;
}

export interface SbpSplitTenderResult {
	readonly totalAmountRub: number;
	readonly totalAmountKopecks: number;
	readonly depositOffsetRub: number;
	readonly depositOffsetKopecks: number; // Tag 1215
	readonly sbpChargeRub: number;
	readonly sbpChargeKopecks: number; // Tag 1081
	readonly isFullyCoveredByDeposit: boolean;
	readonly sbpQr: SbpDynamicQrResult | null;
	readonly tag1081ElectronicKopecks: number;
	readonly tag1215PrepaidKopecks: number;
}

export interface SbpBankAppMember {
	readonly id: string;
	readonly nameRu: string;
	readonly schemaPrefix: string;
	readonly brandColorHex: string;
	readonly isPopular: boolean;
}

export const SBP_BANKS_CATALOG: readonly SbpBankAppMember[] = [
	{
		id: "sber",
		nameRu: "СберБанк Онлайн",
		schemaPrefix: "sberpay://qr/sub?qrId=",
		brandColorHex: "#21a038",
		isPopular: true,
	},
	{
		id: "tbank",
		nameRu: "Т-Банк (Тинькофф)",
		schemaPrefix: "tinkoffbank://qr?id=",
		brandColorHex: "#ffdd2d",
		isPopular: true,
	},
	{
		id: "alfa",
		nameRu: "Альфа-Банк",
		schemaPrefix: "alfabank://qr/pay?qrId=",
		brandColorHex: "#ef3124",
		isPopular: true,
	},
	{
		id: "vtb",
		nameRu: "ВТБ Онлайн",
		schemaPrefix: "vtb://sbp/pay?qrId=",
		brandColorHex: "#0a2896",
		isPopular: true,
	},
	{
		id: "raiffeisen",
		nameRu: "Райффайзенбанк",
		schemaPrefix: "raiffeisenonline://sbp/qr?qrId=",
		brandColorHex: "#fee600",
		isPopular: false,
	},
	{
		id: "nspk_generic",
		nameRu: "Другой банк (СБП)",
		schemaPrefix: "https://qr.nspk.ru/",
		brandColorHex: "#0284c7",
		isPopular: false,
	},
];

export interface SbpDynamicQrModel {
	readonly qrId: string;
	readonly orderId: string;
	readonly sumKopecks: number;
	readonly sumRub: number;
	readonly sumFormattedRu: string;
	readonly recipientLegalName: string;
	readonly recipientInn: string;
	readonly recipientAccount: string;
	readonly bankBic: string;
	readonly paymentPurpose: string;
	readonly nspkUrl: string;
	readonly crc16Hex: string;
	readonly expiresAtIso: string;
	readonly emvPayload: string;
	readonly deepLinks: ReadonlyArray<{
		readonly bankId: string;
		readonly bankNameRu: string;
		readonly appUrl: string;
		readonly brandColor: string;
	}>;
}

export const calculateCrc16Ccitt = computeCrc16Ccitt;

/**
 * Formats an integer amount of kopecks to Russian currency string (e.g. "14 500,00 ₽").
 */
export function formatKopecksToCurrencyRu(kopecks: number): string {
	return formatKopecksRu(Math.round(kopecks) as Kopecks);
}

/**
 * Generates a compliant NSPK SBP dynamic QR payload with CRC16 checksum.
 * Strictly requires sumRub > 0 and validates orderId.
 */
export function generateDynamicSbpQrPayload(params: SbpDynamicQrParams): SbpDynamicQrResult {
	const sumKopecks = rublesToKopecks(params.sumRub);
	if (sumKopecks <= 0) {
		throw new Error(
			`Сумма динамического QR-кода СБП должна быть строго больше 0 копеек (получено: ${params.sumRub} ₽ / ${sumKopecks} коп.)`,
		);
	}
	const sumRub = kopecksToRubles(sumKopecks);
	const orderId = params.orderId?.trim() || `ORD-${Date.now().toString(36).toUpperCase()}`;
	const qrId = `SBP-${orderId}-${Date.now().toString(36).toUpperCase()}`;
	const ttl = params.ttlMinutes ?? 15; // default 15 minutes
	const expiresAtIso = new Date(Date.now() + ttl * 60 * 1000).toISOString();

	const merchantId = params.merchantId || "100000000001";
	const bankId = params.bankId || "100000000111";
	const purpose =
		params.purpose ||
		`Оплата медицинских стоматологических услуг по заказу №${orderId} (${params.clinicName || "ООО ДЕНТЕ"})`;

	const baseUrl = `https://qr.nspk.ru/${qrId}?type=02&bank=${bankId}&sum=${sumKopecks}&cur=RUB`;
	const crc16Hex = computeCrc16Ccitt(baseUrl);
	const nspkUrl = `${baseUrl}&crc=${crc16Hex}`;

	const emvDataWithoutCrc =
		formatTlv("00", "01") +
		formatTlv("01", "12") +
		formatTlv(
			"26",
			formatTlv("00", "ru.nspk.sbp") +
				formatTlv("01", qrId) +
				formatTlv("02", merchantId),
		) +
		formatTlv("52", "8011") +
		formatTlv("53", "643") +
		formatTlv("54", kopecksToNumericString(sumKopecks)) +
		formatTlv("58", "RU") +
		formatTlv("59", (params.clinicName || "DENTE DENTAL CLINIC").slice(0, 25)) +
		formatTlv("60", "MOSCOW") +
		formatTlv(
			"62",
			formatTlv("01", orderId.slice(0, 25)) + formatTlv("08", purpose.slice(0, 25)),
		) +
		"6304";

	const emvCrc = computeCrc16Ccitt(emvDataWithoutCrc);
	const emvPayload = `${emvDataWithoutCrc}${emvCrc}`;

	const deepLinkAppUrl = `bank100000000111://qr.nspk.ru/${qrId}?type=02&bank=${bankId}&sum=${sumKopecks}&cur=RUB&crc=${crc16Hex}`;

	return {
		qrId,
		orderId,
		sumRub,
		sumKopecks,
		sumFormattedRu: `${kopecksToNumericString(sumKopecks)} ₽`,
		purpose,
		nspkUrl,
		crc16Hex,
		expiresAtIso,
		emvPayload,
		deepLinkAppUrl,
	};
}

/**
 * Generates an SBP dynamic QR model with deep links and EMVCo TLV payload.
 */
export function generateSbpPaymentQrModel(params: {
	sumKopecks: number;
	orderId: string;
	purpose?: string;
	clinicLegalName?: string;
	clinicInn?: string;
	clinicAccount?: string;
	bankBic?: string;
	ttlMinutes?: number;
}): SbpDynamicQrModel {
	const sumKopecks = Math.round(params.sumKopecks);
	if (sumKopecks <= 0) {
		throw new Error(`Сумма оплаты через СБП должна быть строго больше 0 коп. (получено: ${sumKopecks})`);
	}

	const sumRub = kopecksToRubles(sumKopecks);
	const orderId = params.orderId.trim() || `ORD-${Date.now().toString(36).toUpperCase()}`;
	const qrId = `SBP${orderId.replace(/\W/g, "")}${Date.now().toString(36).toUpperCase()}`;
	const ttl = params.ttlMinutes ?? 30;
	const expiresAtIso = new Date(Date.now() + ttl * 60 * 1000).toISOString();

	const recipientLegalName = params.clinicLegalName || 'ООО "Стоматологическая клиника ДЕНТЕ"';
	const recipientInn = params.clinicInn || "";
	const recipientAccount = params.clinicAccount || "40702810938000123456";
	const bankBic = params.bankBic || "044525225";
	const paymentPurpose = params.purpose || `Оплата стоматологических услуг по заказу №${orderId} (ИНН ${recipientInn})`;

	const baseUrl = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${sumKopecks}&cur=RUB`;
	const crc16Hex = computeCrc16Ccitt(baseUrl);
	const nspkUrl = `${baseUrl}&crc=${crc16Hex}`;

	const emvWithoutCrc =
		formatTlv("00", "01") +
		formatTlv("01", "12") +
		formatTlv(
			"26",
			formatTlv("00", "ru.nspk.sbp") +
				formatTlv("01", qrId) +
				formatTlv("02", recipientInn),
		) +
		formatTlv("52", "8011") +
		formatTlv("53", "643") +
		formatTlv("54", kopecksToNumericString(sumKopecks)) +
		formatTlv("58", "RU") +
		formatTlv("59", recipientLegalName.slice(0, 25)) +
		formatTlv("60", "MOSCOW") +
		formatTlv(
			"62",
			formatTlv("01", orderId.slice(0, 25)) +
				formatTlv("08", paymentPurpose.slice(0, 25)),
		) +
		"6304";

	const emvCrc = computeCrc16Ccitt(emvWithoutCrc);
	const emvPayload = `${emvWithoutCrc}${emvCrc}`;

	const deepLinks = SBP_BANKS_CATALOG.map((bank) => ({
		bankId: bank.id,
		bankNameRu: bank.nameRu,
		appUrl: bank.id === "nspk_generic" ? nspkUrl : `${bank.schemaPrefix}${qrId}`,
		brandColor: bank.brandColorHex,
	}));

	return {
		qrId,
		orderId,
		sumKopecks,
		sumRub,
		sumFormattedRu: formatKopecksToCurrencyRu(sumKopecks),
		recipientLegalName,
		recipientInn,
		recipientAccount,
		bankBic,
		paymentPurpose,
		nspkUrl,
		crc16Hex,
		expiresAtIso,
		emvPayload,
		deepLinks,
	};
}

/**
 * 1-Click calculation of multi-tender split:
 * Available Family Deposit (Tag 1215) + Dynamic SBP QR generation for remaining due (Tag 1081).
 */
export function calculateSbpMultiTenderSplit(draft: SbpSplitTenderDraft): SbpSplitTenderResult {
	const totalKopecks = Math.max(0, rublesToKopecks(draft.totalAmountRub));
	const depositAvailKopecks = Math.max(0, rublesToKopecks(draft.depositAvailableRub));

	const depositOffsetKopecks = Math.min(totalKopecks, depositAvailKopecks);
	const sbpChargeKopecks = Math.max(0, totalKopecks - depositOffsetKopecks);

	const depositOffsetRub = kopecksToRubles(depositOffsetKopecks);
	const sbpChargeRub = kopecksToRubles(sbpChargeKopecks);
	const isFullyCoveredByDeposit = sbpChargeKopecks === 0 && totalKopecks > 0;

	let sbpQr: SbpDynamicQrResult | null = null;
	if (sbpChargeKopecks > 0) {
		sbpQr = generateDynamicSbpQrPayload({
			sumRub: sbpChargeRub,
			orderId: draft.orderId || `ORDER-${Date.now().toString().slice(-6)}`,
			purpose:
				draft.purpose ||
				`Доплата через СБП к семейному расчету (заказ ${draft.orderId || "CRM"})`,
			clinicName: draft.clinicName,
		});
	}

	return {
		totalAmountRub: kopecksToRubles(totalKopecks),
		totalAmountKopecks: totalKopecks,
		depositOffsetRub,
		depositOffsetKopecks,
		sbpChargeRub,
		sbpChargeKopecks,
		isFullyCoveredByDeposit,
		sbpQr,
		tag1081ElectronicKopecks: sbpChargeKopecks,
		tag1215PrepaidKopecks: depositOffsetKopecks,
	};
}
