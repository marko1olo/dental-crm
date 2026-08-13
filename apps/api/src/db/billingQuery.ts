import type { CreatePaymentInput, Payment } from "@dental/shared";
import { formatKopecksRu, sumKopecks, type Kopecks } from "@dental/shared";
import { and, eq, inArray, ne } from "drizzle-orm";
import {
	chargeLineKopecks,
	toKopecks,
} from "../money/patientDebt.js";
import { db } from "./client.js";
import * as schema from "./schema.js";
import { payments as inMemoryPayments } from "../sampleData.js";

// The DB stores tax_deduction_code as free `text`, but the Payment DTO narrows it
// to the fiscal codes "1" | "2" | null. Validate at the read boundary instead of
// asserting with `as any`: any legacy/invalid value collapses to null rather than
// silently violating the contract.
function narrowTaxDeductionCode(value: string | null): "1" | "2" | null {
	return value === "1" || value === "2" ? value : null;
}

export class BillingOverpaymentError extends Error {
	readonly statusCode = 400;
	readonly error = "BillingOverpaymentError";
	readonly targetKind: "visit" | "document";
	readonly targetId: string;
	readonly incomingKopecks: Kopecks;
	readonly remainingKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly paidKopecks: Kopecks;

	constructor(params: {
		targetKind: "visit" | "document";
		targetId: string;
		targetLabel: string;
		incomingKopecks: Kopecks;
		remainingKopecks: Kopecks;
		totalKopecks: Kopecks;
		paidKopecks: Kopecks;
	}) {
		const {
			targetKind,
			targetId,
			targetLabel,
			incomingKopecks,
			remainingKopecks,
			totalKopecks,
			paidKopecks,
		} = params;

		const message =
			remainingKopecks <= 0
				? `По ${targetLabel} уже внесена вся необходимая сумма (${formatKopecksRu(totalKopecks)}). Дополнительная оплата не требуется.`
				: `Сумма оплаты (${formatKopecksRu(incomingKopecks)}) превышает остаток по ${targetLabel} (${formatKopecksRu(remainingKopecks)}). Всего по ${targetLabel}: ${formatKopecksRu(totalKopecks)}, ранее оплачено: ${formatKopecksRu(paidKopecks)}. Укажите сумму не более ${formatKopecksRu(remainingKopecks)}.`;

		super(message);
		this.name = "BillingOverpaymentError";
		this.targetKind = targetKind;
		this.targetId = targetId;
		this.incomingKopecks = incomingKopecks;
		this.remainingKopecks = remainingKopecks;
		this.totalKopecks = totalKopecks;
		this.paidKopecks = paidKopecks;
	}
}

export async function getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

export async function findPaymentByClientMutationIdInDb(
	organizationId: string,
	clientMutationId: string | null | undefined,
): Promise<Payment | null> {
	if (!clientMutationId) return null;
	const [payment] = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.clientMutationId, clientMutationId),
			),
		)
		.limit(1);
	if (!payment) return null;
	return {
		id: payment.id,
		organizationId: payment.organizationId,
		patientId: payment.patientId,
		visitId: payment.visitId,
		documentId: payment.documentId,
		amountRub: payment.amountRub,
		method: payment.method,
		clientMutationId: payment.clientMutationId,
		fiscalReceiptNumber: payment.fiscalReceiptNumber,
		fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt,
		fiscalReceiptUrl: payment.fiscalReceiptUrl,
		fiscalReceipt: payment.fiscalReceipt,
		payerFullName: payment.payerFullName,
		payerInn: payment.payerInn,
		payerBirthDate: payment.payerBirthDate,
		payerIdentityDocument: payment.payerIdentityDocument,
		payerRelationship: payment.payerRelationship,
		taxDeductionCode: narrowTaxDeductionCode(payment.taxDeductionCode),
		note: payment.note,
		createdAt: payment.createdAt.toISOString(),
		paidAt: payment.paidAt.toISOString(),
		status: payment.status,
	};
}

export async function getPatientForBilling(
	organizationId: string,
	patientId: string,
) {
	const [patient] = await db
		.select()
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, patientId),
			),
		)
		.limit(1);
	return patient || null;
}

