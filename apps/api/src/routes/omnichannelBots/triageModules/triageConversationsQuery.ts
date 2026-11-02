import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	communicationEvents,
	crmLeads,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import { omnichannelBotEngine } from "../../../services/bots/OmnichannelBotEngine.js";
import type { BotChannel } from "../../../services/bots/types.js";
import type { InboxConversation } from "../types.js";

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
