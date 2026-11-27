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
import { reconcileInvoiceBalanceInDb } from "../../billingRoutes/invoiceBalanceReconciler.js";
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

	// 1. Обновление целевого инвойса через SSOT балансировщик (учитывает сплиты, рассрочки и возвраты)
	if (body.invoiceId) {
		await reconcileInvoiceBalanceInDb(tx, orgId, body.invoiceId);
	}

	// 2. Обновление счетов визита и списание BOM
	if (effectiveVisitId) {
		const visitInvoices = await tx
			.select({
				id: patientInvoices.id,
			})
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.visitId, effectiveVisitId),
					eq(patientInvoices.organizationId, orgId),
				),
			);

		for (const inv of visitInvoices) {
			await reconcileInvoiceBalanceInDb(tx, orgId, inv.id);
		}

		// Проверка переплаты по визиту и автоматическое зачисление сдачи на авансовый депозит (Мандат 8e)
		const activeTreatmentItems = await tx
			.select({
				priceKopecks: treatmentItems.priceKopecks,
				unitPriceKopecks: treatmentItems.unitPriceKopecks,
				discountKopecks: treatmentItems.discountKopecks,
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
				activeTreatmentItems.map((item) => {
					if (item.priceKopecks !== null && item.priceKopecks !== undefined && item.priceKopecks > 0n) {
						return Number(item.priceKopecks);
					}
					if (item.unitPriceKopecks !== null && item.unitPriceKopecks !== undefined && item.unitPriceKopecks > 0n) {
						const qty = Math.max(0, Number(item.quantity || 1));
						const discKop = item.discountKopecks !== null && item.discountKopecks !== undefined
							? Number(item.discountKopecks)
							: 0;
						return Math.max(0, Math.round(Number(item.unitPriceKopecks) * qty) - discKop);
					}
					return chargeLineKopecks({
						unitPriceRub: item.unitPriceRub,
						quantity: item.quantity,
						discountRub: item.discountRub,
					});
				}),
			);

			const existingVisitPayments = await tx
				.select({
					amountKopecks: payments.amountKopecks,
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
					p.amountKopecks !== 0n ? Number(p.amountKopecks) : parseKopecks(p.amountRub ?? 0),
				),
			);

			const remainingVisitKopecks = Math.max(
				0,
				chargedVisitKopecks - priorPaidKopecks,
			);

			const effectivePaidKopecks =
				ctx.patientCoPayKopecks && ctx.patientCoPayKopecks > 0n
					? totalKopecks > ctx.patientCoPayKopecks
						? totalKopecks - ctx.patientCoPayKopecks
						: 0n
					: totalKopecks;
			const incomingPaymentKopecks = Number(effectivePaidKopecks);
			if (incomingPaymentKopecks > remainingVisitKopecks) {
				const overpaymentKopecks = incomingPaymentKopecks - remainingVisitKopecks;
				const normMethod = normalizePaymentMethod(body.method);
				// Устранение хардкодного лимита 500 000 коп. (Мандат 8e): сдача в полном объеме зачисляется на депозит пациента
				if (normMethod === "cash" && overpaymentKopecks > 0) {
					await tx.insert(advanceDepositTaggings).values({
						organizationId: orgId,
						patientId: resolvedPatientId,
						patientName: patientName || "Пациент",
						depositAmountKopecks: BigInt(overpaymentKopecks),
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
						carpulesCount: body.carpulesCount,
						drugName: body.drugName,
						mdlpItems: body.mdlpItems,
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
