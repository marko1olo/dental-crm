import {
	createAppointmentSchema,
	dashboardSchema,
	updateAppointmentSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	createAppointmentInDb,
	updateAppointmentInDb,
} from "../db/appointmentsQuery.js";
import { db } from "../db/client.js";
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import {
	chairs,
	clinics,
	users,
	visits,
} from "../db/schema.js";
import { openVisitForAppointmentInDb } from "../db/visitsQuery.js";
import { invalidateAppointmentReminders } from "../services/communications/appointmentReminders.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	appointmentCreateValidationMessage,
	appointmentRejectionResponse,
	appointmentUpdateValidationMessage,
	parseSchedulePayload,
	sendAppointmentRejection,
} from "./appointmentErrors.js";
import { requireScheduleMutationContext } from "./scheduleAuthGuard.js";

export {
	findSuggestedAvailableSlots,
	type AppointmentMutationCode,
	type AppointmentRejectionReason,
	type AppointmentRejectionResponse,
} from "./appointmentErrors.js";

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

	const rawBody =
		request.body && typeof request.body === "object"
			? { ...(request.body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		if (!rawBody.doctorUserId && rawBody.doctorId && typeof rawBody.doctorId === "string") {
			rawBody.doctorUserId = rawBody.doctorId;
		}
		if (!rawBody.startsAt && rawBody.startTime && typeof rawBody.startTime === "string") {
			rawBody.startsAt = rawBody.startTime;
		}
		if (!rawBody.endsAt && rawBody.endTime && typeof rawBody.endTime === "string") {
			rawBody.endsAt = rawBody.endTime;
		}
		if (!rawBody.reason && rawBody.notes && typeof rawBody.notes === "string") {
			rawBody.reason = rawBody.notes;
		}
		if (!rawBody.comment && rawBody.comments && typeof rawBody.comments === "string") {
			rawBody.comment = rawBody.comments;
		}

		if (typeof rawBody.startsAt === "string") {
			let s = rawBody.startsAt.trim();
			if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
			if (!s.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(s)) s = `${s}Z`;
			rawBody.startsAt = s;
		}
		if (typeof rawBody.endsAt === "string") {
			let e = rawBody.endsAt.trim();
			if (e.includes(" ") && !e.includes("T")) e = e.replace(" ", "T");
			if (!e.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(e)) e = `${e}Z`;
			rawBody.endsAt = e;
		}

		if (
			rawBody.assistantUserId === "" ||
			rawBody.assistantUserId === "default-assistant" ||
			(typeof rawBody.assistantUserId === "string" && !rawBody.assistantUserId.trim())
		) {
			rawBody.assistantUserId = null;
		}

		if (
			!rawBody.chairId ||
			rawBody.chairId === "default-chair" ||
			rawBody.chairId === "chair-1" ||
			(typeof rawBody.chairId === "string" && !rawBody.chairId.trim())
		) {
			const [firstActiveChair] = await db
				.select({ id: chairs.id })
				.from(chairs)
				.where(
					and(
						eq(chairs.organizationId, orgId),
						eq(chairs.isActive, true),
					),
				)
				.limit(1);
			if (firstActiveChair) {
				rawBody.chairId = firstActiveChair.id;
			} else {
				const [anyChair] = await db
					.select({ id: chairs.id })
					.from(chairs)
					.where(eq(chairs.organizationId, orgId))
					.limit(1);
				if (anyChair) {
					rawBody.chairId = anyChair.id;
				} else {
					let [clinic] = await db
						.select({ id: clinics.id })
						.from(clinics)
						.where(eq(clinics.organizationId, orgId))
						.limit(1);
					if (!clinic) {
						const [newClinic] = await db
							.insert(clinics)
							.values({
								organizationId: orgId,
								name: "Стоматологическая клиника",
							})
							.returning({ id: clinics.id });
						clinic = newClinic;
					}
					const [autoChair] = await db
						.insert(chairs)
						.values({
							organizationId: orgId,
							clinicId: clinic?.id,
							name: "Кресло 1",
							color: "#0d9488",
							isActive: true,
						})
						.returning({ id: chairs.id });
					if (autoChair) {
						rawBody.chairId = autoChair.id;
					}
				}
			}
		}

		if (
			!rawBody.doctorUserId ||
			rawBody.doctorUserId === "default-doctor" ||
			(typeof rawBody.doctorUserId === "string" && !rawBody.doctorUserId.trim())
		) {
			const [firstActiveDoctor] = await db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
						eq(users.role, "doctor"),
					),
				)
				.limit(1);
			if (firstActiveDoctor) {
				rawBody.doctorUserId = firstActiveDoctor.id;
			} else {
				const [anyDoctor] = await db
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.organizationId, orgId),
							eq(users.role, "doctor"),
						),
					)
					.limit(1);
				if (anyDoctor) {
					rawBody.doctorUserId = anyDoctor.id;
				}
			}
		}
	}

	const input = parseSchedulePayload(createAppointmentSchema, rawBody ?? request.body);
	if (!input) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentCreateValidationMessage,
		});
	}
	try {
		const created = await createAppointmentInDb(orgId, input);

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

		let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>>;
		try {
			dashboard = await getDashboardFromDb(orgId);
		} catch (dashErr) {
			request.log.error(
				{ err: dashErr, appointmentId: created.id, orgId },
				"[Schedule] Запись создана, но сводку прочитать не удалось",
			);
			return reply.code(201).send({
				success: true,
				appointmentId: created.id,
				message:
					"Запись создана. Сводка не обновлена — перезагрузите страницу.",
			});
		}

		const parsed = dashboardSchema.safeParse(dashboard);
		if (!parsed.success) {
			request.log.warn(
				{
					appointmentId: created.id,
					orgId,
					errors: parsed.error.errors,
				},
				"[Schedule] Запись создана, сводка прочиталась, но не прошла контракт",
			);
			return reply.code(201).send({
				success: true,
				appointmentId: created.id,
				message:
					"Запись создана. Сводка не обновлена — перезагрузите страницу.",
			});
		}
		return reply.code(201).send(parsed.data);
	} catch (error) {
		const conflictContext =
			input && orgId
				? {
						orgId,
						doctorUserId: input.doctorUserId ?? null,
						chairId: input.chairId ?? null,
						startsAt: input.startsAt ?? new Date(),
						endsAt: input.endsAt ?? null,
					}
				: undefined;
		return sendAppointmentRejection(
			reply,
			await appointmentRejectionResponse("create", error, conflictContext),
		);
	}
};

