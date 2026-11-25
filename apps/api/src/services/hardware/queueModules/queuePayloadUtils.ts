/**
 * queuePayloadUtils.ts — Pure Payload & Hardware Status Helpers for Fiscal Receipt Queue Worker.
 */

import type { FiscalReceiptDetails } from "@dental/shared";
import {
	kopecksToNumericString,
	rublesToKopecks,
} from "@dental/shared";
import {
	type Ffd12ItemPayload,
	type Ffd12ReceiptPayload,
} from "../../kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "../lanKktDriverService.js";
import type { KktDeviceStatus, KktLanConfig, KktPrintResult } from "../types.js";

const STALE_PRINTING_THRESHOLD_MS = 2 * 60 * 1000;

function toNonNegInt(val: unknown): number {
	if (typeof val === "number" && Number.isFinite(val)) {
		return Math.max(0, Math.round(val));
	}
	if (typeof val === "string" && val.trim().length > 0) {
		const n = Number(val);
		if (Number.isFinite(n)) return Math.max(0, Math.round(n));
	}
	return 0;
}

function rubOrKopecks(kopecksVal: unknown, rubVal: unknown): number {
	const kop = toNonNegInt(kopecksVal);
	if (kop > 0) return kop;
	if (typeof rubVal === "number" && Number.isFinite(rubVal) && rubVal > 0) {
		return Math.max(0, rublesToKopecks(rubVal));
	}
	if (typeof rubVal === "string" && rubVal.trim().length > 0) {
		const n = Number(rubVal);
		if (Number.isFinite(n) && n > 0) return Math.max(0, rublesToKopecks(n));
	}
	return 0;
}

function resolveOpTypeCode(raw: Record<string, unknown>): number {
	const tag = toNonNegInt(raw.tag1054_operationType ?? raw.tag1054);
	if (tag >= 1 && tag <= 4) return tag;
	const op = String(raw.operationType ?? raw.receiptType ?? "").toLowerCase();
	if (op === "income_return" || op === "return") return 2;
	if (op === "expense") return 3;
	if (op === "expense_return") return 4;
	return 1;
}

function normalizeLegacyItem(rawItem: unknown): Ffd12ItemPayload | null {
	if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
		return null;
	}
	const item = rawItem as Record<string, unknown>;
	const quantityRaw = Number(item.tag1023_quantity ?? item.quantity ?? 1);
	const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
	const priceKopecks = rubOrKopecks(item.priceKopecks, item.priceRub ?? item.tag1079_unitPriceRub);
	const amountKopecks =
		rubOrKopecks(item.amountKopecks, item.amountRub ?? item.tag1043_amountRub) ||
		Math.round(priceKopecks * quantity);
	const effectivePrice =
		priceKopecks > 0 ? priceKopecks : quantity > 0 ? Math.round(amountKopecks / quantity) : 0;
	const name =
		(typeof item.tag1030_subjectName === "string" && item.tag1030_subjectName.trim()) ||
		(typeof item.name === "string" && item.name.trim()) ||
		(typeof item.title === "string" && item.title.trim()) ||
		"Оказание стоматологических услуг";

	return {
		name,
		priceKopecks: effectivePrice,
		quantity,
		amountKopecks,
		tag1030_subjectName: name,
		tag1079_unitPriceRub: kopecksToNumericString(effectivePrice),
		tag1023_quantity: quantity,
		tag1043_amountRub: kopecksToNumericString(amountKopecks),
		tag1212_paymentSubject: toNonNegInt(item.tag1212_paymentSubject) || 4,
		tag1214_paymentMethod: toNonNegInt(item.tag1214_paymentMethod) || 4,
		tag1199_vatRate: toNonNegInt(item.tag1199_vatRate) || 6,
		tag2108_quantityMeasure: toNonNegInt(item.tag2108_quantityMeasure),
		tag1222_agentSign:
			typeof item.tag1222_agentSign === "number" ? item.tag1222_agentSign : null,
		medicalServiceCodeMzk:
			typeof item.medicalServiceCodeMzk === "string"
				? item.medicalServiceCodeMzk
				: typeof item.medicalServiceCode804n === "string"
					? item.medicalServiceCode804n
					: null,
		markingCode: typeof item.markingCode === "string" ? item.markingCode : null,
		tag2000_markingPayload:
			item.tag2000_markingPayload && typeof item.tag2000_markingPayload === "object"
				? (item.tag2000_markingPayload as Ffd12ItemPayload["tag2000_markingPayload"])
				: null,
	};
}

