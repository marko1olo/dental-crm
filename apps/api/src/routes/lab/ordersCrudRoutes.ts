import crypto from "node:crypto";
import { labOrderStatusSchema, normalizeVitaShade } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	type LabOrderStatus,
} from "../../db/labQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	labOrders,
	patients,
	users,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	calculateBusinessDaysDueDate,
	colorVitaSchema,
	createLabOrderSchema,
	labOrderPriceRubSchema,
	mapStageToLabOrderStatus,
	toothFdiSchema,
} from "./types.js";

export async function registerOrdersCrudRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinical/lab-orders, /api/lab/orders, /api/dental-lab/orders
	 * Получение всех заказов лаборатории клиники с возможностью фильтрации по пациенту.
	 */
	const getLabOrdersHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"lab orders read",
		);
		if (!orgId) return reply;

		// 152-ФЗ / 323-ФЗ ст. 13: Наряды ЗТЛ содержат формулу зубов и клинические заметки (врачебная тайна)
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.read",
				role: staffRole,
				message: `Отказ в доступе к наряд-заказам ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			action: "VIEW_LAB_ORDERS",
			diagnosis: "Реестр наряд-заказов зуботехнической лаборатории",
		});

		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
		});
		const parsedQuery = querySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			});
		}
		const patientId = parsedQuery.data.patientId;

		const orders = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select({
					id: labOrders.id,
					patientId: labOrders.patientId,
					patientName: patients.fullName,
					doctorId: labOrders.doctorId,
					doctorName: users.fullName,
					secureToken: labOrders.secureToken,
					toothFdi: labOrders.toothFdi,
					material: labOrders.material,
					colorVita: labOrders.colorVita,
					status: labOrders.status,
					dueDate: labOrders.dueDate,
					clinicalNotes: labOrders.clinicalNotes,
					labComments: labOrders.labComments,
					attachedImageUrl: labOrders.attachedImageUrl,
					priceRub: labOrders.priceRub,
					sentAt: labOrders.sentAt,
					completedAt: labOrders.completedAt,
					cancelledAt: labOrders.cancelledAt,
					createdAt: labOrders.createdAt,
					updatedAt: labOrders.updatedAt,
				})
				.from(labOrders)
				.innerJoin(patients, eq(patients.id, labOrders.patientId))
				.leftJoin(users, eq(users.id, labOrders.doctorId))
				.where(
					and(
						eq(labOrders.organizationId, orgId),
						patientId ? eq(labOrders.patientId, patientId) : undefined,
					),
				)
				.orderBy(desc(labOrders.createdAt));
		});

		return orders;
	};

	app.get("/api/clinical/lab-orders", getLabOrdersHandler);
	app.get("/api/lab/orders", getLabOrdersHandler);
	app.get("/api/dental-lab/orders", getLabOrdersHandler);

	/**
	 * POST /api/clinical/lab-orders, /api/lab/orders, /api/dental-lab/orders
	 * Создание нового наряд-заказа в зуботехническую лабораторию.
	 */
	const createLabOrderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders write",
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Создание наряд-заказа ЗТЛ с формулой зубов разрешено только клиническому персоналу (врач/ортопед)
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
				message: `Отказ в создании наряд-заказа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const parsed = createLabOrderSchema.safeParse(request.body);
		if (!parsed.success) {
			const firstError = parsed.error.issues[0]?.message ?? "Проверьте корректность заполнения полей заказа ЗТЛ.";
			return reply.code(400).send({
				error: "ValidationError",
				message: firstError,
			});
		}

		const data = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
			// Проверяем принадлежность пациента к организации или ищем первого пациента клиники для 1-клик наряда у кресла
			let effectivePatientId = data.patientId;
			if (!effectivePatientId) {
				const [firstPatient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(eq(patients.organizationId, orgId))
					.limit(1);
				if (!firstPatient) {
					return { kind: "patient_not_found" as const };
				}
				effectivePatientId = firstPatient.id;
			} else {
				const [patient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, effectivePatientId),
							eq(patients.organizationId, orgId),
						),
					)
					.limit(1);

				if (!patient) {
					return { kind: "patient_not_found" as const };
				}
			}

			// Если указан врач — проверяем принадлежность к персоналу клиники
			let doctorName: string | null = null;
			if (data.doctorId) {
				const [doctor] = await tx
					.select({ id: users.id, fullName: users.fullName })
					.from(users)
					.where(
						and(eq(users.id, data.doctorId), eq(users.organizationId, orgId)),
					)
					.limit(1);
				if (!doctor) {
					return { kind: "doctor_not_found" as const };
				}
				doctorName = doctor.fullName;
			}

			const secureToken = crypto.randomUUID();

			const rawColor = data.colorVita || data.shadeCode || null;
			const normalizedColor = rawColor ? normalizeVitaShade(rawColor) : "A2";
			const parsedDueDate = data.dueDate
				? new Date(data.dueDate)
				: data.expectedLabDate
					? new Date(data.expectedLabDate)
					: calculateBusinessDaysDueDate(new Date(), 5);

			const effectiveToothFdi = data.toothFdi || data.teethFdi || "16";
			const effectiveMaterial = data.material || data.materialName || data.construction || "Диоксид циркония Multi-Layer";
			const effectiveNotes = data.clinicalNotes || data.doctorNotes || null;
			const effectiveStatus = (data.status && ["draft", "sent", "in_progress", "fitting", "ready", "completed"].includes(data.status))
				? data.status
				: "draft";

			const [createdOrder] = await tx
				.insert(labOrders)
				.values({
					organizationId: orgId,
					patientId: effectivePatientId,
					doctorId: data.doctorId || null,
					doctorName: doctorName || data.doctorName || "Врач-ортопед",
					secureToken,
					toothFdi: effectiveToothFdi,
					material: effectiveMaterial,
					colorVita: normalizedColor,
					dueDate: parsedDueDate,
					clinicalNotes: effectiveNotes,
					priceRub: data.priceRub != null ? data.priceRub : 24000,
					status: effectiveStatus,
				})
				.returning();

			return { kind: "ok" as const, order: createdOrder };
		});

		if (result.kind === "patient_not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в вашей клинике.",
			});
		}

		if (result.kind === "doctor_not_found") {
			return reply.code(404).send({
				error: "DoctorNotFound",
				message: "Врач не найден в вашей клинике.",
			});
		}

		const savedOrder = result.order;
		if (!savedOrder) {
			return reply.code(500).send({
				error: "LabOrderNotSaved",
				message:
					"Заказ в лабораторию не создан: сервер не сохранил запись. Проверьте данные и повторите попытку.",
			});
		}

		// Уведомление через веб-сокет
		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				patientId: savedOrder.patientId,
				orderId: savedOrder.id,
				status: savedOrder.status,
			},
		});

		reply.code(201);
		return savedOrder;
	};

	app.post("/api/clinical/lab-orders", createLabOrderHandler);
	app.post("/api/lab/orders", createLabOrderHandler);
	app.post("/api/dental-lab/orders", createLabOrderHandler);

	/**
	 * PUT /api/clinical/lab-orders/:id, /api/lab/orders/:id, /api/dental-lab/orders/:id
	 * Обновление заказа ЗТЛ клиникой с проверкой допустимости переходов состояний.
	 */
	const putLabOrderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders write",
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Редактирование наряда ЗТЛ разрешено только клиническому персоналу
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
				message: `Отказ в изменении наряд-заказа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };

		const updateSchema = z.object({
			doctorId: z.string().uuid().optional().nullable(),
			toothFdi: toothFdiSchema.optional().nullable(),
			teethFdi: toothFdiSchema.optional().nullable(),
			material: z.string().trim().optional().nullable(),
			materialName: z.string().trim().optional().nullable(),
			construction: z.string().trim().optional().nullable(),
			colorVita: colorVitaSchema.optional().nullable(),
			shadeCode: z.string().trim().optional().nullable(),
			dueDate: z.string().optional().nullable(),
			expectedLabDate: z.string().optional().nullable(),
			clinicalNotes: z.string().trim().optional().nullable(),
			doctorNotes: z.string().trim().optional().nullable(),
			priceRub: labOrderPriceRubSchema.optional().nullable(),
			status: labOrderStatusSchema.optional(),
			stage: z.string().trim().optional().nullable(),
			techStage: z.string().trim().optional().nullable(),
			overrideActive: z.boolean().optional().nullable(),
			overrideReason: z.string().trim().optional().nullable(),
			labComments: z.string().trim().optional().nullable(),
			attachedImageUrl: z.string().trim().optional().nullable(),
		});

		const parsed = updateSchema.safeParse(request.body);
		if (!parsed.success) {
			const firstError = parsed.error.issues[0]?.message ?? "Некорректные параметры обновления заказа ЗТЛ.";
			return reply.code(400).send({
				error: "ValidationError",
				message: firstError,
			});
		}

		const updateData = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
			// Загружаем текущий заказ с проверкой принадлежности к клинике
			const [currentOrder] = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!currentOrder) {
				return { kind: "not_found" as const };
			}

			// Определение целевого статуса (напрямую или через этап)
			let targetStatus: LabOrderStatus | undefined = updateData.status;
			if (!targetStatus && updateData.stage) {
				const mapped = mapStageToLabOrderStatus(updateData.stage);
				if (mapped) targetStatus = mapped;
			}

			// Проверка автомата состояний при смене статуса
			if (targetStatus && targetStatus !== currentOrder.status) {
				const currentStatus = currentOrder.status as LabOrderStatus;
				const allowed = LAB_ORDER_CLINIC_TRANSITIONS[currentStatus];

				if (!allowed || !allowed.includes(targetStatus)) {
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

			const rawColor = updateData.colorVita || updateData.shadeCode;
			const normalizedColor = rawColor ? normalizeVitaShade(rawColor) : undefined;
			const parsedDueDate = updateData.dueDate
				? new Date(updateData.dueDate)
				: updateData.expectedLabDate
					? new Date(updateData.expectedLabDate)
					: updateData.dueDate === null
						? null
						: undefined;

			const effectiveMaterial = updateData.material ?? updateData.materialName ?? updateData.construction;
			const effectiveNotes = updateData.clinicalNotes ?? updateData.doctorNotes;
			const effectiveTooth = updateData.toothFdi ?? updateData.teethFdi;

			const updatePayload: Record<string, unknown> = {
				...auditFields,
				updatedAt: now,
			};

			if (updateData.doctorId !== undefined) updatePayload.doctorId = updateData.doctorId;
			if (effectiveTooth !== undefined) updatePayload.toothFdi = effectiveTooth;
			if (effectiveMaterial !== undefined) updatePayload.material = effectiveMaterial;
			if (normalizedColor !== undefined) updatePayload.colorVita = normalizedColor;
			if (parsedDueDate !== undefined) updatePayload.dueDate = parsedDueDate;
			if (effectiveNotes !== undefined) updatePayload.clinicalNotes = effectiveNotes;
			if (updateData.priceRub !== undefined) updatePayload.priceRub = updateData.priceRub;
			if (targetStatus !== undefined) updatePayload.status = targetStatus;
			if (updateData.labComments !== undefined) updatePayload.labComments = updateData.labComments;
			if (updateData.attachedImageUrl !== undefined) updatePayload.attachedImageUrl = updateData.attachedImageUrl;

			const [updated] = await tx
				.update(labOrders)
				.set(updatePayload)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.returning();

			return { kind: "ok" as const, updated };
		});

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
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

		return updated;
	};

	app.put("/api/clinical/lab-orders/:id", putLabOrderHandler);
	app.put("/api/lab/orders/:id", putLabOrderHandler);
	app.put("/api/dental-lab/orders/:id", putLabOrderHandler);

	/**
	 * DELETE /api/clinical/lab-orders/:id, /api/lab/orders/:id, /api/dental-lab/orders/:id
	 * Удаление заказа ЗТЛ (только черновики или отмененные).
	 */
	const deleteLabOrderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders delete",
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Удаление наряда ЗТЛ разрешено только клиническому персоналу
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
				message: `Отказ в удалении наряд-заказа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };

		const result = await withTenantCtx(orgId, async (tx) => {
			const [existing] = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!existing) {
				return { kind: "not_found" as const };
			}

			if (existing.status !== "draft" && existing.status !== "cancelled") {
				return { kind: "cannot_delete" as const, status: existing.status };
			}

			const [deleted] = await tx
				.delete(labOrders)
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.returning();

			return { kind: "ok" as const, deleted };
		});

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		if (result.kind === "cannot_delete") {
			return reply.code(409).send({
				error: "CannotDeleteActiveOrder",
				message: `Нельзя удалить заказ со статусом «${result.status}». Сначала отмените заказ.`,
			});
		}

		const deleted = result.deleted;
		if (!deleted) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_DELETED",
			payload: {
				orderId: deleted.id,
				patientId: deleted.patientId,
			},
		});

		return { success: true };
	};

	app.delete("/api/clinical/lab-orders/:id", deleteLabOrderHandler);
	app.delete("/api/lab/orders/:id", deleteLabOrderHandler);
	app.delete("/api/dental-lab/orders/:id", deleteLabOrderHandler);
}