export const updateAppointmentHandler = async (
	request: FastifyRequest<{
		Params: { appointmentId: string };
	}>,
	reply: FastifyReply,
) => {
	const params = request.params as { appointmentId?: string };
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
		request.body && typeof request.body === "object"
			? { ...(request.body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		// Алиас: in_chair -> in_treatment (Мандат 8e / 8n: на приеме в кресле)
		if (rawBody.status === "in_chair") {
			rawBody.status = "in_treatment";
		}
		if (!rawBody.doctorUserId && rawBody.doctorId && typeof rawBody.doctorId === "string") {
			rawBody.doctorUserId = rawBody.doctorId;
		}
		if (!rawBody.startsAt && rawBody.startTime && typeof rawBody.startTime === "string") {
			rawBody.startsAt = rawBody.startTime;
		}
		if (!rawBody.endsAt && rawBody.endTime && typeof rawBody.endTime === "string") {
			rawBody.endsAt = rawBody.endTime;
		}
		if (!rawBody.reason && rawBody.notes && typeof rawBody.notes === "string") {
			rawBody.reason = rawBody.notes;
		}
		if (!rawBody.comment && rawBody.comments && typeof rawBody.comments === "string") {
			rawBody.comment = rawBody.comments;
		}

		if (typeof rawBody.startsAt === "string") {
			let s = rawBody.startsAt.trim();
			if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
			if (!s.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(s)) s = `${s}Z`;
			rawBody.startsAt = s;
		}
		if (typeof rawBody.endsAt === "string") {
			let e = rawBody.endsAt.trim();
			if (e.includes(" ") && !e.includes("T")) e = e.replace(" ", "T");
			if (!e.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(e)) e = `${e}Z`;
			rawBody.endsAt = e;
		}

		if (
			rawBody.assistantUserId === "" ||
			rawBody.assistantUserId === "default-assistant" ||
			(typeof rawBody.assistantUserId === "string" && !rawBody.assistantUserId.trim())
		) {
			rawBody.assistantUserId = null;
		}
	}

	const input = parseSchedulePayload(updateAppointmentSchema, rawBody ?? request.body);
	if (!input) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: appointmentUpdateValidationMessage,
		});
	}
	try {
		await updateAppointmentInDb(orgId, params.appointmentId, input);

		if (input.status === "in_treatment") {
			try {
				await openVisitForAppointmentInDb(orgId, params.appointmentId);
			} catch (err) {
				request.log.warn(
					{ err, appointmentId: params.appointmentId, orgId },
					"[scheduleRoutes] Не удалось открыть визит при переходе в in_treatment",
				);
			}
		} else if (input.status === "completed") {
			try {
				await db
					.update(visits)
					.set({ status: "signed", updatedAt: new Date() })
					.where(
						and(
							eq(visits.appointmentId, params.appointmentId),
							eq(visits.organizationId, orgId),
							eq(visits.status, "draft"),
						),
					);
			} catch (err) {
				request.log.warn(
					{ err, appointmentId: params.appointmentId, orgId },
					"[scheduleRoutes] Не удалось обновить статус визита при переходе в completed",
				);
			}
		}

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

		let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>>;
		try {
			dashboard = await getDashboardFromDb(orgId);
		} catch (dashErr) {
			request.log.error(
				{ err: dashErr, appointmentId: params.appointmentId, orgId },
				"[Schedule] Приём изменён, но сводку прочитать не удалось",
			);
			return {
				success: true,
				appointmentId: params.appointmentId,
				message:
					"Запись изменена. Сводка не обновлена — перезагрузите страницу.",
			};
		}

		const parsed = dashboardSchema.safeParse(dashboard);
		if (!parsed.success) {
			request.log.warn(
				{
					appointmentId: params.appointmentId,
					orgId,
					errors: parsed.error.errors,
				},
				"[Schedule] Приём изменён, сводка прочиталась, но не прошла контракт",
			);
			return {
				success: true,
				appointmentId: params.appointmentId,
				message:
					"Запись изменена. Сводка не обновлена — перезагрузите страницу.",
			};
		}
		return parsed.data;
	} catch (error) {
		const conflictContext =
			input && orgId
				? {
						orgId,
						doctorUserId: input.doctorUserId ?? null,
						chairId: input.chairId ?? null,
						startsAt: input.startsAt ?? new Date(),
						endsAt: input.endsAt ?? null,
					}
				: undefined;
		return sendAppointmentRejection(
			reply,
			await appointmentRejectionResponse("update", error, conflictContext),
		);
	}
};

export async function registerAppointmentsRoutes(app: FastifyInstance) {
	app.post("/api/appointments", createAppointmentHandler);
	app.patch("/api/appointments/:appointmentId", updateAppointmentHandler);
	app.patch(
		"/api/appointments/:appointmentId/status",
		updateAppointmentHandler,
	);
	app.put(
		"/api/schedule/appointments/:appointmentId",
		updateAppointmentHandler,
	);
	app.put(
		"/api/schedule/appointments/:appointmentId/status",
		updateAppointmentHandler,
	);
}
