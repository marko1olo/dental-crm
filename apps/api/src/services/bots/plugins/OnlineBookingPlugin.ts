import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { tomorrowDateKeyInTimeZone } from "@dental/shared";
import { onTenantTxCommit, withTenantCtx } from "../../../db/rls.js";
import {
	clinics,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
	users,
} from "../../../db/schema.js";
import { hashTelegramChatFingerprint } from "../../../utils/telegramChatHash.js";
import { wsBroker } from "../../websocketBroker.js";
import { calculateAvailableSlots } from "../../../routes/publicBooking/bookingModules/publicBookingSlotEngine.js";
import { DEFAULT_TIMEZONE } from "../../../routes/publicBooking/bookingModules/publicBookingSchemas.js";
import { localWallTimeToUtc } from "../../../routes/publicBooking/slotAvailabilityEngine.js";
import { executeBookingTransaction } from "../../../routes/publicBooking/bookingMutationService.js";
import type {
	BotInboundMessage,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "../types.js";

/**
 * Плагин круглосуточной онлайн-записи пациентов (24/7 Booking Plugin).
 * Позволяет пациенту прямо в чате Telegram/VK/WhatsApp/Max:
 * 1. Узнать свободные окна и расписание клиники.
 * 2. Выбрать доктора, дату и время.
 * 3. Оформить бронь с мгновенной фиксацией в PostgreSQL расписании CRM.
 * 4. Полная мультитенантная изоляция через withTenantCtx и where eq(organizationId).
 */
export class OnlineBookingPlugin implements BotPlugin {
	readonly name = "online_booking";
	readonly description = "Круглосуточная запись на приём к врачу с проверкой свободных слотов";

	canHandle(msg: BotInboundMessage): boolean {
		const text = msg.text.toLowerCase().trim();
		const payload = msg.payload?.toLowerCase().trim() || "";

		if (payload.startsWith("booking:")) return true;
		if (text === "/book" || text === "/запись" || text === "запись") return true;

		const keywords = [
			"записаться",
			"запись на прием",
			"свободное время",
			"свободные слоты",
			"окно на прием",
			"хочу к врачу",
			"запишите меня",
			"прием стоматолога",
		];
		return keywords.some((kw) => text.includes(kw));
	}

	async handle(
		msg: BotInboundMessage,
		botRuntime: OmnichannelBotRuntime,
	): Promise<BotReply | null> {
		const orgId = msg.organizationId;
		const payload = msg.payload || "";

		return await withTenantCtx(orgId, async (tx) => {
			// Resolve clinic timezone
			const [clinicRow] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, orgId))
				.limit(1);
			const clinicTimeZone = clinicRow?.timezone || DEFAULT_TIMEZONE;

			// 1. Шаг: подтверждение слота (booking:confirm:DATE:TIME:DOCTOR_ID)
			if (payload.startsWith("booking:confirm:")) {
				const parts = payload.split(":");
				let dateStr = "";
				let timeStr = "";
				let doctorId: string | null = null;

				if (parts.length >= 6) {
					dateStr = parts[2] || "";
					timeStr = `${parts[3]}:${parts[4]}`;
					doctorId = parts[5] || null;
				} else if (parts.length === 5) {
					dateStr = parts[2] || "";
					timeStr = parts[3] || "";
					doctorId = parts[4] || null;
				}

				if (doctorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId)) {
					doctorId = null;
				}

				if (dateStr && timeStr) {
					const [hStr, mStr] = timeStr.split(":");
					const hour = Number.parseInt(hStr || "0", 10);
					const min = Number.parseInt(mStr || "0", 10);
					const minuteOfDay = hour * 60 + min;
					const startDateTime = localWallTimeToUtc(dateStr, minuteOfDay, clinicTimeZone);
					const endDateTime = localWallTimeToUtc(dateStr, minuteOfDay + 60, clinicTimeZone);

					const senderLabel = msg.senderName || `Пациент ${msg.channel.toUpperCase()}`;
					const rawSender = msg.senderId.trim();
					const rawPhone = rawSender.replace(/\D/g, "");
					const senderPhone = rawPhone.length >= 10 ? `+${rawPhone}` : "";

					// Ищем уже привязанную карту пациента по каналу (не склеиваем разных людей на синтетический телефон!)
					let linkedPatientId: string | undefined;
					let linkedPatientPhone = senderPhone;
					if (!senderPhone && rawSender) {
						if (msg.channel === "telegram") {
							const fp = hashTelegramChatFingerprint(rawSender);
							const [tgLink] = await tx
								.select({ subjectId: denteTelegramChatLinks.subjectId })
								.from(denteTelegramChatLinks)
								.where(
									and(
										eq(denteTelegramChatLinks.organizationId, orgId),
										eq(denteTelegramChatLinks.subjectType, "patient"),
										eq(denteTelegramChatLinks.status, "active"),
										or(
											eq(denteTelegramChatLinks.chatTransportRef, rawSender),
											eq(denteTelegramChatLinks.chatFingerprint, fp),
										),
									),
								)
								.limit(1);
							linkedPatientId = tgLink?.subjectId;
						}
						if (!linkedPatientId) {
							const [inboundLink] = await tx
								.select({ patientId: messengerInboundEvents.patientId })
								.from(messengerInboundEvents)
								.where(
									and(
										eq(messengerInboundEvents.organizationId, orgId),
										eq(messengerInboundEvents.channel, msg.channel),
										eq(messengerInboundEvents.externalChatId, rawSender),
										isNotNull(messengerInboundEvents.patientId),
									),
								)
								.orderBy(desc(messengerInboundEvents.createdAt))
								.limit(1);
							linkedPatientId = inboundLink?.patientId ?? undefined;
						}
						if (linkedPatientId) {
							const [pRow] = await tx
								.select({ phone: patients.phone })
								.from(patients)
								.where(
									and(
										eq(patients.id, linkedPatientId),
										eq(patients.organizationId, orgId),
									),
								)
								.limit(1);
							if (pRow?.phone) {
								linkedPatientPhone = pRow.phone;
							}
						}
					}

					// If doctorId is not provided, pick first active doctor
					let targetDoctorId = doctorId;
					if (!targetDoctorId) {
						const [firstDoctor] = await tx
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
						targetDoctorId = firstDoctor?.id || null;
					}

					if (!targetDoctorId) {
						return {
							text: "⚠️ В клинике нет доступных врачей для записи. Обратитесь к администратору.",
							actionExecuted: "booking_failed_no_doctor",
						};
					}

					// Каноническая транзакция с иерархией блокировок (Кресло -> Врач -> Пациент)
					const bookingResult = await executeBookingTransaction(tx, {
						organizationId: orgId,
						doctorId: targetDoctorId,
						startDate: startDateTime,
						endDate: endDateTime,
						patientName: senderLabel,
						patientPhone: linkedPatientPhone,
						...(linkedPatientId ? { patientId: linkedPatientId } : {}),
						comment: `Онлайн-запись через ${msg.channel.toUpperCase()} бот. Контакт: ${msg.senderId}`,
						source: `bot_${msg.channel}`,
					});

					if (bookingResult.conflict) {
						return {
							text: [
								"⚠️ <b>Выбранное время только что заняли</b>",
								"",
								`К сожалению, время ${timeStr} на ${dateStr} уже занято другим пациентом.`,
								"Пожалуйста, выберите другое свободное окно:",
							].join("\n"),
							keyboard: {
								inline: true,
								buttons: [
									[{ text: "🔄 Обновить свободные окна", callbackData: "booking:start" }],
									[{ text: "📞 Связаться с администратором", callbackData: "triage:human_request" }],
								],
							},
							actionExecuted: "booking_conflict",
						};
					}

					if ("blocked" in bookingResult && bookingResult.blocked) {
						return {
							text: `⚠️ ${bookingResult.message}`,
							actionExecuted: "booking_blocked",
						};
					}

					const appointment = bookingResult.appointment;

					// Оповещаем ресепшен через WebSocket строго после COMMIT транзакции
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(orgId, {
							type: "APPOINTMENT_CREATED",
							payload: {
								appointmentId: appointment.id,
								patientId: appointment.patientId,
								startTime: startDateTime.toISOString(),
								source: `bot_${msg.channel}`,
							},
						});
					});

					const formattedDate = startDateTime.toLocaleDateString("ru-RU", {
						day: "numeric",
						month: "long",
						year: "numeric",
						timeZone: clinicTimeZone,
					});

					return {
						text: [
							"🎉 <b>Вы успешно записаны на приём!</b>",
							"",
							`📅 <b>Дата:</b> ${formattedDate}`,
							`⏰ <b>Время:</b> ${timeStr}`,
							"🏥 <b>Статус:</b> Подтверждено в расписании клиники",
							"",
							"За 24 часа и за 2 часа до визита мы пришлём вам напоминание с быстрым подтверждением.",
							"Если у вас изменятся планы, вы сможете легко перенести визит через этот чат.",
						].join("\n"),
						keyboard: {
							inline: true,
							buttons: [
								[
									{
										text: "📋 Мои записи",
										callbackData: "booking:my_appointments",
									},
									{
										text: "📞 Связаться с клиникой",
										callbackData: "triage:human_request",
									},
								],
							],
						},
						actionExecuted: "appointment_booked",
						metadata: { appointmentId: appointment.id, dateStr, timeStr },
					};
				}
			}

			// 2. Шаг: выбор даты и свободных слотов строго в часовом поясе клиники
			const dateIso = tomorrowDateKeyInTimeZone(clinicTimeZone);
			const targetDate = localWallTimeToUtc(dateIso, 12 * 60, clinicTimeZone);

			// Читаем врачей клиники
			const activeDoctors = await tx
				.select({ id: users.id, fullName: users.fullName, specialties: users.specialties })
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
						eq(users.role, "doctor"),
					),
				)
				.limit(3);

			const doctorId = activeDoctors[0]?.id || null;
			const doctorName = activeDoctors[0]?.fullName || "Дежурный стоматолог";

			// Рассчитываем реальные доступные слоты через канонический calculateAvailableSlots
			const slotsResult = await calculateAvailableSlots(tx, {
				organizationId: orgId,
				date: dateIso,
				requestedDoctorId: doctorId || undefined,
			});

			const availableSlots = slotsResult.success ? slotsResult.slots : [];

			if (availableSlots.length === 0) {
				return {
					text: [
						"📅 <b>Онлайн-запись на приём к врачу</b>",
						"",
						`На завтра (${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: clinicTimeZone })}) свободных окон у врача <b>${doctorName}</b> не осталось.`,
						"",
						"Вы можете выбрать другую дату или обратиться к администратору:",
					].join("\n"),
					keyboard: {
						inline: true,
						buttons: [
							[{ text: "🗓️ Выбрать другую дату", callbackData: "booking:choose_date" }],
							[{ text: "💬 Задать вопрос администратору", callbackData: "triage:human_request" }],
						],
					},
					actionExecuted: "booking_slots_presented",
				};
			}

			const buttons = availableSlots.slice(0, 6).map((slot) => [
				{
					text: `🕒 ${slot.time} — ${doctorName}`,
					callbackData: `booking:confirm:${dateIso}:${slot.time}:${doctorId || ""}`,
				},
			]);

			buttons.push([
				{ text: "🗓️ Выбрать другую дату", callbackData: "booking:choose_date" },
				{ text: "💬 Задать вопрос администратору", callbackData: "triage:human_request" },
			]);

			return {
				text: [
					"📅 <b>Онлайн-запись на приём к врачу</b>",
					"",
					`Ближайшие свободные окна на завтра (${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}):`,
					`👨‍⚕️ <b>Врач:</b> ${doctorName}`,
					"",
					"Выберите удобное время для визита нажатием на кнопку:",
				].join("\n"),
				keyboard: {
					inline: true,
					buttons,
				},
				actionExecuted: "booking_slots_presented",
			};
		});
	}
}
