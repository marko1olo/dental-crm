import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { fiscalReceiptQueue, patientInvoices, patients, payments } from "../../db/schema.js";
import { insertOrFetchFiscalPayment } from "./fiscalPaymentInsertHelper.js";
import { applyFiscalSideEffects } from "./fiscalReceiptSideEffects.js";
import { FiscalInvoiceError } from "./fiscalSignService.js";
import type { CreateFiscalReceiptPayloadInput, ItemizedFfd12Tag } from "./types.js";

export type FiscalDbTransactionResult =
	| {
			readonly isExisting: true;
			readonly payment: typeof payments.$inferSelect;
			readonly queueEntry: null;
			readonly fiscalReceiptNumber: string | null;
	  }
	| {
			readonly isExisting?: false;
			readonly payment: typeof payments.$inferSelect;
			readonly queueEntry: typeof fiscalReceiptQueue.$inferSelect;
	  };

/** Runs the ACID transaction for 54-FZ receipt and related ledger updates */
export async function runFiscalReceiptDbTransaction(params: {
	orgId: string;
	input: CreateFiscalReceiptPayloadInput;
	patientFullName: string;
	effectiveMutationId: string;
	fiscalReceiptNumber: string;
	itemizedFfd12Tags: ItemizedFfd12Tag[];
	now: Date;
}): Promise<FiscalDbTransactionResult> {
	const { orgId, input, patientFullName, effectiveMutationId, fiscalReceiptNumber, itemizedFfd12Tags, now } = params;

	return await db.transaction(async (tx) => {
		const [patient] = await tx
			.select()
			.from(patients)
			.where(and(eq(patients.id, input.patientId), eq(patients.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (!patient) throw new Error("Пациент не найден в этой клинике.");

		if (input.invoiceId) {
			const [invoice] = await tx
				.select()
				.from(patientInvoices)
				.where(and(eq(patientInvoices.id, input.invoiceId), eq(patientInvoices.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!invoice) throw new FiscalInvoiceError("Счёт на оплату не найден в этой клинике.", 404);
			if (input.operationType !== "income_return" && (invoice.status === "paid" || invoice.status === "refunded")) {
				throw new FiscalInvoiceError(
					`Счёт уже находится в статусе «${invoice.status}» и не может быть фискализирован повторно.`,
					409,
					"InvoiceAlreadySettled",
				);
			}
		}

		const { payment, isConflict } = await insertOrFetchFiscalPayment({
			tx,
			orgId,
			input,
			effectiveMutationId,
			fiscalReceiptNumber,
			now,
		});

		if (isConflict) {
			return {
				payment,
				queueEntry: null,
				fiscalReceiptNumber: payment.fiscalReceiptNumber,
				isExisting: true,
			};
		}

		await applyFiscalSideEffects({
			tx,
			orgId,
			input,
			paymentId: payment.id,
			patientFullName,
			fiscalReceiptNumber,
			now,
		});

		const [queueEntry] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: payment.id,
				visitId: input.visitId || null,
				receiptType: input.operationType || "income",
				status: "pending_print",
				payloadJson: {
					...input,
					fiscalReceiptNumber,
					issuedAt: now.toISOString(),
					itemizedFfd12Tags,
				},
				retryCount: 0,
			})
			.returning();

		if (!queueEntry) {
			throw new Error("Не удалось зарегистрировать фискальный чек в очереди печати.");
		}

		return { isExisting: false, payment, queueEntry };
	});
}
