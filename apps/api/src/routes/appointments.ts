import {
	createAppointmentSchema,
	dashboardSchema,
	updateAppointmentSchema,
} from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	createAppointmentInDb,
	updateAppointmentInDb,
} from "../db/appointmentsQuery.js";
import { recordAuditEventInDb } from "../db/auditQuery.js";
import { db } from "../db/client.js";
import { getDashboardFromDb } from "../db/dashboardQuery.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	appointments,
	chairs,
	clinics,
	patients,
	staffChatChannels,
	users,
	visits,
} from "../db/schema.js";
import {
	ensureDefaultStaffChannels,
	getStaffChannelBySlug,
	insertStaffMessage,
} from "../db/staffChatQuery.js";
import { openVisitForAppointmentInDb } from "../db/visitsQuery.js";
import { invalidateAppointmentReminders } from "../services/communications/appointmentReminders.js";
import { triggerSmartGapFiller } from "../services/daemons/smartGapFillerService.js";
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
					const targetClinicId = clinic?.id;
					if (targetClinicId) {
						const [autoChair] = await db
							.insert(chairs)
							.values({
								organizationId: orgId,
								clinicId: targetClinicId,
								name: "Кресло 1",
								isActive: true,
							})
							.returning({ id: chairs.id });
						if (autoChair) {
							rawBody.chairId = autoChair.id;
						}
					}
				}
			}
		}

		if (
			!rawBody.doctorUserId ||
			rawBody.doctorUserId === "default-doctor" ||
			rawBody.doctorUserId === "doctor-solo" ||
			rawBody.doctorUserId === "doctor-default" ||
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
		// Алиасы статусов (DentalPRO expo26 Realtime Schedule Bar & Мандаты 8e / 8n):
		if (rawBody.status === "in_chair" || rawBody.status === "in_progress") {
			rawBody.status = "in_treatment";
		} else if (rawBody.status === "in_clinic" || rawBody.status === "waiting") {
			rawBody.status = "arrived";
		} else if (rawBody.status === "finished" || rawBody.status === "closed") {
			rawBody.status = "completed";
		} else if (rawBody.status === "scheduled") {
			rawBody.status = "planned";
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
		const updatedAppt = await updateAppointmentInDb(orgId, params.appointmentId, input);
		const identity = getRequestIdentity(request);

		try {
			const auditAction =
				input.status === "cancelled"
					? "appointment_cancel"
					: input.startsAt || input.endsAt
						? "appointment_reschedule"
						: "appointment_update";
			await recordAuditEventInDb(orgId, {
				entityType: "appointment",
				entityId: params.appointmentId,
				action: auditAction,
				reason: (input as { reason?: string }).reason ?? (input as { cancelReason?: string }).cancelReason ?? null,
				actorUserId: identity.userId ?? (input as { doctorUserId?: string }).doctorUserId ?? null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, appointmentId: params.appointmentId, orgId },
				"[appointments] Не удалось записать событие обновления приёма в журнал аудита",
			);
		}

		// DentalPRO expo26 Realtime Schedule Bar: при прибытии пациента ("arrived") шлем сигнал в #ресепшен и #интерком-ассистенты
		if (input.status === "arrived") {
			try {
				const [apptMeta] = await db
					.select({
						patientName: patients.fullName,
						doctorName: users.fullName,
						chairName: chairs.name,
					})
					.from(appointments)
					.leftJoin(
						patients,
						and(
							eq(patients.id, appointments.patientId),
							eq(patients.organizationId, orgId),
						),
					)
					.leftJoin(
						users,
						and(
							eq(users.id, appointments.doctorUserId),
							eq(users.organizationId, orgId),
						),
					)
					.leftJoin(
						chairs,
						and(
							eq(chairs.id, appointments.chairId),
							eq(chairs.organizationId, orgId),
						),
					)
					.where(
						and(
							eq(appointments.id, params.appointmentId),
							eq(appointments.organizationId, orgId),
						),
					)
					.limit(1);

				const patientName = apptMeta?.patientName || "Пациент";
				const doctorName = apptMeta?.doctorName || "Врач";
				const chairName = apptMeta?.chairName || "Кабинет";

				await ensureDefaultStaffChannels(orgId);

				const senderName = identity.fullName || "Ресепшен (Регистратура)";
				const senderRole = identity.role || "admin";

				const targetSlugs = ["reception", "intercom_assistants"];
				const targetChannels = await db
					.select()
					.from(staffChatChannels)
					.where(
						and(
							eq(staffChatChannels.organizationId, orgId),
							inArray(staffChatChannels.slug, targetSlugs),
						),
					);

				for (const targetChannel of targetChannels) {
					const slug = targetChannel.slug;
					const createdMessage = await insertStaffMessage({
						organizationId: orgId,
						channelId: targetChannel.id,
						senderUserId: identity.userId,
						senderName,
						senderRole,
						messageType: "intercom_ping",
						content: `🛎️ Пациент ${patientName} прибыл в холл клиники и ожидает приёма. Назначен к: ${doctorName} (${chairName}).`,
						urgency: "urgent",
						intercomPreset: "patient_arrived",
						targetAudience: slug === "reception" ? "reception" : "all_assistants",
						patientAttachment: updatedAppt.patientId
							? {
									patientId: updatedAppt.patientId,
									fullName: patientName,
									cabinetNumber: chairName,
									doctorName,
								}
							: null,
						metadata: {
							appointmentId: params.appointmentId,
							cabinetNumber: chairName,
							chairId: updatedAppt.chairId,
						},
					});

					wsBroker.broadcastToOrganization(orgId, {
						type: "STAFF_CHAT_MESSAGE",
						payload: createdMessage,
					});
				}

				wsBroker.broadcastToOrganization(orgId, {
					type: "INTERCOM_PING",
					payload: {
						ping: {
							content: `🛎️ Пациент ${patientName} прибыл в холл клиники (${doctorName})`,
							urgency: "urgent",
							intercomPreset: "patient_arrived",
							patientAttachment: {
								patientId: updatedAppt.patientId,
								fullName: patientName,
								cabinetNumber: chairName,
								doctorName,
							},
							createdAt: new Date().toISOString(),
						},
						preset: {
							key: "patient_arrived",
							label: "Пациент в холле",
							badge: "🛎️ В холле",
							urgency: "urgent",
						},
						appointmentId: params.appointmentId,
					},
				});
			} catch (intercomErr) {
				request.log.warn(
					{ err: intercomErr, appointmentId: params.appointmentId, orgId },
					"[appointments] Не удалось разослать интерком-сигнал о прибытии пациента",
				);
			}
		}

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

		if (input.status === "cancelled" || input.status === "no_show") {
			triggerSmartGapFiller(params.appointmentId, { organizationId: orgId })
				.then((alert) => {
					if (alert && alert.candidates.length > 0) {
						wsBroker.broadcastToOrganization(orgId, {
							type: "HOT_SLOT_FREED",
							payload: alert,
						});
					}
				})
				.catch((gapErr) => {
					request.log.warn(
						{ err: gapErr, appointmentId: params.appointmentId, orgId },
						"[appointments] Не удалось выполнить анализ smartGapFiller при отмене приёма",
					);
				});
		}

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
