import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, notInArray } from "drizzle-orm";
import { computePayloadHash } from "@dental/shared";
import {
	createAppointmentInDb,
	getAppointmentByIdInDb,
	updateAppointmentInDb,
} from "../../db/appointmentsQuery.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { db } from "../../db/client.js";
import { labOrders } from "../../db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import { invalidateAppointmentReminders } from "../../services/communications/appointmentReminders.js";
import { syncRecallOnAppointmentCreated } from "../../services/patients/recallSyncService.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { requireScheduleMutationContext } from "../scheduleAuthGuard.js";
import {
	buildConflictContext,
	buildNextStageCreatePayload,
	normalizeAppointmentUpdateRawBody,
	resolveUpdateAuditAction,
} from "./appointmentsHelpers.js";
import {
	buildDashboardResponseAfterUpdate,
	fetchDashboardAfterNextStage,
	handleGetAppointments,
	handleGetAppointmentById,
	prepareCreateAppointmentRawBody,
	prepareUpdateAppointmentRawBody,
	sendDashboardResponseAfterCreate,
} from "./appointmentsQueryRoutes.js";
import {
	APPOINTMENT_ID_UUID_PATTERN,
	appointmentCreateValidationMessage,
	appointmentRejectionResponse,
	appointmentUpdateValidationMessage,
	createAppointmentSchema,
	parseSchedulePayload,
	sendAppointmentRejection,
	updateAppointmentSchema,
} from "./appointmentsSchemas.js";
import {
	applyAppointmentStatusTransitions,
	dispatchPatientArrivedIntercom,
	registerAppointmentStatusRoutes,
	triggerCancellationGapFillerEffect,
} from "./appointmentsStatusRoutes.js";
import type {
	AppointmentIdParams,
	AppointmentOptionalIdParams,
} from "./types.js";

async function checkLabOrderScheduleCollision(
	orgId: string,
	patientId: string | null | undefined,
	startsAtStr: string,
	allowOverride: boolean | undefined,
	log?: FastifyRequest["log"],
): Promise<{
	hasCollision: boolean;
	conflictingOrder?: { id: string; dueDate: Date | null } | undefined;
}> {
	if (!patientId || !startsAtStr || allowOverride) {
		return { hasCollision: false };
	}
	const startsAtDate = new Date(startsAtStr);
	if (Number.isNaN(startsAtDate.getTime())) {
		return { hasCollision: false };
	}

	try {
		const activeOrders = await db
			.select({
				id: labOrders.id,
				dueDate: labOrders.dueDate,
				status: labOrders.status,
			})
			.from(labOrders)
			.where(
				and(
					eq(labOrders.organizationId, orgId),
					eq(labOrders.patientId, patientId),
					notInArray(labOrders.status, [
						"ready_in_clinic",
						"received",
						"delivered",
						"completed",
						"cancelled",
						"installed",
					]),
				),
			);

		const conflict = activeOrders.find((order) => {
			if (!order.dueDate) return false;
			return startsAtDate.getTime() < new Date(order.dueDate).getTime();
		});

		if (conflict && conflict.dueDate) {
			return { hasCollision: true, conflictingOrder: conflict };
		}
	} catch (_err) {
		// Non-blocking in case of schema discrepancy or memory mock
		log?.warn(
			{ err: _err },
			"[appointments] Lab order schedule collision check warning",
		);
	}
	return { hasCollision: false };
}

