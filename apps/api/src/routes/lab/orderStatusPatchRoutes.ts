import { labOrderStatusSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	type LabOrderStatus,
} from "../../db/labQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { labOrderEvents, labOrders } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	mapStageOrStatusToMilestone,
	mapStageToLabOrderStatus,
} from "./types.js";

export async function registerOrderStatusPatchRoutes(app: FastifyInstance) {
	/**
	 * PATCH /api/lab/orders/:id, /api/clinical/lab-orders/:id, /api/dental-lab/orders/:id
	 * Частичное обновление наряда ЗТЛ (статус, этап, клинические заметки, фиксация события в labOrderEvents).
	 */
	const patchLabOrderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders write",
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Частичное обновление наряда ЗТЛ разрешено только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.write",
				role: staffRole,
				message: `Отказ в обновлении наряда ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };

		const patchSchema = z.object({
			stage: z.string().trim().optional(),
			status: labOrderStatusSchema.optional(),
			notes: z.string().trim().max(2000).optional().nullable(),
			clinicalNotes: z.string().trim().max(2000).optional().nullable(),
			labComments: z.string().trim().max(2000).optional().nullable(),
			dueDate: z.string().optional().nullable(),
		});

		const parsed = patchSchema.safeParse(request.body);
		if (!parsed.success) {
			const firstError = parsed.error.issues[0]?.message ?? "Некорректные параметры обновления заказа ЗТЛ.";
			return reply.code(400).send({
				error: "ValidationError",
				message: firstError,
			});
		}

		const body = parsed.data;

		// Маппинг этапа на допустимый статус lab_orders.status (миграция 0042)
		let targetStatus: LabOrderStatus | undefined = body.status;
		if (!targetStatus && body.stage) {
			const mapped = mapStageToLabOrderStatus(body.stage);
			if (mapped) {
				targetStatus = mapped;
			}
		}

		const result = await withTenantCtx(orgId, async (tx) => {
			const [currentOrder] = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!currentOrder) {
				return { kind: "not_found" as const };
			}

			const isWarrantyRequest =
				targetStatus === "refitting" ||
				body.stage === "warranty_rework" ||
				body.stage === "correction_remake" ||
				body.stage === "refitting";

			if (currentOrder.isLockedInstalled && !isWarrantyRequest) {
				return { kind: "locked_installed" as const };
			}

			// Проверка автомата состояний при смене статуса
			if (targetStatus && targetStatus !== currentOrder.status) {
				const currentStatus = currentOrder.status as LabOrderStatus;
				const allowed = LAB_ORDER_CLINIC_TRANSITIONS[currentStatus];

				const isPermittedShortcut =
					(currentStatus === "in_progress" &&
						["received", "refitting", "completed", "shipped", "cancelled"].includes(targetStatus)) ||
					(currentStatus === "received" &&
						["completed", "refitting", "in_progress", "cancelled"].includes(targetStatus)) ||
					(currentStatus === "refitting" &&
						["in_progress", "received", "completed", "cancelled"].includes(targetStatus)) ||
					(currentStatus === "sent" &&
						["in_progress", "shipped", "received", "cancelled"].includes(targetStatus)) ||
					(currentStatus === "completed" &&
						["refitting"].includes(targetStatus)) ||
					targetStatus === "cancelled";

				if ((!allowed || !allowed.includes(targetStatus)) && !isPermittedShortcut) {
					return {
						kind: "invalid_transition" as const,
						currentStatus,
						targetStatus,
					};
				}
			}

			const now = new Date();
			const auditFields: Partial<{
				sentAt: Date;
				completedAt: Date;
				cancelledAt: Date;
			}> = {};

			if (targetStatus === "sent" && !currentOrder.sentAt) {
				auditFields.sentAt = now;
			} else if (targetStatus === "completed" && !currentOrder.completedAt) {
				auditFields.completedAt = now;
			} else if (targetStatus === "cancelled" && !currentOrder.cancelledAt) {
				auditFields.cancelledAt = now;
			}

			// Подготовка заметок
			let updatedClinicalNotes = currentOrder.clinicalNotes;
			if (body.clinicalNotes !== undefined) {
				updatedClinicalNotes = body.clinicalNotes;
			} else if (body.notes && body.notes.trim()) {
				const notePrefix = `[${now.toLocaleDateString("ru-RU")}]: `;
				updatedClinicalNotes = updatedClinicalNotes
					? `${updatedClinicalNotes}\n${notePrefix}${body.notes.trim()}`
					: `${notePrefix}${body.notes.trim()}`;
			}

			let updatedLabComments = currentOrder.labComments;
			if (body.labComments !== undefined) {
				updatedLabComments = body.labComments;
			}

			const updateValues: Record<string, any> = {
				updatedAt: now,
				...auditFields,
			};

			if (targetStatus) {
				updateValues.status = targetStatus;
			}
			if (isWarrantyRequest) {
				updateValues.isLockedInstalled = false;
			}
			if (updatedClinicalNotes !== undefined) {
				updateValues.clinicalNotes = updatedClinicalNotes;
			}
			if (updatedLabComments !== undefined) {
				updateValues.labComments = updatedLabComments;
			}
			if (body.dueDate !== undefined) {
				updateValues.dueDate = body.dueDate ? new Date(body.dueDate) : null;
			}

			const [updated] = await tx
				.update(labOrders)
				.set(updateValues)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.returning();

			// Логирование события в labOrderEvents
			const milestone = mapStageOrStatusToMilestone(body.stage || targetStatus || currentOrder.status);
			await tx.insert(labOrderEvents).values({
				organizationId: orgId,
				labOrderId: currentOrder.id,
				milestone,
				actorType: "clinic_doctor",
				actorName: "Клиника",
				notes: body.notes || `Смена этапа: ${body.stage || targetStatus || ""}`,
				photoUrls: [],
			});

			return { kind: "ok" as const, updated };
		});

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		if (result.kind === "locked_installed") {
			return reply.code(409).send({
				error: "LabOrderLockedInstalled",
				message: "Заказ-наряд ЗТЛ находится в статусе installed (припасован и сдан) и намертво заблокирован от редактирования.",
			});
		}

		if (result.kind === "invalid_transition") {
			return reply.code(409).send({
				error: "InvalidStateTransition",
				message: `Недопустимый переход статуса заказа ЗТЛ из «${result.currentStatus}» в «${result.targetStatus}».`,
			});
		}

		const updated = result.updated;
		if (!updated) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		// Уведомление через веб-сокет
		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				patientId: updated.patientId,
				orderId: updated.id,
				status: updated.status,
			},
		});

		return reply.send({ success: true, order: updated });
	};

	app.patch("/api/lab/orders/:id", patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id", patchLabOrderHandler);
	app.patch("/api/clinical/lab-orders/:id/status", patchLabOrderHandler);
	app.patch("/api/dental-lab/orders/:id", patchLabOrderHandler);
	app.patch("/api/dental-lab/orders/:id/status", patchLabOrderHandler);
}
