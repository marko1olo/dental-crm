/**
 * cashRegisterApi.ts — Сетевые вызовы и офлайн-фолбэк кассы (DENTE CRM).
 * Распаковка DTO-конверта Fastify { success, data } (Мандат 8bm) и Idempotency-Key (Мандат 8bo).
 */

import { generateUuidV7, kopecksToRubles } from "@dental/shared";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders.js";
import {
	enqueueOfflinePayment,
	type PaymentMethodKind,
} from "../../../offline/offlinePaymentQueue.js";
import {
	OFD_UNCONFIGURED_LABEL,
	KKT_UNCONFIGURED_LABEL,
	resolveOfdDisplayName,
	type CashboxTenderType,
	type ClientPayerType,
	type FiscalTapeOperationItem,
} from "../cashRegisterCatalogData.js";

export class CashRegisterNetworkError extends Error {
	readonly status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = "CashRegisterNetworkError";
		this.status = status;
	}
}

export function resolveOfflinePaymentType(
	tender: CashboxTenderType,
	isWarranty: boolean,
): PaymentMethodKind {
	if (isWarranty || tender === "warranty") return "cash";
	if (tender === "split" || tender === "installment" || tender === "insurance") return "mixed";
	if (tender === "card" || tender === "sbp" || tender === "deposit" || tender === "cash") {
		return tender;
	}
	return "cash";
}

export function isCashRegisterNetworkFailure(err: unknown, status?: number): boolean {
	if (status && [502, 503, 504].includes(status)) return true;
	if (typeof navigator !== "undefined" && !navigator.onLine) return true;
	if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) return true;
	if (err instanceof Error) {
		const msg = err.message.toLowerCase();
		return (
			msg.includes("network")
			|| msg.includes("failed to fetch")
			|| msg.includes("abort")
			|| msg.includes("timeout")
			|| msg.includes("offline")
			|| msg.includes("econnrefused")
			|| msg.includes("connection")
		);
	}
	return false;
}

async function parseJsonLogged<T>(res: Response, context: string): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch (err) {
		clientLogger.warn(`[cashRegisterApi] Не удалось разобрать JSON (${context})`, err, { module: "Cashbox" });
		return null;
	}
}