/**
 * Parses and defensively normalizes both canonical FFD 1.2 payloads and legacy flat /
 * Fiscal54FzService (`tag1020_totalKopecks`) historical queue rows into `Ffd12ReceiptPayload`.
 */
export function parseFfd12Payload(val: unknown): Ffd12ReceiptPayload {
	const raw: Record<string, unknown> =
		val && typeof val === "object" && !Array.isArray(val)
			? (val as Record<string, unknown>)
			: {};

	const rawPayments =
		raw.payments && typeof raw.payments === "object" && !Array.isArray(raw.payments)
			? (raw.payments as Record<string, unknown>)
			: {};

	const cashKopecks = rubOrKopecks(
		rawPayments.cashKopecks ?? rawPayments.tag1031_cashKopecks ?? raw.cashKopecks,
		rawPayments.tag1031_cashRub ?? raw.cashRub,
	);
	const sbpKopecks = rubOrKopecks(
		rawPayments.sbpKopecks ?? rawPayments.sberPayQrKopecks ?? raw.sbpKopecks,
		raw.sbpRub,
	);
	const explicitCardKopecks = rubOrKopecks(
		rawPayments.electronicCardKopecks ?? rawPayments.sberCardKopecks ?? raw.electronicCardKopecks,
		undefined,
	);
	const combinedElectronicKopecks = rubOrKopecks(
		rawPayments.tag1081_electronicKopecks ?? raw.electronicKopecks,
		rawPayments.tag1081_electronicRub ?? raw.electronicRub,
	);
	const electronicCardKopecks =
		explicitCardKopecks > 0
			? explicitCardKopecks
			: Math.max(0, combinedElectronicKopecks - sbpKopecks);
	const prepaidKopecks = rubOrKopecks(
		rawPayments.prepaidKopecks ??
			rawPayments.tag1215_advanceOffsetKopecks ??
			raw.prepaidKopecks ??
			raw.advanceOffsetKopecks,
		rawPayments.tag1215_prepaidAdvanceOffsetRub ?? raw.advanceOffsetRub,
	);

	const rawItems = Array.isArray(raw.items) ? raw.items : [];
	const items: Ffd12ItemPayload[] = rawItems
		.map((entry) => normalizeLegacyItem(entry))
		.filter((entry): entry is Ffd12ItemPayload => entry !== null);

	const itemsSum = items.reduce((sum, item) => sum + item.amountKopecks, 0);
	const paymentsSum = cashKopecks + electronicCardKopecks + sbpKopecks + prepaidKopecks;
	const explicitTotal = rubOrKopecks(
		raw.totalKopecks ?? raw.tag1020_totalKopecks ?? raw.amountKopecks,
		raw.tag1020_totalRub ?? raw.totalRub ?? raw.amountRub,
	);
	const totalKopecks = explicitTotal || paymentsSum || itemsSum;

	if (items.length === 0 && totalKopecks > 0) {
		const fallbackName =
			(typeof raw.note === "string" && raw.note.trim()) ||
			(typeof raw.reasonText === "string" && raw.reasonText.trim()) ||
			"Оказание стоматологических услуг";
		items.push({
			name: fallbackName,
			priceKopecks: totalKopecks,
			quantity: 1,
			amountKopecks: totalKopecks,
			tag1030_subjectName: fallbackName,
			tag1079_unitPriceRub: kopecksToNumericString(totalKopecks),
			tag1023_quantity: 1,
			tag1043_amountRub: kopecksToNumericString(totalKopecks),
			tag1212_paymentSubject: toNonNegInt(raw.calculationSubjectTag1212) || 4,
			tag1214_paymentMethod: toNonNegInt(raw.calculationMethodTag1214 ?? raw.calculationSign) || 4,
			tag1199_vatRate: 6,
			tag2108_quantityMeasure: 0,
			tag1222_agentSign: null,
			medicalServiceCodeMzk: null,
			markingCode: null,
			tag2000_markingPayload: null,
		});
	}

	const totalElectronicKopecks = electronicCardKopecks + sbpKopecks;

	return {
		tag1054_operationType: resolveOpTypeCode(raw),
		tag1055_taxationSystem: toNonNegInt(raw.tag1055_taxationSystem) || 2,
		tag1057_agentSign:
			typeof raw.tag1057_agentSign === "number" ? raw.tag1057_agentSign : null,
		tag1021_cashierName:
			(typeof raw.tag1021_cashierName === "string" && raw.tag1021_cashierName.trim()) ||
			(typeof raw.cashierFullName === "string" && raw.cashierFullName.trim()) ||
			"Кассир-администратор",
		tag1203_cashierInn:
			typeof raw.tag1203_cashierInn === "string" ? raw.tag1203_cashierInn : null,
		tag1008_customerContact:
			(typeof raw.tag1008_customerContact === "string" && raw.tag1008_customerContact) ||
			(typeof raw.customerContact === "string" && raw.customerContact) ||
			"",
		tag1227_customerName:
			typeof raw.tag1227_customerName === "string"
				? raw.tag1227_customerName
				: typeof raw.patientName === "string"
					? raw.patientName
					: null,
		tag1228_customerInn:
			typeof raw.tag1228_customerInn === "string" ? raw.tag1228_customerInn : null,
		...(typeof raw.tag1009_paymentAddress === "string"
			? { tag1009_paymentAddress: raw.tag1009_paymentAddress }
			: {}),
		...(typeof raw.tag1187_paymentPlace === "string"
			? { tag1187_paymentPlace: raw.tag1187_paymentPlace }
			: {}),
		tag1020_totalRub: kopecksToNumericString(totalKopecks),
		totalKopecks,
		payments: {
			tag1031_cashRub: kopecksToNumericString(cashKopecks),
			cashKopecks,
			tag1081_electronicRub: kopecksToNumericString(totalElectronicKopecks),
			electronicCardKopecks,
			sbpKopecks,
			tag1215_prepaidAdvanceOffsetRub: kopecksToNumericString(prepaidKopecks),
			prepaidKopecks,
		},
		items,
		taxDeductionCategory:
			raw.taxDeductionCategory === "2" || raw.overallTaxDeductionCategory === "2"
				? "2"
				: "1",
	};
}

