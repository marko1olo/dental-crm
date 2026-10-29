/**
 * useOmnichannelChatState.ts — Контроллер состояния омниканального чата.
 * Мандат 8b: строго <= 120 строк.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { showToast } from "../../GlobalToast";
import { applyTemplateVariables } from "../omnichannelChatTemplates";
import type { OmnichannelChannel, OmnichannelConversation } from "../types";
import {
	CANONICAL_DEMO_CONVERSATIONS,
	mapConversation,
} from "./omnichannelDtoMappers";
import { useOmnichannelThreadLoader } from "./useOmnichannelThreadLoader";

export const CHANNEL_BADGES: Record<
	string,
	{ label: string; bg: string; text: string; border: string }
> = {
	whatsapp: {
		label: "WhatsApp",
		bg: "bg-emerald-50 dark:bg-emerald-950/40",
		text: "text-emerald-700 dark:text-emerald-300",
		border: "border-emerald-200 dark:border-emerald-800",
	},
	telegram: {
		label: "Telegram",
		bg: "bg-sky-50 dark:bg-sky-950/40",
		text: "text-sky-700 dark:text-sky-300",
		border: "border-sky-200 dark:border-sky-800",
	},
	vk: {
		label: "VK",
		bg: "bg-blue-50 dark:bg-blue-950/40",
		text: "text-blue-700 dark:text-blue-300",
		border: "border-blue-200 dark:border-blue-800",
	},
	max: {
		label: "MAX",
		bg: "bg-purple-50 dark:bg-purple-950/40",
		text: "text-purple-700 dark:text-purple-300",
		border: "border-purple-200 dark:border-purple-800",
	},
	sms: {
		label: "SMS",
		bg: "bg-amber-50 dark:bg-amber-950/40",
		text: "text-amber-700 dark:text-amber-300",
		border: "border-amber-200 dark:border-amber-800",
	},
};

export function useOmnichannelChatState(initialChannel: OmnichannelChannel | "all" = "all") {
	const [selectedChannel, setSelectedChannel] = useState<OmnichannelChannel | "all">(initialChannel);
	const [searchQuery, setSearchQuery] = useState("");
	const [conversations, setConversations] = useState<OmnichannelConversation[]>(() =>
		isDemoShowcaseMode() ? CANONICAL_DEMO_CONVERSATIONS : [],
	);
	const [isConversationsLoading, setIsConversationsLoading] = useState(!isDemoShowcaseMode());
	const [activeConversationId, setActiveConversationId] = useState<string | null>(() =>
		isDemoShowcaseMode() ? (CANONICAL_DEMO_CONVERSATIONS[0]?.id ?? null) : null,
	);
	const [draftText, setDraftText] = useState("");
	const [mobileViewMode, setMobileViewMode] = useState<"list" | "chat">("chat");
	const inputRef = useRef<HTMLTextAreaElement | null>(null);

	const activeConv = useMemo(
		() => conversations.find((c) => c.id === activeConversationId) || conversations[0] || null,
		[conversations, activeConversationId],
	);

	const onMessageSent = (text: string) => {
		if (!activeConv) return;
		setConversations((prev) => prev.map((c) => c.id === activeConv.id ? { ...c, lastMessageText: text, lastMessageTime: new Date().toISOString() } : c));
		setDraftText("");
	};

	const { activeMessages, isThreadLoading, isSending, sendMessage } = useOmnichannelThreadLoader(activeConv, onMessageSent);

	useEffect(() => {
		let isMounted = true;
		setIsConversationsLoading(true);
		fetch("/api/bots/inbox")
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
			.then((data) => {
				if (!isMounted) return;
				const list = Array.isArray(data?.conversations) ? data.conversations : [];
				const mapped = list.map(mapConversation);
				if (mapped.length > 0) {
					setConversations(mapped);
					setActiveConversationId((prev) => prev ?? mapped[0]?.id ?? null);
				} else if (isDemoShowcaseMode()) {
					setConversations(CANONICAL_DEMO_CONVERSATIONS);
					setActiveConversationId((prev) => prev ?? (CANONICAL_DEMO_CONVERSATIONS[0]?.id ?? null));
				}
			})
			.catch(() => {
				if (isMounted && isDemoShowcaseMode()) {
					setConversations(CANONICAL_DEMO_CONVERSATIONS);
					setActiveConversationId((prev) => prev ?? (CANONICAL_DEMO_CONVERSATIONS[0]?.id ?? null));
				}
			})
			.finally(() => isMounted && setIsConversationsLoading(false));
		return () => { isMounted = false; };
	}, []);

	const filteredConversations = useMemo(() => conversations.filter((c) => {
		const matchChan = selectedChannel === "all" || c.channel === selectedChannel;
		const q = searchQuery.trim().toLowerCase();
		return matchChan && (!q || c.patientName.toLowerCase().includes(q) || c.patientPhone.includes(q) || c.lastMessageText.toLowerCase().includes(q));
	}), [conversations, selectedChannel, searchQuery]);

	const handleSelectConversation = (conv: OmnichannelConversation) => {
		setActiveConversationId(conv.id);
		setMobileViewMode("chat");
		if (conv.unreadCount > 0) {
			setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
		}
	};

	const handleSend = async () => {
		const text = draftText.trim();
		if (!text) {
			inputRef.current?.focus();
			showToast("Введите текст сообщения перед отправкой", "warning");
			return;
		}
		await sendMessage(text);
	};

	const handleApplyTemplate = (tpl: string) => {
		setDraftText(applyTemplateVariables(tpl, { name: activeConv?.patientName || "пациент", time: "14:00", date: "завтра", doctor: "врачу" }));
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