export async function fetchClinicFiscalMeta(): Promise<{ kktRegNumber: string; ofdName: string } | null> {
	const res = await fetch("/api/settings/clinic/fiscal", { headers: denteClinicalReadHeaders() });
	if (!res.ok) return null;
	const raw = await parseJsonLogged<{
		data?: Record<string, unknown>;
		kkmActive?: unknown;
		kkmSerialNumber?: unknown;
		kkmModel?: unknown;
		ofdProvider?: unknown;
	}>(res, "fetchClinicFiscalMeta");
	const fiscal = (raw?.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown> | null;
	if (!fiscal) return null;
	const kkmActive = Boolean(fiscal.kkmActive);
	const serial = typeof fiscal.kkmSerialNumber === "string" ? fiscal.kkmSerialNumber.trim() : "";
	const model = typeof fiscal.kkmModel === "string" ? fiscal.kkmModel.trim() : "";
	const ofdRaw = typeof fiscal.ofdProvider === "string" ? fiscal.ofdProvider.trim() : "";
	const isConfigured = kkmActive || Boolean(serial);
	return {
		kktRegNumber: serial || (model && kkmActive ? model : KKT_UNCONFIGURED_LABEL),
		ofdName: isConfigured && ofdRaw ? resolveOfdDisplayName(ofdRaw) : OFD_UNCONFIGURED_LABEL,
	};
}

export async function fetchCashRecentOperations(): Promise<FiscalTapeOperationItem[]> {
	const res = await fetch("/api/cash/operation-list", { headers: denteClinicalReadHeaders() });
	if (!res.ok) return [];
	const raw = await parseJsonLogged<{ data?: unknown } | unknown[]>(res, "fetchCashRecentOperations");
	const unwrapped = !Array.isArray(raw) && raw && typeof raw === "object" ? raw.data ?? raw : raw;
	return Array.isArray(unwrapped) ? (unwrapped as FiscalTapeOperationItem[]).slice(0, 10) : [];
}

export async function queuePaymentOfflineFallback(params: {
	patientId?: string | undefined;
	patientName?: string | undefined;
	visitId?: string | undefined;
	invoiceId?: string | undefined;
	effectiveTotalKopecks: bigint;
	isWarrantyCaseFinal: boolean;
	method: CashboxTenderType;
	splitCashKopecks: bigint;
	splitCardKopecks: bigint;
	splitSbpKopecks: bigint;
	splitDepositKopecks: bigint;
	splitBonusKopecks: bigint;
	splitCertKopecks: bigint;
	certificateNumber: string;
	serviceTitle?: string | undefined;
	cashierFullName: string;
	doctorFullName?: string | undefined;
	patientPhone?: string | undefined;
	fiscalize: boolean;
	clientMutationId: string;
}) {
	const queuedItem = await enqueueOfflinePayment({
		patientId: params.patientId && params.patientId !== "pat-walkin" ? params.patientId : "pat-walkin",
		patientName: params.patientName || "Пациент клиники",
		visitId: params.visitId,
		invoiceId: params.invoiceId || undefined,
		totalKopecks: params.isWarrantyCaseFinal ? 0 : Number(params.effectiveTotalKopecks),
		paymentType: resolveOfflinePaymentType(params.method, params.isWarrantyCaseFinal),
		splitDetails: params.method === "split" && !params.isWarrantyCaseFinal
			? {
				cashKopecks: Number(params.splitCashKopecks),
				cardKopecks: Number(params.splitCardKopecks),
				sbpKopecks: Number(params.splitSbpKopecks),
				depositKopecks: Number(params.splitDepositKopecks),
				bonusKopecks: Number(params.splitBonusKopecks),
				certificateKopecks: Number(params.splitCertKopecks),
				certificateNumber: params.certificateNumber.trim() || undefined,
			}
			: undefined,
		items: [{
			name: params.serviceTitle || "Стоматологические услуги",
			priceKopecks: params.isWarrantyCaseFinal ? 0 : Number(params.effectiveTotalKopecks),
			quantity: 1,
		}],
		cashierName: params.cashierFullName,
		doctorName: params.doctorFullName,
		patientPhoneOrEmail: params.patientPhone,
		printFiscalReceipt: params.fiscalize,
	});
	return {
		success: true,
		amountKopecks: params.isWarrantyCaseFinal ? 0 : Number(params.effectiveTotalKopecks),
		effectiveTotalRub: params.isWarrantyCaseFinal ? 0 : kopecksToRubles(Number(params.effectiveTotalKopecks)),
		method: params.method,
		clientMutationId: params.clientMutationId,
		visitId: params.visitId,
		isOfflineQueued: true,
		queueId: queuedItem.id,
	};
}

export async function submitInstallmentContractApi(params: {
	patientId: string;
	invoiceId?: string | undefined;
	visitId?: string | undefined;
	effectiveTotalKopecks: bigint;
	installmentMonths: 3 | 6 | 12;
	clientMutationId: string;
}): Promise<{ contract?: { contractNumber?: string } | undefined }> {
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": params.clientMutationId,
	});
	const res = await fetch("/api/installments", {
		method: "POST",
		headers,
		body: JSON.stringify({
			patientId: params.patientId,
			invoiceId: params.invoiceId || undefined,
			visitId: params.visitId,
			totalAmountKopecks: Number(params.effectiveTotalKopecks),
			totalAmountRub: kopecksToRubles(Number(params.effectiveTotalKopecks)),
			downPaymentRub: 0,
			monthsCount: params.installmentMonths,
			notes: `Внутренняя рассрочка клиники 0% на ${params.installmentMonths} мес. (счёт ${params.invoiceId || "б/н"})`,
		}),
	});
	if (!res.ok) {
		const errRaw = await parseJsonLogged<{ data?: { message?: string }; message?: string }>(res, "installments:error");
		const errBody = errRaw?.data ?? errRaw;
		throw new Error(errBody?.message || `Ошибка оформления рассрочки (код ${res.status})`);
	}
	const rawJson = await parseJsonLogged<{
		data?: { contract?: { contractNumber?: string } };
		contract?: { contractNumber?: string };
	}>(res, "installments:ok");
	const body = rawJson?.data ?? rawJson;
	return { contract: body?.contract ?? rawJson?.contract };
}