export const createAppointmentHandler = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	const context = await requireScheduleMutationContext(
		request,
		reply,
		"schedule appointment create",
	);
	if (!context) return reply;
	const orgId = context.organizationId;

	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
			  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined);
	const idempotencyKey =
		typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
		const [existingRecord] = await db
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, orgId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.limit(1);

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				const apptId =
					(existingRecord.responseBody as Record<string, unknown>)?.appointment &&
					typeof (existingRecord.responseBody as Record<string, unknown>).appointment === "object"
						? ((existingRecord.responseBody as Record<string, unknown>).appointment as Record<string, unknown>)?.id
						: null;
				if (typeof apptId === "string") {
					const stillExists = await getAppointmentByIdInDb(orgId, apptId);
					if (stillExists) {
						reply.header("idempotency-replayed", "true");
						reply.header("x-idempotency-replayed", "true");
						return reply
							.code(existingRecord.responseCode || 201)
							.send(existingRecord.responseBody);
					}
				} else {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(existingRecord.responseCode || 201)
						.send(existingRecord.responseBody);
				}
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).header("Retry-After", "1").send({
					error: "Conflict",
					code: "IdempotencyConflict",
					message:
						"Операция создания записи расписания с данным Idempotency-Key уже выполняется.",
				});
			}
		}
	}

	const rawBody = await prepareCreateAppointmentRawBody(
		orgId,
		request.body,
		db,
	);

	const input = parseSchedulePayload(
		createAppointmentSchema,
		rawBody ?? request.body,
	);
	if (!input) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentCreateValidationMessage,
		});
	}

	const allowOverride = Boolean(
		(input as { allowLabCollisionOverride?: boolean }).allowLabCollisionOverride ||
		input.allowEmergencyOverride ||
		input.allowOverbooking,
	);
	const labCollisionCheck = await checkLabOrderScheduleCollision(
		orgId,
		input.patientId,
		input.startsAt,
		allowOverride,
		request.log,
	);
	if (labCollisionCheck.hasCollision && labCollisionCheck.conflictingOrder) {
		const dueIso = labCollisionCheck.conflictingOrder.dueDate?.toISOString();
		const dueRu = labCollisionCheck.conflictingOrder.dueDate?.toLocaleDateString("ru-RU");
		return reply.code(409).send({
			code: "AppointmentLabOrderConflict",
			conflictType: "lab_order_not_ready",
			message: `Заказ-наряд ЗТЛ еще не готов: плановый срок сдачи ${dueRu}. Выберите время позже готовности или подтвердите приём с наложением.`,
			suggestedStartsAt: dueIso,
			orderId: labCollisionCheck.conflictingOrder.id,
		});
	}
	try {
		const identity = getRequestIdentity(request);
		const created = await createAppointmentInDb(orgId, {
			...input,
			creatorUserId: identity.userId ?? null,
		});

		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "appointment",
				entityId: created.id,
				action: "appointment_create",
				reason: input.reason ?? null,
				actorUserId: identity.userId ?? created.doctorUserId ?? null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, appointmentId: created.id, orgId },
				"[appointments] Не удалось записать событие создания приёма в журнал аудита",
			);
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "APPOINTMENT_CREATED",
			payload: {
				appointmentId: created.id,
				patientId: created.patientId,
				doctorUserId: created.doctorUserId,
				chairId: created.chairId,
				startsAt: created.startsAt,
				endsAt: created.endsAt,
				status: created.status,
				treatmentPlanId: created.treatmentPlanId ?? undefined,
				stageId: created.stageId ?? undefined,
			},
		});

		void syncRecallOnAppointmentCreated(orgId, {
			id: created.id,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			reason: input.reason,
		});

		if (idempotencyKey) {
			try {
				await db
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: {
							success: true,
							appointment: created,
						},
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: {
								success: true,
								appointment: created,
							},
							responseCode: 201,
						},
					});
			} catch (idemErr) {
				request.log.warn(
					{ err: idemErr, idempotencyKey },
					"[appointments] Failed to persist create idempotency key",
				);
			}
		}

		return await sendDashboardResponseAfterCreate(
			request,
			reply,
			orgId,
			created.id,
			created,
		);
	} catch (error) {
		const conflictContext =
			input && orgId ? buildConflictContext(orgId, input) : undefined;
		return sendAppointmentRejection(
			reply,
			await appointmentRejectionResponse("create", error, conflictContext),
		);
	}
};