export async function getVisitForBilling(
	organizationId: string,
	visitId: string,
) {
	const [visit] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, visitId),
			),
		)
		.limit(1);
	return visit || null;
}

export async function getDocumentForBilling(
	organizationId: string,
	documentId: string,
) {
	const [doc] = await db
		.select()
		.from(schema.generatedDocuments)
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		)
		.limit(1);
	return doc || null;
}

export async function createPaymentInDb(
	organizationId: string,
	input: CreatePaymentInput,
): Promise<Payment> {
	const incomingPaymentKopecks = toKopecks(input.amountRub, "сумма оплаты");
	if (incomingPaymentKopecks <= 0) {
		throw new Error("Сумма оплаты должна быть строго больше нуля.");
	}

	return await db.transaction(async (tx) => {
		// Pessimistic lock on the target patient to prevent concurrent balance race conditions
		const [lockedPatient] = await tx
			.select({ id: schema.patients.id })
			.from(schema.patients)
			.where(
				and(
					eq(schema.patients.organizationId, organizationId),
					eq(schema.patients.id, input.patientId),
				),
			)
			.for("update")
			.limit(1);

		if (!lockedPatient) {
			throw new Error(
				`Patient ${input.patientId} not found or locked by another transaction.`,
			);
		}

		// 2. Validate and check remaining balance for visitId
		if (input.visitId) {
			const [lockedVisit] = await tx
				.select({
					id: schema.visits.id,
					patientId: schema.visits.patientId,
					status: schema.visits.status,
				})
				.from(schema.visits)
				.where(
					and(
						eq(schema.visits.organizationId, organizationId),
						eq(schema.visits.id, input.visitId),
					),
				)
				.for("update")
				.limit(1);

			if (!lockedVisit) {
				throw new Error(`Прием ${input.visitId} не найден.`);
			}

			if (lockedVisit.patientId !== input.patientId) {
				throw new Error("Прием оплаты относится к другому пациенту.");
			}

			// Calculate charged amount from non-cancelled treatment items
			const activeTreatmentItems = await tx
				.select({
					unitPriceRub: schema.treatmentItems.unitPriceRub,
					quantity: schema.treatmentItems.quantity,
					discountRub: schema.treatmentItems.discountRub,
					status: schema.treatmentItems.status,
				})
				.from(schema.treatmentItems)
				.where(
					and(
						eq(schema.treatmentItems.organizationId, organizationId),
						eq(schema.treatmentItems.visitId, input.visitId),
						ne(schema.treatmentItems.status, "cancelled"),
					),
				);

			if (activeTreatmentItems.length > 0) {
				const chargedVisitKopecks: Kopecks = sumKopecks(
					activeTreatmentItems.map((item) =>
						chargeLineKopecks({
							unitPriceRub: item.unitPriceRub,
							quantity: item.quantity,
							discountRub: item.discountRub,
						}),
					),
				);

				// Calculate existing paid payments for this visit
				const existingVisitPayments = await tx
					.select({
						amountRub: schema.payments.amountRub,
					})
					.from(schema.payments)
					.where(
						and(
							eq(schema.payments.organizationId, organizationId),
							eq(schema.payments.visitId, input.visitId),
							eq(schema.payments.status, "paid"),
						),
					);

				const paidVisitKopecks: Kopecks = sumKopecks(
					existingVisitPayments.map((p) =>
						toKopecks(p.amountRub, "сумма платежа визита"),
					),
				);

				const remainingVisitKopecks = Math.max(
					0,
					chargedVisitKopecks - paidVisitKopecks,
				);

				if (incomingPaymentKopecks > remainingVisitKopecks) {
					throw new BillingOverpaymentError({
						targetKind: "visit",
						targetId: input.visitId,
						targetLabel: "приему",
						incomingKopecks: incomingPaymentKopecks,
						remainingKopecks: remainingVisitKopecks,
						totalKopecks: chargedVisitKopecks,
						paidKopecks: paidVisitKopecks,
					});
				}
			}
		}

		// 3. Validate and check remaining balance for documentId
		if (input.documentId) {
			const [lockedDoc] = await tx
				.select({
					id: schema.generatedDocuments.id,
					patientId: schema.generatedDocuments.patientId,
					visitId: schema.generatedDocuments.visitId,
					kind: schema.generatedDocuments.kind,
					status: schema.generatedDocuments.status,
					totalAmountRub: schema.generatedDocuments.totalAmountRub,
				})
				.from(schema.generatedDocuments)
				.where(
					and(
						eq(schema.generatedDocuments.organizationId, organizationId),
						eq(schema.generatedDocuments.id, input.documentId),
					),
				)
				.for("update")
				.limit(1);

			if (!lockedDoc) {
				throw new Error(`Документ ${input.documentId} не найден.`);
			}

			if (lockedDoc.patientId !== input.patientId) {
				throw new Error("Документ оплаты относится к другому пациенту.");
			}

			if (lockedDoc.status === "voided") {
				throw new Error("К аннулированному документу нельзя привязать оплату.");
			}

			if (lockedDoc.totalAmountRub !== null && lockedDoc.totalAmountRub !== undefined) {
				const documentTotalKopecks = toKopecks(
					lockedDoc.totalAmountRub,
					"общая сумма документа",
				);

				const existingDocPayments = await tx
					.select({
						amountRub: schema.payments.amountRub,
					})
					.from(schema.payments)
					.where(
						and(
							eq(schema.payments.organizationId, organizationId),
							eq(schema.payments.documentId, input.documentId),
							eq(schema.payments.status, "paid"),
						),
					);

				const paidDocKopecks: Kopecks = sumKopecks(
					existingDocPayments.map((p) =>
						toKopecks(p.amountRub, "сумма платежа документа"),
					),
				);

				const remainingDocKopecks = Math.max(
					0,
					documentTotalKopecks - paidDocKopecks,
				);

				if (incomingPaymentKopecks > remainingDocKopecks) {
					throw new BillingOverpaymentError({
						targetKind: "document",
						targetId: input.documentId,
						targetLabel: "документу",
						incomingKopecks: incomingPaymentKopecks,
						remainingKopecks: remainingDocKopecks,
						totalKopecks: documentTotalKopecks,
						paidKopecks: paidDocKopecks,
					});
				}
			}
		}

		const [newPayment] = await tx
			.insert(schema.payments)
			.values({
				organizationId,
				patientId: input.patientId,
				visitId: input.visitId || null,
				documentId: input.documentId || null,
				amountRub: input.amountRub,
				method: input.method,
				fiscalReceiptNumber: input.fiscalReceiptNumber || null,
				fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
				fiscalReceiptUrl: input.fiscalReceiptUrl || null,
				fiscalReceipt: input.fiscalReceipt || null,
				clientMutationId: input.clientMutationId || null,
				payerFullName: input.payerFullName || null,
				payerInn: input.payerInn || null,
				payerBirthDate: input.payerBirthDate || null,
				payerIdentityDocument: input.payerIdentityDocument || null,
				payerRelationship: input.payerRelationship || null,
				taxDeductionCode: input.taxDeductionCode || null,
				note: input.note || null,
				status: "paid",
			})
			.returning();

		if (!newPayment) {
			throw new Error("Failed to create payment");
		}

		return {
			id: newPayment.id,
			organizationId: newPayment.organizationId,
			patientId: newPayment.patientId,
			visitId: newPayment.visitId,
			documentId: newPayment.documentId,
			amountRub: newPayment.amountRub,
			method: newPayment.method,
			clientMutationId: newPayment.clientMutationId,
			fiscalReceiptNumber: newPayment.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: newPayment.fiscalReceiptIssuedAt,
			fiscalReceiptUrl: newPayment.fiscalReceiptUrl,
			fiscalReceipt: newPayment.fiscalReceipt,
			payerFullName: newPayment.payerFullName,
			payerInn: newPayment.payerInn,
			payerBirthDate: newPayment.payerBirthDate,
			payerIdentityDocument: newPayment.payerIdentityDocument,
			payerRelationship: newPayment.payerRelationship,
			taxDeductionCode: narrowTaxDeductionCode(newPayment.taxDeductionCode),
			note: newPayment.note,
			createdAt: newPayment.createdAt.toISOString(),
			paidAt: newPayment.paidAt.toISOString(),
			status: newPayment.status,
		};
	});
}

