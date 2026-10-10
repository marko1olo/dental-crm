import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	communicationEvents,
	crmLeads,
	messengerInboundEvents,
	patients,
	users,
} from "../../db/schema.js";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotChannel } from "../../services/bots/types.js";
import type { ChatMessageItem, InboxConversation } from "./types.js";

/**
 * Получение списка активных диалогов во всех мессенджерах (Telegram, VK, WhatsApp, MAX).
 */
export async function fetchInboxConversations(orgId: string): Promise<{ conversations: InboxConversation[] }> {
	// 1. Получаем входящие события мессенджеров за последнее время
	const inboundEvents = await db
		.select()
		.from(messengerInboundEvents)
		.where(eq(messengerInboundEvents.organizationId, orgId))
		.orderBy(desc(messengerInboundEvents.createdAt))
		.limit(200);

	// 2. Получаем исходящие события коммуникаций
	const outboundEvents = await db
		.select()
		.from(communicationEvents)
		.where(
			and(
				eq(communicationEvents.organizationId, orgId),
				inArray(communicationEvents.channel, ["telegram", "vk", "whatsapp", "max"]),
			),
		)
		.orderBy(desc(communicationEvents.createdAt))
		.limit(200);

	// 3. Получаем список пациентов клиники с привязками к чатам
	const clinicPatients = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			notes: patients.notes,
		})
		.from(patients)
		.where(eq(patients.organizationId, orgId))
		.limit(300);

	const patientMap = new Map<string, (typeof clinicPatients)[0]>();
	for (const p of clinicPatients) {
		patientMap.set(p.id, p);
	}

	// 4. Получаем список лидов клиники
	const leads = await db
		.select({
			id: crmLeads.id,
			name: crmLeads.name,
			patientName: crmLeads.patientName,
			phone: crmLeads.phone,
			source: crmLeads.source,
			status: crmLeads.status,
			notes: crmLeads.notes,
		})
		.from(crmLeads)
		.where(eq(crmLeads.organizationId, orgId))
		.limit(300);

	// Агрегируем диалоги по ключу: `${channel}:${senderId}`
	const convMap = new Map<string, InboxConversation>();

	for (const evt of inboundEvents) {
		const channel = (evt.channel as BotChannel) || "telegram";
		const senderId = evt.externalChatId;
		const key = `${channel}:${senderId}`;

		// Ищем пациента
		const rawPayload = (evt.rawPayload as Record<string, any>) || {};
		const rawSourceType = rawPayload.sourceType || rawPayload.sourceKind || rawPayload.provider;
		let sourceBadge = "TG Бот";
		let sourceType = "tg_bot";

		if (channel === "telegram") {
			if (rawSourceType === "account" || rawSourceType === "tg_account" || rawPayload.isPersonal) {
				sourceBadge = "TG Аккаунт";
				sourceType = "tg_account";
			} else {
				sourceBadge = "TG Бот";
				sourceType = "tg_bot";
			}
		} else if (channel === "vk") {
			if (rawSourceType === "account" || rawSourceType === "vk_account" || rawPayload.isPersonal) {
				sourceBadge = "VK Аккаунт";
				sourceType = "vk_account";
			} else {
				sourceBadge = "VK Группа";
				sourceType = "vk_group";
			}
		} else if (channel === "whatsapp") {
			if (rawSourceType === "cloud_api" || rawSourceType === "waba" || rawSourceType === "wa_waba") {
				sourceBadge = "WA WABA";
				sourceType = "wa_waba";
			} else {
				sourceBadge = "WA Телефон";
				sourceType = "wa_phone";
			}
		} else if (channel === "max") {
			sourceBadge = "MAX";
			sourceType = "max_bot";
		}

		const senderName =
			rawPayload.user_name ||
			[rawPayload.from?.first_name, rawPayload.from?.last_name].filter(Boolean).join(" ") ||
			rawPayload.senderData?.senderName ||
			null;

		let matchedPatient = evt.patientId ? patientMap.get(evt.patientId) : undefined;
		if (!matchedPatient) {
			matchedPatient = clinicPatients.find(
				(p) =>
					(p.notes && p.notes.includes(`${channel}:${senderId}`)) ||
					(p.phone && senderId.includes(p.phone.replace(/\D/g, "").slice(-10))),
			);
		}

		// Ищем лид
		const matchedLead = leads.find(
			(l) =>
				(l.notes && l.notes.includes(`${channel}:${senderId}`)) ||
				(l.phone && senderId.includes(l.phone.replace(/\D/g, "").slice(-10))),
		);

		const interceptInfo = omnichannelBotEngine.getChatInterceptInfo(channel, orgId, senderId);

		if (!convMap.has(key)) {
			convMap.set(key, {
				key,
				channel,
				senderId,
				senderName: senderName || matchedPatient?.fullName || `${channel.toUpperCase()} Пациент`,
				patientId: matchedPatient?.id || null,
				patientName: matchedPatient?.fullName || senderName || `${channel.toUpperCase()} Пациент`,
				phone: matchedPatient?.phone || matchedLead?.phone || null,
				lastMessage: evt.messageText || "[Сообщение]",
				lastMessageAt: (evt.createdAt || new Date()).toISOString(),
				lastMessageDirection: "inbound",
				unreadCount: 1,
				isIntercepted: interceptInfo.isIntercepted,
				interceptedBy: interceptInfo.interceptedBy,
				leadId: matchedLead?.id || null,
				leadStatus: matchedLead?.status || null,
				sourceBadge,
				sourceType,
			});
		} else {
			const current = convMap.get(key)!;
			current.unreadCount++;
			if (new Date(evt.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
				current.lastMessage = evt.messageText || "[Сообщение]";
				current.lastMessageAt = evt.createdAt.toISOString();
				current.lastMessageDirection = "inbound";
			}
		}
	}

	// Учитываем также исходящие сообщения в последнем сообщении
	for (const out of outboundEvents) {
		const channel = out.channel as BotChannel;
		const p = patientMap.get(out.patientId);
		if (!p) continue;

		const match = p.notes?.match(new RegExp(`${channel}:([a-zA-Z0-9_-]+)`));
		const senderId = match ? match[1] : p.phone ? p.phone.replace(/\D/g, "") : null;
		if (!senderId) continue;

		const key = `${channel}:${senderId}`;
		const interceptInfo = omnichannelBotEngine.getChatInterceptInfo(channel, orgId, senderId);

		let sourceBadge = "TG Бот";
		let sourceType = "tg_bot";
		if (channel === "telegram") {
			sourceBadge = "TG Бот";
			sourceType = "tg_bot";
		} else if (channel === "vk") {
			sourceBadge = "VK Группа";
			sourceType = "vk_group";
		} else if (channel === "whatsapp") {
			sourceBadge = "WA Телефон";
			sourceType = "wa_phone";
		} else if (channel === "max") {
			sourceBadge = "MAX";
			sourceType = "max_bot";
		}

		if (!convMap.has(key)) {
			convMap.set(key, {
				key,
				channel,
				senderId,
				senderName: p.fullName,
				patientId: p.id,
				patientName: p.fullName,
				phone: p.phone,
				lastMessage: out.message,
				lastMessageAt: (out.createdAt || new Date()).toISOString(),
				lastMessageDirection: "outbound",
				unreadCount: 0,
				isIntercepted: interceptInfo.isIntercepted,
				interceptedBy: interceptInfo.interceptedBy,
				leadId: null,
				leadStatus: null,
				sourceBadge,
				sourceType,
			});
		} else {
			const current = convMap.get(key)!;
			if (new Date(out.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
				current.lastMessage = out.message;
				current.lastMessageAt = out.createdAt.toISOString();
				current.lastMessageDirection = "outbound";
			}
		}
	}

	// Сортируем диалоги по времени последнего сообщения
	const conversations = Array.from(convMap.values()).sort(
		(a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
	);

	return { conversations };
}

/**
 * Хронологическая история сообщений для выбранного контакта.
 */
export async function fetchInboxMessages(
	orgId: string,
	senderId: string,
	channel: BotChannel = "telegram",
): Promise<{
	messages: ChatMessageItem[];
	patient: { id: string; fullName: string; phone: string | null } | null;
	intercept: { isIntercepted: boolean; interceptedBy: string | null; interceptedAt: string | null };
}> {
	// 1. Входящие сообщения
	const inbounds = await db
		.select()
		.from(messengerInboundEvents)
		.where(
			and(
				eq(messengerInboundEvents.organizationId, orgId),
				eq(messengerInboundEvents.externalChatId, senderId),
			),
		)
		.orderBy(desc(messengerInboundEvents.createdAt))
		.limit(100);

	// 2. Ищем пациента для получения исходящих ответов
	const phoneDigits = senderId.replace(/\D/g, "");
	const matchedPatients = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				phoneDigits.length >= 10
					? ilike(patients.phone, `%${phoneDigits.slice(-10)}%`)
					: ilike(patients.notes, `%${channel}:${senderId}%`),
			),
		)
		.limit(1);

	const patient = matchedPatients[0] || null;

	let outbounds: (typeof communicationEvents.$inferSelect)[] = [];
	if (patient) {
		outbounds = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.patientId, patient.id),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(100);
	}

	// 3. Формируем единый упорядоченный таймлайн
	const messages: ChatMessageItem[] = [];

	for (const ib of inbounds) {
		const raw = (ib.rawPayload as Record<string, any>) || {};
		const name =
			raw.user_name ||
			[raw.from?.first_name, raw.from?.last_name].filter(Boolean).join(" ") ||
			patient?.fullName ||
			"Пациент";

		messages.push({
			id: ib.id,
			channel: ib.channel,
			senderId: ib.externalChatId,
			direction: "inbound",
			sender: "patient",
			senderName: name,
			text: ib.messageText || "",
			createdAt: (ib.createdAt || new Date()).toISOString(),
		});
	}

	for (const ob of outbounds) {
		const isOperator = Boolean(ob.actorUserId);
		messages.push({
			id: ob.id,
			channel: ob.channel,
			senderId,
			direction: "outbound",
			sender: isOperator ? "operator" : "bot",
			senderName: isOperator ? "Оператор" : "🤖 Ассистент DENTE",
			text: ob.message,
			createdAt: (ob.createdAt || new Date()).toISOString(),
		});
	}

	messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	const raw = omnichannelBotEngine.getChatInterceptInfo(channel, orgId, senderId);
	const intercept = { isIntercepted: raw.isIntercepted, interceptedBy: raw.interceptedBy ?? null, interceptedAt: ("interceptedAt" in raw && typeof raw.interceptedAt === "string") ? raw.interceptedAt : null };

	return {
		messages,
		patient: patient
			? {
					id: patient.id,
					fullName: patient.fullName,
					phone: patient.phone,
				}
			: null,
		intercept,
	};
}

