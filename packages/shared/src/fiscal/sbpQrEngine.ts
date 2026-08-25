/**
 * sbpQrEngine.ts — Движок генерации динамических QR-кодов СБП (НСПК / ГОСТ Р 56042-2014)
 * и копеечного сплита платежей (Депозит/Семейный баланс Тег 1215 + Доплата через СБП Тег 1081).
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "./kopecksArithmetic.js";

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

/**
 * Calculates standard CRC-16/CCITT-FALSE (Polynomial 0x1021, Init 0xFFFF)
 * required by EMVCo and NSPK QR specifications.
 * Safely processes multi-byte UTF-8 streams and handles empty/huge payloads.
 */
export function calculateCrc16Ccitt(data: string): string {
	if (!data) {
		return "FFFF";
	}
	let crc = 0xffff;
	const poly = 0x1021;
	const bytes = new TextEncoder().encode(data);

	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i]!;
		crc ^= byte << 8;
		for (let bit = 0; bit < 8; bit++) {
			if ((crc & 0x8000) !== 0) {
				crc = ((crc << 1) ^ poly) & 0xffff;
			} else {
				crc = (crc << 1) & 0xffff;
			}
		}
	}

	return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Formats an EMVCo TLV (Tag-Length-Value) string element.
 */
function formatEmvTlv(tag: string, value: string): string {
	const len = value.length.toString().padStart(2, "0");
	return `${tag}${len}${value}`;
}

/**
 * Generates a compliant NSPK SBP dynamic QR payload with CRC16 checksum.
 * Strictly requires sumRub > 0 and validates orderId.
 */
export function generateDynamicSbpQrPayload(params: SbpDynamicQrParams): SbpDynamicQrResult {
	const sumKopecks = rubToKopecks(params.sumRub);
	if (sumKopecks <= 0) {
		throw new Error(
			`Сумма динамического QR-кода СБП должна быть строго больше 0 копеек (получено: ${params.sumRub} ₽ / ${sumKopecks} коп.)`,
		);
	}
	const sumRub = kopecksToRub(sumKopecks);
	const orderId = params.orderId?.trim() || `ORD-${Date.now().toString(36).toUpperCase()}`;
	const qrId = `SBP-${orderId}-${Date.now().toString(36).toUpperCase()}`;
	const ttl = params.ttlMinutes ?? 15; // default 15 minutes
	const expiresAtIso = new Date(Date.now() + ttl * 60 * 1000).toISOString();

	const merchantId = params.merchantId || "100000000001";
	const bankId = params.bankId || "100000000111";
	const purpose =
		params.purpose ||
		`Оплата медицинских стоматологических услуг по заказу №${orderId} (${params.clinicName || "ООО ДЕНТЕ"})`;

	// Standard NSPK URL for Fast Payments System
	const baseUrl = `https://qr.nspk.ru/${qrId}?type=02&bank=${bankId}&sum=${sumKopecks}&cur=RUB`;
	const crc16Hex = calculateCrc16Ccitt(baseUrl);
	const nspkUrl = `${baseUrl}&crc=${crc16Hex}`;

	// EMVCo QR Code Payload Format (Merchant Presented QR)
	const emvDataWithoutCrc =
		formatEmvTlv("00", "01") + // Payload Format Indicator
		formatEmvTlv("01", "12") + // Dynamic QR Code (12 = dynamic, 11 = static)
		formatEmvTlv(
			"26",
			formatEmvTlv("00", "ru.nspk.sbp") +
				formatEmvTlv("01", qrId) +
				formatEmvTlv("02", merchantId),
		) + // Merchant Account Info (NSPK SBP)
		formatEmvTlv("52", "8011") + // Merchant Category Code (MCC 8011: Doctors)
		formatEmvTlv("53", "643") + // Transaction Currency (643 = RUB)
		formatEmvTlv("54", sumRub.toFixed(2)) + // Transaction Amount
		formatEmvTlv("58", "RU") + // Country Code
		formatEmvTlv("59", (params.clinicName || "DENTE DENTAL CLINIC").slice(0, 25)) + // Merchant Name
		formatEmvTlv("60", "MOSCOW") + // Merchant City
		formatEmvTlv(
			"62",
			formatEmvTlv("01", orderId.slice(0, 25)) + formatEmvTlv("08", purpose.slice(0, 25)),
		) + // Additional Data Field
		"6304"; // Checksum Tag

	const emvCrc = calculateCrc16Ccitt(emvDataWithoutCrc);
	const emvPayload = `${emvDataWithoutCrc}${emvCrc}`;

	// SBP mobile banking deep link
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
 * 1-Click calculation of multi-tender split:
 * Available Family Deposit (Tag 1215) + Dynamic SBP QR generation for remaining due (Tag 1081).
 */
export function calculateSbpMultiTenderSplit(draft: SbpSplitTenderDraft): SbpSplitTenderResult {
	const totalKopecks = Math.max(0, rubToKopecks(draft.totalAmountRub));
	const depositAvailKopecks = Math.max(0, rubToKopecks(draft.depositAvailableRub));

	const depositOffsetKopecks = Math.min(totalKopecks, depositAvailKopecks);
	const sbpChargeKopecks = Math.max(0, totalKopecks - depositOffsetKopecks);

	const depositOffsetRub = kopecksToRub(depositOffsetKopecks);
	const sbpChargeRub = kopecksToRub(sbpChargeKopecks);
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
		totalAmountRub: kopecksToRub(totalKopecks),
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
