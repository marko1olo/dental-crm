import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import {
	clinics,
	crmLeads,
	crmLeadStageHistory,
	organizations,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	schemaIssuePhrase,
	schemaRefusalMessage,
} from "../../../utils/schemaRefusalWords.js";
import {
	bookingRequestSchema,
	CLINIC_LINK_DEAD_MESSAGE,
	DEFAULT_TIMEZONE,
	organizationIdSchema,
	publicBookingFieldLabels,
} from "./publicBookingSchemas.js";
import {
	intersectWorkingWindows,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
	utcToLocalWallTime,
} from "../slotAvailabilityEngine.js";
import {
	isRateLimited,
	verifyPhoneOtp,
} from "../smsVerificationAndSpamGate.js";
import {
	executeBookingTransaction,
	type BookingMutationParams,
	type BookingMutationResult,
} from "../bookingMutationService.js";

export type DatabaseTransaction = TenantDb;

export interface CreateLeadFromIntakeParams {
	organizationId: string;
	patientName: string;
	patientPhone: string;
	source?: string | undefined;
	receiptStatus: string;
	comment?: string | undefined;
	doctorId?: string | undefined;
}

/**
 * Creates CRM Lead and stage history inside an existing database transaction.
 * Broadcasts LEAD_CREATED event via WebSocket broker.
 */
export async function createCrmLeadFromPublicIntake(
	tx: DatabaseTransaction,
	params: CreateLeadFromIntakeParams,
): Promise<{ lead: typeof crmLeads.$inferSelect | null }> {
	const {
		organizationId,
		patientName,
		patientPhone,
		source,
		receiptStatus,
		comment,
		doctorId,
	} = params;

	const leadSource = source || "widget";
	const now = new Date();

	const [createdLead] = await tx
		.insert(crmLeads)
		.values({
			organizationId,
			name: patientName,
			patientName,
			phone: patientPhone,
			source: leadSource,
			status: receiptStatus === "CONFIRMED" ? "consult_booked" : "new",
			notes: `Онлайн-запись (${leadSource}): ${receiptStatus}. ${comment || ""}`.trim(),
			assignedDoctorId: doctorId,
			priority: "normal",
			stageEnteredAt: now,
		})
		.returning();

	if (createdLead) {
		await tx.insert(crmLeadStageHistory).values({
			organizationId,
			leadId: createdLead.id,
			fromStage: null,
			toStage: createdLead.status || "new",
			changedByUserId: null,
			durationSeconds: 0,
			createdAt: now,
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_CREATED",
			payload: createdLead,
		});
	}

	return { lead: createdLead ?? null };
}

/**
 * Executes public appointment booking mutation inside an existing database transaction.
 * On success, broadcasts APPOINTMENT_CREATED event via WebSocket broker.
 */
export async function executePublicBookingAppointment(
	tx: DatabaseTransaction,
	params: BookingMutationParams,
): Promise<BookingMutationResult> {
	const result = await executeBookingTransaction(tx as any, params);

	if (!("blocked" in result) && !result.conflict && result.appointment) {
		wsBroker.broadcastToOrganization(params.organizationId, {
			type: "APPOINTMENT_CREATED",
			payload: {
				appointmentId: result.appointment.id,
				startsAt: result.appointment.startsAt,
			},
		});
	}

	return result;
}

/**
 * Full transactional handler for booking appointment endpoint POST /:organizationId/book.
 */
