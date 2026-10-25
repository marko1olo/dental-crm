/**
 * useOmnichannelThreadLoader.ts — Загрузка истории сообщений и отправка в чат.
 * Мандат 8b: строго <= 120 строк.
 */

import { useCallback, useEffect, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { showToast } from "../../GlobalToast";
import type { OmnichannelConversation, OmnichannelMessage } from "../types";
import {
	CANONICAL_DEMO_MESSAGES,
	mapMessage,
	parseConversationKey,
} from "./omnichannelDtoMappers";

export function useOmnichannelThreadLoader(
	activeConv: OmnichannelConversation | null,
	onMessageSent: (text: string) => void,
) {
	const [messagesMap, setMessagesMap] = useState<Record<string, OmnichannelMessage[]>>(() =>
		isDemoShowcaseMode() && activeConv ? { [activeConv.id]: CANONICAL_DEMO_MESSAGES } : {},
	);
	const [isThreadLoading, setIsThreadLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);

	const loadThread = useCallback(async (convId: string) => {
		const { channel, senderId } = parseConversationKey(convId);
		setIsThreadLoading(true);
		try {
			const r = await fetch(`/api/bots/inbox/${encodeURIComponent(senderId)}/messages?channel=${encodeURIComponent(channel)}`);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const data = await r.json();
			const list = Array.isArray(data?.messages) ? data.messages : [];
			setMessagesMap((prev) => ({ ...prev, [convId]: list.map(mapMessage) }));
		} catch {
			if (isDemoShowcaseMode() && !messagesMap[convId]) {
				setMessagesMap((prev) => ({ ...prev, [convId]: CANONICAL_DEMO_MESSAGES }));
			}
		} finally {
			setIsThreadLoading(false);
		}
	}, [messagesMap]);

	useEffect(() => {
		if (activeConv?.id && !messagesMap[activeConv.id]) void loadThread(activeConv.id);
	}, [activeConv?.id, messagesMap, loadThread]);

	const sendMessage = async (text: string) => {
		if (!activeConv || isSending) return;
		const { channel, senderId } = parseConversationKey(activeConv.id);
		setIsSending(true);
		try {
			const r = await fetch("/api/bots/send-message", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ channel, senderId, message: text }),
			});
			if (!r.ok) {
				const err = await r.json().catch(() => null);
				throw new Error(err?.message || `HTTP ${r.status}`);
			}
			await loadThread(activeConv.id);
			onMessageSent(text);
			showToast(`Сообщение отправлено в ${channel.toUpperCase()}`, "success");
		} catch (err) {
			if (isDemoShowcaseMode()) {
				const mockMsg: OmnichannelMessage = {
					id: `msg-${Date.now()}`,
					channel: activeConv.channel,
					senderId: "operator",
					senderName: "Администратор",
					senderRole: "operator",
					text,
					timestamp: new Date().toISOString(),
					status: "sent",
				};
				setMessagesMap((prev) => ({ ...prev, [activeConv.id]: [...(prev[activeConv.id] || []), mockMsg] }));
				onMessageSent(text);
				showToast(`Сообщение отправлено в ${channel.toUpperCase()}`, "success");
			} else {
				showToast(err instanceof Error ? `Не удалось отправить: ${err.message}` : "Не удалось отправить сообщение", "error");
			}
		} finally {
			setIsSending(false);
		}
	};

	const activeMessages = activeConv ? messagesMap[activeConv.id] || [] : [];

	return {
		messagesMap,
		activeMessages,
		isThreadLoading,
		isSending,
		sendMessage,
		loadThread,
	};
}
