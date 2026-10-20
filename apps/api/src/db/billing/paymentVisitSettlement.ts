/**
 * paymentVisitSettlement.ts — Layer 2: Documents, Visits & Materials Auto-Settlement.
 *
 * Implements:
 * - Generated documents & invoices status updates (draft -> issued/paid)
 * - Visit transition to 'signed' and appointment transition to 'completed'
 * - Automatic warehouse material deduction based on bill of materials (BOM)
 * - Treatment items status completion
 *
 * Mandatory /decomposer invariant:
 * - Transaction client tx passed as FIRST argument to ensure single ACID boundary.
 */

import type { CreatePaymentInput, Kopecks } from "@dental/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import { deductMaterialsForVisit } from "../../services/inventory/materialDeduction.js";
import * as schema from "../schema.js";
import type { LockedVisitForBilling } from "./types.js";

export async function settleDocumentsVisitsAndMaterials(
	tx: any,
	params: {
		readonly organizationId: string;
		readonly input: CreatePaymentInput;
		readonly lockedVisit: LockedVisitForBilling | null;
		readonly remainingVisitKopecks: Kopecks;
		readonly incomingPaymentKopecks: Kopecks;
		readonly isWarrantyOrFullDiscount: boolean;
	},
): Promise<void> {
	const {
		organizationId,
		input,
		lockedVisit,
		remainingVisitKopecks,
		incomingPaymentKopecks,
		isWarrantyOrFullDiscount,
	} = params;

	if (input.documentId) {
		await tx
			.update(schema.generatedDocuments)
			.set({
				status: "issued",
				issuedAt: new Date(),
				...(isWarrantyOrFullDiscount ? { totalAmountRub: 0 } : {}),
			})
			.where(
				and(
					eq(schema.generatedDocuments.id, input.documentId),
					eq(schema.generatedDocuments.organizationId, organizationId),
					eq(schema.generatedDocuments.status, "draft"),
				),
			);

		// Честная синхронизация счетов patientInvoices
		const [targetInvoice] = await tx
			.select()
			.from(schema.patientInvoices)
			.where(
				and(
					eq(schema.patientInvoices.id, input.documentId),
					eq(schema.patientInvoices.organizationId, organizationId),
				),
			)
			.for("update")
			.limit(1);

		if (targetInvoice) {
			const invoiceTotalRub = Number(targetInvoice.totalAmountRub || targetInvoice.totalRub || 0);
			const invoiceTotalKop = Math.round(invoiceTotalRub * 100);
			const isFullyCovered =
				isWarrantyOrFullDiscount ||
				incomingPaymentKopecks >= invoiceTotalKop ||
				invoiceTotalKop === 0;

			await tx
				.update(schema.patientInvoices)
				.set({
					status: isFullyCovered ? "paid" : "partially_paid",
					paidAt: isFullyCovered ? new Date() : targetInvoice.paidAt,
					version: sql`${schema.patientInvoices.version} + 1`,
				})
				.where(eq(schema.patientInvoices.id, targetInvoice.id));
		}
	}

	if (input.visitId && isWarrantyOrFullDiscount) {
		// Фиксируем закрытие актов выполненных работ визита по гарантии со 100% скидкой
		await tx
			.update(schema.generatedDocuments)
			.set({
				status: "issued",
				issuedAt: new Date(),
				totalAmountRub: 0,
			})
			.where(
				and(
					eq(schema.generatedDocuments.organizationId, organizationId),
					eq(schema.generatedDocuments.visitId, input.visitId),
					eq(schema.generatedDocuments.kind, "completed_works_act"),
					eq(schema.generatedDocuments.status, "draft"),
				),
			);
	}

	// Автоматический перевод визита в signed и связанной записи в completed при полной оплате или 100% гарантии
	if (input.visitId && lockedVisit) {
		const isVisitFullySettled =
			isWarrantyOrFullDiscount ||
			incomingPaymentKopecks >= remainingVisitKopecks;

		if (isVisitFullySettled) {
			// Переводим все связанные со визитом открытые счета в paid
			await tx
				.update(schema.patientInvoices)
				.set({
					status: "paid",
					paidAt: new Date(),
					version: sql`${schema.patientInvoices.version} + 1`,
				})
				.where(
					and(
						eq(schema.patientInvoices.organizationId, organizationId),
						eq(schema.patientInvoices.visitId, input.visitId),
						ne(schema.patientInvoices.status, "paid"),
					),
				);

			if (lockedVisit.status === "draft") {
				await tx
					.update(schema.visits)
					.set({
						status: "signed",
						signedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(schema.visits.id, input.visitId),
							eq(schema.visits.organizationId, organizationId),
						),
					);
			}

			if (lockedVisit.appointmentId) {
				await tx
					.update(schema.appointments)
					.set({
						status: "completed",
					})
					.where(
						and(
							eq(schema.appointments.id, lockedVisit.appointmentId),
							eq(schema.appointments.organizationId, organizationId),
						),
					);
			}

			// Автоматическое списание расходных материалов со склада по техкартам процедур (BOM)
			try {
				await deductMaterialsForVisit(tx, {
					organizationId,
					visitId: input.visitId,
					userId: input.payerFullName || null,
					transactionType: "auto_deduct",
				});
			} catch (deductErr) {
				console.warn(
					`[billingQuery] Автоматическое списание материалов по визиту ${input.visitId} завершилось с предупреждением:`,
					deductErr,
				);
			}

			await tx
				.update(schema.treatmentItems)
				.set({
					status: "completed",
				})
				.where(
					and(
						eq(schema.treatmentItems.organizationId, organizationId),
						eq(schema.treatmentItems.visitId, input.visitId),
						ne(schema.treatmentItems.status, "completed"),
						ne(schema.treatmentItems.status, "cancelled"),
					),
				);
		}
	}
}