export const updateAppointmentHandler = async (
	request: FastifyRequest<{
		Params: AppointmentOptionalIdParams;
	}>,
	reply: FastifyReply,
) => {
	const params = request.params;
	const appointmentId = params?.appointmentId || params?.id;
	if (!appointmentId || !APPOINTMENT_ID_UUID_PATTERN.test(appointmentId)) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: "Запись не выбрана.",
		});
	}
	const context = await requireScheduleMutationContext(
		request,
		reply,
		"schedule appointment update",
	);
	if (!context) return reply;
	const orgId = context.organizationId;

	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
			  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined);
	const idempotencyKey =
		typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
		const [existingRecord] = await db
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, orgId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.limit(1);

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				const stillExists = await getAppointmentByIdInDb(orgId, appointmentId);
				if (stillExists) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(existingRecord.responseCode || 200)
						.send(existingRecord.responseBody);
				}
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).header("Retry-After", "1").send({
					error: "Conflict",
					code: "IdempotencyConflict",
					message:
						"Операция обновления расписания с данным Idempotency-Key уже выполняется.",
				});
			}
		}
	}

	const rawBody =
		(await prepareUpdateAppointmentRawBody(orgId, request.body, db)) ??
		normalizeAppointmentUpdateRawBody(request.body);

	const input = parseSchedulePayload(
		updateAppointmentSchema,
		rawBody ?? request.body,
	);
	if (!input) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentUpdateValidationMessage,
		});
	}

	const existingAppt = await getAppointmentByIdInDb(orgId, appointmentId);
	if (!existingAppt) {
		return reply.code(404).send({
			code: "AppointmentNotFound",
			message: "Запись расписания не найдена.",
		});
	}
	const previousStatus = existingAppt.status;

	if (input.startsAt) {
		const effectivePatientId = input.patientId ?? existingAppt.patientId;
		const allowOverride = Boolean(
			(input as { allowLabCollisionOverride?: boolean }).allowLabCollisionOverride ||
			input.allowEmergencyOverride ||
			input.allowOverbooking,
		);
		const labCollisionCheck = await checkLabOrderScheduleCollision(
			orgId,
			effectivePatientId,
			input.startsAt,
			allowOverride,
			request.log,
		);
		if (labCollisionCheck.hasCollision && labCollisionCheck.conflictingOrder) {
			const dueIso = labCollisionCheck.conflictingOrder.dueDate?.toISOString();
			const dueRu = labCollisionCheck.conflictingOrder.dueDate?.toLocaleDateString("ru-RU");
			return reply.code(409).send({
				code: "AppointmentLabOrderConflict",
				conflictType: "lab_order_not_ready",
				message: `Заказ-наряд ЗТЛ еще не готов: плановый срок сдачи ${dueRu}. Выберите время позже готовности или подтвердите приём с наложением.`,
				suggestedStartsAt: dueIso,
				orderId: labCollisionCheck.conflictingOrder.id,
			});
		}
	}
	try {
		const updatedAppt = await db.transaction(async (tx) => {
			const updated = await updateAppointmentInDb(
				orgId,
				appointmentId,
				input,
				tx,
			);
			await applyAppointmentStatusTransitions(
				tx,
				request,
				orgId,
				appointmentId,
				input.status,
			);
			return updated;
		});
		const identity = getRequestIdentity(request);

		try {
			const auditAction = resolveUpdateAuditAction(input);
			const reasonStr =
				"reason" in input && typeof input.reason === "string"
					? input.reason
					: "cancelReason" in input && typeof input.cancelReason === "string"
						? input.cancelReason
						: null;
			const doctorUserIdStr =
				"doctorUserId" in input && typeof input.doctorUserId === "string"
					? input.doctorUserId
					: null;
			await recordAuditEventInDb(orgId, {
				entityType: "appointment",
				entityId: appointmentId,
				action: auditAction,
				reason: reasonStr,
				actorUserId: identity.userId ?? doctorUserIdStr,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, appointmentId, orgId },
				"[appointments] Не удалось записать событие обновления приёма в журнал аудита",
			);
		}

		// Realtime Schedule Bar: при прибытии пациента ("arrived") шлем сигнал в #ресепшен и #интерком-ассистенты
		// только при ПЕРВИЧНОМ переходе в статус arrived, исключая спам-шторм интеркома
		if (input.status === "arrived" && previousStatus !== "arrived") {
			await dispatchPatientArrivedIntercom(
				db,
				request,
				orgId,
				appointmentId,
				updatedAppt,
				identity,
			);
		}

		await invalidateAppointmentReminders(
			orgId,
			appointmentId,
			"Приём изменён администратором",
		).catch((error: unknown) => {
			request.log.error(
				{ err: error },
				"Не удалось снять устаревшие напоминания о приёме",
			);
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "APPOINTMENT_UPDATED",
			payload: {
				appointmentId,
				...(input.status ? { status: input.status } : {}),
			},
		});

		triggerCancellationGapFillerEffect(
			request,
			orgId,
			appointmentId,
			input.status,
		);

		if (idempotencyKey) {
			try {
				await db
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: {
							success: true,
							appointment: updatedAppt,
						},
						responseCode: 200,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: {
								success: true,
								appointment: updatedAppt,
							},
							responseCode: 200,
						},
					});
			} catch (idemErr) {
				request.log.warn(
					{ err: idemErr, idempotencyKey },
					"[appointments] Failed to persist update idempotency key",
				);
			}
		}

		return await buildDashboardResponseAfterUpdate(
			request,
			orgId,
			appointmentId,
			updatedAppt,
		);
	} catch (error) {
		const conflictContext =
			input && orgId ? buildConflictContext(orgId, input) : undefined;
		return sendAppointmentRejection(
			reply,
			await appointmentRejectionResponse("update", error, conflictContext),
		);
	}
};