/**
 * Привязка активного чата к существующей или новой карте пациента.
 */
export async function handleLinkPatient(
	orgId: string,
	senderId: string,
	channel: BotChannel = "telegram",
	patientId?: string,
	createNew?: { fullName: string; phone?: string | null },
): Promise<{
	ok: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	patient?: { id: string; fullName: string; phone: string | null };
}> {
	let targetPatient: { id: string; fullName: string; phone: string | null } | null = null;

	if (patientId) {
		const [existing] = await db
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone, notes: patients.notes })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
			.limit(1);

		if (!existing) {
			return { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." };
		}
		targetPatient = existing;

		// Дописываем маркер мессенджера в notes если ещё нет
		const marker = `${channel}:${senderId}`;
		if (!existing.notes || !existing.notes.includes(marker)) {
			await db
				.update(patients)
				.set({
					notes: existing.notes ? `${existing.notes} • ${marker}` : marker,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patients.organizationId, orgId),
						eq(patients.id, existing.id),
					),
				);
		}
	} else if (createNew && createNew.fullName.trim()) {
		const marker = `${channel}:${senderId}`;
		const [created] = await db
			.insert(patients)
			.values({
				organizationId: orgId,
				fullName: createNew.fullName.trim(),
				phone: createNew.phone?.trim() || null,
				status: "active",
				notes: `Создан из чата оператора (${marker})`,
			})
			.returning({ id: patients.id, fullName: patients.fullName, phone: patients.phone });

		if (!created) {
			return { ok: false, statusCode: 500, error: "CreateFailed", message: "Не удалось создать карту пациента." };
		}
		targetPatient = created;
	} else {
		return {
			ok: false,
			statusCode: 400,
			error: "ValidationError",
			message: "Укажите ID существующего пациента либо данные для создания нового.",
		};
	}

	// Обновляем все входящие события этого чата
	await db
		.update(messengerInboundEvents)
		.set({ patientId: targetPatient.id })
		.where(
			and(
				eq(messengerInboundEvents.organizationId, orgId),
				eq(messengerInboundEvents.channel, channel),
				eq(messengerInboundEvents.externalChatId, senderId),
			),
		);

	return {
		ok: true,
		patient: targetPatient,
		message: `Чат ${channel.toUpperCase()} успешно привязан к карте: ${targetPatient.fullName}`,
	};
}

