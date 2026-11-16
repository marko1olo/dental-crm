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
import { wsBroker } from "../../../../services/websocketBroker.js";
import { formatInvoiceNumber } from "../../../invoiceRoutes/invoiceCalculationHelpers.js";
import { LEDGER_ID_PREFIX_LENGTH } from "../../../odontogram/types.js";
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
	},
): Promise<CreatedInvoiceSummary> {
	const { organizationId, patientId, planId, planName, planTotalPriceRub } = params;
	const now = new Date();
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
		for (const it of planItems) {
			const qty = Math.max(1, it.quantity || 1);
			const unitPrice = Number(it.price || 0);
			const discount = Number(it.discount || 0);
			const lineTotal = Math.max(0, unitPrice * qty - discount);
			totalAmountRub += lineTotal;

			const unitPriceKopecks = Math.round(unitPrice * 100);
			const lineTotalKopecks = Math.round(lineTotal * 100);
			const itemId = randomUUID();

			itemsToInsert.push({
				id: itemId,
				organizationId,
				invoiceId,
				priceListItemId:
					it.priceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.priceId)
						? it.priceId
						: null,
				name: it.name || "Стоматологическая услуга плана лечения",
				quantity: String(qty),
				unitPriceKopecks,
				discountPercent: "0",
				totalPriceKopecks: lineTotalKopecks,
				serviceCode: it.priceId || null,
				toothCode: it.toothNumber ? String(it.toothNumber) : null,
				createdAt: now,
			});

			returnedItems.push({
				id: itemId,
				name: it.name || "Стоматологическая услуга плана лечения",
				quantity: qty,
				unitPriceRub: unitPrice,
				priceRub: lineTotal,
				serviceCode: it.priceId || undefined,
				toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
			});
		}
	} else {
		totalAmountRub = Number(planTotalPriceRub || 0);
		const totalKopecks = Math.round(totalAmountRub * 100);
		const itemId = randomUUID();

		itemsToInsert.push({
			id: itemId,
			organizationId,
			invoiceId,
			name: `План лечения: «${planName}»`,
			quantity: "1",
			unitPriceKopecks: totalKopecks,
			discountPercent: "0",
			totalPriceKopecks: totalKopecks,
			createdAt: now,
		});

		returnedItems.push({
			id: itemId,
			name: `План лечения: «${planName}»`,
			quantity: 1,
			unitPriceRub: totalAmountRub,
			priceRub: totalAmountRub,
		});
	}

	const totalAmountRubRounded = Number(totalAmountRub.toFixed(2));

	// SEV-1 FK Invariant: Сначала создаём родительский счёт в patientInvoices, затем дочерние строки в invoiceItems!
	await tx.insert(patientInvoices).values({
		id: invoiceId,
		organizationId,
		patientId,
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
	let createdInvoice: CreatedInvoiceSummary | null = null;

	const approvedPlan = await db.transaction(async (tx) => {
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
			createdInvoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: existing.patientId,
				planId: id,
				planName: updated.name || updated.title || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice,
			});
		}

		return updated;
	});

	if (!approvedPlan) {
		return reply.code(500).send({
			error: "ApproveFailed",
			message: "Не удалось утвердить план лечения",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: "TREATMENT_PLAN_APPROVED",
			reason: `План лечения «${approvedPlan.name}» утвержден (сумма: ${approvedPlan.totalPriceRub || approvedPlan.totalPrice} ₽)`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит утверждения плана лечения");
	}

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: (createdInvoice as CreatedInvoiceSummary).id,
					invoiceNumber: (createdInvoice as CreatedInvoiceSummary).invoiceNumber,
					patientId: existing.patientId,
					patientName: (createdInvoice as CreatedInvoiceSummary).patientName,
					totalAmountRub: (createdInvoice as CreatedInvoiceSummary).totalAmountRub,
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
	let createdInvoice: CreatedInvoiceSummary | null = null;

	const updatedPlan = await db.transaction(async (tx) => {
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
			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: existing.patientId,
				approvedPlanId: id,
				planGroupId: existing.planGroupId,
			});

			createdInvoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: existing.patientId,
				planId: id,
				planName: updated.name || updated.title || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice,
			});
		}

		return updated;
	});

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateStatusFailed",
			message: "Не удалось обновить статус плана лечения.",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: isApproved ? "TREATMENT_PLAN_APPROVED" : "TREATMENT_PLAN_STATUS_CHANGED",
			reason: `Статус плана лечения «${updatedPlan.name || updatedPlan.title}» изменен на «${status}»`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит смены статуса плана лечения");
	}

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: (createdInvoice as CreatedInvoiceSummary).id,
					invoiceNumber: (createdInvoice as CreatedInvoiceSummary).invoiceNumber,
					patientId: existing.patientId,
					patientName: (createdInvoice as CreatedInvoiceSummary).patientName,
					totalAmountRub: (createdInvoice as CreatedInvoiceSummary).totalAmountRub,
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
