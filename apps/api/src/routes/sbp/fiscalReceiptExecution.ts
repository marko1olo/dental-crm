import { kopecksToNumericString } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patientInvoices, patients, payments } from "../../db/schema.js";
import type { FiscalizeReceiptServiceResult } from "./fiscalExecutionTypes.js";
import { buildItemizedFfd12Tags } from "./fiscalItemMapper.js";
import { updateFiscalQueuePrintStatus } from "./fiscalQueuePrinter.js";
import { runFiscalReceiptDbTransaction } from "./fiscalReceiptTransaction.js";
import { resolveTag1054, resolveTag1055 } from "./fiscalTagsResolver.js";
import type { CreateFiscalReceiptPayloadInput } from "./types.js";

export type { FiscalizeReceiptServiceResult };

/** Executes ACID transaction for fiscalizing receipts under 54-FZ */
export async function executeFiscalizeReceiptTransaction(params: {
	orgId: string;
	input: CreateFiscalReceiptPayloadInput;
	headerIdempotencyKey?: string | undefined;
	logWarn?: (obj: Record<string, unknown>, msg: string) => void;
}): Promise<FiscalizeReceiptServiceResult> {
	const { orgId, input, headerIdempotencyKey, logWarn } = params;

	const [patient] = await db
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(and(eq(patients.id, input.patientId), eq(patients.organizationId, orgId)))
		.limit(1);

	if (!patient) return { kind: "patient_not_found" };

	if (input.invoiceId) {
		const [invoice] = await db
			.select()
			.from(patientInvoices)
			.where(and(eq(patientInvoices.id, input.invoiceId), eq(patientInvoices.organizationId, orgId)))
			.limit(1);
		if (!invoice) return { kind: "invoice_not_found" };
	}

	const fiscalReceiptNumber = `FD-${Date.now().toString().slice(-6)}`;
	const now = new Date();
	const effectiveMutationId =
		input.clientMutationId?.trim() || headerIdempotencyKey?.trim() || `fiscal:${fiscalReceiptNumber}`;

	if (effectiveMutationId && !effectiveMutationId.startsWith("fiscal:")) {
		const [existing] = await db
			.select()
			.from(payments)
			.where(and(eq(payments.organizationId, orgId), eq(payments.clientMutationId, effectiveMutationId)))
			.limit(1);

		if (existing) {
			const expectedAmountRub = Number(kopecksToNumericString(input.totalKopecks));
			if (Math.abs(Number(existing.amountRub) - expectedAmountRub) > 0.001 || existing.patientId !== input.patientId) {
				return { kind: "idempotency_conflict" };
			}
			return { kind: "existing_payment", payment: existing, fiscalReceiptNumber: existing.fiscalReceiptNumber || "" };
		}
	}

	const itemizedFfd12Tags = buildItemizedFfd12Tags(input.items);
	const result = await runFiscalReceiptDbTransaction({
		orgId,
		input,
		patientFullName: patient.fullName,
		effectiveMutationId,
		fiscalReceiptNumber,
		itemizedFfd12Tags,
		now,
	});

	if ("isExisting" in result && result.isExisting) {
		return { kind: "existing_payment", payment: result.payment, fiscalReceiptNumber: result.fiscalReceiptNumber || "" };
	}

	const isKktOffline = process.env.KKM_FORCE_OFFLINE === "1" || process.env.KKM_HARDWARE_TIMEOUT === "1";
	const { queueStatus } = await updateFiscalQueuePrintStatus({
		queueEntryId: result.queueEntry?.id,
		orgId,
		isKktOffline,
		logWarn,
	});

	return {
		kind: "created",
		payment: result.payment,
		fiscalReceiptNumber,
		queueId: result.queueEntry?.id,
		queueStatus,
		ffd12Tags: {
			tag1054_operationType: resolveTag1054(input.operationType),
			tag1055_taxationSystem: resolveTag1055(input.taxationSystem),
			tag1008_customerContact: input.customerContact,
			tag1021_cashier: input.cashierFullName,
			tag1031_cashSumKopecks: input.cashKopecks,
			tag1081_electronicSumKopecks: input.electronicCardKopecks + input.sbpKopecks,
			tag1215_prepaidSumKopecks: input.prepaidKopecks,
			items: itemizedFfd12Tags,
		},
	};
}