/**
 * Приводит статус платежей в соответствие с ВЫДАННЫМИ заявлениями на возврат.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. В этом файле не было ни одного writer'а по платежам,
 * кроме вставки: `db.update(schema.payments)` не вызывался нигде во всём
 * `apps/api/src`. Возврат жил как документ и не существовал как движение денег —
 * выручка (`sum(amount_rub) where status = 'paid'`) продолжала считать
 * возвращённые пациенту деньги полученными.
 *
 * Решение «полностью возвращён» принимается НЕ здесь, а в
 * `documents/guards.ts: paymentRefundSettlements` — там же, где живёт учёт
 * остатка по чеку. Этот слой только записывает, и записывает ровно два перехода:
 *   • `paid` → `refunded`, когда выданные заявления покрыли чек целиком;
 *   • `refunded` → `paid`, когда покрытие исчезло (заявление аннулировано).
 * `planned` и `voided` не трогаются: `planned` — ещё не полученные деньги,
 * `voided` — отменённая строка кассы, и возврат ни ту, ни другую не двигает.
 *
 * Условие по текущему статусу стоит в самом `where`, а не в предварительном
 * чтении: переход выполняется одним оператором, поэтому два одновременных
 * запроса не могут увидеть одно и то же «было» и записать противоречащие «стало».
 * Вызов идемпотентен — повтор не находит строк и возвращает пустой список.
 */
