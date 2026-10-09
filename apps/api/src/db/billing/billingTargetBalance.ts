import {
	formatKopecksToRubles,
	sumKopecks,
	type CreatePaymentInput,
	type Kopecks,
} from "@dental/shared";
import { and, eq, ne } from "drizzle-orm";
import { chargeLineKopecks, toKopecks } from "../../money/patientDebt.js";
import type { TenantDb } from "../rls.js";
import * as schema from "../schema.js";
import {
	BillingOverpaymentError,
	type LockedVisitForBilling,
} from "./types.js";

export async function validateVisitAndDocumentBalances(
	tx: TenantDb,
	params: {
		organizationId: string;
		input: CreatePaymentInput;
		incomingPaymentKopecks: number;
	},
): Promise<{
	lockedVisit?: LockedVisitForBilling;
	remainingVisitKopecks: number;
}> {
	const { organizationId, input, incomingPaymentKopecks } = params;

	let lockedVisit: LockedVisitForBilling | undefined;
	let remainingVisitKopecks = 0;

	// 2. Validate and check remaining balance for visitId
	if (input.visitId) {
		const [foundVisit] = await tx
			.select({
				id: schema.visits.id,
				patientId: schema.visits.patientId,
				appointmentId: schema.visits.appointmentId,
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

		if (!foundVisit) {
			throw new Error(`Прием ${input.visitId} не найден.`);
		}

		if (foundVisit.patientId !== input.patientId) {
			throw new Error("Прием оплаты относится к другому пациенту.");
		}
		lockedVisit = foundVisit;

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

			remainingVisitKopecks = Math.max(
				0,
				chargedVisitKopecks - paidVisitKopecks,
			);

			if (incomingPaymentKopecks > remainingVisitKopecks) {
				const overpaymentKopecks = incomingPaymentKopecks - remainingVisitKopecks;
				// При наличной оплате (cash) кассир вправе принять купюру большего номинала (например, 5000 ₽ при долге 4600 ₽),
				// и сдача автоматически зачисляется на авансовый депозит пациента (до 5000 ₽ сдачи).
				// При безналичной оплате (card, sbp) или неразумной переплате (> 5 000 ₽ сдачи)
				// избыточный платеж мимо леджера приема блокируется кассой (BillingOverpaymentError).
				if (input.method === "cash" && overpaymentKopecks <= 500000) {
					const overpaymentRub = formatKopecksToRubles(overpaymentKopecks);

					await tx.insert(schema.advanceDepositTaggings).values({
						organizationId,
						patientName: input.payerFullName || "Пациент",
						depositAmountRub: overpaymentRub,
						taggedTargetType: "patient_deposit",
						taggedTargetName: `Авансовый депозит по приему ${input.visitId}`,
						allocationStatus: "unallocated",
					});

					console.info(
						`[Billing Overpayment]: Пациент внес ${formatKopecksToRubles(incomingPaymentKopecks)} ₽ при остатке по визиту ${formatKopecksToRubles(remainingVisitKopecks)} ₽. Излишек ${overpaymentRub} ₽ автоматически зачислен на авансовый депозит.`,
					);
				} else {
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

		if (
			lockedDoc.totalAmountRub !== null &&
			lockedDoc.totalAmountRub !== undefined
		) {
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

	return {
		lockedVisit,
		remainingVisitKopecks,
	};
}
