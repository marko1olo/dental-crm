import { and, asc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { appointmentActionCodes } from "../../db/communicationsSchema.js";
import { withSavepoint, withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	patients,
	users,
} from "../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	OUTBOX_TO_REMINDER_STATE,
	type ReminderState,
	badDayConfirmationRequest,
	dayBoundsInTimeZone,
	dayConfirmationsQuerySchema,
	reminderStateRank,
	tomorrowInTimeZone,
} from "./timezoneAndTypes.js";

export function registerDayConfirmationQueryRoute(app: FastifyInstance): void {
	app.get("/api/schedule/day-confirmations", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"day confirmations",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "schedule.read"))
			return;

		const parsed = dayConfirmationsQuerySchema.safeParse(request.query ?? {});
		if (!parsed.success) {
			return badDayConfirmationRequest(
				reply,
				"Дата должна быть в виде ГГГГ-ММ-ДД.",
			);
		}

		const outcome = await withTenantCtx(context.organizationId, async (tx) => {
			const [clinic] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, context.organizationId))
				.limit(1);
			const timeZone = clinic?.timezone ?? "Europe/Moscow";

			const date =
				parsed.data.date ??
				tomorrowInTimeZone(timeZone, new Date(), request.log);
			const bounds = dayBoundsInTimeZone(date, timeZone, request.log);
			if (!bounds) {
				return { kind: "invalid_bounds" as const };
			}

			const appointmentRows = await tx
				.select({
					id: appointments.id,
					startsAt: appointments.startsAt,
					status: appointments.status,
					patientId: appointments.patientId,
					doctorUserId: appointments.doctorUserId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, context.organizationId),
						gte(appointments.startsAt, bounds.from),
						lte(appointments.startsAt, bounds.to),
					),
				)
				.orderBy(asc(appointments.startsAt));

			if (appointmentRows.length === 0) {
				return {
					kind: "ok" as const,
					payload: {
						date,
						timeZone,
						summary: {
							total: 0,
							confirmed: 0,
							awaiting: 0,
							cancelled: 0,
							noShow: 0,
							needsCall: 0,
							withoutPhone: 0,
						},
						rows: [],
						isEmpty: true,
					},
				};
			}

			const dayPatientIds = [
				...new Set(
					appointmentRows
						.map((row) => row.patientId)
						.filter((id): id is string => !!id),
				),
			];
			const dayDoctorIds = [
				...new Set(
					appointmentRows
						.map((row) => row.doctorUserId)
						.filter((id): id is string => !!id),
				),
			];
			const dayAppointmentIds = appointmentRows.map((row) => row.id);

			const patientRows =
				dayPatientIds.length > 0
					? await tx
							.select({
								id: patients.id,
								fullName: patients.fullName,
								phone: patients.phone,
							})
							.from(patients)
							.where(
								and(
									eq(patients.organizationId, context.organizationId),
									inArray(patients.id, dayPatientIds),
								),
							)
					: [];
			const patientById = new Map(patientRows.map((row) => [row.id, row]));

			const staffRows =
				dayDoctorIds.length > 0
					? await tx
							.select({ id: users.id, fullName: users.fullName })
							.from(users)
							.where(
								and(
									eq(users.organizationId, context.organizationId),
									inArray(users.id, dayDoctorIds),
								),
							)
					: [];
			const staffById = new Map(staffRows.map((row) => [row.id, row.fullName]));

			const reminderRows =
				dayAppointmentIds.length > 0
					? await tx
							.select({
								dedupeKey: communicationOutbox.dedupeKey,
								status: communicationOutbox.status,
								channel: communicationOutbox.channel,
								sentAt: communicationOutbox.sentAt,
								deliveredAt: communicationOutbox.deliveredAt,
								lastErrorMessage: communicationOutbox.lastErrorMessage,
								receiptDetail: communicationOutbox.receiptDetail,
							})
							.from(communicationOutbox)
							.where(
								and(
									eq(
										communicationOutbox.organizationId,
										context.organizationId,
									),
									or(
										...dayAppointmentIds.map((id) =>
											like(communicationOutbox.dedupeKey, `reminder:${id}:%`),
										),
										...dayAppointmentIds.map((id) =>
											like(
												communicationOutbox.dedupeKey,
												`reminder:appointment:${id}:%`,
											),
										),
									),
								),
							)
					: [];

			type ReminderInfo = {
				state: ReminderState;
				channel: string | null;
				at: Date | null;
				detail: string | null;
			};
			const reminderByAppointment = new Map<string, ReminderInfo>();
			for (const row of reminderRows) {
				const parts = row.dedupeKey.split(":");
				const appointmentId = parts[1] === "appointment" ? parts[2] : parts[1];
				if (!appointmentId) continue;

				const state = OUTBOX_TO_REMINDER_STATE[row.status] ?? "queued";
				const candidate: ReminderInfo = {
					state,
					channel: row.channel,
					at: row.deliveredAt ?? row.sentAt ?? null,
					detail: row.receiptDetail ?? row.lastErrorMessage ?? null,
				};
				const existing = reminderByAppointment.get(appointmentId);
				if (
					!existing ||
					reminderStateRank(candidate.state) > reminderStateRank(existing.state)
				) {
					reminderByAppointment.set(appointmentId, candidate);
				}
			}

			let codeRows: { appointmentId: string; usedAt: Date | null }[] = [];
			if (dayAppointmentIds.length > 0) {
				try {
					codeRows = await withSavepoint(tx, (spTx) =>
						spTx
							.select({
								appointmentId: appointmentActionCodes.appointmentId,
								usedAt: appointmentActionCodes.usedAt,
							})
							.from(appointmentActionCodes)
							.where(
								and(
									eq(
										appointmentActionCodes.organizationId,
										context.organizationId,
									),
									inArray(
										appointmentActionCodes.appointmentId,
										dayAppointmentIds,
									),
								),
							),
					);
				} catch (codeErr) {
					request.log.warn(
						{ err: codeErr },
						"[dayConfirmations] Не удалось прочитать appointment_action_codes — продолжаем без отметок перехода",
					);
					codeRows = [];
				}
			}

			const clickedAtByAppointment = new Map<string, Date>();
			for (const row of codeRows) {
				if (!row.usedAt) continue;
				const existing = clickedAtByAppointment.get(row.appointmentId);
				if (!existing || row.usedAt > existing) {
					clickedAtByAppointment.set(row.appointmentId, row.usedAt);
				}
			}

			let confirmed = 0;
			let cancelled = 0;
			let noShow = 0;
			let needsCall = 0;
			let withoutPhone = 0;

			const rows = appointmentRows.map((appointment) => {
				const patient = appointment.patientId
					? patientById.get(appointment.patientId)
					: undefined;
				const reminder = reminderByAppointment.get(appointment.id) ?? {
					state: "not_queued" as ReminderState,
					channel: null,
					at: null,
					detail: null,
				};
				const clickedAt = clickedAtByAppointment.get(appointment.id) ?? null;
				const phone = patient?.phone?.trim() || null;

				if (appointment.status === "confirmed") confirmed += 1;
				if (appointment.status === "cancelled") cancelled += 1;
				if (appointment.status === "no_show") noShow += 1;
				if (!phone) withoutPhone += 1;

				const awaitingAnswer = appointment.status === "planned";
				const reminderReached = reminder.state === "delivered";
				const requiresCall = awaitingAnswer && !reminderReached;
				if (requiresCall) needsCall += 1;

				return {
					appointmentId: appointment.id,
					startsAt: appointment.startsAt,
					status: appointment.status,
					patientId: appointment.patientId,
					patientName: patient?.fullName ?? "Пациент не указан",
					phone,
					doctorName: appointment.doctorUserId
						? (staffById.get(appointment.doctorUserId) ?? "Врач не в списке")
						: null,
					reminder,
					patientClickedAt: clickedAt,
					needsCall: requiresCall,
				};
			});

			const awaiting = rows.filter((row) => row.status === "planned").length;

			return {
				kind: "ok" as const,
				payload: {
					date,
					timeZone,
					summary: {
						total: rows.length,
						confirmed,
						awaiting,
						cancelled,
						noShow,
						needsCall,
						withoutPhone,
					},
					rows,
					isEmpty: false,
				},
			};
		});

		if (outcome.kind === "invalid_bounds") {
			return badDayConfirmationRequest(
				reply,
				"Дату не удалось разобрать в часовом поясе клиники.",
			);
		}
		return outcome.payload;
	});
}
