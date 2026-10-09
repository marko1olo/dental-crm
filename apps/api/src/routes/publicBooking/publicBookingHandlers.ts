import { and, eq, inArray, lt, gt, notInArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	clinics,
	crmLeads,
	crmLeadStageHistory,
	organizations,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { publicBookingQueueService } from "../../services/publicBookingQueueService.js";
import {
	schemaIssuePhrase,
	schemaRefusalMessage,
} from "../../utils/schemaRefusalWords.js";
import { FREED_APPOINTMENT_STATUSES } from "../../services/schedule/scheduleConflictService.js";
import {
	type PublicSlotDto,
	acceptBumpSchema,
	bookingRequestSchema,
	cloudIntakeSchema,
	CLINIC_LINK_DEAD_MESSAGE,
	dateSchema,
	DEFAULT_SLOT_MINUTES,
	DEFAULT_TIMEZONE,
	optionalDoctorIdSchema,
	organizationIdSchema,
	publicBookingFieldLabels,
	sendOtpSchema,
} from "./types.js";
import {
	intersectWorkingWindows,
	localWallTimeToUtc,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
	utcToLocalWallTime,
} from "./slotAvailabilityEngine.js";
import {
	isRateLimited,
	requestPhoneVerification,
	verifyPhoneOtp,
} from "./smsVerificationAndSpamGate.js";
import { executeBookingTransaction } from "./bookingMutationService.js";

/**
 * Core Slot Generation Handler:
 * Supports both single-doctor queries and multi-doctor union aggregation.
 */
export const handleSlotsQuery = async (
	organizationId: string,
	date: string,
	requestedDoctorId: string | undefined,
	reply: FastifyReply,
) => {
	if (!organizationIdSchema.safeParse(organizationId).success) {
		return reply.status(404).send({
			error: "ClinicLinkInvalid",
			message: CLINIC_LINK_DEAD_MESSAGE,
		});
	}
	if (!dateSchema.safeParse(date).success) {
		return reply.status(400).send({
			error: "BookingDateInvalid",
			message: "Дату приёма сервер не разобрал. Выберите корректную дату в формате YYYY-MM-DD.",
		});
	}

	return withTenantCtx(organizationId, async (tx) => {
		const [org] = await tx
			.select({ clinicSchedule: organizations.clinicSchedule })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			return reply
				.status(404)
				.send({ error: "ClinicNotFound", message: CLINIC_LINK_DEAD_MESSAGE });
		}

		const [clinic] = await tx
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);

		const timeZone = clinic?.timezone || DEFAULT_TIMEZONE;
		const schedule = org.clinicSchedule as unknown;
		const slotMinutes = (() => {
			const raw = (schedule as Record<string, unknown> | null)?.defaultVisitMinutes;
			return typeof raw === "number" && raw >= 5 && raw <= 240
				? raw
				: DEFAULT_SLOT_MINUTES;
		})();

		const [wy, wm, wd] = date
			.split("-")
			.map((n) => Number.parseInt(n, 10)) as [number, number, number];
		const calendarWeekday = new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay();
		const clinicDaySchedule = resolveDaySchedule(schedule, calendarWeekday);

		if (!clinicDaySchedule.isWorking) {
			return reply.status(409).send({
				error: "ClinicClosedThatDay",
				message: "В этот день клиника не работает. Выберите другую дату.",
			});
		}
		if (clinicDaySchedule.closeMinute <= clinicDaySchedule.openMinute) {
			return reply.status(409).send({
				error: "ClinicHoursMisconfigured",
				message: "Часы приёма на этот день у клиники заданы неверно. Выберите другую дату или позвоните в клинику.",
			});
		}

		// Load target doctors
		const doctorConditions = [
			eq(users.organizationId, organizationId),
			eq(users.role, "doctor"),
			eq(users.isActive, true),
		];
		if (requestedDoctorId) {
			doctorConditions.push(eq(users.id, requestedDoctorId));
		}

		const targetDoctors = await tx
			.select({
				id: users.id,
				fullName: users.fullName,
				workingHours: users.workingHours,
			})
			.from(users)
			.where(and(...doctorConditions));

		if (targetDoctors.length === 0) {
			if (requestedDoctorId) {
				return reply.status(404).send({
					error: "DoctorNotFound",
					message: "Выбранный врач не найден или не принимает в этой клинике.",
				});
			}
			return [];
		}

		// Load appointments on this date
		const dayStartUtc = localWallTimeToUtc(date, 0, timeZone);
		const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);

		const doctorIds = targetDoctors.map((d) => d.id);
		const existingApps = await tx
			.select({
				doctorUserId: appointments.doctorUserId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					inArray(appointments.doctorUserId, doctorIds),
					lt(appointments.startsAt, dayEndUtc),
					gt(appointments.endsAt, dayStartUtc),
					notInArray(appointments.status, [...FREED_APPOINTMENT_STATUSES]),
				),
			);

		const nowMs = Date.now();
		const slotUnionMap = new Map<string, { time: string; startsAt: string; endsAt: string; doctorIds: Set<string> }>();

		let totalDoctorWindows = 0;

		for (const doctor of targetDoctors) {
			const doctorWindow = resolveDoctorDaySchedule(
				doctor.workingHours,
				calendarWeekday,
				clinicDaySchedule,
			);

			const effectiveWindow = intersectWorkingWindows(
				clinicDaySchedule,
				doctorWindow,
				slotMinutes,
			);

			if (!effectiveWindow.isWorking) {
				// Doctor is off on this weekday (enabled: false) or intersection is empty -> 0 slots for this doctor
				continue;
			}

			totalDoctorWindows += 1;
			const doctorApps = existingApps.filter((a) => a.doctorUserId === doctor.id);

			for (
				let minute = effectiveWindow.startMinute;
				minute + slotMinutes <= effectiveWindow.endMinute;
				minute += slotMinutes
			) {
				const slotStart = localWallTimeToUtc(date, minute, timeZone);
				const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);

				if (slotStart.getTime() <= nowMs) continue;

				const isTaken = doctorApps.some((app) => {
					const appStart = new Date(app.startsAt).getTime();
					const appEnd = new Date(app.endsAt).getTime();
					return slotStart.getTime() < appEnd && slotEnd.getTime() > appStart;
				});

				if (!isTaken) {
					const startsAtIso = slotStart.toISOString();
					const existingSlot = slotUnionMap.get(startsAtIso);
					if (existingSlot) {
						existingSlot.doctorIds.add(doctor.id);
					} else {
						const hh = Math.floor(minute / 60).toString().padStart(2, "0");
						const mm = (minute % 60).toString().padStart(2, "0");
						slotUnionMap.set(startsAtIso, {
							time: `${hh}:${mm}`,
							startsAt: startsAtIso,
							endsAt: slotEnd.toISOString(),
							doctorIds: new Set([doctor.id]),
						});
					}
				}
			}
		}

		if (requestedDoctorId && totalDoctorWindows === 0) {
			// The requested doctor does not work on this weekday
			return [];
		}

		// Sort chronologically and format
		const sortedSlots: PublicSlotDto[] = Array.from(slotUnionMap.values())
			.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
			.map((s) => ({
				time: s.time,
				startsAt: s.startsAt,
				endsAt: s.endsAt,
				availableDoctorIds: Array.from(s.doctorIds),
			}));

		return sortedSlots;
	});
};

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
	// Root health/discovery endpoint
	server.get("/", async (_request, reply) => {
		return reply.send({ status: "ok", service: "public_booking" });
	});

	// Rate-limited OTP send endpoint (SMS / Flash call)
	server.post("/send-otp", async (request, reply) => {
		const parsed = sendOtpSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректный номер телефона",
				details: parsed.error.issues,
			});
		}

		const clientIp = request.ip || "unknown";
		const result = requestPhoneVerification(
			parsed.data.phone,
			parsed.data.method,
			clientIp,
			parsed.data.organizationId,
		);

		if (!result.allowed) {
			return reply.status(429).send({
				error: result.message,
				cooldownSeconds: result.cooldownSeconds,
			});
		}

		return reply.send({
			success: true,
			message: result.message,
			cooldownSeconds: result.cooldownSeconds,
			challengeId: result.challengeId,
		});
	});

	// Cloud Relay / 24/7 intake endpoint (supports daytime direct or nighttime soft-hold queue)
	server.post("/cloud-intake", async (request, reply) => {
		const parsed = cloudIntakeSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные данные заявки",
				details: parsed.error.issues,
			});
		}

		try {
			const receipt = await publicBookingQueueService.submitBooking(parsed.data);

			// Фиксация в CRM-конвейере обращений клиники (Мандат 8e / 8n)
			if (receipt.status !== "REJECTED_CONFLICT") {
				try {
					const leadSource = parsed.data.source || "widget";
					const now = new Date();
					await withTenantCtx(parsed.data.organizationId, async (tx) => {
						const [createdLead] = await tx
							.insert(crmLeads)
							.values({
								organizationId: parsed.data.organizationId,
								name: parsed.data.patientName,
								patientName: parsed.data.patientName,
								phone: parsed.data.patientPhone,
								source: leadSource,
								status: receipt.status === "CONFIRMED" ? "consult_booked" : "new",
								notes: `Онлайн-запись (${leadSource}): ${receipt.status}. ${parsed.data.comment || ""}`.trim(),
								assignedDoctorId: parsed.data.doctorId,
								priority: "normal",
								stageEnteredAt: now,
							})
							.returning();

						if (createdLead) {
							await tx.insert(crmLeadStageHistory).values({
								organizationId: parsed.data.organizationId,
								leadId: createdLead.id,
								fromStage: null,
								toStage: createdLead.status || "new",
								changedByUserId: null,
								durationSeconds: 0,
								createdAt: now,
							});

							wsBroker.broadcastToOrganization(parsed.data.organizationId, {
								type: "LEAD_CREATED",
								payload: createdLead,
							});
						}
					});
				} catch (leadErr) {
					request.log.warn(
						{ leadErr },
						"Failed to create CRM lead from public intake",
					);
				}
			}

			return reply.status(receipt.status === "REJECTED_CONFLICT" ? 409 : 200).send(receipt);
		} catch (err) {
			return reply.status(400).send({ error: (err as Error).message });
		}
	});

	// Graceful Bump 1-click accept endpoint
	server.post("/accept-bump", async (request, reply) => {
		const parsed = acceptBumpSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные параметры переноса",
				details: parsed.error.issues,
			});
		}

		try {
			const receipt = await publicBookingQueueService.acceptBumpedSlot(
				parsed.data.organizationId,
				parsed.data.bookingId,
				parsed.data.chosenSlot,
			);
			return reply.status(receipt.status === "REJECTED_CONFLICT" ? 409 : 200).send(receipt);
		} catch (err) {
			return reply.status(400).send({ error: (err as Error).message });
		}
	});

	// 1. Get doctors for an organization
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/doctors",
		async (request, reply) => {
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

			return withTenantCtx(organizationId, async () => {
				const [organization] = await db
					.select({ id: organizations.id })
					.from(organizations)
					.where(eq(organizations.id, organizationId))
					.limit(1);
				if (!organization) {
					return reply.status(404).send({
						error: "ClinicNotFound",
						message: CLINIC_LINK_DEAD_MESSAGE,
					});
				}

				const doctorsList = await db
					.select({
						id: users.id,
						fullName: users.fullName,
						specialties: users.specialties,
					})
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(users.role, "doctor"),
							eq(users.isActive, true),
						),
					)
					.limit(50);

				if (doctorsList.length === 0) {
					return reply.status(503).send({
						error: "NoBookableDoctors",
						message:
							"В этой клинике пока нет ни одного врача, открытого для записи через сайт. Позвоните в клинику — там запишут на приём.",
					});
				}

				return doctorsList;
			});
		},
	);

	// 2a. Unified slots endpoint: GET /api/public/booking/:organizationId/slots?date=YYYY-MM-DD[&doctorId=UUID]
	server.get<{
		Params: { organizationId: string };
		Querystring: { date: string; doctorId?: string };
	}>("/:organizationId/slots", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId } = request.params;
		const { date, doctorId } = request.query;

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}
		if (doctorId && !optionalDoctorIdSchema.safeParse(doctorId).success) {
			return reply.status(400).send({
				error: "DoctorIdInvalid",
				message: "Некорректный идентификатор врача.",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
	});

	// 2b. Backward-compatible param endpoint: GET /api/public/booking/:organizationId/slots/:doctorId?date=YYYY-MM-DD
	server.get<{
		Params: { organizationId: string; doctorId: string };
		Querystring: { date: string };
	}>("/:organizationId/slots/:doctorId", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId, doctorId } = request.params;
		const { date } = request.query;

		if (!date) {
			return reply.status(400).send({
				error: "BookingDateMissing",
				message: "Запрос свободного времени пришёл без даты приёма. Выберите дату в поле «Выберите дату».",
			});
		}

		return handleSlotsQuery(organizationId, date, doctorId, reply);
	});

	// 3. Book an appointment with strict working hour & collision enforcement
	server.post<{
		Params: { organizationId: string };
		Body: {
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
		};
	}>("/:organizationId/book", async (request, reply) => {
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

			// Atomic Collision Check & Appointment Creation
			try {
				const result = await tenantTx.transaction(async (tx) => {
					return executeBookingTransaction(tx, {
						organizationId,
						doctorId,
						startDate,
						endDate,
						patientName,
						patientPhone,
						comment,
					});
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

				wsBroker.broadcastToOrganization(organizationId, {
					type: "APPOINTMENT_CREATED",
					payload: {
						appointmentId: result.appointment.id,
						startsAt: result.appointment.startsAt,
					},
				});

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
	});
};
