import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../../services/logging/clientLogger";
import type { BotLeadItem } from "./types";

const CHANNEL_LABELS: Record<string, string> = {
	telegram: "Telegram",
	vk: "VK",
	whatsapp: "WhatsApp",
	max: "MAX",
};

interface LiveConversationItem {
	key?: string;
	patientName?: string;
	phone?: string;
	senderId?: string;
	channel?: string;
	lastMessage?: string;
	isIntercepted?: boolean;
	lastMessageAt?: string | number | Date;
}

export async function fetchLiveInboxLeads(): Promise<BotLeadItem[] | null> {
	try {
		const res = await fetch("/api/bots/inbox", { headers: denteClinicalReadHeaders() });
		if (!res.ok) return null;
		const data = await res.json();
		if (!Array.isArray(data.conversations) || data.conversations.length === 0) return null;
		return data.conversations.map((c: LiveConversationItem, idx: number) => ({
			id: c.key || `lead-${idx}`,
			patientName: c.patientName || "Пациент",
			phone: c.phone || c.senderId || "",
			action: `Диалог ${c.channel ? (CHANNEL_LABELS[c.channel] ?? c.channel) : "Telegram"}`,
			detail: c.lastMessage || "Новое сообщение",
			status: c.isIntercepted ? "inquiry" : "confirmed",
			statusLabel: c.isIntercepted ? "Оператор" : "Отвечает бот",
			time: c.lastMessageAt
				? new Date(c.lastMessageAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
				: "—",
		}));
	} catch (err) {
		clientLogger.warn("Не удалось получить список диалогов бота", err, { module: "launchBotApi" });
		return null;
	}
}

export async function registerLiveBot(channel: string, token: string | undefined, plugins: string[]) {
	const res = await fetch("/api/bots/configs", {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
		}),
		body: JSON.stringify({
			channel,
			botConfigId: "default",
			token: token || undefined,
			isActive: true,
			enabledPlugins: plugins,
		}),
	});
	return res;
}
