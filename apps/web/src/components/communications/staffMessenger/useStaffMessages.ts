import type { StaffChatChannel, StaffChatMessage } from "@dental/shared";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { getDemoMessages } from "./staffMessengerDemoData";

export function useStaffMessages(channels: StaffChatChannel[], activeChannelId: string | null) {
	const [messages, setMessages] = useState<StaffChatMessage[]>([]);
	const [messageText, setMessageText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const loadMessages = useCallback(async (channelId: string) => {
		try {
			const res = await fetch(`/api/staff-chat/messages?channelId=${channelId}`, {
				headers: getDenteAuthHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.messages) && data.messages.length > 0) {
					setMessages(data.messages);
					return;
				}
			}
			if (isDemoShowcaseMode()) {
				const activeCh = channels.find((c) => c.id === channelId);
				setMessages(getDemoMessages(channelId, activeCh?.slug || undefined));
			}
		} catch (e) {
			console.error("Ошибка загрузки сообщений:", e);
			if (isDemoShowcaseMode()) {
				const activeCh = channels.find((c) => c.id === channelId);
				setMessages(getDemoMessages(channelId, activeCh?.slug || undefined));
			}
		}
	}, [channels]);

	const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const text = messageText.trim();
		if (!text || !activeChannelId || isSending) return;

		try {
			setIsSending(true);
			const headers = getDenteAuthHeaders({ "Content-Type": "application/json" });
			const res = await fetch("/api/staff-chat/messages", {
				method: "POST", headers,
				body: JSON.stringify({ channelId: activeChannelId, content: text, messageType: "text", urgency: "normal" }),
			});
			if (res.ok) {
				const data = await res.json();
				setMessages((prev) => [...prev, data.message]);
				setMessageText("");
				inputRef.current?.focus();
			} else {
				showToast("Не удалось отправить сообщение", "warning");
			}
		} catch (e) {
			console.error("Ошибка отправки сообщения:", e);
			showToast("Сетевая ошибка при отправке", "error");
		} finally {
			setIsSending(false);
		}
	}, [messageText, activeChannelId, isSending]);

	return {
		messages, setMessages, messageText, setMessageText, isSending,
		messagesEndRef, inputRef, loadMessages, handleSendMessage,
	};
}
