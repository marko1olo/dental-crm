import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	communicationEvents,
	messengerInboundEvents,
	patients,
} from "../../../db/schema.js";
import { omnichannelBotEngine } from "../../../services/bots/OmnichannelBotEngine.js";
import type { BotChannel } from "../../../services/bots/types.js";
import type { ChatMessageItem } from "../types.js";

interface InboundMessageRawPayload {
	user_name?: string;
	from?: {
		first_name?: string;
		last_name?: string;
	};
	[key: string]: unknown;
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

	// 2. Ищем пациента для получения исходящих ответов.
	// Телефон в БД хранится в формате «+7 903 555-44-33», поэтому сравниваем
	// по нормализованным цифрам (та же нормализация, что в fetchInboxConversations),
	// иначе тред диалога всегда пуст: подстрока «9035554433» в форматированном
	// телефоне не встречается.
	const phoneDigits = senderId.replace(/\D/g, "");
	const national10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";
	const matchedPatients = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, orgId),
				national10
					? or(
							eq(patients.phone, senderId),
							sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${national10}%`}`,
						)
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
					// В тред конкретного мессенджера попадают только его же каналы,
					// иначе SMS-уведомления загрязняют переписку в Telegram/WhatsApp.
					eq(communicationEvents.channel, channel),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(100);
	}

	// 3. Формируем единый упорядоченный таймлайн
	const messages: ChatMessageItem[] = [];

	for (const ib of inbounds) {
		const raw = (ib.rawPayload as InboundMessageRawPayload | null) || {};
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
			senderName: isOperator ? "Оператор клиники" : "Ассистент DENTE",
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