/**
 * Создание записи на приём из чата оператора с авто-подтверждением в мессенджер.
 */
export async function handleBookAppointment(
	orgId: string,
	senderId: string,
	options: {
		channel?: BotChannel;
		patientId: string;
		doctorUserId?: string;
		startsAt: string;
		endsAt: string;
		reason?: string;
		sendConfirmationToChat?: boolean;
		operatorName?: string;
	},
): Promise<{
	ok: boolean;
	statusCode?: number;
	error?: string;
	message?: string;
	appointmentId?: string;
}> {
	const {
		channel = "telegram",
		patientId,
		doctorUserId,
		startsAt,
		endsAt,
		reason = "Консультация и первичный осмотр",
		sendConfirmationToChat = true,
		operatorName = "Оператор клиники",
	} = options;

	if (!patientId || !startsAt || !endsAt) {
		return {
			ok: false,
			statusCode: 400,
			error: "ValidationError",
			message: "Необходимо указать patientId, startsAt и endsAt.",
		};
	}

	// 1. Проверяем пациента
	const [patient] = await db
		.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
		.from(patients)
		.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
		.limit(1);

	if (!patient) {
		return { ok: false, statusCode: 404, error: "PatientNotFound", message: "Пациент не найден." };
	}

	// 2. Определяем врача
	let selectedDoctorId = doctorUserId;
	let doctorName = "Дежурный врач";
	if (selectedDoctorId) {
		const [doc] = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(and(eq(users.organizationId, orgId), eq(users.id, selectedDoctorId)))
			.limit(1);
		if (doc) doctorName = doc.fullName;
	} else {
		const [firstDoc] = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(
				and(
					eq(users.organizationId, orgId),
					inArray(users.role, ["doctor", "owner", "administrator"]),
				),
			)
			.limit(1);
		if (firstDoc) {
			selectedDoctorId = firstDoc.id;
			doctorName = firstDoc.fullName;
		}
	}

	// 3. Определяем кресло
	const [chair] = await db
		.select({ id: chairs.id })
		.from(chairs)
		.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
		.limit(1);

	// 4. Создаем запись в appointments
	const [newAppt] = await db
		.insert(appointments)
		.values({
			organizationId: orgId,
			patientId: patient.id,
			doctorUserId: selectedDoctorId || null,
			chairId: chair?.id || null,
			startsAt: new Date(startsAt),
			endsAt: new Date(endsAt),
			status: "planned",
			reason: reason.trim(),
			comment: `Записан через омниканальный чат оператора (${channel.toUpperCase()})`,
		})
		.returning({ id: appointments.id });

	if (!newAppt) {
		return { ok: false, statusCode: 500, error: "BookingFailed", message: "Не удалось создать запись на приём." };
	}

	// 5. Если запрошено авто-подтверждение в чат пациенту
	if (sendConfirmationToChat) {
		const startDate = new Date(startsAt);
		const formattedDate = startDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
		const formattedTime = startDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

		const confirmText = `Здравствуйте, ${patient.fullName}! Вы успешно записаны на приём в клинику DENTE.\n\n📅 Дата: ${formattedDate}\n⏰ Время: ${formattedTime}\n👨‍⚕️ Врач: ${doctorName}\n🎯 Причина: ${reason}\n\n📍 Адрес: ул. Стоматологическая, 12 (парковка во дворе).\nЕсли потребуется перенести или отменить визит, просто ответьте в этот чат!`;

		await omnichannelBotEngine.sendOperatorMessage({
			channel,
			organizationId: orgId,
			senderId,
			message: confirmText,
			operatorName,
		});

		// Автоматически перехватываем чат оператором
		omnichannelBotEngine.takeoverChat(channel, orgId, senderId, operatorName);
	}

	return {
		ok: true,
		appointmentId: newAppt.id,
		message: `Запись успешно создана на ${new Date(startsAt).toLocaleString("ru-RU")}`,
	};
}
