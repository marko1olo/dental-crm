import type React from "react";
import { useCallback, useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import {
	isPlainRecord,
	parseJsonEnvelope,
	readApiErrorMessage,
} from "../../../lib/apiResponseHandler";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import type { QuickTemplateItem } from "../../chat/whatsAppChatTemplates";
import type { ChatChannel, MobileChatMessageItem } from "./types";

interface MobileSendPayload {
	readonly warning?: string | undefined;
	readonly event?: { readonly status?: MobileChatMessageItem["status"] | undefined } | undefined;
}

function isMobileSendPayload(value: unknown): value is MobileSendPayload {
	return isPlainRecord(value);
}

interface MobileUploadPayload {
	readonly ok?: boolean | undefined;
	readonly mediaUrl?: string | undefined;
	readonly message?: string | undefined;
}

function isMobileUploadPayload(value: unknown): value is MobileUploadPayload {
	return isPlainRecord(value);
}

export function useMobileMessageSender(
	selectedPatientId: string | null,
	setChatMessages: React.Dispatch<React.SetStateAction<MobileChatMessageItem[]>>,
	communicationChannelLabels: Record<string, string>,
	quickTemplates: QuickTemplateItem[],
) {
	const [inputText, setInputText] = useState("");
	const [activeChannel, setActiveChannel] = useState<ChatChannel>("whatsapp");
	const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
	const [attachedMediaUrl, setAttachedMediaUrl] = useState<string | null>(null);
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const handleApplyTemplate = useCallback((tmpl: QuickTemplateItem) => {
		setInputText(tmpl.buildText());
		textareaRef.current?.focus();
		showToast(`Шаблон «${tmpl.label}» добавлен в поле ввода`, "info");
	}, []);

	const handleSendMessage = useCallback(async () => {
		const text = inputText.trim();
		if (!text && !attachedMediaUrl) {
			const defTmpl = quickTemplates[0];
			if (defTmpl) handleApplyTemplate(defTmpl);
			return;
		}
		if (!selectedPatientId || isSendingMessage) return;

		const fullText = attachedMediaUrl
			? `${text ? text + "\n" : ""}[Прикреплен файл: ${attachedFileName || "документ"}] ${attachedMediaUrl}`
			: text;
		const newMsg: MobileChatMessageItem = {
			id: `mobile-msg-${Date.now()}`,
			patientId: selectedPatientId,
			text: fullText,
			direction: "outbound",
			channel: activeChannel,
			timestamp: new Date().toISOString(),
			status: "sent",
		};

		setChatMessages((prev) => [...prev, newMsg]);
		setInputText("");
		setAttachedFileName(null);
		setAttachedMediaUrl(null);
		setIsSendingMessage(true);

		try {
			const res = await fetch(`/api/communications/inbox/${encodeURIComponent(selectedPatientId)}/send`, {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({ message: fullText, channel: activeChannel }),
			});
			if (!res.ok) {
				const errMsg = await readApiErrorMessage(res, "Ошибка отправки через шлюз");
				clientLogger.warn("[useMobileMessageSender] Ошибка отправки сообщения", { status: res.status, message: errMsg }, { module: "Chat" });
				showToast(errMsg, "error");
				setChatMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: "failed" } : m)));
				return;
			}
			const data = await parseJsonEnvelope(
				res,
				isMobileSendPayload,
				"Ошибка отправки через шлюз",
			);
			if (data.warning) showToast(data.warning, "info");
			setChatMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: data.event?.status ?? "sent" } : m)));
			showToast(`Сообщение отправлено в ${communicationChannelLabels[activeChannel] || activeChannel}`, "success");
		} catch (err) {
			clientLogger.error("Failed to send mobile message via API:", err);
			showToast("Сбой сети при отправке сообщения", "error");
			setChatMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: "failed" } : m)));
		} finally {
			setIsSendingMessage(false);
		}
	}, [inputText, attachedMediaUrl, attachedFileName, selectedPatientId, isSendingMessage, activeChannel, quickTemplates, handleApplyTemplate, communicationChannelLabels, setChatMessages]);

	const handleToggleChannel = useCallback(() => {
		setActiveChannel((prev) => (prev === "whatsapp" ? "telegram" : prev === "telegram" ? "sms" : "whatsapp"));
		showToast(`Канал переключен на ${activeChannel === "whatsapp" ? "Telegram" : activeChannel === "telegram" ? "SMS" : "WhatsApp"}`, "info");
	}, [activeChannel]);

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const target = e.target;
			const file = target.files?.[0];
			if (file) {
				if (!selectedPatientId) {
					showToast("Для отправки файла выберите диалог с пациентом", "warning");
					target.value = "";
					return;
				}
				if (file.size > 16 * 1024 * 1024) {
					showToast("Максимальный размер вложения — 16 МБ", "error");
					target.value = "";
					return;
				}
				const reader = new FileReader();
				reader.onload = async () => {
					const result = reader.result;
					if (typeof result !== "string") return;
					const base64Data = result.includes(",") ? result.split(",")[1] : result;
					if (!base64Data) return;

					showToast(`Загрузка «${file.name}»...`, "info");
					try {
						const res = await fetch("/api/whatsapp/media/upload", {
							method: "POST",
							headers: denteClinicalMutationHeaders({
								"Content-Type": "application/json",
								"Idempotency-Key": generateUuidV7(),
							}),
							body: JSON.stringify({
								patientId: selectedPatientId,
								fileName: file.name,
								mimeType: file.type || "application/octet-stream",
								base64Data,
							}),
						});
						if (!res.ok) {
							const errMsg = await readApiErrorMessage(res, "Ошибка загрузки файла");
							clientLogger.warn("[useMobileMessageSender] Ошибка загрузки файла", { status: res.status, message: errMsg }, { module: "Chat" });
							showToast(errMsg, "error");
							return;
						}
						const data = await parseJsonEnvelope(
							res,
							isMobileUploadPayload,
							"Ошибка загрузки файла",
						);
						if (data.mediaUrl) {
							setAttachedFileName(file.name);
							setAttachedMediaUrl(data.mediaUrl);
							showToast(`Файл «${file.name}» загружен и прикреплен`, "success");
						} else {
							showToast(data.message || "Ошибка загрузки файла", "error");
						}
					} catch (err: unknown) {
						clientLogger.warn("[useMobileMessageSender] Сбой сети при загрузке файла", err, { module: "Chat" });
						showToast("Сбой сети при загрузке файла", "error");
					}
				};
				reader.readAsDataURL(file);
			}
			target.value = "";
		},
		[selectedPatientId],
	);

	const handleAttachFile = useCallback(() => {
		if (fileInputRef.current) {
			fileInputRef.current.click();
			return;
		}
		const input = document.getElementById("mobile-chat-file-input");
		if (input instanceof HTMLInputElement) {
			input.click();
		}
	}, []);

	return {
		inputText, setInputText, activeChannel, setActiveChannel,
		attachedFileName, setAttachedFileName, isSendingMessage,
		handleSendMessage, handleToggleChannel, handleAttachFile,
		handleFileChange, fileInputRef,
		handleRemoveAttachedFile: () => {
			setAttachedFileName(null);
			setAttachedMediaUrl(null);
		},
		handleApplyTemplate, textareaRef,
	};
}
