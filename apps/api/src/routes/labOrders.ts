/**
 * Lab Orders Pipeline & Digital CAD/CAM API Routes.
 * Provides complete 5-stage lifecycle state management, StAR/Minzdrav
 * print blank generation, prosthetic warranty passports, and technician portal.
 */

import {
	CANONICAL_5STAGE_LAB_PIPELINE,
	generateProstheticWarrantyPassport,
	type LabPipeline5StageKey,
	labPipeline5StageKeySchema,
	prostheticWarrantyPassportSchema,
	VALID_FDI_TOOTH_NUMBERS,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { labItems, labOrderEvents, labOrders, organizations, patients, users } from "../db/schema.js";
import { registerLabRoutes as baseRegisterLabRoutes } from "./lab.js";
import { wsBroker } from "../services/websocketBroker.js";

export async function registerLabOrderRoutes(app: FastifyInstance) {
	// Register the core lab endpoints from lab.js first
	await baseRegisterLabRoutes(app);

	/**
	 * GET /api/clinical/lab-orders/:id/warranty-passport
	 * Генерация официального гарантийного паспорта ортопедической конструкции (СтАР / Минздрав РФ).
	 */
	app.get("/api/clinical/lab-orders/:id/warranty-passport", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "lab orders passport read");
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const orderWithDetails = await withTenantCtx(orgId, async (tx) => {
			const [order] = await tx
				.select({
					id: labOrders.id,
					orderNumber: labOrders.secureToken,
					toothFdi: labOrders.toothFdi,
					material: labOrders.material,
					colorVita: labOrders.colorVita,
					status: labOrders.status,
					dueDate: labOrders.dueDate,
					patientName: patients.fullName,
					doctorName: users.fullName,
					orgName: organizations.name,
					completedAt: labOrders.completedAt,
					createdAt: labOrders.createdAt,
				})
				.from(labOrders)
				.innerJoin(patients, eq(patients.id, labOrders.patientId))
				.leftJoin(users, eq(users.id, labOrders.doctorId))
				.leftJoin(organizations, eq(organizations.id, labOrders.organizationId))
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			return order;
		});

		if (!orderWithDetails) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ-наряд лаборатории не найден.",
			});
		}

		const formattedOrderNum = `ЛО-${new Date().getFullYear()}-${orderWithDetails.id.slice(0, 8).toUpperCase()}`;

		const passport = generateProstheticWarrantyPassport({
			orderNumber: formattedOrderNum,
			batchCode: `LOT-${new Date().getFullYear()}-${orderWithDetails.id.slice(0, 6).toUpperCase()}`,
			patientFullName: orderWithDetails.patientName || "Пациент",
			clinicName: orderWithDetails.orgName || "Стоматологическая клиника",
			doctorFullName: orderWithDetails.doctorName || "Лечащий врач",
			technicianLabName: "Цифровая зуботехническая лаборатория CAD/CAM",
			toothFdi: orderWithDetails.toothFdi || "—",
			restorationType: "Анатомическая коронка / мостовидный протез",
			frameworkMaterial: orderWithDetails.material || "Диоксид циркония ZrO2 Katana ML",
			shade: orderWithDetails.colorVita || "A2",
			warrantyYears: 2,
			fixationDate: orderWithDetails.completedAt
				? new Date(orderWithDetails.completedAt).toISOString().slice(0, 10)
				: new Date().toISOString().slice(0, 10),
		});

		return reply.send({ success: true, passport });
	});

	/**
	 * POST /api/clinical/lab-orders/:id/pipeline-stage
	 * Перевод заказа ЗТЛ по каноническому 5-этапному пайплайну:
	 * 1. impression_scan -> 2. cad_modeling -> 3. framework_fitting -> 4. ceramic_layering -> 5. ready_fixation
	 */
	app.post("/api/clinical/lab-orders/:id/pipeline-stage", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders pipeline stage update",
		);
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const bodySchema = z.object({
			stage: labPipeline5StageKeySchema,
			notes: z.string().trim().max(1000).optional().nullable(),
			scheduledDate: z.string().optional().nullable(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvalidPipelineStage",
				message: "Недопустимый этап зуботехнического цикла (ожидается один из 5 этапов).",
			});
		}

		const { stage, notes, scheduledDate } = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
			const [existing] = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!existing) {
				return { kind: "not_found" as const };
			}

			// Map 5-stage pipeline to database status
			let dbStatus = existing.status;
			if (stage === "impression_scan") dbStatus = "sent";
			else if (stage === "cad_modeling") dbStatus = "in_progress";
			else if (stage === "framework_fitting") dbStatus = "in_progress";
			else if (stage === "ceramic_layering") dbStatus = "in_progress";
			else if (stage === "ready_fixation") dbStatus = "received";

			const now = new Date();
			const [updated] = await tx
				.update(labOrders)
				.set({
					status: dbStatus,
					clinicalNotes: notes ? `${existing.clinicalNotes ? `${existing.clinicalNotes}\n` : ""}[${CANONICAL_5STAGE_LAB_PIPELINE[stage].shortTitleRu}]: ${notes}` : existing.clinicalNotes,
					dueDate: scheduledDate ? new Date(scheduledDate) : existing.dueDate,
					updatedAt: now,
				})
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.returning();

			// Log milestone event into audit trail
			await tx.insert(labOrderEvents).values({
				organizationId: orgId,
				labOrderId: id,
				milestone: stage,
				actorType: "clinic_doctor",
				actorName: "Врач-ортопед",
				notes: notes ?? null,
			});

			return { kind: "ok" as const, updated };
		});

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ-наряд ЗТЛ не найден.",
			});
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				orderId: id,
				stage,
			},
		});

		return reply.send({
			success: true,
			stage,
			stageDefinition: CANONICAL_5STAGE_LAB_PIPELINE[stage],
			order: result.updated,
		});
	});
}

// Re-export for server integration
export { registerLabRoutes } from "./lab.js";
