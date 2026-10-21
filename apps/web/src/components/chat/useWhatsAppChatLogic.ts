import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	buildQuickTemplates,
	type QuickTemplateItem,
} from "./whatsAppChatTemplates";
import type { ChatMessage, WhatsAppChatPanelProps } from "./WhatsAppChatPanel";
import { useWhatsAppPatientDetails } from "./useWhatsAppPatientDetails";

let chatMsgSeq = 0;

export function useWhatsAppChatLogic(props: WhatsAppChatPanelProps) {
	const {
		dashboard,
		effectivePatientId,
		patient,
		effectivePhone,
		effectiveName,
		formattedPhone,
		initials,
		avatarColors,
		financialSummary,
		upcomingAppointment,
		activeTreatmentPlan,
	} = useWhatsAppPatientDetails(props);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "telegram" | "sms">("whatsapp");
	const [inputText, setInputText] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [selectedChipTemplate, setSelectedChipTemplate] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	const fetchThread = useCallback(async () => {
		if (!effectivePatientId) {
			setMessages([]);
			return;
		}
		setIsLoading(true);
		try {
			const res = await fetch(
				`/api/communications/inbox/${encodeURIComponent(effectivePatientId)}`,
				{ headers: denteAdminSecretRequestHeaders() },
			);
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data)
					? data
					: Array.isArray(data.messages)
						? data.messages
						: [];
				const parsed: ChatMessage[] = list.map((m: any) => ({
					id: m.id || `msg-${Date.now()}-${++chatMsgSeq}`,
					sender: m.direction === "inbound" ? "patient" : "clinic",
					senderName: m.direction === "inbound" ? (m.patientName || effectiveName) : "DENTE Администратор",
					text: m.message || m.bodyText || "",
					timestamp: m.createdAt || new Date().toISOString(),
					status: m.direction === "inbound" ? undefined : (m.status === "failed" ? "failed" : (m.status === "delivered" || m.status === "read" ? m.status : "sent")),
				}));
				setMessages(parsed);
			} else {
				setMessages([]);
			}
		} catch (err) {
			console.error("Failed to load WhatsApp conversation thread:", err);
			setMessages([]);
		} finally {
			setIsLoading(false);
		}
	}, [effectivePatientId, effectiveName]);

	useEffect(() => {
		void fetchThread();
	}, [fetchThread]);

	const quickTemplates = useMemo(() => {
		return buildQuickTemplates({
			clinicName: dashboard?.clinicSettings?.name || "клинику DENTE",
			clinicAddress: dashboard?.clinicSettings?.address || "г. Москва, ул. Клиническая, 10",
			clinicPhone: dashboard?.clinicSettings?.phone,
			effectiveName,
			upcomingAppointment,
			financialSummary,
			activeTreatmentPlan,
		});
	}, [dashboard?.clinicSettings, upcomingAppointment, effectiveName, financialSummary, activeTreatmentPlan]);

	const handleApplyTemplate = (tmpl?: QuickTemplateItem) => {
		if (!tmpl) return;
		setInputText(tmpl.buildText());
		setSelectedChipTemplate(tmpl.id);
		textareaRef.current?.focus();
		showToast("Шаблон подготовлен к отправке", "info");
	};

	const dispatchMessage = async (text: string, templateLabel?: string) => {
		if (isSending) return;
		const newMsgId = `msg-${Date.now()}-${++chatMsgSeq}`;
		const newMsg: ChatMessage = {
			id: newMsgId,
			sender: "clinic",
			senderName: "DENTE Администратор",
			text,
			timestamp: new Date().toISOString(),
			status: "sent",
		};

		setMessages((prev) => [...prev, newMsg]);
		setInputText("");
		setSelectedChipTemplate(null);
		setIsSending(true);

		try {
			if (effectivePatientId) {
				const res = await fetch(
					`/api/communications/inbox/${encodeURIComponent(effectivePatientId)}/send`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({ message: text, channel: selectedChannel }),
					},
				);
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					showToast(data.message || (templateLabel ? "Ошибка отправки шаблона через шлюз" : "Ошибка отправки сообщения через шлюз"), "error");
					setMessages((prev) => prev.map((m) => (m.id === newMsgId ? { ...m, status: "failed" } : m)));
					return;
				}
				const data = await res.json().catch(() => ({}));
				if (data.warning) showToast(data.warning, "info");
			}
			showToast(
				templateLabel
					? `Шаблон «${templateLabel}» отправлен (${selectedChannel.toUpperCase()})`
					: "Сообщение отправлено",
				"success",
			);
		} catch (err) {
			console.error("Failed to send message via API:", err);
			showToast(templateLabel ? "Сбой сети при отправке шаблона" : "Сбой сети при отправке сообщения", "error");
			setMessages((prev) => prev.map((m) => (m.id === newMsgId ? { ...m, status: "failed" } : m)));
		} finally {
			setIsSending(false);
		}
	};

	const handleDirectSendTemplate = async (tmpl?: QuickTemplateItem) => {
		if (!tmpl) return;
		await dispatchMessage(tmpl.buildText(), tmpl.label);
	};

	const handleSendMessage = async () => {
		const text = inputText.trim();
		if (!text) {
			const preset =
				"Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Если у вас возникли вопросы, пожалуйста, сообщите нам.";
			setInputText(preset);
			textareaRef.current?.focus();
			showToast("Подставлен стандартный шаблон напоминания. Нажмите Enter или «Отправить»", "info");
			return;
		}
		await dispatchMessage(text);
	};

	const handleLaunchWhatsAppNative = () => {
		const text =
			inputText.trim() ||
			`Здравствуйте, ${effectiveName}! Вас приветствует стоматология ${dashboard?.clinicSettings?.name || "DENTE"}.`;
		openWhatsAppChat(effectivePhone, text);
		showToast(`Открыт диалог в WhatsApp (${effectiveName})`, "info");
	};

	const handleAttachFile = (file: File) => {
		setInputText((prev) => (prev ? `${prev}\n[Вложение: ${file.name}]` : `[Вложение: ${file.name}]`));
		showToast(`Файл «${file.name}» (${Math.round(file.size / 1024)} КБ) прикреплен к сообщению`, "info");
	};

	const handleCallPatient = () => {
		const cleanDigits = effectivePhone.replace(/[^\d+]/g, "");
		if (cleanDigits) {
			window.open(`tel:${cleanDigits}`, "_self");
			showToast(`Набор номера: ${formattedPhone || effectivePhone}`, "info");
		} else {
			showToast("Номер телефона пациента не указан", "warning");
		}
	};

	const filteredMessages = useMemo(() => {
		if (!searchQuery.trim()) return messages;
		const q = searchQuery.toLowerCase();
		return messages.filter((m) => m.text.toLowerCase().includes(q));
	}, [messages, searchQuery]);

	return {
		patient,
		effectivePhone,
		effectiveName,
		formattedPhone,
		initials,
		avatarColors,
		financialSummary,
		upcomingAppointment,
		messages,
		isLoading,
		isSending,
		selectedChannel,
		setSelectedChannel,
		inputText,
		setInputText,
		searchQuery,
		setSearchQuery,
		isSearchOpen,
		setIsSearchOpen,
		selectedChipTemplate,
		messagesEndRef,
		textareaRef,
		quickTemplates,
		fetchThread,
		handleApplyTemplate,
		handleDirectSendTemplate,
		handleSendMessage,
		handleAttachFile,
		handleLaunchWhatsAppNative,
		handleCallPatient,
		filteredMessages,
	};
}
