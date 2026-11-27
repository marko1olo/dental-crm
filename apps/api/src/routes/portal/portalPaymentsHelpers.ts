import { createHash } from "node:crypto";
import { kopecksToRubles, parseKopecks } from "@dental/shared";
import type { sberbankTransactions } from "../../db/schema.js";

export function readHeaderString(value: string | string[] | undefined): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	if (Array.isArray(value) && typeof value[0] === "string") {
		const trimmed = value[0].trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	return undefined;
}

export function deriveDeterministicSbpOrderId(idempotencyKey: string): string {
	const digest = createHash("sha256").update(idempotencyKey).digest("hex").toUpperCase().slice(0, 24);
	return `SBPA${digest}`;
}

function readOptionalStringField(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}
	return undefined;
}

export function extractBankRequisites(bankDetails?: string | null): {
	account?: string | undefined;
	bic?: string | undefined;
} {
	if (!bankDetails) return {};
	try {
		const parsed: unknown = JSON.parse(bankDetails);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			const record: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(parsed)) {
				record[k] = v;
			}
			const account = readOptionalStringField(record, [
				"account",
				"recipientAccount",
				"settlementAccount",
			]);
			const bic = readOptionalStringField(record, ["bic", "bankBic"]);
			return {
				...(account ? { account } : {}),
				...(bic ? { bic } : {}),
			};
		}
	} catch {
		// Plain text regex extraction
	}
	const accountMatch = bankDetails.match(/\b(40[78]\d{17})\b/);
	const bicMatch = bankDetails.match(/\b(04\d{7})\b/);
	return {
		...(accountMatch?.[1] ? { account: accountMatch[1] } : {}),
		...(bicMatch?.[1] ? { bic: bicMatch[1] } : {}),
	};
}

export type SbpAmountCheckResult =
	| { ok: true; paidKopecksNow: number }
	| { ok: false; error: string; message: string };

export function resolveSbpPaidKopecksNow(params: {
	sberTx: typeof sberbankTransactions.$inferSelect | undefined;
	explicitKopecks: number | undefined;
	externalBankAmountKopecks: number | undefined;
	remainingInvoiceKop: number;
}): SbpAmountCheckResult {
	const { sberTx, explicitKopecks, externalBankAmountKopecks, remainingInvoiceKop } = params;
	if (sberTx) {
		const sberTxKop = Number(sberTx.amountKopecks);
		if (!Number.isSafeInteger(sberTxKop) || sberTxKop <= 0) {
			return { ok: false, error: "InvalidAmount", message: "Некорректная сумма транзакции СБП." };
		}
		if (explicitKopecks !== undefined && explicitKopecks !== sberTxKop) {
			return { ok: false, error: "AmountMismatch", message: "Сумма в запросе не совпадает с суммой транзакции СБП." };
		}
		if (externalBankAmountKopecks !== undefined && externalBankAmountKopecks !== sberTxKop) {
			return { ok: false, error: "AmountMismatch", message: "Сумма подтверждения банка не совпадает с суммой транзакции СБП." };
		}
		if (sberTxKop > remainingInvoiceKop) {
			return { ok: false, error: "AmountMismatch", message: "Сумма транзакции СБП превышает остаток по счёту." };
		}
		return { ok: true, paidKopecksNow: sberTxKop };
	}
	if (externalBankAmountKopecks !== undefined && explicitKopecks !== undefined && externalBankAmountKopecks !== explicitKopecks) {
		return { ok: false, error: "AmountMismatch", message: "Сумма в запросе не совпадает с суммой подтверждения банка." };
	}
	const resolvedKop = externalBankAmountKopecks ?? explicitKopecks ?? remainingInvoiceKop;
	if (!Number.isSafeInteger(resolvedKop) || resolvedKop <= 0 || resolvedKop > remainingInvoiceKop) {
		return { ok: false, error: "AmountMismatch", message: "Сумма оплаты не соответствует остатку по счёту." };
	}
	return { ok: true, paidKopecksNow: resolvedKop };
}

export function buildIdempotentSbpReply(params: {
	paymentId: string;
	invoiceId: string;
	stageId: string;
	status: string;
	amountKopecks: number;
	message: string;
	paidAmountKopecks?: number | undefined;
}) {
	return {
		success: true,
		idempotent: true,
		paymentId: params.paymentId,
		invoiceId: params.invoiceId,
		...(params.stageId ? { stageId: params.stageId } : {}),
		status: params.status,
		amountRub: kopecksToRubles(params.amountKopecks),
		amountKopecks: params.amountKopecks,
		...(params.paidAmountKopecks !== undefined
			? { paidAmountRub: kopecksToRubles(params.paidAmountKopecks), paidAmountKopecks: params.paidAmountKopecks }
			: {}),
		fiscalReceipt: null,
		message: params.message,
	};
}

export function buildAvailablePortalSbpBanks(qrId: string, sbpNspkPayloadString: string) {
	return [
		{ id: "sber", nameRu: "СберБанк Онлайн", schemaPrefix: `sberpay://qr/sub?qrId=${qrId}`, brandColorHex: "#21a038", popular: true },
		{ id: "tbank", nameRu: "Т-Банк (Тинькофф)", schemaPrefix: `tinkoffbank://qr?id=${qrId}`, brandColorHex: "#ffdd2d", popular: true },
		{ id: "alfa", nameRu: "Альфа-Банк", schemaPrefix: `alfabank://qr/pay?qrId=${qrId}`, brandColorHex: "#ef3124", popular: true },
		{ id: "vtb", nameRu: "ВТБ Онлайн", schemaPrefix: `vtb://sbp/pay?qrId=${qrId}`, brandColorHex: "#0a2896", popular: true },
		{ id: "sbp_generic", nameRu: "Другой банк (СБП)", schemaPrefix: sbpNspkPayloadString, brandColorHex: "#1a56db", popular: false },
	];
}

export function resolveInvoiceTotalKopecks(inv: {
	totalPriceKopecks?: bigint | number | null | undefined;
	totalAmountRub?: string | number | null | undefined;
	totalRub?: string | number | null | undefined;
}): number {
	const kopecksVal = inv.totalPriceKopecks != null ? Number(inv.totalPriceKopecks) : 0;
	if (kopecksVal > 0) return kopecksVal;
	return parseKopecks(inv.totalAmountRub || inv.totalRub || "0");
}