export async function applyPaymentRefundSettlementsInDb(
	organizationId: string,
	settlements: readonly { paymentId: string; fullyRefunded: boolean }[],
): Promise<{ refunded: string[]; restored: string[] }> {
	const toRefund = settlements
		.filter((item) => item.fullyRefunded)
		.map((item) => item.paymentId);
	const toRestore = settlements
		.filter((item) => !item.fullyRefunded)
		.map((item) => item.paymentId);

	async function move(
		paymentIds: readonly string[],
		from: "paid" | "refunded",
		to: "paid" | "refunded",
	): Promise<string[]> {
		if (paymentIds.length === 0) return [];
		const changed = await db
			.update(schema.payments)
			.set({ status: to, updatedAt: new Date() })
			.where(
				and(
					eq(schema.payments.organizationId, organizationId),
					inArray(schema.payments.id, [...paymentIds]),
					eq(schema.payments.status, from),
				),
			)
			.returning({ id: schema.payments.id });
		return changed.map((row) => row.id);
	}

	return {
		refunded: await move(toRefund, "paid", "refunded"),
		restored: await move(toRestore, "refunded", "paid"),
	};
}

export async function getPaymentsByPatientIdInDb(
	organizationId: string,
	patientId: string,
): Promise<Payment[]> {
	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
	        return inMemoryPayments.filter(
	                (payment) =>
	                        payment.organizationId === organizationId &&
	                        payment.patientId === patientId,
	        );
	}
	const res = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.patientId, patientId),
			),
		);
	return res.map(
		(p): Payment => ({
			id: p.id,
			organizationId: p.organizationId,
			patientId: p.patientId,
			visitId: p.visitId,
			documentId: p.documentId,
			amountRub: p.amountRub,
			method: p.method,
			clientMutationId: p.clientMutationId,
			fiscalReceiptNumber: p.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: p.fiscalReceiptIssuedAt,
			fiscalReceiptUrl: p.fiscalReceiptUrl,
			fiscalReceipt: p.fiscalReceipt,
			payerFullName: p.payerFullName,
			payerInn: p.payerInn,
			payerBirthDate: p.payerBirthDate,
			payerIdentityDocument: p.payerIdentityDocument,
			payerRelationship: p.payerRelationship,
			taxDeductionCode: narrowTaxDeductionCode(p.taxDeductionCode),
			note: p.note,
			createdAt: p.createdAt.toISOString(),
			paidAt: p.paidAt.toISOString(),
			status: p.status,
		}),
	);
}
