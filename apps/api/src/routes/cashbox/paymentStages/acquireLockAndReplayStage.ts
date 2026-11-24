/**
 * apps/api/src/routes/cashbox/paymentStages/acquireLockAndReplayStage.ts
 *
 * Stage 1B: Advisory Lock Acquisition, Idempotent Replay Lookup, Patient Resolution & Invoice Lock.
 * Governed by Mandate 8e, 8n, 8bm, 8bo (54-FZ & ACID Race Protection).
 */

import { and, eq, or, sql } from "drizzle-orm";
import {
	kopecksToRubles,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import { familyGroups, patientInvoices, patients, payments } from "../../../db/schema.js";
import { normalizePatientAdministrativeProfile } from "../../../utils/patientAdministrativeProfile.js";
import type {
	PaymentProcessingContext,
	StageStepResult,
	TenantTransaction,
} from "./types.js";

export async function acquireLockAndResolvePatient(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	const { orgId, effectiveMutationId, body } = ctx;

	// ACID pg_advisory_xact_lock на clientMutationId для защиты от состояния гонки
	if (effectiveMutationId) {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':cashbox_payment:' || ${effectiveMutationId}))`,
		);
	}

	// Проверка идемпотентности
	const matchedExistingPayments = await tx
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				or(
					eq(payments.clientMutationId, effectiveMutationId),
					eq(payments.clientMutationId, `${effectiveMutationId}:card`),
					eq(payments.clientMutationId, `${effectiveMutationId}:sbp`),
					eq(payments.clientMutationId, `${effectiveMutationId}:electronic`),
					eq(payments.clientMutationId, `${effectiveMutationId}:cash`),
					eq(payments.clientMutationId, `${effectiveMutationId}:deposit`),
					eq(payments.clientMutationId, `${effectiveMutationId}:bonus`),
					eq(payments.clientMutationId, `${effectiveMutationId}:certificate`),
					eq(payments.clientMutationId, `${effectiveMutationId}:dms`),
				),
			),
		);

	const existingPayment = matchedExistingPayments[0];
	if (existingPayment) {
		const isSplitReplay =
			matchedExistingPayments.length > 1 ||
			Boolean(
				existingPayment.clientMutationId &&
					(existingPayment.clientMutationId.endsWith(":card") ||
						existingPayment.clientMutationId.endsWith(":sbp") ||
						existingPayment.clientMutationId.endsWith(":electronic") ||
						existingPayment.clientMutationId.endsWith(":cash") ||
						existingPayment.clientMutationId.endsWith(":deposit") ||
						existingPayment.clientMutationId.endsWith(":bonus") ||
						existingPayment.clientMutationId.endsWith(":certificate") ||
						existingPayment.clientMutationId.endsWith(":dms")),
			);
		const totalExistingKop = isSplitReplay
			? sumKopecks(
					matchedExistingPayments.map((p) =>
						p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks !== 0n
							? Number(p.amountKopecks)
							: parseKopecks(p.amountRub ?? 0),
					),
				)
			: existingPayment.amountKopecks !== null &&
				  existingPayment.amountKopecks !== undefined &&
				  existingPayment.amountKopecks !== 0n
				? Number(existingPayment.amountKopecks)
				: parseKopecks(existingPayment.amountRub ?? 0);
		const totalExistingRub = kopecksToRubles(totalExistingKop);

		let replayFamilyPrevBal = 0;
		let replayFamilyNewBal = 0;
		const targetFgId = body.familyGroupId || existingPayment.documentId;
		if (targetFgId) {
			const [fg] = await tx
				.select({ balance: familyGroups.balance, balanceKopecks: familyGroups.balanceKopecks })
				.from(familyGroups)
				.where(and(eq(familyGroups.id, targetFgId), eq(familyGroups.organizationId, orgId)))
				.limit(1);
			if (fg) {
				replayFamilyPrevBal =
					fg.balanceKopecks !== null &&
					fg.balanceKopecks !== undefined &&
					(Number(fg.balanceKopecks) !== 0 || !fg.balance || parseKopecks(fg.balance) === 0)
						? Number(fg.balanceKopecks)
						: parseKopecks(fg.balance ?? 0);
				replayFamilyNewBal = replayFamilyPrevBal;
			}
		}

		return {
			outcome: {
				statusCode: 200,
				body: {
					success: true,
					data: {
						id: existingPayment.id,
						paymentId: existingPayment.id,
						organizationId: existingPayment.organizationId,
						patientId: existingPayment.patientId,
						visitId: existingPayment.visitId,
						documentId: existingPayment.documentId,
						amountKopecks: totalExistingKop,
						amountRub: totalExistingRub,
						method: isSplitReplay ? "split" : existingPayment.method,
						status: existingPayment.status,
						paidAt: existingPayment.paidAt
							? existingPayment.paidAt.toISOString()
							: new Date().toISOString(),
						fiscalReceiptNumber: existingPayment.fiscalReceiptNumber,
						clientMutationId: effectiveMutationId,
						isReplay: true,
						previousFamilyBalanceRub: kopecksToRubles(replayFamilyPrevBal),
						newFamilyBalanceRub: kopecksToRubles(replayFamilyNewBal),
						previousFamilyBalanceKopecks: replayFamilyPrevBal,
						newFamilyBalanceKopecks: replayFamilyNewBal,
					},
				},
			},
		};
	}

	// Разрешение пациента или создание системного розничного покупателя (54-ФЗ ст. 1.2, 4.7)
	const requestedPatientId = body.patientId ?? undefined;
	if (requestedPatientId) {
		const [found] = await tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				familyGroupId: patients.familyGroupId,
			})
			.from(patients)
			.where(and(eq(patients.id, requestedPatientId), eq(patients.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (!found) {
			return {
				failure: {
					kind: "patient_not_found",
					requestedPatientId,
				},
			};
		}
		ctx.patientRow = found;
		ctx.resolvedPatientId = found.id;
		ctx.patientName = found.fullName || "Пациент клиники";
	} else {
		const [existingRetail] = await tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				familyGroupId: patients.familyGroupId,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					eq(patients.fullName, "Розничный покупатель"),
				),
			)
			.limit(1);

		if (existingRetail) {
			ctx.resolvedPatientId = existingRetail.id;
			ctx.patientName = existingRetail.fullName || "Розничный покупатель";
			ctx.patientRow = existingRetail;
		} else {
			const [createdRetail] = await tx
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: "Розничный покупатель",
					notes:
						"Системная запись для свободных кассовых чеков и розничных продаж (54-ФЗ ст. 1.2, 4.7)",
					administrativeProfile: normalizePatientAdministrativeProfile({
						isAnonymous: true,
					}),
				})
				.returning({
					id: patients.id,
					fullName: patients.fullName,
					familyGroupId: patients.familyGroupId,
				});
			ctx.resolvedPatientId = createdRetail?.id ?? "";
			ctx.patientName = createdRetail?.fullName || "Розничный покупатель";
			ctx.patientRow = createdRetail ?? null;
		}
	}

	// [FIN-02] Пессимистическая блокировка инвойса от двойной оплаты и связывание с приёмом
	if (body.invoiceId) {
		const [inv] = await tx
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.id, body.invoiceId),
					eq(patientInvoices.organizationId, orgId),
				),
			)
			.for("update")
			.limit(1);

		if (!inv) {
			return { failure: { kind: "invoice_not_found", invoiceId: body.invoiceId } };
		}
		if (inv.status === "paid" || inv.status === "paid_warranty") {
			return {
				failure: {
					kind: "invoice_already_paid",
					invoiceId: inv.id,
					status: inv.status,
				},
			};
		}
		ctx.lockedInvoice = inv;
		if (!ctx.effectiveVisitId && inv.visitId) {
			ctx.effectiveVisitId = inv.visitId;
		}
	}

	return { success: true };
}
