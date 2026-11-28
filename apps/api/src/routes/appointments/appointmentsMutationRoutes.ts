import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { defineStreamRoute } from "../../core/routeFactories.js";
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
	withTenantWriteCtx,
	type TenantDb,
} from "../../db/rls.js";
import { labOrders } from "../../db/schema/clinical/clinicalRulesModules/clinicalProtocolsTables.js";
import { getRequestIdentity } from "../../security/identity.js";
import { invalidateAppointmentReminders } from "../../services/communications/appointmentReminders.js";
import { triggerSmartGapFiller } from "../../services/daemons/smartGapFillerService.js";
import { syncRecallOnAppointmentCreated } from "../../services/patients/recallSyncService.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	DEFAULT_CLINIC_TIME_ZONE,
	clinicTimeZone,
} from "../../services/reports/managerReports/timezone.js";
import { requireScheduleMutationContext } from "../scheduleAuthGuard.js";
import {
	DEFAULT_SCHEDULE_TIMEZONE,
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
import { handleGetNextFreeSlots } from "./appointmentsNextFreeSlotsRoutes.js";
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
	AppointmentQueryParams,
} from "./types.js";

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

	type CreateOutcome =
		| { kind: "validation_error" }
		| { kind: "lab_conflict"; dueIso: string | undefined; dueRu: string | undefined; orderId: string }
		| { kind: "created"; created: Awaited<ReturnType<typeof createAppointmentInDb>> }
		| { kind: "rejected"; rejection: Awaited<ReturnType<typeof appointmentRejectionResponse>> };

	const txOutcome = await withTenantWriteCtx(orgId, async (tx): Promise<CreateOutcome> => {
		const zone = (await clinicTimeZone(orgId, tx)) || DEFAULT_SCHEDULE_TIMEZONE;
		const rawBody = await prepareCreateAppointmentRawBody(
			orgId,
			request.body,
			tx,
			zone,
		);

		const input = parseSchedulePayload(
			createAppointmentSchema,
			rawBody ?? request.body,
		);
		if (!input) {
			return {
				kind: "validation_error" as const,
			};
		}

		const allowOverride = Boolean(
			input.allowLabCollisionOverride ||
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
			const dueRu = labCollisionCheck.conflictingOrder.dueDate?.toLocaleDateString("ru-RU", {
				timeZone: zone,
			});
			return {
				kind: "lab_conflict" as const,
				dueIso,
				dueRu,
				orderId: labCollisionCheck.conflictingOrder.id,
			};
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

			return { kind: "created" as const, created };
		} catch (error) {
			const conflictContext =
				input && orgId ? buildConflictContext(orgId, input) : undefined;
			return {
				kind: "rejected" as const,
				rejection: await appointmentRejectionResponse("create", error, conflictContext),
			};
		}
	});

	if (txOutcome.kind === "validation_error") {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentCreateValidationMessage,
		});
	}
	if (txOutcome.kind === "lab_conflict") {
		return reply.code(409).send({
			code: "AppointmentLabOrderConflict",
			conflictType: "lab_order_not_ready",
			message: `Заказ-наряд ЗТЛ еще не готов: плановый срок сдачи ${txOutcome.dueRu}. Выберите время позже готовности или подтвердите приём с наложением.`,
			suggestedStartsAt: txOutcome.dueIso,
			orderId: txOutcome.orderId,
		});
	}
	if (txOutcome.kind === "rejected") {
		return sendAppointmentRejection(reply, txOutcome.rejection);
	}

	return await sendDashboardResponseAfterCreate(
		request,
		reply,
		orgId,
		txOutcome.created.id,
		txOutcome.created,
	);
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
	if (
		!request.body ||
		typeof request.body !== "object" ||
		Array.isArray(request.body)
	) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentUpdateValidationMessage,
		});
	}
	const context = await requireScheduleMutationContext(
		request,
		reply,
		"schedule appointment update",
	);
	if (!context) return reply;
	const orgId = context.organizationId;

	type UpdateOutcome =
		| { kind: "validation_error" }
		| { kind: "not_found" }
		| { kind: "lab_conflict"; dueIso: string | undefined; dueRu: string | undefined; orderId: string }
		| { kind: "updated"; updatedAppt: Awaited<ReturnType<typeof updateAppointmentInDb>> }
		| { kind: "rejected"; rejection: Awaited<ReturnType<typeof appointmentRejectionResponse>> };

	const txOutcome = await withTenantWriteCtx(orgId, async (tx): Promise<UpdateOutcome> => {
		const zone = (await clinicTimeZone(orgId, tx)) || DEFAULT_SCHEDULE_TIMEZONE;
		const rawBody =
			(await prepareUpdateAppointmentRawBody(orgId, request.body, tx, zone)) ??
			normalizeAppointmentUpdateRawBody(request.body, zone);

		const input = parseSchedulePayload(
			updateAppointmentSchema,
			rawBody ?? request.body,
		);
		if (!input) {
			return { kind: "validation_error" as const };
		}

		const existingAppt = await getAppointmentByIdInDb(orgId, appointmentId, tx);
		if (!existingAppt) {
			return { kind: "not_found" as const };
		}
		const previousStatus = existingAppt.status;

		if (input.startsAt) {
			const effectivePatientId = input.patientId ?? existingAppt.patientId;
			const allowOverride = Boolean(
				input.allowLabCollisionOverride ||
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
				const dueRu = labCollisionCheck.conflictingOrder.dueDate?.toLocaleDateString("ru-RU", {
					timeZone: zone,
				});
				return {
					kind: "lab_conflict" as const,
					dueIso,
					dueRu,
					orderId: labCollisionCheck.conflictingOrder.id,
				};
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
					previousStatus,
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
				await withSavepoint(tx, async (spTx) => {
					await invalidateAppointmentReminders(
						orgId,
						appointmentId,
						"Приём изменён администратором",
						spTx,
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

			return { kind: "updated" as const, updatedAppt };
		} catch (error) {
			const conflictContext =
				input && orgId ? buildConflictContext(orgId, input) : undefined;
			return {
				kind: "rejected" as const,
				rejection: await appointmentRejectionResponse("update", error, conflictContext),
			};
		}
	});

	if (txOutcome.kind === "validation_error") {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentUpdateValidationMessage,
		});
	}
	if (txOutcome.kind === "not_found") {
		return reply.code(404).send({
			code: "AppointmentNotFound",
			message: "Запись расписания не найдена.",
		});
	}
	if (txOutcome.kind === "lab_conflict") {
		return reply.code(409).send({
			code: "AppointmentLabOrderConflict",
			conflictType: "lab_order_not_ready",
			message: `Заказ-наряд ЗТЛ еще не готов: плановый срок сдачи ${txOutcome.dueRu}. Выберите время позже готовности или подтвердите приём с наложением.`,
			suggestedStartsAt: txOutcome.dueIso,
			orderId: txOutcome.orderId,
		});
	}
	if (txOutcome.kind === "rejected") {
		return sendAppointmentRejection(reply, txOutcome.rejection);
	}

	return await buildDashboardResponseAfterUpdate(
		request,
		orgId,
		appointmentId,
		txOutcome.updatedAppt,
	);
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

	type NextStageOutcome =
		| { kind: "missing_parent_id" }
		| { kind: "parent_not_found" }
		| { kind: "validation_error" }
		| { kind: "lab_conflict"; dueIso: string | undefined; dueRu: string | undefined; orderId: string }
		| { kind: "created"; created: Awaited<ReturnType<typeof createAppointmentInDb>> }
		| { kind: "rejected"; rejection: Awaited<ReturnType<typeof appointmentRejectionResponse>> };

	const txOutcome = await withTenantWriteCtx(orgId, async (tx): Promise<NextStageOutcome> => {
		const params = request.params;
		const appointmentId = params?.appointmentId || params?.id;
		if (!appointmentId || !APPOINTMENT_ID_UUID_PATTERN.test(appointmentId)) {
			return { kind: "missing_parent_id" as const };
		}

		const parent = await getAppointmentByIdInDb(orgId, appointmentId, tx);
		if (!parent) {
			return { kind: "parent_not_found" as const };
		}

		const zone = (await clinicTimeZone(orgId, tx)) || DEFAULT_SCHEDULE_TIMEZONE;
		const rawBody =
			request.body && typeof request.body === "object"
				? { ...(request.body as Record<string, unknown>) }
				: {};

		const mergedNextStageRaw = buildNextStageCreatePayload(parent, rawBody);
		const preparedRawBody = await prepareCreateAppointmentRawBody(
			orgId,
			mergedNextStageRaw,
			tx,
			zone,
		);

		const input = parseSchedulePayload(
			createAppointmentSchema,
			preparedRawBody ?? mergedNextStageRaw,
		);
		if (!input) {
			return { kind: "validation_error" as const };
		}

		const allowOverride = Boolean(
			input.allowLabCollisionOverride ||
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
			const dueRu = labCollisionCheck.conflictingOrder.dueDate?.toLocaleDateString("ru-RU", {
				timeZone: zone,
			});
			return {
				kind: "lab_conflict" as const,
				dueIso,
				dueRu,
				orderId: labCollisionCheck.conflictingOrder.id,
			};
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

			return { kind: "created" as const, created };
		} catch (error) {
			const conflictContext = buildConflictContext(orgId, input);
			return {
				kind: "rejected" as const,
				rejection: await appointmentRejectionResponse("create", error, conflictContext),
			};
		}
	});

	if (txOutcome.kind === "missing_parent_id") {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: "Не указан ID родительского приёма",
		});
	}
	if (txOutcome.kind === "parent_not_found") {
		return reply.code(404).send({
			code: "AppointmentNotFound",
			message: "Родительский приём не найден",
		});
	}
	if (txOutcome.kind === "validation_error") {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentCreateValidationMessage,
		});
	}
	if (txOutcome.kind === "lab_conflict") {
		return reply.code(409).send({
			code: "AppointmentLabOrderConflict",
			conflictType: "lab_order_not_ready",
			message: `Заказ-наряд ЗТЛ еще не готов: плановый срок сдачи ${txOutcome.dueRu}. Выберите время позже готовности или подтвердите приём с наложением.`,
			suggestedStartsAt: txOutcome.dueIso,
			orderId: txOutcome.orderId,
		});
	}
	if (txOutcome.kind === "rejected") {
		return sendAppointmentRejection(reply, txOutcome.rejection);
	}

	const dashboard = await fetchDashboardAfterNextStage(
		request,
		orgId,
		txOutcome.created.id,
	);

	return reply.code(201).send({
		success: true,
		appointment: txOutcome.created,
		dashboard: dashboard ?? undefined,
	});
};

