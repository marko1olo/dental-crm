import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	communicationEvents,
	communicationTasks,
	patients,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import type {
	BotInboundMessage,
	BotPlugin,
	BotReply,
	OmnichannelBotRuntime,
} from "../types.js";

/**
 * Плагин сервисных напоминаний и подтверждения визитов (Service Reminder Plugin).
 * 1. Обрабатывает подтверждение («✓ Подтверждаю») и перенос («🔄 Перенести приём») в 1 клик.
 * 2. Мгновенно переводит статус в БД `appointments.status = 'confirmed'` / `reschedule_requested`.
 * 3. Рассылает оповещения в веб-интерфейс регистратуры через WebSocket.
 * 4. Обеспечивает генерацию шаблонов напоминаний за 24 часа и за 2 часа до приёма.
 */
export class ServiceReminderPlugin implements BotPlugin {
	readonly name = "service_reminders";
	readonly description = "Сервисные напоминания за 24ч и за 2ч с подтверждением и переносом в 1 клик";

	canHandle(msg: BotInboundMessage): boolean {
		const payload = msg.payload?.toLowerCase().trim() || "";
		const text = msg.text.toLowerCase().trim();

		if (
			payload.startsWith("confirm_visit:") ||
			payload.startsWith("reschedule_visit:") ||
			payload.startsWith("reminder:confirm:") ||
			payload.startsWith("reminder:reschedule:")
		) {
			return true;
		}

		if (
			text === "да" ||
			text === "буду" ||
			text === "подтверждаю" ||
			text.includes("подтверждаю") ||
			text.includes("буду") ||
			text === "да, буду" ||
			text === "1"
		) {
			return true;
		}

		if (
			text === "перенести" ||
			text.includes("перенести") ||
			text.includes("перенос") ||
			text === "не смогу" ||
			text === "отмена" ||
			text === "2"
		) {
			return true;
		}

		return false;
	}

