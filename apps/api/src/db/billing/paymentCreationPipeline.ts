/**
 * paymentCreationPipeline.ts — Layer 5: Canonical Facade & ACID Pipeline for Payment Processing.
 *
 * Implements:
 * - Atomic PostgreSQL advisory lock on clientMutationId (idempotency key)
 * - Pessimistic row locking on patient for balance consistency
 * - Decree 659 & catalog price enforcement
 * - Visit & document balance verification
 * - Multi-tender split calculation & wallet/DMS balance deduction
 * - Document/visit auto-settlement & warehouse material deduction
 * - 54-FZ cash & fiscal accounting registration
 *
 * Decomposed into modular architecture:
 * - paymentSplitValidation.ts (kopecks & split calculation)
 * - paymentRecordExecutor.ts (payments row insertions & wallet balance updates)
 * - paymentVisitSettlement.ts (documents, visits, appointments & warehouse auto-settlement)
 */

import {
	type CreatePaymentInput,
	type Payment,
} from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import { validateVisitAndDocumentBalances } from "./billingTargetBalance.js";
import { validateDecree659AndPriceCompliance } from "./decree659Audit.js";
import { recordCashAndFiscalAccounting } from "./fiscalAccounting.js";
import { executePaymentInsertAndBalanceDeductions } from "./paymentRecordExecutor.js";
import { validateAndResolvePaymentSplit } from "./paymentSplitValidation.js";
import { settleDocumentsVisitsAndMaterials } from "./paymentVisitSettlement.js";
import { narrowTaxDeductionCode } from "./types.js";

export * from "./paymentSplitValidation.js";
export * from "./paymentRecordExecutor.js";
export * from "./paymentVisitSettlement.js";

