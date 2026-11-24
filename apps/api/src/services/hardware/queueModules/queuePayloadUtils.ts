/**
 * queuePayloadUtils.ts — Pure Payload & Hardware Status Helpers for Fiscal Receipt Queue Worker.
 */

import type { FiscalReceiptDetails } from "@dental/shared";
import { type Ffd12ReceiptPayload } from "../../kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "../lanKktDriverService.js";
import type { KktDeviceStatus, KktLanConfig, KktPrintResult } from "../types.js";

const STALE_PRINTING_THRESHOLD_MS = 2 * 60 * 1000;

export function parseFfd12Payload(val: unknown): Ffd12ReceiptPayload {
	if (val && typeof val === "object" && !Array.isArray(val)) {
		return val as Ffd12ReceiptPayload;
	}
	return {} as Ffd12ReceiptPayload;
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
