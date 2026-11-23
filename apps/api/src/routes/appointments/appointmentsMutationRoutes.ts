import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { computePayloadHash } from "@dental/shared";
import {
	createAppointmentInDb,
	getAppointmentByIdInDb,
	updateAppointmentInDb,
} from "../../db/appointmentsQuery.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { db } from "../../db/client.js";
import {
	onTenantTxCommit,
	runDetachedInTenantCtx,
	withSavepoint,
	withTenantCtx,
	type TenantDb,
} from "../../db/rls.js";
import { labOrders } from "../../db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import { invalidateAppointmentReminders } from "../../services/communications/appointmentReminders.js";
import { triggerSmartGapFiller } from "../../services/daemons/smartGapFillerService.js";
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
} from "./appointmentsStatusRoutes.js";
import type {
	AppointmentIdParams,
	AppointmentOptionalIdParams,
} from "./types.js";

function extractAppointmentIdempotencyKey(request: FastifyRequest): string | undefined {
	const headerPrimary = request.headers?.["idempotency-key"];
	const headerAlt = request.headers?.["x-idempotency-key"];
	const bodyKey =
		request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined;
	const raw =
		(typeof headerPrimary === "string" ? headerPrimary : undefined) ??
		(typeof headerAlt === "string" ? headerAlt : undefined) ??
		bodyKey;
	if (typeof raw !== "string") return undefined;
	const trimmed = raw.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

async function resolveAppointmentIdempotentReplay(
	tx: TenantDb,
	reply: FastifyReply,
	orgId: string,
	idempotencyKey: string,
	options: {
		defaultCode: number;
		inFlightMessage: string;
		fixedAppointmentId?: string | undefined;
	},
): Promise<boolean> {
	reply.header("Idempotency-Key", idempotencyKey);
	if (process.env.DENTAL_STATE_PERSISTENCE !== "off") {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${idempotencyKey}))`,
		);
	}
	const [existingRecord] = await tx
		.select()
		.from(idempotencyKeys)
		.where(
			and(
				eq(idempotencyKeys.clinicId, orgId),
				eq(idempotencyKeys.key, idempotencyKey),
			),
		)
		.limit(1);

	if (!existingRecord) {
		return false;
	}

	if (existingRecord.status === "completed" && existingRecord.responseBody) {
		const respAppt = existingRecord.responseBody.appointment;
		const respApptId =
			respAppt && typeof respAppt === "object"
				? (respAppt as Record<string, unknown>).id
				: null;
		const checkApptId =
			options.fixedAppointmentId ??
			(typeof respApptId === "string" ? respApptId : null);

		if (typeof checkApptId === "string") {
			const stillExists = await getAppointmentByIdInDb(orgId, checkApptId);
			if (stillExists) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				void reply
					.code(existingRecord.responseCode || options.defaultCode)
					.send(existingRecord.responseBody);
				return true;
			}
			return false;
		}

		reply.header("idempotency-replayed", "true");
		reply.header("x-idempotency-replayed", "true");
		void reply
			.code(existingRecord.responseCode || options.defaultCode)
			.send(existingRecord.responseBody);
		return true;
	}

	if (existingRecord.status === "in_flight") {
		void reply.code(409).header("Retry-After", "1").send({
			error: "Conflict",
			code: "IdempotencyConflict",
			message: options.inFlightMessage,
		});
		return true;
	}

	return false;
}

async function persistAppointmentIdempotencyRecord(
	tx: TenantDb,
	request: FastifyRequest,
	orgId: string,
	idempotencyKey: string,
	responseBody: Record<string, unknown>,
	responseCode: number,
	warnMessage: string,
): Promise<void> {
	try {
		await withSavepoint(tx, async (spTx) => {
			await spTx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody,
					responseCode,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody,
						responseCode,
					},
				});
		});
	} catch (idemErr) {
		request.log.warn({ err: idemErr, idempotencyKey }, warnMessage);
	}
}

function schedulePostCommitRecallSync(
	request: FastifyRequest,
	orgId: string,
	appointment: {
		id: string;
		patientId: string | null;
		doctorUserId?: string | null | undefined;
		reason?: string | null | undefined;
	},
): void {
	onTenantTxCommit(() => {
		void runDetachedInTenantCtx(orgId, async () =>
			syncRecallOnAppointmentCreated(orgId, appointment),
		).catch((recallErr: unknown) => {
			request.log.warn(
				{ err: recallErr, appointmentId: appointment.id, orgId },
				"[appointments] Не удалось синхронизировать recall после создания приёма",
			);
		});
	});
}

async function checkLabOrderScheduleCollision(
	orgId: string,
	patientId: string | null | undefined,
	startsAtStr: string,
	allowOverride: boolean | undefined,
	log?: FastifyRequest["log"] | undefined,
	tx: TenantDb = db,
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
		const activeOrders = await withSavepoint(tx, async (spTx) =>
			spTx
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
	const idempotencyKey = extractAppointmentIdempotencyKey(request);

	return withTenantCtx(orgId, async (tx) => {
		if (idempotencyKey) {
			const replayed = await resolveAppointmentIdempotentReplay(
				tx,
				reply,
				orgId,
				idempotencyKey,
				{
					defaultCode: 201,
					inFlightMessage:
						"Операция создания записи расписания с данным Idempotency-Key уже выполняется.",
				},
			);
			if (replayed) return reply;
		}

		const rawBody = await prepareCreateAppointmentRawBody(
			orgId,
			request.body,
			tx,
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
			tx,
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
			const tenantTx = tx;
			const created = await createAppointmentInDb(
				orgId,
				{
					...input,
					creatorUserId: identity.userId ?? null,
				},
				tenantTx,
			);

			try {
				await withSavepoint(tx, async (spTx) => {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "appointment",
							entityId: created.id,
							action: "appointment_create",
							reason: input.reason ?? null,
							actorUserId: identity.userId ?? created.doctorUserId ?? null,
						},
						spTx,
					);
				});
			} catch (auditErr) {
				request.log.warn(
					{ err: auditErr, appointmentId: created.id, orgId },
					"[appointments] Не удалось записать событие создания приёма в журнал аудита",
				);
			}

			onTenantTxCommit(() => {
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
			});

			schedulePostCommitRecallSync(request, orgId, {
				id: created.id,
				patientId: created.patientId,
				doctorUserId: created.doctorUserId,
				reason: input.reason,
			});

			if (idempotencyKey) {
				await persistAppointmentIdempotencyRecord(
					tx,
					request,
					orgId,
					idempotencyKey,
					{
						success: true,
						appointment: created,
					},
					201,
					"[appointments] Failed to persist create idempotency key",
				);
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
	});
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
	const idempotencyKey = extractAppointmentIdempotencyKey(request);

	return withTenantCtx(orgId, async (tx) => {
		if (idempotencyKey) {
			const replayed = await resolveAppointmentIdempotentReplay(
				tx,
				reply,
				orgId,
				idempotencyKey,
				{
					defaultCode: 200,
					inFlightMessage:
						"Операция обновления расписания с данным Idempotency-Key уже выполняется.",
					fixedAppointmentId: appointmentId,
				},
			);
			if (replayed) return reply;
		}

		const rawBody =
			(await prepareUpdateAppointmentRawBody(orgId, request.body, tx)) ??
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
				tx,
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
			const updatedAppt = await withSavepoint(tx, async (spTx) => {
				const updated = await updateAppointmentInDb(
					orgId,
					appointmentId,
					input,
					spTx,
				);
				await applyAppointmentStatusTransitions(
					spTx,
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
				await withSavepoint(tx, async (spTx) => {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "appointment",
							entityId: appointmentId,
							action: auditAction,
							reason: reasonStr,
							actorUserId: identity.userId ?? doctorUserIdStr,
						},
						spTx,
					);
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
				await withSavepoint(tx, async (spTx) => {
					await dispatchPatientArrivedIntercom(
						spTx,
						request,
						orgId,
						appointmentId,
						updatedAppt,
						identity,
					);
				});
			}

			try {
				await withSavepoint(tx, async () => {
					await invalidateAppointmentReminders(
						orgId,
						appointmentId,
						"Приём изменён администратором",
					);
				});
			} catch (error: unknown) {
				request.log.error(
					{ err: error },
					"Не удалось снять устаревшие напоминания о приёме",
				);
			}

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId,
						...(input.status ? { status: input.status } : {}),
					},
				});
			});

			if (input.status === "cancelled" || input.status === "no_show") {
				onTenantTxCommit(() => {
					void runDetachedInTenantCtx(orgId, async () =>
						triggerSmartGapFiller(appointmentId, { organizationId: orgId }),
					)
						.then((alert) => {
							if (alert && alert.candidates.length > 0) {
								wsBroker.broadcastToOrganization(orgId, {
									type: "HOT_SLOT_FREED",
									payload: alert,
								});
							}
						})
						.catch((gapErr: unknown) => {
							request.log.warn(
								{ err: gapErr, appointmentId, orgId },
								"[appointments] Не удалось выполнить анализ smartGapFiller при отмене приёма",
							);
						});
				});
			}

			if (idempotencyKey) {
				await persistAppointmentIdempotencyRecord(
					tx,
					request,
					orgId,
					idempotencyKey,
					{
						success: true,
						appointment: updatedAppt,
					},
					200,
					"[appointments] Failed to persist update idempotency key",
				);
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
	});
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
	const idempotencyKey = extractAppointmentIdempotencyKey(request);

	return withTenantCtx(orgId, async (tx) => {
		if (idempotencyKey) {
			const replayed = await resolveAppointmentIdempotentReplay(
				tx,
				reply,
				orgId,
				idempotencyKey,
				{
					defaultCode: 201,
					inFlightMessage:
						"Операция создания след. этапа приёма с данным Idempotency-Key уже выполняется.",
				},
			);
			if (replayed) return reply;
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
			const tenantTx = tx;
			const created = await createAppointmentInDb(
				orgId,
				{
					...input,
					creatorUserId: identity.userId ?? null,
				},
				tenantTx,
			);

			try {
				await withSavepoint(tx, async (spTx) => {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "appointment",
							entityId: created.id,
							action: "appointment_create_next_stage",
							reason: input.reason ?? null,
							actorUserId: identity.userId ?? created.doctorUserId ?? null,
						},
						spTx,
					);
				});
			} catch (auditErr) {
				request.log.warn(
					{ err: auditErr, appointmentId: created.id, orgId },
					"[appointments] Не удалось записать событие создания след. этапа в журнал аудита",
				);
			}

			onTenantTxCommit(() => {
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
			});

			schedulePostCommitRecallSync(request, orgId, {
				id: created.id,
				patientId: created.patientId,
				doctorUserId: created.doctorUserId,
				reason: input.reason,
			});

			const dashboard = await withSavepoint(tx, () =>
				fetchDashboardAfterNextStage(request, orgId, created.id),
			);

			const responsePayload: Record<string, unknown> = {
				success: true,
				appointment: created,
				dashboard: dashboard ?? undefined,
			};

			if (idempotencyKey) {
				await persistAppointmentIdempotencyRecord(
					tx,
					request,
					orgId,
					idempotencyKey,
					responsePayload,
					201,
					"[appointments] Failed to persist next-stage idempotency key",
				);
			}

			return reply.code(201).send(responsePayload);
		} catch (error) {
			const conflictContext = buildConflictContext(orgId, input);
			return sendAppointmentRejection(
				reply,
				await appointmentRejectionResponse("create", error, conflictContext),
			);
		}
	});
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