export async function createPaymentInDb(
	organizationId: string,
	input: CreatePaymentInput,
): Promise<Payment> {
	const split = validateAndResolvePaymentSplit(input);
	const { incomingPaymentKopecks, isWarrantyOrFullDiscount } = split;

	return await withTenantCtx(organizationId, async (tx) => {
		// ACID pg_advisory_xact_lock на clientMutationId для защиты от состояния гонки
		if (input.clientMutationId) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':payment_mutation:' || ${input.clientMutationId}))`,
			);
			const alreadyCreatedPayments = await tx
				.select()
				.from(schema.payments)
				.where(
					and(
						eq(schema.payments.organizationId, organizationId),
						or(
							eq(schema.payments.clientMutationId, input.clientMutationId),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:cash`),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:electronic`),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:deposit`),
							eq(schema.payments.clientMutationId, `${input.clientMutationId}:dms`),
						),
					),
				);
			const alreadyCreated = alreadyCreatedPayments[0];
			if (alreadyCreated) {
				return {
					id: alreadyCreated.id,
					organizationId: alreadyCreated.organizationId,
					patientId: alreadyCreated.patientId,
					visitId: alreadyCreated.visitId,
					documentId: alreadyCreated.documentId,
					amountRub: input.amountRub,
					method: (input.method === "split" || input.method === "mixed") ? "card" : alreadyCreated.method,
					clientMutationId: input.clientMutationId,
					fiscalReceiptNumber: alreadyCreated.fiscalReceiptNumber,
					fiscalReceiptIssuedAt: alreadyCreated.fiscalReceiptIssuedAt,
					fiscalReceiptUrl: alreadyCreated.fiscalReceiptUrl,
					fiscalReceipt: alreadyCreated.fiscalReceipt,
					payerFullName: alreadyCreated.payerFullName,
					payerInn: alreadyCreated.payerInn,
					payerBirthDate: alreadyCreated.payerBirthDate,
					payerIdentityDocument: alreadyCreated.payerIdentityDocument,
					payerRelationship: alreadyCreated.payerRelationship,
					taxDeductionCode: narrowTaxDeductionCode(alreadyCreated.taxDeductionCode),
					note: alreadyCreated.note,
					createdAt: alreadyCreated.createdAt.toISOString(),
					paidAt: alreadyCreated.paidAt.toISOString(),
					status: alreadyCreated.status,
				};
			}
		}

		// Pessimistic lock on the target patient to prevent concurrent balance race conditions
		const [lockedPatient] = await tx
			.select({
				id: schema.patients.id,
				fullName: schema.patients.fullName,
				administrativeProfile: schema.patients.administrativeProfile,
				familyGroupId: schema.patients.familyGroupId,
			})
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
				`Пациент с идентификатором ${input.patientId} не найден или заблокирован другой операцией.`,
			);
		}

		// 1. Блокирующий гейт Постановления №659 и проверка цен каталога
		await validateDecree659AndPriceCompliance(tx, {
			organizationId,
			lockedPatient,
			input,
			incomingPaymentKopecks,
			isWarrantyOrFullDiscount,
		});

		// 2 & 3. Валидация остатков по визиту и документу
		const { lockedVisit, remainingVisitKopecks } =
			await validateVisitAndDocumentBalances(tx, {
				organizationId,
				input,
				incomingPaymentKopecks,
			});

		const toothSuffix = input.toothNumber ? ` [Зуб: ${input.toothNumber}]` : "";
		const rawNote = isWarrantyOrFullDiscount
			? (input.note || "Гарантийная переделка (скидка 100%)")
			: (input.note || null);
		const effectivePaymentNote = rawNote
			? (toothSuffix && !rawNote.includes("Зуб") ? `${rawNote}${toothSuffix}` : rawNote)
			: (toothSuffix ? `Оплата стоматологических услуг${toothSuffix}` : null);

		// 4. Запись строк платежей и списание балансов (ДМС, семейный кошелек)
		const primaryPayment = await executePaymentInsertAndBalanceDeductions(tx, {
			organizationId,
			input,
			lockedPatient,
			split,
			effectivePaymentNote,
		});

		// 5. Синхронизация документов, визитов, записей расписания и склада
		await settleDocumentsVisitsAndMaterials(tx, {
			organizationId,
			input,
			lockedVisit: lockedVisit ?? null,
			remainingVisitKopecks,
			incomingPaymentKopecks,
			isWarrantyOrFullDiscount,
		});

		// 6. Формирование кассового и фискального учета
		const { effectiveFdNumber, effectiveReceiptIssuedAt, finalFiscalReceipt } =
			await recordCashAndFiscalAccounting(tx, {
				organizationId,
				input,
				primaryPayment,
				incomingPaymentKopecks,
				isWarrantyOrFullDiscount,
				isSplit: split.isSplit,
				resolvedCashKop: split.resolvedCashKop,
				resolvedElectronicKop: split.resolvedElectronicKop,
				resolvedDmsKop: split.resolvedDmsKop,
				resolvedDepositKop: split.resolvedDepositKop,
			});

		return {
			id: primaryPayment.id,
			organizationId: primaryPayment.organizationId,
			patientId: primaryPayment.patientId,
			visitId: primaryPayment.visitId,
			documentId: primaryPayment.documentId,
			amountRub: input.amountRub,
			method: (input.method === "split" || input.method === "mixed") ? "card" : primaryPayment.method,
			clientMutationId: input.clientMutationId || primaryPayment.clientMutationId,
			fiscalReceiptNumber: effectiveFdNumber || primaryPayment.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: effectiveReceiptIssuedAt,
			fiscalReceiptUrl: primaryPayment.fiscalReceiptUrl,
			fiscalReceipt: finalFiscalReceipt,
			payerFullName: primaryPayment.payerFullName,
			payerInn: primaryPayment.payerInn,
			payerBirthDate: primaryPayment.payerBirthDate,
			payerIdentityDocument: primaryPayment.payerIdentityDocument,
			payerRelationship: primaryPayment.payerRelationship,
			taxDeductionCode: narrowTaxDeductionCode(primaryPayment.taxDeductionCode),
			note: primaryPayment.note,
			createdAt: primaryPayment.createdAt.toISOString(),
			paidAt: primaryPayment.paidAt.toISOString(),
			status: primaryPayment.status,
		};
	});
}
