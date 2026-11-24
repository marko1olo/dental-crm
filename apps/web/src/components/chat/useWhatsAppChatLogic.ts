import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { initiateOutboundCall } from "../telephony/initiateOutboundCall";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { clientLogger } from "../../services/logging/clientLogger";
import {
	buildQuickTemplates,
	type QuickTemplateItem,
} from "./whatsAppChatTemplates";
import type { ChatMessage, WhatsAppChatPanelProps } from "./WhatsAppChatPanel";
import { useWhatsAppPatientDetails } from "./useWhatsAppPatientDetails";

let chatMsgSeq = 0;

interface RawInboxMessage {
	id?: string;
	patientId?: string;
	patientName?: string;
	message?: string;
	bodyText?: string;
	channel?: string;
	direction?: string;
	status?: string;
	createdAt?: string;
}

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
	const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "telegram" | "max" | "sms">("whatsapp");
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
				const data = (await res.json()) as
					| RawInboxMessage[]
					| { messages?: RawInboxMessage[] };
				const list = (Array.isArray(data)
					? data
					: Array.isArray(data.messages)
						? data.messages
						: []) as RawInboxMessage[];
				const parsed: ChatMessage[] = list.map((m, idx) => {
					const sender = m.direction === "inbound" ? "patient" : "clinic";
					const senderName: string =
						m.direction === "inbound"
							? String(m.patientName || effectiveName || "Пациент клиники")
							: "DENTE Администратор";
					const status =
						m.direction === "inbound"
							? undefined
							: m.status === "failed"
								? ("failed" as const)
								: m.status === "delivered" || m.status === "read"
									? (m.status as "delivered" | "read")
									: ("sent" as const);
					return {
						id: m.id || `msg-${Date.now()}-${idx}-${++chatMsgSeq}`,
						sender,
						senderName,
						text: m.message || m.bodyText || "",
						timestamp: m.createdAt || new Date().toISOString(),
						...(status !== undefined ? { status } : {}),
					};
				});
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
		const profile = dashboard?.clinicSettings?.profile;
		return buildQuickTemplates({
			clinicName: profile?.clinicName || dashboard?.clinicName || "стоматологии",
			clinicAddress: profile?.address || "Адрес клиники",
			clinicPhone: profile?.phone ?? undefined,
			effectiveName,
			upcomingAppointment,
			financialSummary,
			activeTreatmentPlan,
		});
	}, [dashboard?.clinicSettings, dashboard?.clinicName, upcomingAppointment, effectiveName, financialSummary, activeTreatmentPlan]);

	const handleApplyTemplate = (tmpl?: QuickTemplateItem) => {
		if (!tmpl) return;
		setInputText(tmpl.buildText());
		setSelectedChipTemplate(tmpl.id);
		textareaRef.current?.focus();
		showToast("Шаблон подготовлен к отправке", "info");
	};

	const dispatchMessage = async (
		text: string,
		templateLabel?: string,
		options?: { templateName?: string; intent?: string; languageCode?: string },
	) => {
		if (isSending) return;
		if (!effectivePatientId) {
			showToast("Для отправки сообщений требуется привязать или создать карту пациента", "warning");
			return;
		}
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
			const payload: Record<string, unknown> = {
				message: text,
				channel: selectedChannel,
			};
			if (options?.templateName) payload.templateName = options.templateName;
			if (options?.intent) payload.intent = options.intent;
			if (options?.languageCode) payload.languageCode = options.languageCode;

			const res = await fetch(
				`/api/communications/inbox/${encodeURIComponent(effectivePatientId)}/send`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify(payload),
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
		await dispatchMessage(tmpl.buildText(), tmpl.label, {
			templateName: tmpl.id,
			...(tmpl.intent !== undefined ? { intent: tmpl.intent } : {}),
		});
	};

	const handleSendMessage = async () => {
		const text = inputText.trim();
		if (!text) {
			const reminderTmpl = quickTemplates.find((t) => t.id === "appt_reminder") ?? quickTemplates[0];
			if (reminderTmpl) {
				setInputText(reminderTmpl.buildText());
				textareaRef.current?.focus();
				showToast("Подставлен шаблон быстрого ответа. Нажмите Enter или «Отправить»", "info");
			} else {
				const profile = dashboard?.clinicSettings?.profile;
				const clinicName = profile?.clinicName || dashboard?.clinicName;
				const clinicSuffix = clinicName ? ` в клинику ${clinicName}` : "";
				const preset = `Здравствуйте! Напоминаем о вашей записи на приём${clinicSuffix}. Если у вас возникли вопросы, пожалуйста, сообщите нам.`;
				setInputText(preset);
				textareaRef.current?.focus();
				showToast("Подставлен шаблон напоминания. Нажмите Enter или «Отправить»", "info");
			}
			return;
		}
		await dispatchMessage(text);
	};

	const handleLaunchWhatsAppNative = () => {
		const clinicName = dashboard?.clinicSettings?.profile?.clinicName || dashboard?.clinicName || "";
		const clinicSuffix = clinicName ? ` ${clinicName}` : "";
		const text =
			inputText.trim() ||
			`Здравствуйте, ${effectiveName}! Вас приветствует стоматология${clinicSuffix}.`;
		openWhatsAppChat(effectivePhone, text);
		showToast(`Открыт диалог в WhatsApp (${effectiveName})`, "info");
	};

	const handleAttachFile = (file: File) => {
		if (!effectivePatientId) {
			showToast(
				"Для отправки файлов требуется привязать карту пациента",
				"warning",
			);
			return;
		}

		const reader = new FileReader();
		reader.onload = async () => {
			const result = reader.result;
			if (typeof result !== "string") return;
			const base64Data = result.includes(",") ? result.split(",")[1] : result;
			if (!base64Data) return;

			showToast(`Загрузка файла «${file.name}»...`, "info");
			try {
				const res = await fetch("/api/whatsapp/media/upload", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						patientId: effectivePatientId,
						fileName: file.name,
						mimeType: file.type || "application/octet-stream",
						base64Data,
					}),
				});

				const data = (await res.json().catch(() => ({}))) as {
					ok?: boolean;
					mediaUrl?: string;
					message?: string;
				};

				if (res.ok && data.mediaUrl) {
					const fullAttachmentText = `[Вложение: ${file.name}] ${data.mediaUrl}`;
					setInputText((prev) =>
						prev ? `${prev}\n${fullAttachmentText}` : fullAttachmentText,
					);
					showToast(`Файл «${file.name}» загружен и прикреплен`, "success");
				} else {
					showToast(
						data.message || "Ошибка загрузки файла на сервер",
						"error",
					);
				}
			} catch (err) {
				console.error("Failed to upload WhatsApp media file:", err);
				showToast("Сбой сети при загрузке файла", "error");
			}
		};
		reader.onerror = () => {
			showToast("Ошибка чтения файла с диска", "error");
		};
		reader.readAsDataURL(file);
	};

	const handleCallPatient = () => {
		if (effectivePhone?.trim()) {
			void initiateOutboundCall({
				phone: effectivePhone,
				patientName: effectiveName,
				patientId: effectivePatientId,
			});
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