export async function submitCashboxPaymentApi(params: {
	payload: Record<string, unknown>;
	clientMutationId: string;
	fallbackResult: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": params.clientMutationId,
	});
	const res = await fetch("/api/cashbox/payments", {
		method: "POST",
		headers,
		body: JSON.stringify(params.payload),
	});
	if (!res.ok) {
		if ([502, 503, 504].includes(res.status)) {
			throw new CashRegisterNetworkError(`Сервер кассы временно недоступен (код ${res.status})`, res.status);
		}
		const errRaw = await parseJsonLogged<{
			data?: { message?: string; error?: string };
			message?: string;
			error?: string;
		}>(res, "cashboxPayments:error");
		const errBody = errRaw?.data ?? errRaw;
		throw new Error(errBody?.message || errBody?.error || `Сбой проведения платежа сервером кассы (код ${res.status})`);
	}
	const rawJson = await parseJsonLogged<{
		success?: boolean;
		message?: string;
		data?: Record<string, unknown>;
	}>(res, "cashboxPayments:ok");
	if (rawJson && rawJson.success === false) {
		throw new Error(rawJson.message || "Ошибка проведения платежа через кассовый аппарат");
	}
	return rawJson?.data ?? params.fallbackResult;
}

export async function toggleCashboxShiftApi(action: "open" | "close", cashierFullName: string): Promise<void> {
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
	});
	const res = await fetch(
		action === "close" ? "/api/cashbox/shift/close" : "/api/cashbox/shift/open",
		{
			method: "POST",
			headers,
			body: JSON.stringify(
				action === "close"
					? { force: true, cashierFullName }
					: { cashierFullName, openedByUserId: undefined },
			),
		},
	);
	if (!res.ok) {
		const errRaw = await parseJsonLogged<{ data?: { message?: string }; message?: string }>(res, `shift:${action}:error`);
		const errBody = errRaw?.data ?? errRaw;
		throw new Error(
			errBody?.message || (action === "close" ? `Ошибка закрытия смены (код ${res.status})` : `Ошибка открытия смены (код ${res.status})`),
		);
	}
	const okRaw = await parseJsonLogged<{ data?: unknown }>(res, `shift:${action}:ok`);
	void okRaw?.data;
}

export async function printFiscalXReportApi(cashierFullName: string): Promise<void> {
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
	});
	const res = await fetch("/api/fiscal/x-report", {
		method: "POST",
		headers,
		body: JSON.stringify({ cashierFullName }),
	});
	if (!res.ok) {
		const errRaw = await parseJsonLogged<{ data?: { message?: string }; message?: string }>(res, "x-report:error");
		const errBody = errRaw?.data ?? errRaw;
		throw new Error(errBody?.message || `Ошибка формирования X-отчёта (код ${res.status})`);
	}
}