export function buildFiscalReceiptDetails(
	payload: Ffd12ReceiptPayload,
	printResult: KktPrintResult,
): FiscalReceiptDetails {
	const opTypeMap: Record<number, FiscalReceiptDetails["operationType"]> = {
		1: "income",
		2: "income_return",
		3: "expense",
		4: "expense_return",
	};
	return {
		fn: printResult.fnSerial ?? null,
		fd: printResult.fiscalDocumentNumber ?? null,
		fpd: printResult.fiscalSign ?? null,
		receiptUrl: printResult.ofdVerificationUrl ?? null,
		cashierName: payload.tag1021_cashierName ?? null,
		operationType: opTypeMap[payload.tag1054_operationType] ?? "income",
	};
}

export function isFreshPrinting(
	item: { status: string; updatedAt: Date | string | null | undefined },
	nowMs: number,
): boolean {
	if (item.status !== "printing" || !item.updatedAt) {
		return false;
	}
	const updatedAtMs =
		item.updatedAt instanceof Date
			? item.updatedAt.getTime()
			: new Date(item.updatedAt).getTime();
	if (!Number.isFinite(updatedAtMs)) {
		return false;
	}
	return nowMs - updatedAtMs < STALE_PRINTING_THRESHOLD_MS;
}

export function extractTargetPaymentIds(
	paymentId: string | null | undefined,
	payloadJson: unknown,
): string[] {
	const ids = new Set<string>();
	if (typeof paymentId === "string" && paymentId.length > 0) {
		ids.add(paymentId);
	}
	if (
		typeof payloadJson === "object" &&
		payloadJson !== null &&
		"createdPaymentIds" in payloadJson
	) {
		const rawCreatedIds: unknown = payloadJson.createdPaymentIds;
		if (Array.isArray(rawCreatedIds)) {
			for (const entry of rawCreatedIds) {
				const candidate: unknown = entry;
				if (typeof candidate === "string" && candidate.length > 0) {
					ids.add(candidate);
				}
			}
		}
	}
	return Array.from(ids);
}

export async function safeCheckDeviceStatus(config?: Partial<KktLanConfig>): Promise<KktDeviceStatus> {
	try {
		return await LanKktDriverService.checkDeviceStatus(config);
	} catch (err: unknown) {
		return {
			online: false,
			paperOk: false,
			coverClosed: true,
			fnPresent: false,
			fnFiscalized: false,
			modelName: "Offline",
			fnSerial: "",
			kktSerialNumber: "",
			lastCheckAt: new Date().toISOString(),
			latencyMs: 0,
			error: err instanceof Error ? err.message : "KKT device status check failed",
		};
	}
}
