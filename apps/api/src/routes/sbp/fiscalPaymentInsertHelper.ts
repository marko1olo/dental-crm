import { kopecksToNumericString } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { db } from "../../db/client.js";
import { payments } from "../../db/schema.js";
import { buildOfdVerificationUrl, computeFiscalSign } from "./fiscalSignService.js";
import type { CreateFiscalReceiptPayloadInput } from "./types.js";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Inserts a fiscal payment record or retrieves existing one on conflict */
export async function insertOrFetchFiscalPayment(params: {
	tx: DbTransaction;
	orgId: string;
	input: CreateFiscalReceiptPayloadInput;
	effectiveMutationId: string;
	fiscalReceiptNumber: string;
	now: Date;
}): Promise<{ payment: typeof payments.$inferSelect; isConflict: boolean }> {
	const { tx, orgId, input, effectiveMutationId, fiscalReceiptNumber, now } = params;
	const isReturn = input.operationType === "income_return";
	const fn = process.env.KKM_FN_SERIAL || "9960440302145896";
	const fd = fiscalReceiptNumber.replace(/\D/g, "") || "1";
	const fpd = computeFiscalSign(fn, fiscalReceiptNumber, now, input.totalKopecks);

	const [payment] = await tx
		.insert(payments)
		.values({
			organizationId: orgId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			documentId: input.documentId || null,
			clientMutationId: effectiveMutationId,
			amountRub: Number(kopecksToNumericString(input.totalKopecks)),
			method:
				input.sbpKopecks > 0
					? "online"
					: input.electronicCardKopecks > 0
						? "card"
						: "cash",
			status: isReturn ? "refunded" : "paid",
			paidAt: now,
			fiscalReceiptNumber,
			fiscalReceiptIssuedAt: now.toISOString(),
			taxDeductionCode:
				input.taxDeductionSummaryCode === "code_2_expensive_treatment" ? "2" : "1",
			fiscalReceipt: {
				fn,
				fd,
				fpd,
				cashierName: input.cashierFullName,
				receiptUrl: buildOfdVerificationUrl({
					fn,
					fd,
					fpd,
					amountKopecks: input.totalKopecks,
					operationType: input.operationType,
				}),
				operationType: isReturn ? "income_return" : "income",
			},
			note: isReturn
				? `Возврат прихода 54-ФЗ. Чек ${fiscalReceiptNumber}`
				: `Фискализация 54-ФЗ. Чек ${fiscalReceiptNumber}`,
		})
		.onConflictDoNothing({
			target: [payments.organizationId, payments.clientMutationId],
		})
		.returning();

	if (payment) {
		return { payment, isConflict: false };
	}

	const [existing] = await tx
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				eq(payments.clientMutationId, effectiveMutationId),
			),
		)
		.limit(1);

	if (existing) {
		return { payment: existing, isConflict: true };
	}

	throw new Error("Не удалось зарегистрировать фискальный платёж в базе данных.");
}
