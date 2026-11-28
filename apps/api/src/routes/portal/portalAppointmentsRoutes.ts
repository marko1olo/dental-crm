import { and, desc, eq, gt, lt, ne, notInArray, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { definePublicRoute } from "../../core/routeFactories.js";
import { withTenantCtx, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	appointments,
	chairs,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { DEFAULT_TIMEZONE } from "../publicBooking/types.js";
import {
	intersectWorkingWindows,
	resolveDaySchedule,
	resolveDoctorDaySchedule,
	utcToLocalWallTime,
} from "../publicBooking/slotAvailabilityEngine.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import {
	bookAppointmentBodySchema,
	cancelAppointmentBodySchema,
	rescheduleAppointmentBodySchema,
	type CancelAppointmentBody,
} from "./types.js";
import { isValidUuid } from "@dental/shared";

export async function registerPortalAppointmentsRoutes(server: FastifyInstance): Promise<void> {
	// 17. Get Patient Appointments (Protected)
	definePublicRoute(server, {
		method: "GET",
		path: "/appointments",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			return withTenantReadCtx(auth.organizationId, async (tx) => {
				const list = await tx
					.select({
						id: appointments.id,
						doctorUserId: appointments.doctorUserId,
						chairId: appointments.chairId,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
						status: appointments.status,
						reason: appointments.reason,
						comment: appointments.comment,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.patientId, auth.patientId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.orderBy(desc(appointments.startsAt));

				return { success: true, appointments: list };
			});
		},
	});

	// 18. Book Appointment with Strict Pessimistic Double-Booking Concurrency Lock (Protected)
	definePublicRoute(server, {
		method: "POST",
		path: "/appointments",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const rawIdempotencyKey =
				(request.headers["idempotency-key"] as string | undefined) ||
				(request.headers["x-idempotency-key"] as string | undefined);
			const idempotencyKey = rawIdempotencyKey?.trim();
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				};
			}

			const parsedBody = bookAppointmentBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры записи на приём.",
					details: parsedBody.error.format(),
				};
			}

			const doctorId = parsedBody.data.doctorId?.trim() ?? "";
			const startsAtStr = parsedBody.data.startsAt?.trim() ?? "";
			const endsAtStr = parsedBody.data.endsAt?.trim() ?? "";
			const reason =
				parsedBody.data.reason?.trim() || "Запись через личный кабинет";
			const comment = parsedBody.data.comment?.trim() || undefined;

			if (!doctorId || !startsAtStr || !endsAtStr) {
				reply.status(400);
				return {
					error: "MissingRequiredFields",
					message: "Укажите врача, время начала и окончания приёма.",
				};
			}

			if (!isValidUuid(doctorId)) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Идентификатор врача должен быть валидным UUID.",
				};
			}

			const startDate = new Date(startsAtStr);
			const endDate = new Date(endsAtStr);
			if (
				Number.isNaN(startDate.getTime()) ||
				Number.isNaN(endDate.getTime()) ||
				endDate <= startDate
			) {
				reply.status(400);
				return {
					error: "InvalidAppointmentTime",
					message: "Некорректное время приёма.",
				};
			}

			// SEV-2: Запрет бронирования в прошлое
			if (startDate.getTime() <= Date.now()) {
				reply.status(400);
				return {
					error: "InvalidAppointmentTime",
					message: "Нельзя записаться на прошедшее время.",
				};
			}

			// SEV-2: Защита от абсурдной длительности приёма
			const durationMs = endDate.getTime() - startDate.getTime();
			if (durationMs < 15 * 60 * 1000 || durationMs > 8 * 60 * 60 * 1000) {
				reply.status(400);
				return {
					error: "InvalidAppointmentTime",
					message: "Длительность приёма должна составлять от 15 минут до 8 часов.",
				};
			}

			return withTenantWriteCtx(auth.organizationId, async (tx) => {
			// 1. Проверка рабочего графика клиники и врача (Мандат 8a, 8k: исключить запись в 3 ночи)
				const [orgRow] = await tx
					.select({
						clinicSchedule: organizations.clinicSchedule,
					})
					.from(organizations)
					.where(eq(organizations.id, auth.organizationId))
					.limit(1);

				const [doctorRow] = await tx
					.select({
						id: users.id,
						workingHours: users.workingHours,
					})
					.from(users)
					.where(
						and(
							eq(users.id, doctorId),
							eq(users.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!doctorRow) {
					reply.status(404);
					return {
						error: "DoctorNotFound",
						message: "Выбранный врач не найден в этой клинике.",
					};
				}

				const tz =
					(orgRow?.clinicSchedule as { timezone?: string } | null)?.timezone ||
					DEFAULT_TIMEZONE;
				const localStart = utcToLocalWallTime(startDate, tz);
				const localEnd = utcToLocalWallTime(endDate, tz);

				const clinicDaySchedule = resolveDaySchedule(
					orgRow?.clinicSchedule as unknown,
					localStart.weekday,
				);
				if (!clinicDaySchedule.isWorking) {
					reply.status(409);
					return {
						error: "ClinicClosed",
						message: "В этот день клиника не работает. Пожалуйста, выберите другую дату.",
					};
				}

				const doctorWindow = resolveDoctorDaySchedule(
					doctorRow.workingHours,
					localStart.weekday,
					clinicDaySchedule,
				);
				const effectiveWindow = intersectWorkingWindows(
					clinicDaySchedule,
					doctorWindow,
					1,
				);
				if (!effectiveWindow.isWorking) {
					reply.status(409);
					return {
						error: "DoctorNotWorking",
						message: "В этот день выбранный врач не ведёт приём. Пожалуйста, выберите другую дату.",
					};
				}

				const startMinute = localStart.hours * 60 + localStart.minutes;
				const endMinute = localEnd.hours * 60 + localEnd.minutes;
				if (
					startMinute < effectiveWindow.startMinute ||
					endMinute > effectiveWindow.endMinute ||
					endMinute <= startMinute
				) {
					reply.status(409);
					return {
						error: "OutsideWorkingHours",
						message: "Выбранное время находится вне рабочих часов приёма. Пожалуйста, выберите рабочее окно врача.",
					};
				}

				// 2. SEV-2: Автоматическое определение и назначение свободного стоматологического кресла (chairId)
				const activeChairs = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, auth.organizationId),
							eq(chairs.isActive, true),
						),
					);

				let selectedChairId: string | null = null;
				if (activeChairs.length > 0) {
					const sortedChairs = [...activeChairs].sort((a, b) =>
						a.id.localeCompare(b.id),
					);
					for (const chair of sortedChairs) {
						const [occupied] = await tx
							.select({ id: appointments.id })
							.from(appointments)
							.where(
								and(
									eq(appointments.organizationId, auth.organizationId),
									eq(appointments.chairId, chair.id),
									lt(appointments.startsAt, endDate),
									gt(appointments.endsAt, startDate),
									notInArray(appointments.status, ["cancelled", "no_show"]),
								),
							)
							.limit(1);

						if (!occupied) {
							selectedChairId = chair.id;
							break;
						}
					}

					if (!selectedChairId) {
						reply.status(409);
						return {
							error: "NoAvailableChairs",
							message: "На выбранное время нет свободных стоматологических кресел. Пожалуйста, выберите другой интервал.",
						};
					}

					// Блокируем выбранное кресло FOR UPDATE в каноническом порядке Chair -> Doctor -> Patient
					await tx
						.select({ id: chairs.id })
						.from(chairs)
						.where(
							and(
								eq(chairs.organizationId, auth.organizationId),
								eq(chairs.id, selectedChairId),
							),
						)
						.limit(1)
						.for("update");
				}

				// 3. Lock Patient row FOR UPDATE
				await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, auth.patientId),
							eq(patients.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				// 4. Collision / Overlap check across active appointments
				const resourceMatchConditions = [
					eq(appointments.doctorUserId, doctorId),
					eq(appointments.patientId, auth.patientId),
				];
				if (selectedChairId) {
					resourceMatchConditions.push(eq(appointments.chairId, selectedChairId));
				}

				const overlapping = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, auth.organizationId),
							or(...resourceMatchConditions),
							lt(appointments.startsAt, endDate),
							gt(appointments.endsAt, startDate),
							notInArray(appointments.status, ["cancelled", "no_show"]),
						),
					)
					.limit(1);

				if (overlapping.length > 0) {
					reply.status(409);
					return {
						error: "SlotConflict",
						message:
							"Выбранное время у врача уже занято другой записью. Пожалуйста, выберите другой интервал.",
					};
				}

				// 5. Atomic insertion с гарантированным chairId
				const [created] = await tx
					.insert(appointments)
					.values({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						doctorUserId: doctorId,
						chairId: selectedChairId,
						status: "planned",
						startsAt: startDate,
						endsAt: endDate,
						reason,
						comment: comment
							? `[Личный кабинет] ${comment}`
							: "Запись через личный кабинет пациента",
					})
					.returning();

				reply.status(201);
				if (idempotencyKey) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("X-Idempotency-Key", idempotencyKey);
				}
				return { success: true, appointment: created };
			});
		},
	});

	// 19. Cancel Patient Appointment (Protected)
	definePublicRoute(server, {
		method: "PATCH",
		path: "/appointments/:id/cancel",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const appointmentId = (request.params as { id?: string } | undefined)?.id?.trim();
			if (!appointmentId || !isValidUuid(appointmentId)) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Идентификатор записи на приём должен быть валидным UUID.",
				};
			}
			const parsedBody = cancelAppointmentBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры отмены записи.",
					details: parsedBody.error.format(),
				};
			}
			const cancelReason =
				parsedBody.data.reason?.trim() || "Отменено пациентом через личный кабинет";

			return withTenantWriteCtx(auth.organizationId, async (tx) => {
				const [appRow] = await tx
					.select()
					.from(appointments)
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.patientId, auth.patientId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!appRow) {
					reply.status(404);
					return {
						error: "AppointmentNotFound",
						message: "Запись на приём не найдена.",
					};
				}

				if (appRow.status === "cancelled") {
					return { success: true, appointment: appRow, message: "Запись уже отменена." };
				}

				if (appRow.status === "completed") {
					reply.status(400);
					return {
						error: "CannotCancelCompleted",
						message: "Нельзя отменить уже завершённый приём.",
					};
				}

				const [updated] = await tx
					.update(appointments)
					.set({
						status: "cancelled",
						comment: appRow.comment
							? `${appRow.comment} | [Отмена: ${cancelReason}]`
							: `[Отмена: ${cancelReason}]`,
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.returning();

				return { success: true, appointment: updated };
			});
		},
	});

	// 19.1 Reschedule Patient Appointment (Protected)
	definePublicRoute(server, {
		method: "PATCH",
		path: "/appointments/:id/reschedule",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const appointmentId = (request.params as { id?: string } | undefined)?.id?.trim();
			if (!appointmentId || !isValidUuid(appointmentId)) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Идентификатор записи на приём должен быть валидным UUID.",
				};
			}

			const parsedBody = rescheduleAppointmentBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры переноса записи.",
					details: parsedBody.error.format(),
				};
			}

			const startsAtStr = parsedBody.data.startsAt?.trim() ?? "";
			if (!startsAtStr) {
				reply.status(400);
				return {
					error: "MissingRequiredFields",
					message: "Укажите новое время начала приёма.",
				};
			}

			const startDate = new Date(startsAtStr);
			const endsAtStr = parsedBody.data.endsAt?.trim() ?? "";
			const endDate = endsAtStr ? new Date(endsAtStr) : new Date(startDate.getTime() + 30 * 60 * 1000);

			if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
				reply.status(400);
				return {
					error: "InvalidAppointmentTime",
					message: "Некорректное время приёма.",
				};
			}

			if (startDate.getTime() <= Date.now()) {
				reply.status(400);
				return {
					error: "InvalidAppointmentTime",
					message: "Нельзя перенести запись на прошедшее время.",
				};
			}

			const rescheduleReason =
				parsedBody.data.reason?.trim() || "Перенос пациентом через личный кабинет";

			return withTenantWriteCtx(auth.organizationId, async (tx) => {
				const [appRow] = await tx
					.select()
					.from(appointments)
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.patientId, auth.patientId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				if (!appRow) {
					reply.status(404);
					return {
						error: "AppointmentNotFound",
						message: "Запись на приём не найдена.",
					};
				}

				if (appRow.status === "cancelled" || appRow.status === "completed") {
					reply.status(400);
					return {
						error: "CannotReschedule",
						message: "Нельзя перенести отменённую или уже завершённую запись.",
					};
				}

				// 1. Проверка рабочего графика клиники и врача через slotAvailabilityEngine
				if (appRow.doctorUserId) {
					const [orgRow] = await tx
						.select({ clinicSchedule: organizations.clinicSchedule })
						.from(organizations)
						.where(eq(organizations.id, auth.organizationId))
						.limit(1);

					const [doctorRow] = await tx
						.select({ id: users.id, workingHours: users.workingHours })
						.from(users)
						.where(
							and(
								eq(users.id, appRow.doctorUserId),
								eq(users.organizationId, auth.organizationId),
							),
						)
						.limit(1)
						.for("update");

					if (!doctorRow) {
						reply.status(404);
						return {
							error: "DoctorNotFound",
							message: "Назначенный врач не найден в этой клинике.",
						};
					}

					const tz =
						(orgRow?.clinicSchedule as { timezone?: string } | null)?.timezone ||
						DEFAULT_TIMEZONE;
					const localStart = utcToLocalWallTime(startDate, tz);
					const localEnd = utcToLocalWallTime(endDate, tz);

					const clinicDaySchedule = resolveDaySchedule(
						orgRow?.clinicSchedule as unknown,
						localStart.weekday,
					);
					if (!clinicDaySchedule.isWorking) {
						reply.status(409);
						return {
							error: "ClinicClosed",
							message: "В этот день клиника не работает. Пожалуйста, выберите другую дату.",
						};
					}

					const doctorWindow = resolveDoctorDaySchedule(
						doctorRow.workingHours,
						localStart.weekday,
						clinicDaySchedule,
					);
					const effectiveWindow = intersectWorkingWindows(
						clinicDaySchedule,
						doctorWindow,
						1,
					);
					if (!effectiveWindow.isWorking) {
						reply.status(409);
						return {
							error: "DoctorNotWorking",
							message: "В этот день выбранный врач не ведёт приём. Пожалуйста, выберите другую дату.",
						};
					}

					const startMinute = localStart.hours * 60 + localStart.minutes;
					const endMinute = localEnd.hours * 60 + localEnd.minutes;
					if (
						startMinute < effectiveWindow.startMinute ||
						endMinute > effectiveWindow.endMinute ||
						endMinute <= startMinute
					) {
						reply.status(409);
						return {
							error: "OutsideWorkingHours",
							message: "Выбранное время находится вне рабочих часов приёма. Пожалуйста, выберите рабочее окно врача.",
						};
					}
				}

				// 2. Валидация и назначение свободного кресла (chairId) с пессимистической блокировкой
				const activeChairs = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, auth.organizationId),
							eq(chairs.isActive, true),
						),
					);

				let selectedChairId: string | null = null;
				if (activeChairs.length > 0) {
					// Сначала пробуем сохранить текущее кресло записи, если оно активно и свободно
					const sortedChairs = [...activeChairs].sort((a, b) => {
						if (appRow.chairId && a.id === appRow.chairId) return -1;
						if (appRow.chairId && b.id === appRow.chairId) return 1;
						return a.id.localeCompare(b.id);
					});

					for (const chair of sortedChairs) {
						const [occupied] = await tx
							.select({ id: appointments.id })
							.from(appointments)
							.where(
								and(
									eq(appointments.organizationId, auth.organizationId),
									ne(appointments.id, appointmentId),
									eq(appointments.chairId, chair.id),
									lt(appointments.startsAt, endDate),
									gt(appointments.endsAt, startDate),
									notInArray(appointments.status, ["cancelled", "no_show"]),
								),
							)
							.limit(1);

						if (!occupied) {
							selectedChairId = chair.id;
							break;
						}
					}

					if (!selectedChairId) {
						reply.status(409);
						return {
							error: "NoAvailableChairs",
							message: "На выбранное время нет свободных стоматологических кресел. Пожалуйста, выберите другое время.",
						};
					}

					// Блокируем кресло FOR UPDATE в каноническом порядке
					await tx
						.select({ id: chairs.id })
						.from(chairs)
						.where(
							and(
								eq(chairs.organizationId, auth.organizationId),
								eq(chairs.id, selectedChairId),
							),
						)
						.limit(1)
						.for("update");
				}

				// 3. Блокируем строку пациента FOR UPDATE
				await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, auth.patientId),
							eq(patients.organizationId, auth.organizationId),
						),
					)
					.limit(1)
					.for("update");

				// 4. Проверка коллизий по врачу, пациенту и креслу
				const resourceConditions = [
					eq(appointments.patientId, auth.patientId),
				];
				if (appRow.doctorUserId) {
					resourceConditions.push(eq(appointments.doctorUserId, appRow.doctorUserId));
				}
				if (selectedChairId) {
					resourceConditions.push(eq(appointments.chairId, selectedChairId));
				}

				const [collision] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, auth.organizationId),
							ne(appointments.id, appointmentId),
							or(...resourceConditions),
							lt(appointments.startsAt, endDate),
							gt(appointments.endsAt, startDate),
							notInArray(appointments.status, ["cancelled", "no_show"]),
						),
					)
					.limit(1);

				if (collision) {
					reply.status(409);
					return {
						error: "SlotConflict",
						message: "Выбранное время у врача или в кресле уже занято другой записью. Пожалуйста, выберите другое время.",
					};
				}

				const [updated] = await tx
					.update(appointments)
					.set({
						startsAt: startDate,
						endsAt: endDate,
						chairId: selectedChairId,
						comment: appRow.comment
							? `${appRow.comment} | [Перенос: ${rescheduleReason}]`
							: `[Перенос: ${rescheduleReason}]`,
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, auth.organizationId),
						),
					)
					.returning();

				return { success: true, appointment: updated };
			});
		},
	});

	// 20. Get Clinic Doctors for Online Booking (Protected)
	definePublicRoute(server, {
		method: "GET",
		path: "/doctors",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			return withTenantReadCtx(auth.organizationId, async (tx) => {
				const list = await tx
					.select({
						id: users.id,
						fullName: users.fullName,
						specialties: users.specialties,
					})
					.from(users)
					.where(
						and(
							eq(users.organizationId, auth.organizationId),
							eq(users.role, "doctor"),
							eq(users.isActive, true),
						),
					)
					.limit(100);

				return { success: true, doctors: list };
			});
		},
	});
}