export const createNextStageAppointmentHandler = async (
	request: FastifyRequest<{
		Params: AppointmentOptionalIdParams;
	}>,
	reply: FastifyReply,
) => {
	const context = await requireScheduleMutationContext(
		request,
		reply,
		"schedule appointment create next-stage",
	);
	if (!context) return reply;
	const orgId = context.organizationId;

	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
			  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined);
	const idempotencyKey =
		typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
		const [existingRecord] = await db
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, orgId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.limit(1);

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				const apptId =
					(existingRecord.responseBody as Record<string, unknown>)?.appointment &&
					typeof (existingRecord.responseBody as Record<string, unknown>).appointment === "object"
						? ((existingRecord.responseBody as Record<string, unknown>).appointment as Record<string, unknown>)?.id
						: null;
				if (typeof apptId === "string") {
					const stillExists = await getAppointmentByIdInDb(orgId, apptId);
					if (stillExists) {
						reply.header("idempotency-replayed", "true");
						reply.header("x-idempotency-replayed", "true");
						return reply
							.code(existingRecord.responseCode || 201)
							.send(existingRecord.responseBody);
					}
				} else {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(existingRecord.responseCode || 201)
						.send(existingRecord.responseBody);
				}
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).header("Retry-After", "1").send({
					error: "Conflict",
					code: "IdempotencyConflict",
					message:
						"Операция создания след. этапа приёма с данным Idempotency-Key уже выполняется.",
				});
			}
		}
	}

	const params = request.params;
	const appointmentId = params?.appointmentId || params?.id;
	if (!appointmentId || !APPOINTMENT_ID_UUID_PATTERN.test(appointmentId)) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: "Не указан ID родительского приёма",
		});
	}

	const parent = await getAppointmentByIdInDb(orgId, appointmentId);
	if (!parent) {
		return reply.code(404).send({
			code: "AppointmentNotFound",
			message: "Родительский приём не найден",
		});
	}

	const rawBody =
		request.body && typeof request.body === "object"
			? { ...(request.body as Record<string, unknown>) }
			: {};

	const createPayload = buildNextStageCreatePayload(parent, rawBody);

	const input = parseSchedulePayload(createAppointmentSchema, createPayload);
	if (!input) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentCreateValidationMessage,
		});
	}

	try {
		const identity = getRequestIdentity(request);
		const created = await createAppointmentInDb(orgId, {
			...input,
			creatorUserId: identity.userId ?? null,
		});

		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "appointment",
				entityId: created.id,
				action: "appointment_create_next_stage",
				reason: input.reason ?? null,
				actorUserId: identity.userId ?? created.doctorUserId ?? null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, appointmentId: created.id, orgId },
				"[appointments] Не удалось записать событие создания след. этапа в журнал аудита",
			);
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "APPOINTMENT_CREATED",
			payload: {
				appointmentId: created.id,
				patientId: created.patientId,
				doctorUserId: created.doctorUserId,
				chairId: created.chairId,
				startsAt: created.startsAt,
				endsAt: created.endsAt,
				status: created.status,
				parentAppointmentId: created.parentAppointmentId,
				stageIndex: created.stageIndex,
				clinicalStage: created.clinicalStage,
				treatmentPlanId: created.treatmentPlanId ?? undefined,
				stageId: created.stageId ?? undefined,
			},
		});

		void syncRecallOnAppointmentCreated(orgId, {
			id: created.id,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			reason: input.reason,
		});

		const dashboard = await fetchDashboardAfterNextStage(
			request,
			orgId,
			created.id,
		);

		const responsePayload: Record<string, unknown> = {
			success: true,
			appointment: created,
			dashboard: dashboard ?? undefined,
		};

		if (idempotencyKey) {
			try {
				await db
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 201,
						},
					});
			} catch (idemErr) {
				request.log.warn(
					{ err: idemErr, idempotencyKey },
					"[appointments] Failed to persist next-stage idempotency key",
				);
			}
		}

		return reply.code(201).send(responsePayload);
	} catch (error) {
		const conflictContext = buildConflictContext(orgId, input);
		return sendAppointmentRejection(
			reply,
			await appointmentRejectionResponse("create", error, conflictContext),
		);
	}
};

export async function registerAppointmentsRoutes(app: FastifyInstance) {
	app.get("/api/appointments", handleGetAppointments);
	app.get("/api/schedule", handleGetAppointments);
	app.get("/api/appointments/:appointmentId", handleGetAppointmentById);
	app.post("/api/appointments", createAppointmentHandler);
	app.post(
		"/api/appointments/:appointmentId/next-stage",
		createNextStageAppointmentHandler,
	);
	app.post(
		"/api/schedule/appointments/:appointmentId/next-stage",
		createNextStageAppointmentHandler,
	);
	app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
	app.put("/api/appointments/:appointmentId", updateAppointmentHandler);
	registerAppointmentStatusRoutes(app, updateAppointmentHandler);
	app.put(
		"/api/schedule/appointments/:appointmentId",
		updateAppointmentHandler,
	);
	app.patch(
		"/api/schedule/appointments/:appointmentId",
		updateAppointmentHandler,
	);
}
