import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { clinics, users } from "../../../db/schema.js";
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
					const rawPhone = msg.senderId.replace(/\D/g, "");
					const senderPhone = rawPhone.length >= 10 ? `+${rawPhone}` : "+79990000000";

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
						patientPhone: senderPhone,
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

					// Оповещаем ресепшен через WebSocket
					wsBroker.broadcastToOrganization(orgId, {
						type: "APPOINTMENT_CREATED",
						payload: {
							appointmentId: appointment.id,
							patientId: appointment.patientId,
							startTime: startDateTime.toISOString(),
							source: `bot_${msg.channel}`,
						},
					});

					const formattedDate = startDateTime.toLocaleDateString("ru-RU", {
						day: "numeric",
						month: "long",
						year: "numeric",
					});

					return {
						text: [
							"🎉 <b>Вы успешно записаны на приём!</b>",
							"",
							`📅 <b>Дата:</b> ${formattedDate}`,
							`⏰ <b>Время:</b> ${timeStr}`,
							"🏥 <b>Статус:</b> Подтверждено в расписании клиники",
							"",
							"За 24 часа и за 2 часа до визита мы пришлём вам напоминание с возможностью подтверждения в 1 клик.",
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

			// 2. Шаг: выбор даты и свободных слотов
			const targetDate = new Date();
			targetDate.setDate(targetDate.getDate() + 1); // Предлагаем завтрашний день по умолчанию
			const dateIso = targetDate.toISOString().slice(0, 10);

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
						`На завтра (${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}) свободных окон у врача <b>${doctorName}</b> не осталось.`,
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