	async handle(
		msg: BotInboundMessage,
		botRuntime: OmnichannelBotRuntime,
	): Promise<BotReply | null> {
		const orgId = msg.organizationId;
		const payload = msg.payload || "";
		const text = msg.text.toLowerCase().trim();

		return await withTenantCtx(orgId, async (tx) => {
			let appointmentId: string | null = null;
			let isConfirm = false;
			let isReschedule = false;

			if (payload.startsWith("confirm_visit:")) {
				appointmentId = payload.slice("confirm_visit:".length).trim();
				isConfirm = true;
			} else if (payload.startsWith("reschedule_visit:")) {
				appointmentId = payload.slice("reschedule_visit:".length).trim();
				isReschedule = true;
			} else if (["да", "буду", "подтверждаю", "да, буду", "1"].includes(text)) {
				isConfirm = true;
			} else if (["перенести", "не смогу", "отмена", "2"].includes(text)) {
				isReschedule = true;
			}

			// Если конкретный ID не передан в payload, ищем ближайшую запись пациента
			if (!appointmentId) {
				const phoneDigits = msg.senderId.replace(/\D/g, "");
				const phoneSearch = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";

				const recentApps = await tx
					.select({
						id: appointments.id,
						status: appointments.status,
						startsAt: appointments.startsAt,
					})
					.from(appointments)
					.innerJoin(patients, eq(appointments.patientId, patients.id))
					.where(
						and(
							eq(appointments.organizationId, orgId),
							phoneSearch ? eq(patients.phone, `+${phoneDigits}`) : undefined,
						),
					)
					.orderBy(appointments.startsAt)
					.limit(1);

				if (recentApps.length > 0) {
					appointmentId = recentApps[0]!.id;
				}
			}

			if (!appointmentId) {
				return {
					text: "ℹ️ Не найдено активных записей на приём для вашего номера телефона. Если вы хотите записаться к врачу, нажмите кнопку ниже:",
					keyboard: {
						inline: true,
						buttons: [
							[{ text: "📅 Записаться на приём", callbackData: "booking:start" }],
							[{ text: "📞 Позвонить администратору", callbackData: "triage:human_request" }],
						],
					},
					actionExecuted: "no_active_appointment_found",
				};
			}

			// Получаем детали записи
			const [existingApp] = await tx
				.select({
					id: appointments.id,
					startsAt: appointments.startsAt,
					patientId: appointments.patientId,
					patientName: patients.fullName,
					doctorName: users.fullName,
				})
				.from(appointments)
				.leftJoin(patients, eq(appointments.patientId, patients.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(
					and(
						eq(appointments.id, appointmentId),
						eq(appointments.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existingApp) {
				return {
					text: "⚠️ Запись на приём не найдена или уже была отменена.",
					actionExecuted: "appointment_not_found",
				};
			}

			const formattedTime = existingApp.startsAt
				? new Date(existingApp.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
				: "назначенное время";
			const formattedDate = existingApp.startsAt
				? new Date(existingApp.startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
				: "сегодня";

			if (isConfirm) {
				// 1. Обновляем статус в БД на 'confirmed'
				await tx
					.update(appointments)
					.set({
						status: "confirmed",
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);

				// 2. Логируем событие коммуникации
				if (existingApp.patientId) {
					await tx.insert(communicationEvents).values({
						organizationId: orgId,
						patientId: existingApp.patientId,
						channel: msg.channel === "max" ? "max" : msg.channel,
						direction: "inbound",
						status: "delivered",
						message: `[Бот ${msg.channel.toUpperCase()}] Пациент подтвердил визит на ${formattedDate} в ${formattedTime}.`,
					});
				}

				// 3. Рассылаем WebSocket событие для UI регистратуры
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_CONFIRMED",
					payload: {
						appointmentId,
						patientName: existingApp.patientName,
						confirmedAt: new Date().toISOString(),
						channel: msg.channel,
					},
				});

				return {
					text: [
						"✅ <b>Отлично! Ваш приём подтверждён.</b>",
						"",
						`📅 <b>Дата:</b> ${formattedDate}`,
						`⏰ <b>Время:</b> ${formattedTime}`,
						`👨‍⚕️ <b>Врач:</b> ${existingApp.doctorName || "Ваш лечащий врач"}`,
						"",
						"Кабинет и стерильный инструментарий зарезервированы. Ждём вас в клинике за 5–10 минут до начала визита!",
					].join("\n"),
					keyboard: {
						inline: true,
						buttons: [
							[{ text: "🗺️ Как добраться (Маршрут)", callbackData: "clinic:location" }],
							[{ text: "🔄 Изменились планы (Перенести)", callbackData: `reschedule_visit:${appointmentId}` }],
						],
					},
					actionExecuted: "appointment_confirmed",
					metadata: { appointmentId, status: "confirmed" },
				};
			}

			if (isReschedule) {
				// 1. Помечаем статус 'cancelled' с комментарием о переносе
				await tx
					.update(appointments)
					.set({
						status: "cancelled",
						comment: "Запрошен перенос визита через бот",
					})
					.where(
						and(
							eq(appointments.id, appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);

				// 2. Ставим задачу администратору
				if (existingApp.patientId) {
					await tx.insert(communicationTasks).values({
						organizationId: orgId,
						patientId: existingApp.patientId,
						appointmentId,
						assignedRole: "receptionist",
						channel: msg.channel === "max" ? "max" : msg.channel,
						intent: "appointment_confirmation",
						status: "needs_call",
						priority: "urgent",
						dueAt: new Date(Date.now() + 15 * 60 * 1000), // В течение 15 минут
						title: `[Перенос визита] ${existingApp.patientName || "Пациент"} просит перенести приём с ${formattedDate} ${formattedTime}`,
						body: `Пациент нажал кнопку переноса визита в боте ${msg.channel.toUpperCase()}. Срочно связаться и подобрать новое время.`,
					});
				}

				// 3. WebSocket оповещение
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_RESCHEDULE_REQUESTED",
					payload: {
						appointmentId,
						patientName: existingApp.patientName,
						requestedAt: new Date().toISOString(),
						channel: msg.channel,
					},
				});

				return {
					text: [
						"🔄 <b>Запрос на перенос визита принят!</b>",
						"",
						`Мы освободили ваше окно на ${formattedDate} в ${formattedTime}.`,
						"Администратор клиники уже получил уведомление и свяжется с вами в течение 10–15 минут для подбора удобной даты.",
						"",
						"Либо вы можете сразу выбрать свободный слот самостоятельно нажатием на кнопку ниже:",
					].join("\n"),
					keyboard: {
						inline: true,
						buttons: [
							[{ text: "📅 Выбрать новую дату и время", callbackData: "booking:start" }],
							[{ text: "📞 Позвонить в клинику прямо сейчас", callbackData: "triage:human_request" }],
						],
					},
					actionExecuted: "appointment_rescheduled",
					metadata: { appointmentId, status: "rescheduled" },
				};
			}

			return null;
		});
	}

	/**
	 * Фабрика шаблонов напоминания для отправки в каналы мессенджеров.
	 */
	static createReminderPayload(params: {
		appointmentId: string;
		patientName: string;
		dateFormatted: string;
		timeFormatted: string;
		doctorName: string;
		leadHours: 24 | 2;
	}): { text: string; buttons: { text: string; callbackData: string }[][] } {
		const hourPrefix = params.leadHours === 24 ? "завтра" : "сегодня через 2 часа";
		return {
			text: [
				`👋 Здравствуйте, <b>${params.patientName}</b>!`,
				"",
				`Напоминаем, что вы записаны на стоматологический приём ${hourPrefix}:`,
				`📅 <b>Дата:</b> ${params.dateFormatted}`,
				`⏰ <b>Время:</b> ${params.timeFormatted}`,
				`👨‍⚕️ <b>Врач:</b> ${params.doctorName}`,
				"",
				"Пожалуйста, подтвердите ваш визит нажатием кнопки ниже, чтобы доктор зарезервировал время кабинета:",
			].join("\n"),
			buttons: [
				[
					{
						text: "✓ Подтверждаю визит",
						callbackData: `confirm_visit:${params.appointmentId}`,
					},
					{
						text: "🔄 Перенести приём",
						callbackData: `reschedule_visit:${params.appointmentId}`,
					},
				],
			],
		};
	}
}
