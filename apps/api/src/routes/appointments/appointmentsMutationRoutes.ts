import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	createAppointmentInDb,
	getAppointmentByIdInDb,
	updateAppointmentInDb,
} from "../../db/appointmentsQuery.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { db } from "../../db/client.js";
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
	try {
		const created = await createAppointmentInDb(orgId, input);

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
			},
		});

		void syncRecallOnAppointmentCreated(orgId, {
			id: created.id,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			reason: input.reason,
		});

		return await sendDashboardResponseAfterCreate(
			request,
			reply,
			orgId,
			created.id,
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
		Params: AppointmentIdParams;
	}>,
	reply: FastifyReply,
) => {
	const params = request.params as AppointmentOptionalIdParams;
	if (!params?.appointmentId) {
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
	try {
		const updatedAppt = await updateAppointmentInDb(
			orgId,
			params.appointmentId,
			input,
		);
		const identity = getRequestIdentity(request);

		try {
			const auditAction = resolveUpdateAuditAction(input);
			await recordAuditEventInDb(orgId, {
				entityType: "appointment",
				entityId: params.appointmentId,
				action: auditAction,
				reason:
					(input as { reason?: string }).reason ??
					(input as { cancelReason?: string }).cancelReason ??
					null,
				actorUserId:
					identity.userId ??
					(input as { doctorUserId?: string }).doctorUserId ??
					null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, appointmentId: params.appointmentId, orgId },
				"[appointments] Не удалось записать событие обновления приёма в журнал аудита",
			);
		}

		// DentalPRO expo26 Realtime Schedule Bar: при прибытии пациента ("arrived") шлем сигнал в #ресепшен и #интерком-ассистенты
		if (input.status === "arrived") {
			await dispatchPatientArrivedIntercom(
				db,
				request,
				orgId,
				params.appointmentId,
				updatedAppt,
				identity,
			);
		}

		await applyAppointmentStatusTransitions(
			db,
			request,
			orgId,
			params.appointmentId,
			input.status,
		);

		await invalidateAppointmentReminders(
			orgId,
			params.appointmentId,
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
				appointmentId: params.appointmentId,
				...(input.status ? { status: input.status } : {}),
			},
		});

		triggerCancellationGapFillerEffect(
			request,
			orgId,
			params.appointmentId,
			input.status,
		);

		return await buildDashboardResponseAfterUpdate(
			request,
			orgId,
			params.appointmentId,
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
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	const context = await requireScheduleMutationContext(
		request,
		reply,
		"schedule appointment create next-stage",
	);
	if (!context) return reply;
	const orgId = context.organizationId;

	const params = request.params as AppointmentOptionalIdParams;
	if (!params.appointmentId) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: "Не указан ID родительского приёма",
		});
	}

	const parent = await getAppointmentByIdInDb(orgId, params.appointmentId);
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
		const created = await createAppointmentInDb(orgId, input);

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

		return reply.code(201).send({
			success: true,
			appointment: created,
			dashboard: dashboard ?? undefined,
		});
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
	registerAppointmentStatusRoutes(app, updateAppointmentHandler);
	app.put(
		"/api/schedule/appointments/:appointmentId",
		updateAppointmentHandler,
	);
}
