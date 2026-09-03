import {
	LAB_ORDER_MATERIALS,
	type LabOrderMaterialKey,
	type LabOrderStatusKey,
	labOrderStatusSchema,
	nonNegativeMoneyRubSchema,
	VALID_FDI_TOOTH_NUMBERS,
	isValidVitaShade,
	VITA_SHADE_VALIDATION_MESSAGE,
	calculateMeshGeometryMetrics,
	restorationTypeSchema,
	restorationMaterialSchema,
	stumpPreparationShadeSchema,
	labOrderMilestoneSchema,
	type Triangle3D,
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
import {
	getLabOrderByToken,
	LAB_ORDER_CLINIC_TRANSITIONS,
	LAB_ORDER_TECHNICIAN_TRANSITIONS,
	type LabOrderStatus,
	updateLabOrderStatusByClinic,
	updateLabOrderStatusByToken,
} from "../db/labQuery.js";
import { labItems, labOrderEvents, labOrders, patients, users } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { auditMedicalAccessFromRequest } from "../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import { wsBroker } from "../services/websocketBroker.js";

/*
 * Цена заказа лаборатории — деньги клиники. Колонка `numeric(12,2)`:
 * Контракт `nonNegativeMoneyRubSchema` исключает копеечный дрейф и дробные части.
 */
const labOrderPriceRubSchema = nonNegativeMoneyRubSchema
	.refine((value) => value <= 100_000_000, {
		message: "Цена заказа лаборатории не помещается в допустимый лимит (100 млн ₽).",
	})
	.optional()
	.nullable();

/**
 * Валидация нотации зубов по стандарту FDI (ISO 3950).
 * Принимает как одиночный номер (напр. "16"), так и список через запятую ("16, 17", "11-21").
 */
function validateFdiToothNotation(value: string | null | undefined): boolean {
	if (!value) return true;
	const parts = value.split(/[\s,;-]+/).filter(Boolean);
	if (parts.length === 0) return true;
	for (const part of parts) {
		const num = Number.parseInt(part, 10);
		if (Number.isNaN(num) || !VALID_FDI_TOOTH_NUMBERS.has(num)) {
			return false;
		}
	}
	return true;
}

const toothFdiSchema = z
	.string()
	.trim()
	.refine(validateFdiToothNotation, {
		message:
			"Недопустимый номер зуба в заказе ЗТЛ. Используйте номера FDI (11–48, 51–85, 91–98).",
	})
	.optional()
	.nullable();

const colorVitaSchema = z
	.string()
	.trim()
	.refine(
		(val) => !val || isValidVitaShade(val),
		{ message: VITA_SHADE_VALIDATION_MESSAGE },
	)
	.optional()
	.nullable();

const createLabOrderSchema = z.object({
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional().nullable(),
	toothFdi: toothFdiSchema,
	material: z.string().trim().optional().nullable(),
	colorVita: colorVitaSchema,
	dueDate: z.string().optional().nullable(),
	clinicalNotes: z.string().trim().optional().nullable(),
	priceRub: labOrderPriceRubSchema,
});

export async function registerLabRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinical/lab-orders
	 * Получение всех заказов лаборатории клиники с возможностью фильтрации по пациенту.
	 */
	app.get("/api/clinical/lab-orders", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"lab orders read",
		);
		if (!orgId) return;

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
	});

	/**
	 * POST /api/clinical/lab-orders
	 * Создание нового наряд-заказа в зуботехническую лабораторию.
	 */
	app.post("/api/clinical/lab-orders", async (request, reply) => {
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
			// Проверяем принадлежность пациента к организации
			const [patient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.id, data.patientId),
						eq(patients.organizationId, orgId),
					),
				)
				.limit(1);

			if (!patient) {
				return { kind: "patient_not_found" as const };
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

			const [createdOrder] = await tx
				.insert(labOrders)
				.values({
					organizationId: orgId,
					patientId: data.patientId,
					doctorId: data.doctorId || null,
					doctorName,
					secureToken,
					toothFdi: data.toothFdi || null,
					material: data.material || null,
					colorVita: data.colorVita ? data.colorVita.toUpperCase() : null,
					dueDate: data.dueDate ? new Date(data.dueDate) : null,
					clinicalNotes: data.clinicalNotes || null,
					priceRub: data.priceRub != null ? data.priceRub : null,
					status: "draft",
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
	});

	/**
	 * PUT /api/clinical/lab-orders/:id
	 * Обновление заказа ЗТЛ клиникой с проверкой допустимости переходов состояний.
	 */
	app.put("/api/clinical/lab-orders/:id", async (request, reply) => {
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
			toothFdi: toothFdiSchema,
			material: z.string().trim().optional().nullable(),
			colorVita: colorVitaSchema,
			dueDate: z.string().optional().nullable(),
			clinicalNotes: z.string().trim().optional().nullable(),
			priceRub: labOrderPriceRubSchema,
			status: labOrderStatusSchema.optional(),
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

			// Проверка автомата состояний при смене статуса
			if (updateData.status && updateData.status !== currentOrder.status) {
				const currentStatus = currentOrder.status as LabOrderStatus;
				const targetStatus = updateData.status as LabOrderStatus;
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

			if (updateData.status === "sent" && !currentOrder.sentAt) {
				auditFields.sentAt = now;
			} else if (updateData.status === "completed" && !currentOrder.completedAt) {
				auditFields.completedAt = now;
			} else if (updateData.status === "cancelled" && !currentOrder.cancelledAt) {
				auditFields.cancelledAt = now;
			}

			const [updated] = await tx
				.update(labOrders)
				.set({
					...updateData,
					colorVita: updateData.colorVita ? updateData.colorVita.toUpperCase() : updateData.colorVita,
					dueDate: updateData.dueDate ? new Date(updateData.dueDate) : updateData.dueDate === null ? null : undefined,
					...auditFields,
					updatedAt: now,
				})
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
	});

	/**
	 * Вспомогательное сопоставление клинического этапа ЗТЛ на допустимый статус lab_orders.status (0042 CHECK).
	 */
	function mapStageToLabOrderStatus(stage: string): LabOrderStatus | null {
		switch (stage) {
			case "sent_to_lab":
			case "sent":
				return "sent";
			case "in_progress":
			case "model_cad_design":
			case "framework_wax_milling":
			case "sintering_ceramic_layering":
			case "final_glaze":
				return "in_progress";
			case "shipped":
			case "shipped_to_clinic":
				return "shipped";
			case "delivered_to_clinic":
			case "received":
			case "clinic_received":
				return "received";
			case "fitting_scheduled":
			case "fitting_in_mouth":
			case "correction_remake":
			case "refitting":
				return "refitting";
			case "delivered_completed":
			case "completed":
				return "completed";
			case "cancelled":
				return "cancelled";
			case "draft":
				return "draft";
			default:
				return null;
		}
	}

	/**
	 * Сопоставление этапа или статуса на майлстоун для таблицы аудита labOrderEvents.
	 */
	function mapStageOrStatusToMilestone(stageOrStatus: string): z.infer<typeof labOrderMilestoneSchema> {
		switch (stageOrStatus) {
			case "draft":
				return "draft";
			case "sent":
			case "sent_to_lab":
				return "submitted";
			case "in_progress":
				return "cad_intake_verified";
			case "model_cad_design":
			case "digital_design_cad":
				return "digital_design_cad";
			case "framework_wax_milling":
			case "cam_production":
				return "cam_production";
			case "sintering_ceramic_layering":
			case "sintering_crystallization":
				return "sintering_crystallization";
			case "final_glaze":
			case "ceramic_glaze_finish":
				return "ceramic_glaze_finish";
			case "shipped":
			case "shipped_courier":
				return "shipped_courier";
			case "received":
			case "delivered_to_clinic":
			case "clinic_received":
				return "clinic_received";
			case "fitting_scheduled":
			case "fitting_in_mouth":
			case "clinical_try_in":
				return "clinical_try_in";
			case "refitting":
			case "correction_remake":
			case "refitting_remake":
				return "refitting_remake";
			case "delivered_completed":
			case "completed":
			case "final_cementation":
				return "final_cementation";
			case "closed_warranty":
				return "closed_warranty";
			case "cancelled":
				return "cancelled";
			default:
				return "submitted";
		}
	}

	/**
	 * PATCH /api/lab/orders/:id and /api/clinical/lab-orders/:id
	 * Частичное обновление наряда ЗТЛ (статус, этап, клинические заметки, фиксация события в labOrderEvents).
	 */
	const patchLabOrderHandler = async (request: any, reply: any) => {
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

			if (currentOrder.isLockedInstalled) {
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

	/**
	 * DELETE /api/clinical/lab-orders/:id
	 * Удаление заказа ЗТЛ (только черновики или отмененные).
	 */
	app.delete("/api/clinical/lab-orders/:id", async (request, reply) => {
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
	});

	/**
	 * GET /api/portal/lab-order/:token
	 * Публичный защищенный портал зубного техника (доступ по криптографическому токену наряда).
	 */
	app.get("/api/portal/lab-order/:token", async (request, reply) => {
		const { token } = request.params as { token: string };
		if (!token) return reply.code(400).send({ error: "TokenRequired", message: "Токен наряда обязателен." });

		try {
			const order = await getLabOrderByToken(token);
			if (!order) {
				return reply.code(404).send({
					error: "OrderNotFound",
					message: "Наряд-заказ не найден или срок действия ссылки истек.",
				});
			}

			return {
				id: order.id,
				patientFullName: order.patientFullName,
				toothFdi: order.toothFdi,
				material: order.material,
				colorVita: order.colorVita,
				status: order.status,
				clinicalNotes: order.clinicalNotes,
				attachedImageUrl: order.attachedImageUrl,
				dueDate: order.dueDate,
				createdAt: order.createdAt,
			};
		} catch (e) {
			request.log.error({ err: e }, "[LabPortal] GET error");
			return reply.code(500).send({
				error: "LabPortalError",
				message:
					"Портал лаборатории временно недоступен. Повторите попытку позже.",
			});
		}
	});

	/**
	 * POST /api/portal/lab-order/:token/status
	 * Обновление статуса заказа зубным техником по токену наряда с валидацией автомата переходов.
	 */
	app.post("/api/portal/lab-order/:token/status", async (request, reply) => {
		const { token } = request.params as { token: string };

		const technicianAllowedStatuses = z.enum([
			"in_progress",
			"shipped",
			"received",
			"refitting",
			"completed",
		]);

		const parsedBody = z
			.object({
				status: technicianAllowedStatuses,
				labComments: z.string().trim().max(1000).optional().nullable(),
			})
			.safeParse(request.body);

		if (!token || !parsedBody.success) {
			return reply.code(400).send({
				error: "InvalidRequest",
				message: "Недопустимый статус работы лаборатории.",
			});
		}

		const { status: targetStatus, labComments } = parsedBody.data;

		try {
			const order = await getLabOrderByToken(token);
			if (!order) {
				return reply.code(404).send({
					error: "OrderNotFound",
					message: "Наряд-заказ не найден или ссылка устарела.",
				});
			}

			const currentStatus = order.status as LabOrderStatus;
			const allowed = LAB_ORDER_TECHNICIAN_TRANSITIONS[currentStatus];

			if (!allowed || !allowed.includes(targetStatus as LabOrderStatus)) {
				return reply.code(409).send({
					error: "InvalidTechnicianStateTransition",
					message: `Техник не может перевести заказ из статуса «${currentStatus}» в «${targetStatus}».`,
				});
			}

			const updated = await updateLabOrderStatusByToken(
				token,
				order.organizationId,
				targetStatus as LabOrderStatus,
			);

			if (!updated) {
				return reply.code(409).send({
					error: "LabOrderStatusNotSaved",
					message:
						"Статус заказа не обновлен: запись уже изменена или недоступна.",
				});
			}

			if (labComments !== undefined) {
				await db
					.update(labOrders)
					.set({ labComments, updatedAt: new Date() })
					.where(
						and(
							eq(labOrders.id, updated.id),
							eq(labOrders.organizationId, updated.organizationId),
						),
					);
			}

			wsBroker.broadcastToOrganization(updated.organizationId, {
				type: "LAB_ORDER_UPDATED",
				payload: {
					patientId: updated.patientId,
					orderId: updated.id,
					status: updated.status,
				},
			});

			return { success: true, status: updated.status };
		} catch (e) {
			request.log.error({ err: e }, "[LabPortal] POST status error");
			return reply.code(500).send({
				error: "LabPortalError",
				message:
					"Портал лаборатории временно недоступен. Повторите попытку позже.",
			});
		}
	});

	// ─── CAD/CAM 3D Mesh Geometry Analysis ───────────────────────────────────

	app.post("/api/clinical/cadcam/analyze-mesh", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const body = request.body as { triangles: Triangle3D[] };
		if (!Array.isArray(body?.triangles)) {
			return reply.status(400).send({
				error: "InvalidMeshPayload",
				message: "Ожидается массив полигонов triangles: Array<{ v1, v2, v3 }>",
			});
		}

		const metrics = calculateMeshGeometryMetrics(body.triangles);
		return reply.send({
			success: true,
			metrics,
		});
	});

	// ─── Multi-Unit Restoration Items CRUD ───────────────────────────────────

	app.get("/api/clinical/lab-orders/:id/items", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Единицы протезирования ЗТЛ содержат формулу зубов и параметры препарирования (врачебная тайна)
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
				message: `Отказ в доступе к единицам протезирования ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id: labOrderId } = request.params as { id: string };

		const items = await db
			.select()
			.from(labItems)
			.where(and(eq(labItems.organizationId, orgId), eq(labItems.labOrderId, labOrderId)))
			.orderBy(labItems.toothFdi);

		return reply.send({ items });
	});

const createLabItemSchema = z.object({
	toothFdi: z
		.number()
		.int()
		.refine((val) => VALID_FDI_TOOTH_NUMBERS.has(val), {
			message:
				"Недопустимый биологический номер зуба по стандарту FDI (разрешены только 11–18, 21–28, 31–38, 41–48, 51–55, 61–65, 71–75, 81–85).",
		}),
	restorationType: restorationTypeSchema.default("crown_monolithic"),
	material: restorationMaterialSchema.default("zirconia_multilayer_gradient"),
	shadeSystem: z
		.enum(["VITA_CLASSICAL", "VITA_3D_MASTER", "BLEACH"])
		.default("VITA_CLASSICAL"),
	shadeFinal: z.string().trim().default("A2"),
	shadeStump: stumpPreparationShadeSchema.optional().nullable(),
	shadeGingiva: z.string().trim().optional().nullable(),
	translucencyLevel: z.enum(["HT", "ST", "UT", "MO", "LT"]).default("HT"),
	cementGapMicrons: z.number().int().min(0).max(200).default(30),
	extraMarginGapMicrons: z.number().int().min(0).max(100).default(10),
	minimalThicknessMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.default("0.60"),
	implantSystem: z.string().trim().optional().nullable(),
	implantPlatformDiameterMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	tiBaseHeightMm: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshTriangleCount: z.number().int().optional().nullable(),
	meshSurfaceAreaMm2: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshVolumeMm3: z
		.union([z.number(), z.string()])
		.transform(String)
		.optional()
		.nullable(),
	meshBboxMm: z.record(z.unknown()).optional().nullable(),
	isManifold: z.boolean().default(true),
	priceRub: labOrderPriceRubSchema,
});

	app.post("/api/clinical/lab-orders/:id/items", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Добавление единиц протезирования ЗТЛ разрешено только клиническому персоналу
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
				message: `Отказ в добавлении единицы протезирования ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id: labOrderId } = request.params as { id: string };

		const [order] = await db
			.select({ id: labOrders.id })
			.from(labOrders)
			.where(
				and(
					eq(labOrders.id, labOrderId),
					eq(labOrders.organizationId, orgId),
				),
			)
			.limit(1);

		if (!order) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Наряд зуботехнической лаборатории не найден в текущей клинике.",
			});
		}

		const parsed = createLabItemSchema.safeParse(request.body);
		if (!parsed.success) {
			const firstIssueMessage = parsed.error.issues[0]?.message;
			return reply.code(400).send({
				error: "LabItemValidationError",
				message:
					firstIssueMessage ??
					"Проверьте данные единицы протезирования (номер зуба, материал, цвет).",
				details: parsed.error.format(),
			});
		}
		const body = parsed.data;

		const [createdItem] = await db
			.insert(labItems)
			.values({
				organizationId: orgId,
				labOrderId,
				toothFdi: body.toothFdi,
				restorationType: body.restorationType,
				material: body.material,
				shadeSystem: body.shadeSystem,
				shadeFinal: body.shadeFinal,
				shadeStump: body.shadeStump ?? null,
				shadeGingiva: body.shadeGingiva ?? null,
				translucencyLevel: body.translucencyLevel,
				cementGapMicrons: body.cementGapMicrons,
				extraMarginGapMicrons: body.extraMarginGapMicrons,
				minimalThicknessMm: body.minimalThicknessMm,
				implantSystem: body.implantSystem ?? null,
				implantPlatformDiameterMm: body.implantPlatformDiameterMm ?? null,
				tiBaseHeightMm: body.tiBaseHeightMm ?? null,
				meshTriangleCount: body.meshTriangleCount ?? null,
				meshSurfaceAreaMm2: body.meshSurfaceAreaMm2 ?? null,
				meshVolumeMm3: body.meshVolumeMm3 ?? null,
				meshBboxMm: body.meshBboxMm ?? null,
				isManifold: body.isManifold,
				priceRub: body.priceRub ? String(body.priceRub) : null,
			})
			.returning();

		return reply.status(201).send({ success: true, item: createdItem });
	});

	// ─── Lab Order Milestone & Event Audit Logging ───────────────────────────

	app.get("/api/clinical/lab-orders/:id/events", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Журнал этапов наряда ЗТЛ содержит клиническую историю (врачебная тайна)
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
				message: `Отказ в доступе к журналу этапов ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id: labOrderId } = request.params as { id: string };

		const events = await db
			.select()
			.from(labOrderEvents)
			.where(
				and(
					eq(labOrderEvents.organizationId, orgId),
					eq(labOrderEvents.labOrderId, labOrderId),
				),
			)
			.orderBy(desc(labOrderEvents.createdAt));

		return reply.send({ events });
	});

const createLabOrderEventSchema = z.object({
	milestone: labOrderMilestoneSchema.default("submitted"),
	actorType: z
		.enum(["clinic_doctor", "dental_technician", "courier", "administrator"])
		.default("clinic_doctor"),
	actorId: z.string().uuid().optional().nullable(),
	actorName: z.string().trim().default("Сотрудник клиники"),
	notes: z.string().trim().max(1000).optional().nullable(),
	barcodeScanned: z.string().trim().optional().nullable(),
	photoUrls: z
		.array(z.string().url().or(z.string().startsWith("/")))
		.default([]),
	cadPreviewGlbUrl: z.string().trim().optional().nullable(),
});

	app.post("/api/clinical/lab-orders/:id/events", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Добавление этапов ЗТЛ разрешено только клиническому персоналу
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
				message: `Отказ в фиксации этапа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id: labOrderId } = request.params as { id: string };
		const parsed = createLabOrderEventSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "LabOrderEventValidationError",
				message: "Проверьте данные этапа наряда ЗТЛ.",
				details: parsed.error.format(),
			});
		}
		const body = parsed.data;

		const [createdEvent] = await db
			.insert(labOrderEvents)
			.values({
				organizationId: orgId,
				labOrderId,
				milestone: body.milestone,
				actorType: body.actorType,
				actorId: body.actorId ?? null,
				actorName: body.actorName,
				notes: body.notes ?? null,
				barcodeScanned: body.barcodeScanned ?? null,
				photoUrls: body.photoUrls,
				cadPreviewGlbUrl: body.cadPreviewGlbUrl ?? null,
			})
			.returning();

		return reply.status(201).send({ success: true, event: createdEvent });
	});
}