export function buildPaymentPayload(params: {
	patientId?: string | undefined;
	visitId?: string | undefined;
	invoiceId?: string | undefined;
	isRetailSale: boolean;
	isWarrantyCaseFinal: boolean;
	effectiveTotalKopecks: bigint;
	method: CashboxTenderType;
	cashierFullName: string;
	payerType: ClientPayerType;
	buyerInn: string;
	printFormat: string;
	clientMutationId: string;
	splitCashKopecks: bigint;
	splitCardKopecks: bigint;
	splitSbpKopecks: bigint;
	splitDepositKopecks: bigint;
	splitBonusKopecks: bigint;
	splitCertKopecks: bigint;
	certificateNumber: string;
	dmsKopecks?: bigint | undefined;
	dmsLetterId?: string | undefined;
}): Record<string, unknown> {
	const effectiveTotalRubDisplay = params.isWarrantyCaseFinal ? 0 : kopecksToRubles(Number(params.effectiveTotalKopecks));
	const payload: Record<string, unknown> = {
		patientId: !params.isRetailSale ? params.patientId : undefined,
		isRetailSale: params.isRetailSale,
		visitId: params.visitId,
		invoiceId: params.invoiceId || undefined,
		amountKopecks: params.isWarrantyCaseFinal ? 0 : Number(params.effectiveTotalKopecks),
		amountRub: effectiveTotalRubDisplay,
		method: params.isWarrantyCaseFinal ? "warranty" : params.method,
		isWarranty: params.isWarrantyCaseFinal,
		cashierFullName: params.cashierFullName,
		clientType: params.payerType,
		buyerInn: params.payerType !== "physical_person" ? params.buyerInn.trim() || undefined : undefined,
		printFormat: params.printFormat,
		clientMutationId: params.clientMutationId,
		note: params.isWarrantyCaseFinal ? "Гарантийный расчёт (скидка 100%)" : undefined,
	};

	if (params.dmsKopecks && params.dmsKopecks > 0n) {
		if (params.dmsLetterId) payload.guaranteeLetterId = params.dmsLetterId;
		payload.dmsAmountKopecks = Number(params.dmsKopecks);
		payload.dmsAmountRub = kopecksToRubles(Number(params.dmsKopecks));
	}

	if (params.method === "split" && !params.isWarrantyCaseFinal) {
		payload.cashAmountKopecks = Number(params.splitCashKopecks);
		payload.electronicAmountKopecks = Number(params.splitCardKopecks + params.splitSbpKopecks);
		payload.depositAmountKopecks = Number(params.splitDepositKopecks);
		payload.bonusAmountKopecks = Number(params.splitBonusKopecks);
		payload.certificateAmountKopecks = Number(params.splitCertKopecks);
		if (params.splitCertKopecks > 0n && params.certificateNumber.trim()) {
			payload.certificateNumber = params.certificateNumber.trim();
		}
		const tenders: Array<{ method: string; amountKopecks: number; amountRub?: number | undefined; guaranteeLetterId?: string | undefined; certificateNumber?: string | undefined }> = [];
		const pushTender = (m: string, kop: bigint, extra?: { guaranteeLetterId?: string; certificateNumber?: string }) => {
			if (kop > 0n) tenders.push({ method: m, amountKopecks: Number(kop), amountRub: kopecksToRubles(Number(kop)), ...extra });
		};
		pushTender("cash", params.splitCashKopecks);
		pushTender("card", params.splitCardKopecks);
		pushTender("sbp", params.splitSbpKopecks);
		pushTender("family_wallet", params.splitDepositKopecks);
		pushTender("loyalty", params.splitBonusKopecks);
		pushTender("certificate", params.splitCertKopecks, params.certificateNumber.trim() ? { certificateNumber: params.certificateNumber.trim() } : undefined);
		if (params.dmsKopecks && params.dmsKopecks > 0n) {
			pushTender("insurance", params.dmsKopecks, params.dmsLetterId ? { guaranteeLetterId: params.dmsLetterId } : undefined);
		}
		payload.splitTenders = tenders;
	}

	if (params.method === "certificate" && !params.isWarrantyCaseFinal) {
		payload.certificateNumber = params.certificateNumber.trim() || undefined;
		payload.certificateAmountKopecks = Number(params.effectiveTotalKopecks);
		payload.certificateAmountRub = effectiveTotalRubDisplay;
	}

	void clientLogger;
	return payload;
}
