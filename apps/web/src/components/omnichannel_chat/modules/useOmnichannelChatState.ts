import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import { applyTemplateVariables } from "../omnichannelChatTemplates";
import type { OmnichannelChannel, OmnichannelConversation, OmnichannelMessage } from "../types";

/**
 * DTO списка диалогов — GET /api/bots/inbox (честный контур PostgreSQL:
 * messengerInboundEvents + communicationEvents, агрегация на бэкенде).
 */
interface BotsInboxConversationDto {
	key: string;
	channel: string;
	senderId: string;
	senderName: string;
	patientId: string | null;
	patientName: string;
	phone: string | null;
	lastMessage: string;
	lastMessageAt: string;
	lastMessageDirection: "inbound" | "outbound";
	unreadCount: number;
	isIntercepted: boolean;
}

/**
 * DTO истории переписки — GET /api/bots/inbox/:senderId/messages?channel=…
 */
interface BotsInboxMessageDto {
	id: string;
	channel: string;
	senderId: string;
	direction: "inbound" | "outbound";
	sender: "patient" | "bot" | "operator";
	senderName: string;
	text: string;
	createdAt: string;
}

/** Разбор составного ключа диалога `${channel}:${senderId}`. */
function parseConversationKey(key: string): { channel: OmnichannelChannel; senderId: string } {
	const sep = key.indexOf(":");
	if (sep <= 0) return { channel: "telegram", senderId: key };
	return {
		channel: key.slice(0, sep) as OmnichannelChannel,
		senderId: key.slice(sep + 1),
	};
}

function mapConversation(dto: BotsInboxConversationDto): OmnichannelConversation {
	const { senderId } = parseConversationKey(dto.key);
	return {
		id: dto.key,
		patientId: dto.patientId ?? undefined,
		patientName: dto.patientName || dto.senderName || "Пациент",
		patientPhone: dto.phone || "",
		channel: dto.channel as OmnichannelChannel,
		unreadCount: dto.unreadCount || 0,
		lastMessageText: dto.lastMessage || "",
		lastMessageTime: dto.lastMessageAt || new Date().toISOString(),
		isHumanIntercepted: dto.isIntercepted,
	};
}

function mapMessage(dto: BotsInboxMessageDto): OmnichannelMessage {
	return {
		id: dto.id,
		channel: dto.channel as OmnichannelChannel,
		senderId: dto.senderId,
		senderName: dto.senderName,
		senderRole: dto.sender,
		text: dto.text,
		timestamp: dto.createdAt,
		// У API коммуникаций нет собственной галочки доставки — честный статус «отправлено».
		status: "sent",
	};
}

export function useOmnichannelChatState(initialChannel: OmnichannelChannel | "all" = "all") {
	const [selectedChannel, setSelectedChannel] = useState<OmnichannelChannel | "all">(initialChannel);
	const [searchQuery, setSearchQuery] = useState("");
	const [conversations, setConversations] = useState<OmnichannelConversation[]>([]);
	const [isConversationsLoading, setIsConversationsLoading] = useState(true);
	const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
	const [messagesMap, setMessagesMap] = useState<Record<string, OmnichannelMessage[]>>({});
	const [isThreadLoading, setIsThreadLoading] = useState(false);
	const [draftText, setDraftText] = useState("");
	const [mobileViewMode, setMobileViewMode] = useState<"list" | "chat">("chat");
	const [isSending, setIsSending] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	// Честная гидратация диалогов из PostgreSQL через /api/bots/inbox.
	useEffect(() => {
		let isMounted = true;
		setIsConversationsLoading(true);
		fetch("/api/bots/inbox")
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
			.then((data) => {
				if (!isMounted) return;
				const list = Array.isArray(data?.conversations) ? data.conversations : [];
				const mapped = list.map(mapConversation);
				setConversations(mapped);
				setActiveConversationId((prev) => prev ?? mapped[0]?.id ?? null);
			})
			.catch(() => {
				// Тихий пустой стейт: API недоступен — показываем пустой список, без выдуманных диалогов.
				if (isMounted) setConversations([]);
			})
			.finally(() => {
				if (isMounted) setIsConversationsLoading(false);
			});
		return () => {
			isMounted = false;
		};
	}, []);

	// История активного диалога: GET /api/bots/inbox/:senderId/messages?channel=…
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
			// Без связи с API показываем пустую историю — никаких локальных заглушек.
			setMessagesMap((prev) => ({ ...prev, [convId]: [] }));
		} finally {
			setIsThreadLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!activeConversationId) return;
		if (messagesMap[activeConversationId]) return;
		void loadThread(activeConversationId);
	}, [activeConversationId, messagesMap, loadThread]);

	const activeConv = useMemo(
		() => conversations.find((c) => c.id === activeConversationId) || conversations[0] || null,
		[conversations, activeConversationId],
	);

	const activeMessages = useMemo(
		() => (activeConv ? messagesMap[activeConv.id] || [] : []),
		[messagesMap, activeConv],
	);

	const filteredConversations = useMemo(() => {
		return conversations.filter((c) => {
			const matchesChannel = selectedChannel === "all" || c.channel === selectedChannel;
			const q = searchQuery.trim().toLowerCase();
			const matchesQuery = !q || c.patientName.toLowerCase().includes(q) || c.patientPhone.includes(q) || c.lastMessageText.toLowerCase().includes(q);
			return matchesChannel && matchesQuery;
		});
	}, [conversations, selectedChannel, searchQuery]);

	const handleSelectConversation = (conv: OmnichannelConversation) => {
		setActiveConversationId(conv.id);
		setMobileViewMode("chat");
		if (conv.unreadCount > 0) {
			setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
		}
	};

	const handleSend = async () => {
		const text = draftText.trim();
		if (isSending) return;
		if (!text) {
			inputRef.current?.focus();
			showToast("Введите текст сообщения перед отправкой", "warning");
			return;
		}
		if (!activeConv) return;

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
			// Перезагружаем историю из БД — на экране только реально сохранённые сообщения.
			await loadThread(activeConv.id);
			setConversations((prev) =>
				prev.map((c) =>
					c.id === activeConv.id
						? { ...c, lastMessageText: text, lastMessageTime: new Date().toISOString() }
						: c,
				),
			);
			setDraftText("");
			showToast(`Сообщение отправлено в ${channel.toUpperCase()}`, "success");
		} catch (err) {
			showToast(err instanceof Error ? `Не удалось отправить: ${err.message}` : "Не удалось отправить сообщение", "error");
		} finally {
			setIsSending(false);
		}
	};

	const handleApplyTemplate = (templateText: string) => {
		const interpolated = applyTemplateVariables(templateText, {
			name: activeConv?.patientName || "пациент",
			time: "14:00",
			date: "завтра",
			doctor: "врачу клиники",
		});
		setDraftText(interpolated);
		inputRef.current?.focus();
	};

	return {
		selectedChannel, setSelectedChannel, searchQuery, setSearchQuery,
		conversations, activeConv, activeMessages, filteredConversations,
		isConversationsLoading, isThreadLoading, isSending,
		draftText, setDraftText, mobileViewMode, setMobileViewMode,
		inputRef, handleSelectConversation, handleSend, handleApplyTemplate,
	};
}
