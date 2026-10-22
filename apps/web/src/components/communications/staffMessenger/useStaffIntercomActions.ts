import { INTERCOM_PRESETS, type IntercomPresetKey, type StaffChatChannel, type StaffChatMessage } from "@dental/shared";
import type React from "react";
import { useCallback, useState } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { playIntercomChime } from "../../../lib/intercomSound";
import { showToast } from "../../GlobalToast";
import type { IntercomAckType, MobileViewMode } from "./types";

export function useStaffIntercomActions(
	channels: StaffChatChannel[],
	setChannels: React.Dispatch<React.SetStateAction<StaffChatChannel[]>>,
	activeChannelId: string | null,
	setActiveChannelId: (id: string) => void,
	setMessages: React.Dispatch<React.SetStateAction<StaffChatMessage[]>>,
	selectedLocation: string,
	setMobileView: (mode: MobileViewMode) => void,
) {
	const [quickNotePrompt, setQuickNotePrompt] = useState<string | null>(null);
	const [quickNoteText, setQuickNoteText] = useState("");

	const handleIntercomPing = useCallback(async (presetKey: IntercomPresetKey, customNote?: string) => {
		try {
			const headers = getDenteAuthHeaders({ "Content-Type": "application/json" });
			const res = await fetch("/api/staff-chat/intercom-ping", {
				method: "POST", headers,
				body: JSON.stringify({ presetKey, cabinetNumber: selectedLocation, customNote }),
			});
			if (res.ok) {
				const data = await res.json();
				playIntercomChime(presetKey === "urgent_doctor_call" ? "critical" : "urgent");
				showToast(`Интерком: ${INTERCOM_PRESETS[presetKey].label} отправлен!`, "success");
				const targetCh = channels.find((c) => c.slug === data.channelSlug);
				if (targetCh) {
					setActiveChannelId(targetCh.id);
					setMobileView("chat");
				}
				const current = channels.find((c) => c.id === activeChannelId);
				if (current?.slug === data.channelSlug) {
					setMessages((prev) => [...prev, data.message]);
				}
			} else {
				showToast("Ошибка интеркома", "warning");
			}
		} catch (e) {
			console.error("Ошибка интеркома:", e);
			showToast("Сетевая ошибка интеркома", "error");
		} finally {
			setQuickNotePrompt(null);
			setQuickNoteText("");
		}
	}, [channels, activeChannelId, selectedLocation, setActiveChannelId, setMessages, setMobileView]);

	const handleIntercomAck = useCallback(async (messageId: string, ackType: IntercomAckType) => {
		try {
			const headers = getDenteAuthHeaders({ "Content-Type": "application/json" });
			const res = await fetch("/api/staff-chat/intercom-ack", {
				method: "POST", headers, body: JSON.stringify({ messageId, ackType }),
			});
			if (res.ok) {
				const data = await res.json();
				playIntercomChime("normal");
				showToast(ackType === "on_my_way" ? "Статус: Иду! (1 мин) передан врачу" : ackType === "coming_soon" ? "Статус: Через 3-5 мин передан" : "Статус: Занят передан", "success");
				setMessages((prev) => prev.map((m) => (m.id === messageId ? data.message : m)));
			}
		} catch (e) {
			console.error("Ошибка подтверждения:", e);
		}
	}, [setMessages]);

	const handleOpenDirectChat = useCallback(async (targetUserId: string) => {
		try {
			const headers = getDenteAuthHeaders({ "Content-Type": "application/json" });
			const res = await fetch("/api/staff-chat/channels/direct", {
				method: "POST", headers, body: JSON.stringify({ targetUserId }),
			});
			if (res.ok) {
				const data = await res.json();
				setChannels((prev) => (prev.some((c) => c.id === data.channel.id) ? prev : [...prev, data.channel]));
				setActiveChannelId(data.channel.id);
				setMobileView("chat");
			}
		} catch (e) {
			console.error("Ошибка открытия чата:", e);
		}
	}, [setChannels, setActiveChannelId, setMobileView]);

	return {
		quickNotePrompt, setQuickNotePrompt, quickNoteText, setQuickNoteText,
		handleIntercomPing, handleIntercomAck, handleOpenDirectChat,
	};
}
