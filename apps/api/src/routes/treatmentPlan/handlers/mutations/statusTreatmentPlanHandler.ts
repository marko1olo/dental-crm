import { randomUUID } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../../db/client.js";
import {
	auditEvents,
	invoiceItems,
	patientInvoices,
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../../../db/schema.js";
import { kopecksToRubles, rublesToKopecks, sumKopecks } from "@dental/shared";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { formatInvoiceNumber } from "../../../invoiceRoutes/invoiceCalculationHelpers.js";
import { LEDGER_ID_PREFIX_LENGTH } from "../../../odontogram/types.js";
import { calculateEffectivePlanDiscount } from "../treatmentPlanTotalsCalculator.js";
import { cancelRejectedPlanTierLedgerItems } from "./planLedgerSync.js";
import { updateTreatmentPlanStatusSchema } from "./schemas.js";

/**
 * statusTreatmentPlanHandler.ts — Утверждение, смена статуса и жизненный цикл плана лечения.
 * Мандат 8b/8zi: строгое транзакционное управление статусами с обновлением книги лечения.
 * DEF-PLAN-01: При утверждении плана создается реальный счет/наряд в кассе и возвращается объект инвойса.
 */

interface CreatedInvoiceSummary {
	id: string;
	number: string;
	invoiceNumber: string;
	patientId: string;
	patientName: string;
	treatmentPlanId: string | null;
	visitId: string | null;
	totalAmountRub: number;
	status: string;
	issuedAt: string;
	createdAt: string;
	items: Array<{
		id: string;
		name: string;
		quantity: number;
		unitPriceRub: number;
		priceRub: number;
		serviceCode?: string | undefined;
		toothCode?: string | undefined;
	}>;
}

async function createInvoiceForApprovedPlan(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	params: {
		organizationId: string;
		patientId: string;
		planId: string;
		planName: string;
		planTotalPriceRub?: string | number | null;
		discountMode?: string | null | undefined;
		planDiscountPercent?: number | null | undefined;
		planDiscountRub?: number | null | undefined;
	},
): Promise<CreatedInvoiceSummary> {
	const { organizationId, patientId, planId, planName, planTotalPriceRub } = params;
	const now = new Date();

	// DEF-02: Идемпотентность создания счета при повторном утверждении плана
	const [existingInvoice] = await tx
		.select()
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.treatmentPlanId, planId),
			),
		)
		.limit(1);

	if (existingInvoice) {
		const existingItems = await tx
			.select()
			.from(invoiceItems)
			.where(
				and(
					eq(invoiceItems.organizationId, organizationId),
					eq(invoiceItems.invoiceId, existingInvoice.id),
				),
			);

		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
			.limit(1);

		const existingInvoiceNumber = formatInvoiceNumber("invoice", patientId) || existingInvoice.id;

		return {
			id: existingInvoice.id,
			number: existingInvoiceNumber,
			invoiceNumber: existingInvoiceNumber,
			patientId,
			patientName: patient?.fullName || "Пациент",
			treatmentPlanId: planId,
			visitId: existingInvoice.visitId,
			totalAmountRub: existingInvoice.totalAmountRub ?? Number(existingInvoice.totalRub || 0),
			status: existingInvoice.status || "draft",
			issuedAt: existingInvoice.issuedAt ? new Date(existingInvoice.issuedAt).toISOString() : now.toISOString(),
			createdAt: existingInvoice.createdAt ? new Date(existingInvoice.createdAt).toISOString() : now.toISOString(),
			items: existingItems.map((it) => ({
				id: it.id,
				name: it.name,
				quantity: Number(it.quantity || 1),
				unitPriceRub: kopecksToRubles(it.unitPriceKopecks || 0),
				priceRub: kopecksToRubles(it.totalPriceKopecks || 0),
				serviceCode: it.serviceCode || undefined,
				toothCode: it.toothCode || undefined,
			})),
		};
	}

	const invoiceId = randomUUID();

	const planItems = await tx
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, planId),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		);

	const [patient] = await tx
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	const patientName = patient?.fullName || "Пациент";
	const invoiceNumber =
		formatInvoiceNumber("invoice", patientId) ||
		`СЧ-${now.getFullYear()}-${invoiceId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

	let totalAmountRub = 0;
	const returnedItems: CreatedInvoiceSummary["items"] = [];
	const itemsToInsert: Array<typeof invoiceItems.$inferInsert> = [];

	if (planItems.length > 0) {
		const rawLineData = planItems.map((it) => {
			const qty = Math.max(1, it.quantity || 1);
			const unitPrice = Number(it.price || 0);
			const lineDiscountRub = Number(it.discount || 0);
			const unitPriceKopecks = rublesToKopecks(unitPrice);
			const lineDiscountKopecks = rublesToKopecks(lineDiscountRub);
			const lineBaseKopecks = Math.max(0, unitPriceKopecks * qty - lineDiscountKopecks);
			return {
				it,
				qty,
				unitPrice,
				lineDiscountRub,
				unitPriceKopecks,
				lineBaseKopecks,
			};
		});

		const sumOfLinesKopecks = sumKopecks(rawLineData.map((l) => l.lineBaseKopecks));

		// Мандат 8e: Полный учет скидки плана (вплоть до 100% гарантии врача = 0 ₽)
		const effectiveDiscount = calculateEffectivePlanDiscount({
			baseTotalKopecks: sumOfLinesKopecks,
			discountMode: params.discountMode ?? "plan_fixed",
			planDiscountPercent: Number(params.planDiscountPercent ?? 0),
			planDiscountRub: Number(params.planDiscountRub ?? 0),
		});

		const targetFinalTotalKopecks = effectiveDiscount.finalTotalKopecks;
		const totalDiscountToApplyKopecks = effectiveDiscount.discountKopecks;
		let remainingDiscountKopecks = totalDiscountToApplyKopecks;

		for (let i = 0; i < rawLineData.length; i++) {
			const line = rawLineData[i]!;
			let lineAdditionalDiscountKopecks = 0;

			if (totalDiscountToApplyKopecks > 0 && sumOfLinesKopecks > 0) {
				if (i === rawLineData.length - 1) {
					lineAdditionalDiscountKopecks = Math.min(line.lineBaseKopecks, remainingDiscountKopecks);
				} else {
					lineAdditionalDiscountKopecks = Math.min(
						line.lineBaseKopecks,
						Math.round((line.lineBaseKopecks * totalDiscountToApplyKopecks) / sumOfLinesKopecks),
					);
					lineAdditionalDiscountKopecks = Math.min(lineAdditionalDiscountKopecks, remainingDiscountKopecks);
				}
				remainingDiscountKopecks -= lineAdditionalDiscountKopecks;
			}

			const lineFinalKopecks = Math.max(0, line.lineBaseKopecks - lineAdditionalDiscountKopecks);
			const lineFinalRub = kopecksToRubles(lineFinalKopecks);
			const fullLinePriceKopecks = line.unitPriceKopecks * line.qty;
			const totalLineDiscountKopecks = Math.max(0, fullLinePriceKopecks - lineFinalKopecks);
			const effectiveDiscountPercent = fullLinePriceKopecks > 0
				? Math.min(100, Math.round((totalLineDiscountKopecks / fullLinePriceKopecks) * 100))
				: 0;

			const itemId = randomUUID();

			itemsToInsert.push({
				id: itemId,
				organizationId,
				invoiceId,
				priceListItemId:
					line.it.priceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(line.it.priceId)
						? line.it.priceId
						: null,
				name: line.it.name || "Стоматологическая услуга плана лечения",
				quantity: String(line.qty),
				unitPriceKopecks: line.unitPriceKopecks,
				discountPercent: String(effectiveDiscountPercent),
				totalPriceKopecks: lineFinalKopecks,
				serviceCode: line.it.priceId || null,
				toothCode: line.it.toothNumber ? String(line.it.toothNumber) : null,
				createdAt: now,
			});

			returnedItems.push({
				id: itemId,
				name: line.it.name || "Стоматологическая услуга плана лечения",
				quantity: line.qty,
				unitPriceRub: line.unitPrice,
				priceRub: lineFinalRub,
				serviceCode: line.it.priceId || undefined,
				toothCode: line.it.toothNumber ? String(line.it.toothNumber) : undefined,
			});
		}

		totalAmountRub = kopecksToRubles(targetFinalTotalKopecks);
	} else {
		const rawTotalRub = Number(planTotalPriceRub || 0);
		const baseTotalKopecks = rublesToKopecks(rawTotalRub);
		const effectiveDiscount = calculateEffectivePlanDiscount({
			baseTotalKopecks,
			discountMode: params.discountMode ?? "plan_fixed",
			planDiscountPercent: Number(params.planDiscountPercent ?? 0),
			planDiscountRub: Number(params.planDiscountRub ?? 0),
		});

		const finalTotalKopecks = effectiveDiscount.finalTotalKopecks;
		totalAmountRub = kopecksToRubles(finalTotalKopecks);
		const itemId = randomUUID();
		const discountPercent = baseTotalKopecks > 0
			? Math.min(100, Math.round((effectiveDiscount.discountKopecks / baseTotalKopecks) * 100))
			: 0;

		itemsToInsert.push({
			id: itemId,
			organizationId,
			invoiceId,
			name: `План лечения: «${planName}»`,
			quantity: "1",
			unitPriceKopecks: baseTotalKopecks,
			discountPercent: String(discountPercent),
			totalPriceKopecks: finalTotalKopecks,
			createdAt: now,
		});

		returnedItems.push({
			id: itemId,
			name: `План лечения: «${planName}»`,
			quantity: 1,
			unitPriceRub: rawTotalRub,
			priceRub: totalAmountRub,
		});
	}

	const totalAmountRubRounded = Number(totalAmountRub.toFixed(2));

	// SEV-1 FK Invariant: Сначала создаём родительский счёт в patientInvoices, затем дочерние строки в invoiceItems!
	await tx.insert(patientInvoices).values({
		id: invoiceId,
		organizationId,
		patientId,
		treatmentPlanId: planId,
		visitId: null,
		totalRub: String(totalAmountRubRounded),
		totalAmountRub: totalAmountRubRounded,
		status: "draft",
		issuedAt: now,
		createdAt: now,
	});

	if (itemsToInsert.length > 0) {
		await tx.insert(invoiceItems).values(itemsToInsert);
	}

	return {
		id: invoiceId,
		number: invoiceNumber,
		invoiceNumber,
		patientId,
		patientName,
		treatmentPlanId: planId,
		visitId: null,
		totalAmountRub: totalAmountRubRounded,
		status: "draft",
		issuedAt: now.toISOString(),
		createdAt: now.toISOString(),
		items: returnedItems,
	};
}

export async function handleApproveTreatmentPlan(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const rawBody = (request.body && typeof request.body === "object") ? (request.body as Record<string, unknown>) : {};
	const selectedTier = (typeof rawBody.selectedTier === "string" && rawBody.selectedTier.trim())
		|| (typeof rawBody.alternativeTier === "string" && rawBody.alternativeTier.trim())
		|| "optimum";

	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const ledgerPrefix = id.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();

	const { approvedPlan, createdInvoice } = await db.transaction(async (tx) => {
		let invoice: CreatedInvoiceSummary | null = null;
		const [updated] = await tx
			.update(treatmentPlans)
			.set({
				status: "Approved",
				approvedAt: new Date(),
				alternativeTier: selectedTier,
				updatedAt: new Date(),
			})
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (updated) {
			await tx
				.update(treatmentItems)
				.set({
					status: "approved",
					treatmentPlanId: id,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, existing.patientId),
						eq(treatmentItems.status, "proposed"),
						or(
							eq(treatmentItems.treatmentPlanId, id),
							sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
							sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${id} AND organization_id = ${organizationId})`,
						),
					),
				);

			// SEV-2.4: Аннулируем позиции отвергнутых альтернативных тарифов в той же группе планов
			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: existing.patientId,
				approvedPlanId: id,
				planGroupId: existing.planGroupId,
			});

			// DEF-PLAN-01: Создаем реальный счет/наряд в БД при утверждении плана
			invoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: existing.patientId,
				planId: id,
				planName: updated.name || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice,
				discountMode: updated.discountMode,
				planDiscountPercent: updated.planDiscountPercent ? Number(updated.planDiscountPercent) : 0,
				planDiscountRub: updated.planDiscountRub ? Number(updated.planDiscountRub) : 0,
			});

			// Мандат 8bo: Аудит пишется строго внутри единой ACID-транзакции tx
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: id,
				action: "TREATMENT_PLAN_APPROVED",
				reason: `План лечения «${updated.name}» утвержден (сумма: ${updated.totalPriceRub || updated.totalPrice} ₽)`,
			});
		}

		return { approvedPlan: updated, createdInvoice: invoice };
	});

	if (!approvedPlan) {
		return reply.code(500).send({
			error: "ApproveFailed",
			message: "Не удалось утвердить план лечения",
		});
	}

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: createdInvoice.id,
					invoiceNumber: createdInvoice.invoiceNumber,
					patientId: existing.patientId,
					patientName: createdInvoice.patientName,
					totalAmountRub: createdInvoice.totalAmountRub,
					status: "draft",
				},
			});
		} catch (wsErr) {
			request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan approval");
		}
	}

	return reply.code(200).send({
		success: true,
		plan: approvedPlan,
		invoice: createdInvoice,
		createdInvoice,
	});
}