export async function registerAppointmentsRoutes(app: FastifyInstance) {
	const authOptions = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
	} as const;

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/appointments",
		permission: "schedule.read",
		authOptions,
		handler: async ({ request, reply }) =>
			handleGetAppointments(
				request as FastifyRequest<{ Querystring: AppointmentQueryParams }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/appointments/next-free-slots",
		permission: "schedule.read",
		authOptions,
		handler: async ({ request, reply }) => handleGetNextFreeSlots(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/schedule",
		permission: "schedule.read",
		authOptions,
		handler: async ({ request, reply }) =>
			handleGetAppointments(
				request as FastifyRequest<{ Querystring: AppointmentQueryParams }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/appointments/:appointmentId",
		permission: "schedule.read",
		authOptions,
		handler: async ({ request, reply }) =>
			handleGetAppointmentById(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/appointments",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) => createAppointmentHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/appointments/:appointmentId/next-stage",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) =>
			createNextStageAppointmentHandler(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/schedule/appointments/:appointmentId/next-stage",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) =>
			createNextStageAppointmentHandler(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/appointments/:appointmentId",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) =>
			updateAppointmentHandler(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/appointments/:appointmentId",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) =>
			updateAppointmentHandler(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});

	registerAppointmentStatusRoutes(app, updateAppointmentHandler);

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/schedule/appointments/:appointmentId",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) =>
			updateAppointmentHandler(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/schedule/appointments/:appointmentId",
		permission: "schedule.write",
		authOptions,
		handler: async ({ request, reply }) =>
			updateAppointmentHandler(
				request as FastifyRequest<{ Params: AppointmentOptionalIdParams }>,
				reply,
			),
	});
}
