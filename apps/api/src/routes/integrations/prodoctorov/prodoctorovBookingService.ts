/**
 * routes/integrations/prodoctorov/prodoctorovBookingService.ts
 * Layer 2: Сервис обработки бронирований ПроДокторов / МедФлекс (создание, перенос, отмена, CRM-лиды).
 * Использует канонический транзакционный шлюз executeBookingTransaction с каскадной блокировкой ресурсов.
 */

import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { TenantDb } from "../../../db/rls.js";
import {
	appointments,
	crmLeadStageHistory,
	crmLeads,
	externalScheduleActionLogs,
	medflexDoctorMappings,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeBookingTransaction } from "../../publicBooking/bookingMutationService.js";
import {
	isWebhookDeliveryProcessed,
	recordMedflexWebhookLog,
} from "./medflexIntegrationService.js";
import type { BookingResponseData, WebhookPayload } from "./types.js";

export async function processProdoctorovBookingWebhook(
	tx: TenantDb,
	req: FastifyRequest,
	payload: WebhookPayload,
	organizationId: string,
	options?: {
		autoConfirmBookings?: boolean;
		defaultChairId?: string | null;
	},
): Promise<BookingResponseData> {
	const bookingId = payload.bookingId || payload.deliveryId || payload.delivery_id || "";
	const deliveryId =
		payload.deliveryId ||
		payload.delivery_id ||
		payload.bookingId ||
		payload.booking_id ||
		bookingId ||
		`gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

	const patientFullName =
		payload.patient?.fullName ||
		payload.patient?.full_name ||
		payload.patient?.name ||
		payload.patientName ||
		payload.patient_name ||
		"Пациент с ПроДокторов";
	const patientPhone =
		payload.patient?.phone ||
		payload.patientPhone ||
		payload.patient_phone ||
		null;
	const doctorUserId =
		payload.appointment?.doctorId ||
		payload.appointment?.doctor_id ||
		payload.appointment?.doctorUserId ||
		payload.appointment?.doctor_user_id ||
		payload.doctorId ||
		payload.doctor_id ||
		payload.doctorUserId ||
		payload.doctor_user_id ||
		null;
	const rawStartsAt =
		payload.appointment?.startsAt ||
		payload.appointment?.starts_at ||
		payload.startsAt ||
		payload.starts_at ||
		null;
	const rawEndsAt =
		payload.appointment?.endsAt ||
		payload.appointment?.ends_at ||
		payload.endsAt ||
		payload.ends_at ||
		null;
	const durationMinutes =
		payload.appointment?.durationMinutes ||
		payload.appointment?.duration_minutes ||
		payload.durationMinutes ||
		payload.duration_minutes ||
		30;
	const reason =
		payload.appointment?.reason ||
		payload.reason ||
		"Запись через ПроДокторов / МедФлекс";
	const comment =
		payload.appointment?.comment || payload.comment || "";

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
						or(
							ilike(appointments.comment, `%[ПроДокторов ID: ${bookingId}]%`),
							ilike(appointments.comment, `%[MedFlex ID: ${bookingId}]%`),
							ilike(appointments.comment, `%ID: ${bookingId}]%`),
						),
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

			await recordMedflexWebhookLog(
				tx,
				organizationId,
				"booking_cancelled",
				deliveryId,
				payload,
				"processed",
			);

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

		await recordMedflexWebhookLog(
			tx,
			organizationId,
			"booking_cancelled",
			deliveryId,
			payload,
			"ignored",
			"Запись для отмены не найдена",
		);

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

	// 1. Идемпотентность: проверка повторного вебхука по deliveryId в medflexWebhookLogs
	if (deliveryId) {
		const alreadyProcessed = await isWebhookDeliveryProcessed(
			tx,
			organizationId,
			deliveryId,
		);
		if (alreadyProcessed) {
			req.log.info(
				{ deliveryId, organizationId },
				"MedFlex webhook delivery already processed (idempotent replay skipped)",
			);
			return {
				statusCode: 200,
				body: {
					success: true,
					duplicate: true,
					deliveryId,
					message:
						"Бронирование уже зарегистрировано ранее (идемпотентный ответ)",
				},
			};
		}
	}

	// Дополнительная проверка по ID бронирования в комментариях визитов
	if (bookingId) {
		const [existing] = await tx
			.select({ id: appointments.id })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					or(
						ilike(appointments.comment, `%[ПроДокторов ID: ${bookingId}]%`),
						ilike(appointments.comment, `%[MedFlex ID: ${bookingId}]%`),
						ilike(appointments.comment, `%ID: ${bookingId}]%`),
					),
				),
			)
			.limit(1);

		if (existing) {
			req.log.info(
				{ bookingId, organizationId },
				"ProDoctorov booking already processed in appointments (replay skipped)",
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

	// 2. Определение врача (с учетом medflexDoctorMappings и Мандата 8n: поддержка соло-врача)
	let resolvedDoctorId: string | null = null;
	if (doctorUserId) {
		// Проверяем, не является ли переданный ID внешним идентификатором МедФлекс
		const [mapping] = await tx
			.select({ staffId: medflexDoctorMappings.staffId })
			.from(medflexDoctorMappings)
			.where(
				and(
					eq(medflexDoctorMappings.organizationId, organizationId),
					eq(medflexDoctorMappings.externalDoctorId, doctorUserId),
					eq(medflexDoctorMappings.isSyncEnabled, true),
				),
			)
			.limit(1);

		if (mapping) {
			resolvedDoctorId = mapping.staffId;
		} else {
			// Проверяем существование пользователя по внутреннему ID
			const [existingUser] = await tx
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.organizationId, organizationId),
						eq(users.id, doctorUserId),
						eq(users.isActive, true),
					),
				)
				.limit(1);
			if (existingUser) {
				resolvedDoctorId = existingUser.id;
			}
		}
	}

	// Fallback для соло-врача / практики из 1-2 кресел (Мандат 8n)
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
				await recordMedflexWebhookLog(
					tx,
					organizationId,
					"booking_created",
					deliveryId,
					payload,
					"error",
					"DoctorNotFound",
				);
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

	// 3. Валидация временных меток
	if (!rawStartsAt) {
		await recordMedflexWebhookLog(
			tx,
			organizationId,
			"booking_created",
			deliveryId,
			payload,
			"error",
			"MissingStartsAt",
		);
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
		await recordMedflexWebhookLog(
			tx,
			organizationId,
			"booking_created",
			deliveryId,
			payload,
			"error",
			"InvalidStartsAt",
		);
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
		await recordMedflexWebhookLog(
			tx,
			organizationId,
			"booking_created",
			deliveryId,
			payload,
			"error",
			"InvalidEndsAt",
		);
		return {
			statusCode: 400,
			body: {
				error: "InvalidEndsAt",
				message: "Время окончания приема должно быть позже времени начала.",
			},
		};
	}

	// 4. Вызов атомарного шлюза executeBookingTransaction с блокировкой ресурсов FOR UPDATE (Мандаты 8d, 8e)
	const bookingComment = [
		bookingId ? `[ПроДокторов ID: ${bookingId}]` : "[ПроДокторов / МедФлекс]",
		reason,
		comment,
	]
		.filter(Boolean)
		.join(" ");

	const isAutoConfirm = options?.autoConfirmBookings !== false;

	const bookingResult = await executeBookingTransaction(tx, {
		organizationId,
		doctorId: resolvedDoctorId,
		startDate: candidateStarts,
		endDate: candidateEnds,
		patientName: patientFullName,
		patientPhone: patientPhone || "+79000000000",
		comment: bookingComment,
		source: "prodoctorov_medflex",
		status: isAutoConfirm ? "confirmed" : "planned",
		idempotencyKey: deliveryId || bookingId || undefined,
	});

	// Обработка конфликта овербукинга
	if (bookingResult.conflict) {
		await recordMedflexWebhookLog(
			tx,
			organizationId,
			"booking_created",
			deliveryId,
			payload,
			"conflict",
			"SlotAlreadyBooked",
		);
		return {
			statusCode: 409,
			body: {
				error: "SlotAlreadyBooked",
				message:
					"Выбранное время у врача уже занято другой записью (защита от овербукинга).",
			},
		};
	}

	// Обработка блокировки (черный список / архив)
	if (bookingResult.blocked) {
		await recordMedflexWebhookLog(
			tx,
			organizationId,
			"booking_created",
			deliveryId,
			payload,
			"ignored",
			bookingResult.message,
		);
		return {
			statusCode: bookingResult.status,
			body: {
				error: bookingResult.error,
				message: bookingResult.message,
			},
		};
	}

	const createdAppointment = bookingResult.appointment;
	const resolvedPatientId = bookingResult.patientId;

	// 5. Успешная фиксация в medflex_webhook_logs и аудит-логе
	await recordMedflexWebhookLog(
		tx,
		organizationId,
		"booking_created",
		deliveryId,
		payload,
		"processed",
	);

	await tx.insert(externalScheduleActionLogs).values({
		organizationId,
		externalProvider: "prodoctorov_medflex",
		actionType: "booking_created",
		patientName: patientFullName,
		appointmentSlot: `${candidateStarts.toISOString()} - ${candidateEnds.toISOString()}`,
		status: "success",
	});

	// 6. Автоматическая фиксация лида в CRM-конвейере клиники (Мандат 8e/8n)
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

	// 7. Оповещение через WebSocket в реальном времени
	try {
		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CREATED",
			payload: {
				appointmentId: createdAppointment.id,
				patientId: resolvedPatientId,
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
			patientId: resolvedPatientId,
			doctorUserId: resolvedDoctorId,
			startsAt: candidateStarts.toISOString(),
			endsAt: candidateEnds.toISOString(),
			message: "Запись на приём успешно создана через ПроДокторов / МедФлекс",
		},
	};
}