export async function handleUpdateTreatmentPlanStatus(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const parsed = updateTreatmentPlanStatusSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры статуса плана лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
			issues: parsed.error.issues,
		});
	}
	const status = parsed.data.status;

	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const isApproved = status.toLowerCase() === "approved";
	const selectedTier = parsed.data.selectedTier || parsed.data.alternativeTier;

	const { updatedPlan, createdInvoice } = await db.transaction(async (tx) => {
		let invoice: CreatedInvoiceSummary | null = null;
		const [updated] = await tx
			.update(treatmentPlans)
			.set({
				status,
				...(isApproved ? { approvedAt: new Date() } : {}),
				...(selectedTier ? { alternativeTier: selectedTier } : {}),
				updatedAt: new Date(),
			})
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (updated && isApproved) {
			const ledgerPrefix = id.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
			await tx
				.update(treatmentItems)
				.set({
					status: "approved",
					treatmentPlanId: id,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, existing.patientId),
						eq(treatmentItems.status, "proposed"),
						or(
							eq(treatmentItems.treatmentPlanId, id),
							sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
							sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${id} AND organization_id = ${organizationId})`,
						),
					),
				);

			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: existing.patientId,
				approvedPlanId: id,
				planGroupId: existing.planGroupId,
			});

			invoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: existing.patientId,
				planId: id,
				planName: updated.name || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice,
				discountMode: updated.discountMode,
				planDiscountPercent: updated.planDiscountPercent ? Number(updated.planDiscountPercent) : 0,
				planDiscountRub: updated.planDiscountRub ? Number(updated.planDiscountRub) : 0,
			});
		}

		if (updated) {
			// Мандат 8bo: Аудит пишется строго внутри единой ACID-транзакции tx
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: id,
				action: isApproved ? "TREATMENT_PLAN_APPROVED" : "TREATMENT_PLAN_STATUS_CHANGED",
				reason: `Статус плана лечения «${updated.name || updated.title}» изменен на «${status}»`,
			});
		}

		return { updatedPlan: updated, createdInvoice: invoice };
	});

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateStatusFailed",
			message: "Не удалось обновить статус плана лечения.",
		});
	}

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: createdInvoice.id,
					invoiceNumber: createdInvoice.invoiceNumber,
					patientId: existing.patientId,
					patientName: createdInvoice.patientName,
					totalAmountRub: createdInvoice.totalAmountRub,
					status: "draft",
				},
			});
		} catch (wsErr) {
			request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan status change");
		}
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
		invoice: createdInvoice,
		createdInvoice,
	});
}
