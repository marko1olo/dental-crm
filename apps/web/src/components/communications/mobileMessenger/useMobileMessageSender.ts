import type React from "react";
import { useCallback, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { QuickTemplateItem } from "../../chat/whatsAppChatTemplates";
import type { ChatChannel, MobileChatMessageItem } from "./types";

export function useMobileMessageSender(
	selectedPatientId: string | null,
	setChatMessages: React.Dispatch<React.SetStateAction<MobileChatMessageItem[]>>,
	communicationChannelLabels: Record<string, string>,
	quickTemplates: QuickTemplateItem[],
) {
	const [inputText, setInputText] = useState("");
	const [activeChannel, setActiveChannel] = useState<ChatChannel>("whatsapp");
	const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const handleApplyTemplate = useCallback((tmpl: QuickTemplateItem) => {
		setInputText(tmpl.buildText());
		textareaRef.current?.focus();
		showToast(`Шаблон «${tmpl.label}» добавлен в поле ввода`, "info");
	}, []);

	const handleSendMessage = useCallback(async () => {
		const text = inputText.trim();
		if (!text && !attachedFileName) {
			const defTmpl = quickTemplates[0];
			if (defTmpl) handleApplyTemplate(defTmpl);
			return;
		}
		if (!selectedPatientId || isSendingMessage) return;

		const fullText = attachedFileName ? `${text ? text + "\n" : ""}[Прикреплен снимок: ${attachedFileName}]` : text;
		const newMsg: MobileChatMessageItem = {
			id: `mobile-msg-${Date.now()}`, patientId: selectedPatientId, text: fullText,
			direction: "outbound", channel: activeChannel, timestamp: new Date().toISOString(), status: "sent",
		};

		setChatMessages((prev) => [...prev, newMsg]);
		setInputText("");
		setAttachedFileName(null);
		setIsSendingMessage(true);

		try {
			const res = await fetch(`/api/communications/inbox/${encodeURIComponent(selectedPatientId)}/send`, {
				method: "POST",
				headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify({ message: fullText, channel: activeChannel }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				showToast(data.message || "Ошибка отправки через шлюз", "error");
				setChatMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: "failed" } : m)));
				return;
			}
			const data = await res.json().catch(() => ({}));
			if (data.warning) showToast(data.warning, "info");
			setChatMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: data.event?.status ?? "sent" } : m)));
			showToast(`Сообщение отправлено в ${communicationChannelLabels[activeChannel] || activeChannel}`, "success");
		} catch (err) {
			console.error("Failed to send mobile message via API:", err);
			showToast("Сбой сети при отправке сообщения", "error");
			setChatMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: "failed" } : m)));
		} finally {
			setIsSendingMessage(false);
		}
	}, [inputText, attachedFileName, selectedPatientId, isSendingMessage, activeChannel, quickTemplates, handleApplyTemplate, communicationChannelLabels, setChatMessages]);

	const handleToggleChannel = useCallback(() => {
		setActiveChannel((prev) => (prev === "whatsapp" ? "telegram" : prev === "telegram" ? "sms" : "whatsapp"));
		showToast(`Канал переключен на ${activeChannel === "whatsapp" ? "Telegram" : activeChannel === "telegram" ? "SMS" : "WhatsApp"}`, "info");
	}, [activeChannel]);

	const handleAttachFile = useCallback(() => {
		setAttachedFileName("Прицельный_снимок_16_зуб.jpg");
		showToast("Прикреплен снимок пациента для отправки", "info");
	}, []);

	return {
		inputText, setInputText, activeChannel, setActiveChannel,
		attachedFileName, setAttachedFileName, isSendingMessage,
		handleSendMessage, handleToggleChannel, handleAttachFile,
		handleRemoveAttachedFile: () => setAttachedFileName(null),
		handleApplyTemplate, textareaRef,
	};
}
