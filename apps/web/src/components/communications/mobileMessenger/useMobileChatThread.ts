import { generateUuidV7 } from "@dental/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import type { ChatChannel, MobileChatMessageItem, MobileCommunicationsMessengerProps } from "./types";

interface RawMobileApiMessage {
	id?: string;
	message?: string;
	bodyText?: string;
	direction?: string;
	channel?: string;
	createdAt?: string;
	status?: string;
}

interface RawCommunicationEvent {
	id?: string;
	patientId?: string;
	message?: string;
	direction?: string;
	channel?: string;
	createdAt?: string;
	status?: string;
}

function parseChannel(rawChannel?: string): ChatChannel {
	if (rawChannel === "telegram" || rawChannel === "sms" || rawChannel === "max") {
		return rawChannel;
	}
	return "whatsapp";
}

function parseMessageStatus(rawStatus?: string): "delivered" | "read" | "failed" | "sent" {
	if (rawStatus === "failed") return "failed";
	if (rawStatus === "read") return "read";
	if (rawStatus === "sent") return "sent";
	return "delivered";
}

export function useMobileChatThread(
	selectedPatientId: string | null,
	activeChannel: ChatChannel,
	dashboard: MobileCommunicationsMessengerProps["dashboard"],
) {
	const [chatMessages, setChatMessages] = useState<MobileChatMessageItem[]>([]);
	const [isFetchingChat, setIsFetchingChat] = useState(false);
	const [interceptedDialogs, setInterceptedDialogs] = useState<Record<string, boolean>>({});
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	const isCurrentMobileIntercepted = Boolean(selectedPatientId && interceptedDialogs[selectedPatientId]);

	const handleMobileTakeoverChat = useCallback(async () => {
		if (!selectedPatientId) return;
		try {
			const res = await fetch(`/api/bots/chats/${encodeURIComponent(selectedPatientId)}/takeover`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				},
				body: JSON.stringify({
					channel: activeChannel,
					operatorName: "Оператор клиники",
				}),
			});
			if (!res.ok) {
				showToast("Не удалось перехватить диалог на сервере", "error");
				return;
			}
		} catch (err) {
			clientLogger.error("[useMobileChatThread] Takeover failed:", err);
			showToast("Сетевая ошибка при перехвате диалога", "error");
			return;
		}

		setInterceptedDialogs((prev) => ({ ...prev, [selectedPatientId]: true }));
		const takeoverMsg: MobileChatMessageItem = {
			id: `mobile-takeover-${Date.now()}`,
			patientId: selectedPatientId,
			text: "Оператор клиники подключился к диалогу. Бот переведён в спящий режим. Чем я могу вам помочь?",
			direction: "outbound",
			channel: activeChannel,
			timestamp: new Date().toISOString(),
			status: "delivered",
		};
		setChatMessages((prev) => [...prev, takeoverMsg]);
		showToast("Диалог успешно перехвачен оператором", "success");
	}, [selectedPatientId, activeChannel]);

	const fetchChatThread = useCallback(async (pId: string) => {
		setIsFetchingChat(true);
		try {
			const res = await fetch(`/api/communications/inbox/${encodeURIComponent(pId)}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = (await res.json()) as
					| RawMobileApiMessage[]
					| { messages?: RawMobileApiMessage[] };
				const list = (Array.isArray(data)
					? data
					: Array.isArray(data.messages)
						? data.messages
						: []) as RawMobileApiMessage[];
				if (list.length > 0) {
					setChatMessages(
						list.map((m, idx: number) => ({
							id: m.id || `msg-${idx}`,
							patientId: pId,
							text: m.message || m.bodyText || "",
							direction: m.direction === "inbound" ? "inbound" : "outbound",
							channel: parseChannel(m.channel),
							timestamp: m.createdAt || new Date().toISOString(),
							status:
								m.direction === "inbound"
									? undefined
									: parseMessageStatus(m.status),
						})),
					);
					return;
				}
			}
		} catch (err) {
			clientLogger.debug("[useMobileChatThread] Inbox thread fallback:", err);
		}

		const events = (dashboard?.communicationEvents ??
			[]) as RawCommunicationEvent[];
		const matching = events.filter((ev) => ev.patientId === pId);
		if (matching.length > 0) {
			setChatMessages(
				matching.map((ev, idx: number) => ({
					id: ev.id || `ev-${idx}`,
					patientId: pId,
					text: ev.message || "Сообщение в чате",
					direction: ev.direction === "inbound" ? "inbound" : "outbound",
					channel: parseChannel(ev.channel),
					timestamp: ev.createdAt || new Date().toISOString(),
					status: ev.status === "failed" ? "failed" : "read",
				})),
			);
		} else if (isDemoShowcaseMode()) {
			const now = Date.now();
			setChatMessages([
				{ id: `seed-1-${pId}`, patientId: pId, text: "Здравствуйте! Напоминаем о вашей записи на приём завтра в 11:30 к доктору Смирновой Е.А.", direction: "outbound", channel: "whatsapp", timestamp: new Date(now - 14400000).toISOString(), status: "read" },
				{ id: `seed-2-${pId}`, patientId: pId, text: "Добрый день! Да, спасибо большое, буду вовремя. Подскажите, нужно ли взять с собой снимок КТ?", direction: "inbound", channel: "whatsapp", timestamp: new Date(now - 10800000).toISOString() },
				{ id: `seed-3-${pId}`, patientId: pId, text: "Если снимок на диске или флешке — обязательно возьмите! Также у нас в клинике работает цифровой томограф, сможем сделать прицельный снимок на месте.", direction: "outbound", channel: "whatsapp", timestamp: new Date(now - 7200000).toISOString(), status: "read" },
				{ id: `seed-4-${pId}`, patientId: pId, text: "Отлично, диск взяла! До встречи завтра.", direction: "inbound", channel: "whatsapp", timestamp: new Date(now - 1800000).toISOString() },
			]);
		} else {
			setChatMessages([]);
		}
		setIsFetchingChat(false);
	}, [dashboard?.communicationEvents]);

	useEffect(() => {
		if (selectedPatientId) void fetchChatThread(selectedPatientId);
	}, [selectedPatientId, fetchChatThread]);

	useEffect(() => {
		if (selectedPatientId && messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [chatMessages, selectedPatientId]);

	return {
		chatMessages, setChatMessages, isFetchingChat,
		isCurrentMobileIntercepted, handleMobileTakeoverChat,
		fetchChatThread, messagesEndRef,
	};
}
