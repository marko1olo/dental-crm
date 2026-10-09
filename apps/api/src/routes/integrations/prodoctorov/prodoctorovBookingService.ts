/**
 * routes/integrations/prodoctorov/prodoctorovBookingService.ts
 * Layer 2: Сервис обработки бронирований ПроДокторов / МедФлекс (создание, перенос, отмена, CRM-лиды).
 */

import { and, eq, ilike, lt, ne, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import {
	appointments,
	chairs,
	crmLeadStageHistory,
	crmLeads,
	externalScheduleActionLogs,
	patients,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import type { BookingResponseData, WebhookPayload } from "./types.js";

// biome-ignore lint/suspicious/noExplicitAny: generic drizzle transaction
export async function processProdoctorovBookingWebhook(
	tx: any,
	req: FastifyRequest,
	payload: WebhookPayload,
	organizationId: string,
): Promise<BookingResponseData> {
	const bookingId = payload.bookingId || payload.deliveryId || "";
	const patientFullName =
		payload.patient?.fullName ||
		payload.patient?.name ||
		payload.patientName ||
		"Пациент с ПроДокторов";
	const patientPhone = payload.patient?.phone || payload.patientPhone || null;
	const patientBirthDate =
		payload.patient?.birthDate || payload.patientBirthDate || null;
	const patientEmail = payload.patient?.email || payload.patientEmail || null;

	const doctorUserId =
		payload.appointment?.doctorId ||
		payload.appointment?.doctorUserId ||
		payload.doctorId ||
		payload.doctorUserId ||
		null;
	const chairId = payload.appointment?.chairId || payload.chairId || null;
	const rawStartsAt = payload.appointment?.startsAt || payload.startsAt || null;
	const rawEndsAt = payload.appointment?.endsAt || payload.endsAt || null;
	const durationMinutes =
		payload.appointment?.durationMinutes || payload.durationMinutes || 30;
	const reason =
		payload.appointment?.reason ||
		payload.reason ||
		"Запись через ПроДокторов / МедФлекс";
	const comment = payload.appointment?.comment || payload.comment || "";

	const isCancel =
		payload.event === "booking_cancelled" ||
		payload.event === "cancelled" ||
		payload.action === "cancel";

	// ─── СЦЕНАРИЙ ОТМЕНЫ БРОНИРОВАНИЯ ──────────────────────────────
	if (isCancel) {
		let targetAppointment: {
			id: string;
			startsAt: Date;
			endsAt: Date;
		} | null = null;

		if (bookingId) {
			const [found] = await tx
				.select({
					id: appointments.id,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						ilike(appointments.comment, `%${bookingId}%`),
					),
				)
				.limit(1);
			if (found) targetAppointment = found;
		}

		if (!targetAppointment && rawStartsAt) {
			const cancelStart = new Date(rawStartsAt);
			if (!Number.isNaN(cancelStart.getTime())) {
				const [found] = await tx
					.select({
						id: appointments.id,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.startsAt, cancelStart),
							ne(appointments.status, "cancelled"),
						),
					)
					.limit(1);
				if (found) targetAppointment = found;
			}
		}

		if (targetAppointment) {
			await tx
				.update(appointments)
				.set({
					status: "cancelled",
					comment: sql`concat(coalesce(${appointments.comment}, ''), ' [Отменено через ПроДокторов / МедФлекс]')`,
				})
				.where(
					and(
						eq(appointments.id, targetAppointment.id),
						eq(appointments.organizationId, organizationId),
					),
				);

			await tx.insert(externalScheduleActionLogs).values({
				organizationId,
				externalProvider: "prodoctorov_medflex",
				actionType: "booking_cancelled",
				patientName: patientFullName,
				appointmentSlot: `${targetAppointment.startsAt.toISOString()} - ${targetAppointment.endsAt.toISOString()}`,
				status: "success",
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "APPOINTMENT_CANCELLED",
				payload: {
					appointmentId: targetAppointment.id,
					channel: "prodoctorov_medflex",
				},
			});

			return {
				statusCode: 200,
				body: {
					success: true,
					event: "booking_cancelled",
					appointmentId: targetAppointment.id,
					message: "Запись успешно отменена по запросу ПроДокторов / МедФлекс",
				},
			};
		}

		return {
			statusCode: 200,
			body: {
				success: true,
				event: "booking_cancelled",
				message: "Запись для отмены не найдена или уже была отменена ранее",
			},
		};
	}

	// ─── СЦЕНАРИЙ СОЗДАНИЯ БРОНИРОВАНИЯ (BOOKING CREATED) ───────────

	// 1. Идемпотентность: проверка повторного вебхука
	if (bookingId) {
		const [existing] = await tx
			.select({ id: appointments.id })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					ilike(appointments.comment, `%${bookingId}%`),
				),
			)
			.limit(1);

		if (existing) {
			req.log.info(
				{ bookingId, organizationId },
				"ProDoctorov booking already processed (replay skipped)",
			);
			return {
				statusCode: 200,
				body: {
					success: true,
					duplicate: true,
					appointmentId: existing.id,
					message:
						"Бронирование уже зарегистрировано ранее (идемпотентный ответ)",
				},
			};
		}
	}

	// 2. Поиск или создание пациента (с нормализацией номера до 10 цифр)
	let patientId: string | null = null;
	if (patientPhone) {
		const digits = patientPhone.replace(/\D/g, "");
		const suffix = digits.length >= 10 ? digits.slice(-10) : null;
		const phoneCondition = suffix
			? sql`right(regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g'), 10) = ${suffix}`
			: eq(patients.phone, patientPhone);

		const [foundPatient] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					phoneCondition,
				),
			)
			.limit(1);
		if (foundPatient) {
			patientId = foundPatient.id;
		}
	}

	if (!patientId) {
		const [newPatient] = await tx
			.insert(patients)
			.values({
				organizationId,
				fullName: patientFullName,
				phone: patientPhone || null,
				birthDate: patientBirthDate || null,
				email: patientEmail || null,
				status: "active",
				notes: "Первичный пациент из агрегатора ПроДокторов / МедФлекс",
			})
			.returning({ id: patients.id });
		if (!newPatient) {
			throw new Error("Не удалось создать запись пациента в базе данных");
		}
		patientId = newPatient.id;
	}

	// 3. Определение врача (Мандат 8n: поддержка соло-врача)
	let resolvedDoctorId = doctorUserId;
	if (!resolvedDoctorId) {
		const [firstDoc] = await tx
			.select({ id: users.id })
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(users.isActive, true),
					eq(users.role, "doctor"),
				),
			)
			.limit(1);
		if (firstDoc) {
			resolvedDoctorId = firstDoc.id;
		} else {
			const [anyUser] = await tx
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.organizationId, organizationId),
						eq(users.isActive, true),
					),
				)
				.limit(1);
			if (anyUser) {
				resolvedDoctorId = anyUser.id;
			} else {
				return {
					statusCode: 400,
					body: {
						error: "DoctorNotFound",
						message:
							"В клинике не найден ни один активный врач для назначения записи.",
					},
				};
			}
		}
	}

	// 4. Определение кресла (опционально)
	let resolvedChairId = chairId;
	if (!resolvedChairId) {
		const [firstChair] = await tx
			.select({ id: chairs.id })
			.from(chairs)
			.where(
				and(
					eq(chairs.organizationId, organizationId),
					eq(chairs.isActive, true),
				),
			)
			.limit(1);
		if (firstChair) {
			resolvedChairId = firstChair.id;
		}
	}

	// 5. Валидация временных меток
	if (!rawStartsAt) {
		return {
			statusCode: 400,
			body: {
				error: "MissingStartsAt",
				message: "Не указано время начала приема (startsAt).",
			},
		};
	}
	const candidateStarts = new Date(rawStartsAt);
	if (Number.isNaN(candidateStarts.getTime())) {
		return {
			statusCode: 400,
			body: {
				error: "InvalidStartsAt",
				message: "Некорректный формат времени начала приема (startsAt).",
			},
		};
	}

	const candidateEnds = rawEndsAt
		? new Date(rawEndsAt)
		: new Date(candidateStarts.getTime() + durationMinutes * 60 * 1000);

	if (
		Number.isNaN(candidateEnds.getTime()) ||
		candidateEnds <= candidateStarts
	) {
		return {
			statusCode: 400,
			body: {
				error: "InvalidEndsAt",
				message: "Время окончания приема должно быть позже времени начала.",
			},
		};
	}

	// 6. Защита от овербукинга: проверка пересечений у врача
	const [overlappingAppt] = await tx
		.select({ id: appointments.id })
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				eq(appointments.doctorUserId, resolvedDoctorId),
				ne(appointments.status, "cancelled"),
				ne(appointments.status, "no_show"),
				lt(appointments.startsAt, candidateEnds),
				sql`${appointments.endsAt} > ${candidateStarts}`,
			),
		)
		.limit(1);

	if (overlappingAppt) {
		return {
			statusCode: 409,
			body: {
				error: "SlotAlreadyBooked",
				message:
					"Выбранное время у врача уже занято другой записью (защита от овербукинга).",
			},
		};
	}

	// 7. Создание приема (Мандаты 8e & 8n: assistantUserId равен null)
	const fullComment = [
		bookingId ? `[ПроДокторов ID: ${bookingId}]` : "[ПроДокторов]",
		comment,
	]
		.filter(Boolean)
		.join(" ");

	const [createdAppointment] = await tx
		.insert(appointments)
		.values({
			organizationId,
			patientId,
			doctorUserId: resolvedDoctorId,
			assistantUserId: null, // МАНДАТ 8e/8n: без обязательного ассистента!
			chairId: resolvedChairId || null,
			status: "planned",
			startsAt: candidateStarts,
			endsAt: candidateEnds,
			reason: reason || "Запись через ПроДокторов / МедФлекс",
			comment: fullComment,
		})
		.returning();

	if (!createdAppointment) {
		throw new Error("Не удалось создать запись на приём в базе данных");
	}

	// 8. Фиксация в аудит-логе внешних интеграций
	await tx.insert(externalScheduleActionLogs).values({
		organizationId,
		externalProvider: "prodoctorov_medflex",
		actionType: "booking_created",
		patientName: patientFullName,
		appointmentSlot: `${candidateStarts.toISOString()} - ${candidateEnds.toISOString()}`,
		status: "success",
	});

	// 8a. Автоматическая фиксация лида в CRM-конвейере клиники (Мандат 8e/8n)
	try {
		const now = new Date();
		const [createdLead] = await tx
			.insert(crmLeads)
			.values({
				organizationId,
				name: patientFullName,
				patientName: patientFullName,
				phone: patientPhone || null,
				source: "prodoctorov",
				status: "consult_booked",
				notes: `Запись через ПроДокторов / МедФлекс. Приём: ${candidateStarts.toLocaleString("ru-RU")}. ${reason}`,
				assignedDoctorId: resolvedDoctorId,
				priority: "high",
				stageEnteredAt: now,
			})
			.returning();

		if (createdLead) {
			await tx.insert(crmLeadStageHistory).values({
				organizationId,
				leadId: createdLead.id,
				fromStage: null,
				toStage: "consult_booked",
				changedByUserId: null,
				durationSeconds: 0,
				createdAt: now,
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "LEAD_CREATED",
				payload: createdLead,
			});
		}
	} catch (leadErr) {
		req.log.warn(
			{ leadErr },
			"Failed to create CRM lead from ProDoctorov booking",
		);
	}

	// 9. Оповещение через WebSocket в реальном времени
	try {
		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CREATED",
			payload: {
				appointmentId: createdAppointment.id,
				patientId,
				patientName: patientFullName,
				doctorUserId: resolvedDoctorId,
				startsAt: candidateStarts.toISOString(),
				endsAt: candidateEnds.toISOString(),
				channel: "prodoctorov_medflex",
			},
		});
	} catch (wsErr) {
		req.log.warn(
			{ wsErr },
			"Failed to broadcast ProDoctorov appointment via WS",
		);
	}

	return {
		statusCode: 201,
		body: {
			success: true,
			appointmentId: createdAppointment.id,
			patientId,
			doctorUserId: resolvedDoctorId,
			startsAt: candidateStarts.toISOString(),
			endsAt: candidateEnds.toISOString(),
			message: "Запись на приём успешно создана через ПроДокторов / МедФлекс",
		},
	};
}
