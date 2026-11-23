/**
 * apps/api/src/routes/cashbox/paymentStages/settlementAndBomStage.ts
 *
 * Stage 8: Invoice Settlement, Visit Signing, BOM Materials Write-Off & Change-to-Deposit.
 * Governed by Mandate 8e, 8v, 8bm, 8bo (Soft Negative Stock & Clinical Autonomy).
 */

import { and, eq, ne, notInArray, sql } from "drizzle-orm";
import {
	kopecksToNumericString,
	normalizePaymentMethod,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	advanceDepositTaggings,
	appointments,
	patientInvoices,
	payments,
	treatmentItems,
	visits,
} from "../../../db/schema.js";
import { withSavepoint } from "../../../db/rls.js";
import { chargeLineKopecks } from "../../../money/patientDebt.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumables/index.js";
import { finalizeLoyaltyBonusDeduction } from "./loyaltyBonusStage.js";
import { finalizeGiftCertificateDeduction } from "./giftCertificateStage.js";
import { finalizeDmsDeduction } from "./dmsStage.js";
import {
	type PaymentProcessingContext,
	type StageStepResult,
	type TenantTransaction,
} from "./types.js";

export async function processSettlementAndBomStage(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (ctx.isWarrantyPayment) {
		return { success: true };
	}

	const {
		orgId,
		body,
		totalKopecks,
		resolvedPatientId,
		patientName,
		effectiveVisitId,
		newPayment,
		logger,
	} = ctx;

	// 1. Обновление целевого инвойса
	if (body.invoiceId) {
		const [invoicePayments] = await tx
			.select({
				totalPaidRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.documentId, body.invoiceId),
					eq(payments.status, "paid"),
				),
			);
		const invoiceTotalKop = parseKopecks(
			ctx.lockedInvoice?.totalAmountRub ?? ctx.lockedInvoice?.totalRub ?? 0,
		);
		const totalPaidKop = parseKopecks(invoicePayments?.totalPaidRub ?? 0);
		const nextStatus = totalPaidKop >= invoiceTotalKop ? "paid" : "partially_paid";

		await tx
			.update(patientInvoices)
			.set({
				status: nextStatus,
				paidAt: nextStatus === "paid" ? new Date() : null,
			})
			.where(
				and(
					eq(patientInvoices.id, body.invoiceId),
					eq(patientInvoices.organizationId, orgId),
				),
			);
	}

	// 2. Обновление счетов визита и списание BOM
	if (effectiveVisitId) {
		const visitInvoices = await tx
			.select({
				id: patientInvoices.id,
				status: patientInvoices.status,
				totalRub: patientInvoices.totalAmountRub,
			})
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.visitId, effectiveVisitId),
					eq(patientInvoices.organizationId, orgId),
				),
			);

		for (const inv of visitInvoices) {
			const [invPaid] = await tx
				.select({
					totalPaidRub: sql<number>`coalesce(sum(${payments.amountRub}), 0)`,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.documentId, inv.id),
						eq(payments.status, "paid"),
					),
				);
			const totalDueKop = parseKopecks(inv.totalRub ?? 0);
			const totalPaidKop = parseKopecks(invPaid?.totalPaidRub ?? 0);
			const invStatus =
				totalPaidKop >= totalDueKop
					? "paid"
					: totalPaidKop > 0
						? "partially_paid"
						: inv.status;
			await tx
				.update(patientInvoices)
				.set({
					status: invStatus,
					paidAt: invStatus === "paid" ? new Date() : null,
				})
				.where(
					and(
						eq(patientInvoices.id, inv.id),
						eq(patientInvoices.organizationId, orgId),
					),
				);
		}

		// Проверка переплаты по визиту и автоматическое зачисление сдачи на авансовый депозит (Мандат 8e)
		const activeTreatmentItems = await tx
			.select({
				unitPriceRub: treatmentItems.unitPriceRub,
				quantity: treatmentItems.quantity,
				discountRub: treatmentItems.discountRub,
			})
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, orgId),
					eq(treatmentItems.visitId, effectiveVisitId),
					ne(treatmentItems.status, "cancelled"),
				),
			);

		let isVisitFullySettled = false;

		if (activeTreatmentItems.length > 0) {
			const chargedVisitKopecks = sumKopecks(
				activeTreatmentItems.map((item) =>
					chargeLineKopecks({
						unitPriceRub: item.unitPriceRub,
						quantity: item.quantity,
						discountRub: item.discountRub,
					}),
				),
			);

			const existingVisitPayments = await tx
				.select({
					amountRub: payments.amountRub,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.visitId, effectiveVisitId),
						eq(payments.status, "paid"),
						ctx.createdPaymentIds.length > 0
							? notInArray(payments.id, ctx.createdPaymentIds)
							: newPayment?.id
								? ne(payments.id, newPayment.id)
								: sql`true`,
					),
				);

			const priorPaidKopecks = sumKopecks(
				existingVisitPayments.map((p) =>
					rublesToKopecks(Number(p.amountRub || 0)),
				),
			);

			const remainingVisitKopecks = Math.max(
				0,
				chargedVisitKopecks - priorPaidKopecks,
			);

			const incomingPaymentKopecks = Number(totalKopecks);
			if (incomingPaymentKopecks > remainingVisitKopecks) {
				const overpaymentKopecks = incomingPaymentKopecks - remainingVisitKopecks;
				const normMethod = normalizePaymentMethod(body.method);
				// Устранение хардкодного лимита 500 000 коп. (Мандат 8e): сдача в полном объеме зачисляется на депозит пациента
				if (normMethod === "cash" && overpaymentKopecks > 0) {
					const overpaymentRub = kopecksToNumericString(overpaymentKopecks);

					await tx.insert(advanceDepositTaggings).values({
						organizationId: orgId,
						patientId: resolvedPatientId,
						patientName: patientName || "Пациент",
						depositAmountRub: overpaymentRub,
						taggedTargetType: "patient_deposit",
						taggedTargetName: `Авансовый депозит по приему ${effectiveVisitId}`,
						allocationStatus: "unallocated",
					});
				}
			}

			if (incomingPaymentKopecks >= remainingVisitKopecks) {
				isVisitFullySettled = true;
			}
		} else {
			isVisitFullySettled = true;
		}

		// Полноценный сеттлмент визита: draft -> signed, appointments -> completed, warehouse BOM deduction
		const [visitRow] = await tx
			.select({
				id: visits.id,
				status: visits.status,
				appointmentId: visits.appointmentId,
			})
			.from(visits)
			.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (isVisitFullySettled && visitRow) {
			if (visitRow.status === "draft") {
				await tx
					.update(visits)
					.set({
						status: "signed",
						signedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(and(eq(visits.id, visitRow.id), eq(visits.organizationId, orgId)));
			} else {
				await tx
					.update(visits)
					.set({ updatedAt: new Date() })
					.where(and(eq(visits.id, visitRow.id), eq(visits.organizationId, orgId)));
			}

			if (visitRow.appointmentId) {
				await tx
					.update(appointments)
					.set({ status: "completed" })
					.where(
						and(
							eq(appointments.id, visitRow.appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);
			}

			// Автоматическое списание расходных материалов по техкартам процедур (BOM) визита (Мандаты 8e, 8v)
			const cashierUserId = body.cashierUserId || body.operatorId || null;
			try {
				await withSavepoint(tx, async (spTx) => {
					await TreatmentConsumablesService.deductForVisit(spTx, {
						organizationId: orgId,
						visitId: effectiveVisitId,
						userId: cashierUserId,
						transactionType: "auto_deduct",
						clientMutationId: ctx.effectiveMutationId || body.clientMutationId || null,
						patientId: resolvedPatientId,
						carpulesCount: (body as { carpulesCount?: number }).carpulesCount ?? undefined,
						drugName: (body as { drugName?: string }).drugName ?? undefined,
						mdlpItems: (body as { mdlpItems?: Array<{ rawBarcode?: string | null; sgtin?: string | null; gtin?: string | null; serialNumber?: string | null; costRub?: number | null; tradeName?: string | null; inn?: string | null; series?: string | null }> }).mdlpItems ?? undefined,
						allowOverdraft: true,
					});
				});
			} catch (deductErr) {
				// Soft Negative Stock: ошибка списания никогда не блокирует кассовый расчет визита
				logger?.warn(
					{ err: deductErr, visitId: effectiveVisitId, orgId },
					"BOM materials auto-deduction completed with warning",
				);
			}

			await tx
				.update(treatmentItems)
				.set({ status: "completed" })
				.where(
					and(
						eq(treatmentItems.organizationId, orgId),
						eq(treatmentItems.visitId, effectiveVisitId),
						ne(treatmentItems.status, "completed"),
						ne(treatmentItems.status, "cancelled"),
					),
				);
		} else {
			await tx
				.update(visits)
				.set({ updatedAt: new Date() })
				.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)));
		}
	}

	// 3. Финализация списания лояльности, сертификатов и ДМС
	await finalizeLoyaltyBonusDeduction(tx, ctx);
	await finalizeGiftCertificateDeduction(tx, ctx);
	await finalizeDmsDeduction(tx, ctx);

	return { success: true };
}
