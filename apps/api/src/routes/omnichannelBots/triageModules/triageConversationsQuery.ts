import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	communicationEvents,
	crmLeads,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import { denteTelegramChatLinks } from "../../../db/schema/communications/channelsSchema.js";
import { omnichannelBotEngine } from "../../../services/bots/OmnichannelBotEngine.js";
import type { BotChannel } from "../../../services/bots/types.js";
import type { InboxConversation } from "../types.js";

interface InboundRawPayload {
	sourceType?: string;
	sourceKind?: string;
	provider?: string;
	isPersonal?: boolean;
	user_name?: string;
	from?: {
		first_name?: string;
		last_name?: string;
	};
	senderData?: {
		senderName?: string;
	};
	[key: string]: unknown;
}

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

	// 3. Собираем известные идентификаторы пациентов и телефоны из активных диалогов (DEF-17-08)
	const patientIds = new Set<string>();
	for (const e of inboundEvents) {
		if (e.patientId) patientIds.add(e.patientId);
	}
	for (const e of outboundEvents) {
		if (e.patientId) patientIds.add(e.patientId);
	}

	// Загружаем активные связки Telegram-чатов организации
	const chatLinks = await db
		.select({
			subjectId: denteTelegramChatLinks.subjectId,
			chatTransportRef: denteTelegramChatLinks.chatTransportRef,
		})
		.from(denteTelegramChatLinks)
		.where(
			and(
				eq(denteTelegramChatLinks.organizationId, orgId),
				eq(denteTelegramChatLinks.subjectType, "patient"),
				eq(denteTelegramChatLinks.status, "active"),
			),
		);

	const chatRefToPatientId = new Map<string, string>();
	const patientIdToChatRef = new Map<string, string>();
	for (const cl of chatLinks) {
		if (cl.chatTransportRef && cl.subjectId) {
			chatRefToPatientId.set(cl.chatTransportRef, cl.subjectId);
			patientIdToChatRef.set(cl.subjectId, cl.chatTransportRef);
			patientIds.add(cl.subjectId);
		}
	}

	// Собираем нормализованные 10-значные суффиксы телефонов
	const searchPhones = new Set<string>();
	for (const evt of inboundEvents) {
		const digits = evt.externalChatId.replace(/\D/g, "");
		if (digits.length >= 10) {
			searchPhones.add(digits.slice(-10));
		}
	}

	type ClinicPatientRecord = {
		id: string;
		fullName: string;
		phone: string | null;
	};

	const patientIdList = Array.from(patientIds);
	const phoneList = Array.from(searchPhones);
	let clinicPatients: ClinicPatientRecord[] = [];

	if (patientIdList.length > 0) {
		const byIds = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					inArray(patients.id, patientIdList),
				),
			);
		clinicPatients = byIds;
	}

	if (phoneList.length > 0) {
		const byPhones = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					or(
						...phoneList.map((p) => sql`right(regexp_replace(coalesce(${patients.phone}, ''), '\\D', '', 'g'), 10) = ${p}`),
					),
				),
			);
		for (const p of byPhones) {
			if (!clinicPatients.some((cp) => cp.id === p.id)) {
				clinicPatients.push(p);
			}
		}
	}

	const patientMap = new Map<string, ClinicPatientRecord>();
	const patientPhoneMap = new Map<string, ClinicPatientRecord>();
	for (const p of clinicPatients) {
		patientMap.set(p.id, p);
		if (p.phone) {
			const digits = p.phone.replace(/\D/g, "");
			if (digits.length >= 10) {
				patientPhoneMap.set(digits.slice(-10), p);
			}
		}
	}

	// 4. Получаем список лидов клиники по совпадению нормализованных номеров телефонов
	let leads: {
		id: string;
		name: string | null;
		patientName: string | null;
		phone: string | null;
		source: string | null;
		status: string;
	}[] = [];

	if (phoneList.length > 0) {
		leads = await db
			.select({
				id: crmLeads.id,
				name: crmLeads.name,
				patientName: crmLeads.patientName,
				phone: crmLeads.phone,
				source: crmLeads.source,
				status: crmLeads.status,
			})
			.from(crmLeads)
			.where(
				and(
					eq(crmLeads.organizationId, orgId),
					or(
						...phoneList.map((p) => sql`right(regexp_replace(coalesce(${crmLeads.phone}, ''), '\\D', '', 'g'), 10) = ${p}`),
					),
				),
			);
	}

	const leadPhoneMap = new Map<string, (typeof leads)[0]>();
	for (const l of leads) {
		if (l.phone) {
			const digits = l.phone.replace(/\D/g, "");
			if (digits.length >= 10) {
				leadPhoneMap.set(digits.slice(-10), l);
			}
		}
	}

	// Агрегируем диалоги по ключу: `${channel}:${senderId}`
	const convMap = new Map<string, InboxConversation>();
	const patientChannelToExternalChatId = new Map<string, string>();

	for (const evt of inboundEvents) {
		const channel = (evt.channel as BotChannel) || "telegram";
		const senderId = evt.externalChatId;
		const key = `${channel}:${senderId}`;

		// Ищем пациента
		const rawPayload = (evt.rawPayload as InboundRawPayload | null) || {};
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

		const digits = senderId.replace(/\D/g, "");
		const phoneKey = digits.length >= 10 ? digits.slice(-10) : null;

		let matchedPatient = evt.patientId ? patientMap.get(evt.patientId) : undefined;
		const linkedPatientId = chatRefToPatientId.get(senderId);
		if (!matchedPatient && linkedPatientId) {
			matchedPatient = patientMap.get(linkedPatientId);
		}
		if (!matchedPatient && phoneKey) {
			matchedPatient = patientPhoneMap.get(phoneKey);
		}

		// Запоминаем externalChatId для сопоставления исходящих тредов (DEF-101: VK, MAX, Telegram)
		const resolvedPatId = matchedPatient?.id || evt.patientId;
		if (resolvedPatId && senderId) {
			patientChannelToExternalChatId.set(`${channel}:${resolvedPatId}`, senderId);
		}

		// Ищем лид
		const matchedLead = phoneKey ? leadPhoneMap.get(phoneKey) : undefined;

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
			const current = convMap.get(key);
			if (current) {
				current.unreadCount++;
				if (new Date(evt.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
					current.lastMessage = evt.messageText || "[Сообщение]";
					current.lastMessageAt = evt.createdAt.toISOString();
					current.lastMessageDirection = "inbound";
				}
			}
		}
	}

	// Учитываем также исходящие сообщения в последнем сообщении
	for (const out of outboundEvents) {
		if (!out.patientId) continue;
		const channel = out.channel as BotChannel;
		const p = patientMap.get(out.patientId);
		if (!p) continue;

		let senderId: string | null = null;
		const linkedChatRef = patientIdToChatRef.get(p.id);
		const knownExternalId = patientChannelToExternalChatId.get(`${channel}:${p.id}`);
		if (channel === "telegram" && linkedChatRef) {
			senderId = linkedChatRef;
		} else if (knownExternalId) {
			senderId = knownExternalId;
		} else if (p.phone) {
			senderId = p.phone.replace(/\D/g, "");
		}
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
			const current = convMap.get(key);
			if (current) {
				if (new Date(out.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
					current.lastMessage = out.message;
					current.lastMessageAt = out.createdAt.toISOString();
					current.lastMessageDirection = "outbound";
				}
			}
		}
	}

	// Сортируем диалоги по времени последнего сообщения
	const conversations = Array.from(convMap.values()).sort(
		(a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
	);

	return { conversations };
}
