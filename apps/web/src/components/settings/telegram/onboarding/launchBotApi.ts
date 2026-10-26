import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type { BotLeadItem } from "./types";

export async function fetchLiveInboxLeads(): Promise<BotLeadItem[] | null> {
	try {
		const res = await fetch("/api/bots/inbox", { headers: denteAdminSecretRequestHeaders() });
		if (!res.ok) return null;
		const data = await res.json();
		if (!Array.isArray(data.conversations) || data.conversations.length === 0) return null;
		return data.conversations.map((c: any, idx: number) => ({
			id: c.key || `lead-${idx}`,
			patientName: c.patientName,
			phone: c.phone || c.senderId,
			action: `Диалог ${c.channel?.toUpperCase?.() || "TG"}`,
			detail: c.lastMessage || "Новое сообщение",
			status: c.isIntercepted ? "inquiry" : "confirmed",
			statusLabel: c.isIntercepted ? "Оператор" : "Отвечает бот",
			time: new Date(c.lastMessageAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
		}));
	} catch {
		return null;
	}
}

export async function registerLiveBot(channel: string, token: string | undefined, plugins: string[]) {
	const res = await fetch("/api/bots/configs", {
		method: "POST",
		headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
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
