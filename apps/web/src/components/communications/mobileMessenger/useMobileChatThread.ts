import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { ChatChannel, MobileChatMessageItem, MobileCommunicationsMessengerProps } from "./types";

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

	const handleMobileTakeoverChat = useCallback(() => {
		if (!selectedPatientId) return;
		setInterceptedDialogs((prev) => ({ ...prev, [selectedPatientId]: true }));
		const takeoverMsg: MobileChatMessageItem = {
			id: `mobile-takeover-${Date.now()}`,
			patientId: selectedPatientId,
			text: "👩‍💼 Оператор клиники подключился к диалогу. Бот переведён в спящий режим. Чем я могу вам помочь?",
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
				const data = await res.json();
				const list = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
				if (list.length > 0) {
					setChatMessages(list.map((m: any, idx: number) => ({
						id: m.id || `msg-${idx}`,
						patientId: pId,
						text: m.message || m.bodyText || "",
						direction: m.direction === "inbound" ? "inbound" : "outbound",
						channel: (m.channel as any) || "whatsapp",
						timestamp: m.createdAt || new Date().toISOString(),
						status: m.direction === "inbound" ? undefined : (m.status as any) || "delivered",
					})));
					return;
				}
			}
		} catch { /* fallback */ }

		const matching = (dashboard?.communicationEvents ?? []).filter((ev: any) => ev.patientId === pId);
		if (matching.length > 0) {
			setChatMessages(matching.map((ev: any, idx: number) => ({
				id: ev.id || `ev-${idx}`, patientId: pId, text: ev.message || "Сообщение в чате",
				direction: ev.direction === "inbound" ? "inbound" : "outbound", channel: (ev.channel as any) || "whatsapp",
				timestamp: ev.createdAt, status: ev.status === "failed" ? "failed" : "read",
			})));
		} else {
			const now = Date.now();
			setChatMessages([
				{ id: `seed-1-${pId}`, patientId: pId, text: "Здравствуйте! Напоминаем о вашей записи на приём завтра в 11:30 к доктору Смирновой Е.А.", direction: "outbound", channel: "whatsapp", timestamp: new Date(now - 14400000).toISOString(), status: "read" },
				{ id: `seed-2-${pId}`, patientId: pId, text: "Добрый день! Да, спасибо большое, буду вовремя. Подскажите, нужно ли взять с собой снимок КТ?", direction: "inbound", channel: "whatsapp", timestamp: new Date(now - 10800000).toISOString() },
				{ id: `seed-3-${pId}`, patientId: pId, text: "Если снимок на диске или флешке — обязательно возьмите! Также у нас в клинике работает цифровой томограф, сможем сделать прицельный снимок на месте.", direction: "outbound", channel: "whatsapp", timestamp: new Date(now - 7200000).toISOString(), status: "read" },
				{ id: `seed-4-${pId}`, patientId: pId, text: "Отлично, диск взяла! До встречи завтра.", direction: "inbound", channel: "whatsapp", timestamp: new Date(now - 1800000).toISOString() },
			]);
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