export async function handleBookAppointment(
	request: FastifyRequest<{
		Params: { organizationId: string };
		Body: {
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
			verificationCode?: string;
			source?: string;
			utm_source?: string;
			utmSource?: string;
			utm_campaign?: string;
			utm_medium?: string;
			utm_content?: string;
			utm_term?: string;
		};
	}>,
	reply: FastifyReply,
) {
	if (isRateLimited(request.ip ?? "unknown")) {
		return reply.status(429).send({ error: "Слишком много запросов." });
	}
	const { organizationId } = request.params;
	if (!organizationIdSchema.safeParse(organizationId).success) {
		return reply.status(404).send({
			error: "ClinicLinkInvalid",
			message: CLINIC_LINK_DEAD_MESSAGE,
		});
	}

	const parsed = bookingRequestSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "Некорректные данные записи",
			message: schemaRefusalMessage({
				issues: parsed.error.issues,
				fieldLabels: publicBookingFieldLabels,
				retryAction: "запись на приём",
				fallbackMessage:
					"Форма записи заполнена не полностью. Заполните врача, дату, время, имя и телефон и повторите запись на приём.",
			}),
			details: parsed.error.issues.map((issue) =>
				schemaIssuePhrase(issue, publicBookingFieldLabels),
			),
		});
	}
	const { doctorId, startsAt, endsAt, patientName, patientPhone, comment, verificationCode } =
		parsed.data;

	if (verificationCode) {
		const check = verifyPhoneOtp(patientPhone, verificationCode);
		if (!check.valid) {
			return reply.status(400).send({
				error: "Неверный код подтверждения",
				message: check.error ?? "Код подтверждения не совпадает или истёк.",
			});
		}
	}

	const startDate = new Date(startsAt);
	const endDate = new Date(endsAt);

	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return reply.status(400).send({ error: "Некорректное время записи" });
	}
	if (endDate.getTime() <= startDate.getTime()) {
		return reply
			.status(400)
			.send({ error: "Время окончания должно быть позже начала" });
	}
	const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60_000;
	if (durationMinutes > 8 * 60) {
		return reply
			.status(400)
			.send({ error: "Слишком большая длительность записи" });
	}
	if (startDate.getTime() <= Date.now()) {
		return reply
			.status(400)
			.send({ error: "Нельзя записаться на прошедшее время" });
	}

	return withTenantCtx(organizationId, async (tenantTx) => {
		const [doctor] = await tenantTx
			.select({
				id: users.id,
				workingHours: users.workingHours,
			})
			.from(users)
			.where(
				and(
					eq(users.id, doctorId),
					eq(users.organizationId, organizationId),
					eq(users.role, "doctor"),
					eq(users.isActive, true),
				),
			)
			.limit(1);

		if (!doctor) {
			return reply.status(404).send({ error: "Врач не найден" });
		}

		// Check Clinic & Doctor Working Hours Intersection
		const [clinicRow] = await tenantTx
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);
		const [bookingOrg] = await tenantTx
			.select({ clinicSchedule: organizations.clinicSchedule })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		const bookingTimeZone = clinicRow?.timezone || DEFAULT_TIMEZONE;
		const localDate = utcToLocalWallTime(startDate, bookingTimeZone);
		const bookingDaySchedule = resolveDaySchedule(
			bookingOrg?.clinicSchedule as unknown,
			localDate.weekday,
		);

		if (!bookingDaySchedule.isWorking) {
			return reply.status(409).send({
				error: "В этот день клиника не работает. Выберите другую дату.",
			});
		}

		const doctorWindow = resolveDoctorDaySchedule(
			doctor.workingHours,
			localDate.weekday,
			bookingDaySchedule,
		);

		const effectiveWindow = intersectWorkingWindows(
			bookingDaySchedule,
			doctorWindow,
			1,
		);

		if (!effectiveWindow.isWorking) {
			return reply.status(409).send({
				error: "В этот день выбранный врач не принимает. Выберите другую дату или другого специалиста.",
			});
		}

		const localEnd = utcToLocalWallTime(endDate, bookingTimeZone);
		const startMinute = localDate.hours * 60 + localDate.minutes;
		const endMinute = localEnd.hours * 60 + localEnd.minutes;

		if (
			startMinute < effectiveWindow.startMinute ||
			endMinute > effectiveWindow.endMinute ||
			endMinute <= startMinute
		) {
			return reply.status(409).send({
				error: "Выбранное время вне часов приёма врача. Обновите список слотов.",
			});
		}

		// Atomic Collision Check, Appointment Creation & CRM Lead Registration
		try {
			const effectiveSource =
				parsed.data.utm_source ||
				parsed.data.utmSource ||
				parsed.data.source ||
				"widget";

			const result = await tenantTx.transaction(async (tx) => {
				const bookingResult = await executePublicBookingAppointment(tx, {
					organizationId,
					doctorId,
					startDate,
					endDate,
					patientName,
					patientPhone,
					comment,
					source: effectiveSource,
					utmSource: parsed.data.utm_source || parsed.data.utmSource,
					utmCampaign: parsed.data.utm_campaign,
					utmMedium: parsed.data.utm_medium,
				});

				if (bookingResult.conflict || ("blocked" in bookingResult && bookingResult.blocked)) {
					return bookingResult;
				}

				// Honest First-Principles: create/sync CRM Lead with marketing source & UTM attribution
				await createCrmLeadFromPublicIntake(tx, {
					organizationId,
					patientName,
					patientPhone,
					source: effectiveSource,
					receiptStatus: "CONFIRMED",
					comment: comment ? `Приём врача: ${comment}` : "Онлайн-запись подтверждена",
					doctorId,
				});

				return bookingResult;
			});

			if ("blocked" in result && result.blocked) {
				return reply.status(result.status).send({
					error: result.error,
					message: result.message,
				});
			}

			if (result.conflict) {
				return reply.status(409).send({
					error: "Выбранное время уже занято. Обновите список слотов.",
				});
			}

			return { success: true, appointment: result.appointment };
		} catch (error) {
			const err = error as { code?: string; message?: string };
			if (
				err?.code === "23P01" ||
				err?.message?.includes("23P01") ||
				err?.message?.includes("exclusion constraint") ||
				err?.message?.includes("overlap_excl")
			) {
				return reply.status(409).send({
					error: "Выбранное время уже занято. Обновите список слотов.",
				});
			}
			request.log.error(
				{ err: error },
				"[publicBooking] Не удалось создать запись",
			);
			return reply
				.status(500)
				.send({ error: "Не удалось создать запись. Повторите попытку." });
		}
	});
}

export {
	executeBookingTransaction,
	type BookingMutationParams,
	type BookingMutationResult,
};
