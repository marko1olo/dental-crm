import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type {
	BotChannel,
	ChatMessageItem,
	DoctorOption,
	InboxConversation,
	OmnichannelOperatorDeskProps,
} from "./types";

export function useOmnichannelOperatorDesk({
	onOpenPatientCard,
	onBookAppointment,
}: OmnichannelOperatorDeskProps = {}) {
	// Conversations list
	const [conversations, setConversations] = useState<InboxConversation[]>([]);
	const [isLoadingList, setIsLoadingList] = useState(false);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);

	// Быстрая запись на прием из чата (Мандат 8e)
	const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
	const [bookingDate, setBookingDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		return d.toISOString().split("T")[0]!;
	});
	const [bookingTime, setBookingTime] = useState("11:00");
	const [bookingReason, setBookingReason] = useState("Первичная консультация и осмотр");
	const [bookingDoctorId, setBookingDoctorId] = useState<string>("");
	const [bookingSendConfirmation, setBookingSendConfirmation] = useState(true);
	const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

	// Быстрое создание / привязка карты пациента (Мандат 8e)
	const [isLinkPatientModalOpen, setIsLinkPatientModalOpen] = useState(false);
	const [newPatientFullName, setNewPatientFullName] = useState("");
	const [newPatientPhone, setNewPatientPhone] = useState("");
	const [isLinkingSubmitting, setIsLinkingSubmitting] = useState(false);

	// Список врачей для назначения
	const [doctorsList] = useState<DoctorOption[]>([
		{ id: "doc-1", fullName: "Смирнова Елена Александровна (Терапевт)" },
		{ id: "doc-2", fullName: "Ковалев Дмитрий Сергеевич (Хирург-имплантолог)" },
		{ id: "doc-3", fullName: "Иванова Ольга Петровна (Ортодонт)" },
	]);

	// Filters & Search
	const [channelFilter, setChannelFilter] = useState<"all" | BotChannel>("all");
	const [statusFilter, setStatusFilter] = useState<"all" | "intercepted" | "bot">("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Active conversation messages
	const [messages, setMessages] = useState<ChatMessageItem[]>([]);
	const [isLoadingMessages, setIsLoadingMessages] = useState(false);
	const [inputText, setInputText] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [operatorName, setOperatorName] = useState("Оператор клиники");

	// Mobile view support: toggle conversation stream
	const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);

	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	const activeConv = useMemo(() => {
		return conversations.find((c) => c.key === selectedKey) || null;
	}, [conversations, selectedKey]);

	const selectedKeyRef = useRef<string | null>(null);
	selectedKeyRef.current = selectedKey;

	// ─── 1. Fetch Conversations List from GET /api/bots/inbox ───
	const fetchConversations = useCallback(async () => {
		setIsLoadingList(true);
		try {
			const res = await fetch("/api/bots/inbox", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.conversations)) {
					setConversations(data.conversations);
					if (data.conversations.length > 0 && !selectedKeyRef.current) {
						setSelectedKey(data.conversations[0].key);
					}
				}
			}
		} catch (err) {
			console.warn("[OmnichannelOperatorDesk] Error fetching inbox:", err);
		} finally {
			setIsLoadingList(false);
		}
	}, []);

	useEffect(() => {
		fetchConversations();
		const interval = setInterval(fetchConversations, 8000);
		return () => clearInterval(interval);
	}, [fetchConversations]);

	// ─── 2. Fetch Messages for Selected Conversation ───
	const fetchMessages = useCallback(async (conv: InboxConversation, showLoading = true) => {
		if (showLoading) setIsLoadingMessages(true);
		try {
			const res = await fetch(
				`/api/bots/inbox/${encodeURIComponent(conv.senderId)}/messages?channel=${conv.channel}`,
				{ headers: denteAdminSecretRequestHeaders() },
			);
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.messages)) {
					setMessages(data.messages);
				}
				if (data.intercept) {
					setConversations((prev) => {
						const current = prev.find((c) => c.key === conv.key);
						if (
							current &&
							current.isIntercepted === Boolean(data.intercept.isIntercepted) &&
							current.interceptedBy === (data.intercept.interceptedBy || null)
						) {
							return prev;
						}
						return prev.map((c) =>
							c.key === conv.key
								? {
										...c,
										isIntercepted: Boolean(data.intercept.isIntercepted),
										interceptedBy: data.intercept.interceptedBy || null,
									}
								: c,
						);
					});
				}
			}
		} catch (err) {
			console.warn("[OmnichannelOperatorDesk] Error fetching messages:", err);
		} finally {
			if (showLoading) setIsLoadingMessages(false);
		}
	}, []);

	const lastFetchedKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!selectedKey) {
			setMessages([]);
			lastFetchedKeyRef.current = null;
			return;
		}
		const target = conversations.find((c) => c.key === selectedKey);
		if (target && lastFetchedKeyRef.current !== selectedKey) {
			lastFetchedKeyRef.current = selectedKey;
			fetchMessages(target, true);
		}
	}, [selectedKey, conversations, fetchMessages]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// ─── 3. Filtered Conversations ───
	const filteredConversations = useMemo(() => {
		return conversations.filter((c) => {
			if (channelFilter !== "all" && c.channel !== channelFilter) return false;
			if (statusFilter === "intercepted" && !c.isIntercepted) return false;
			if (statusFilter === "bot" && c.isIntercepted) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = c.patientName.toLowerCase().includes(q) || c.senderName.toLowerCase().includes(q);
				const matchPhone = c.phone ? c.phone.includes(q) : false;
				const matchSender = c.senderId.toLowerCase().includes(q);
				const matchMsg = c.lastMessage.toLowerCase().includes(q);
				if (!matchName && !matchPhone && !matchSender && !matchMsg) return false;
			}
			return true;
		});
	}, [conversations, channelFilter, statusFilter, searchQuery]);

	// ─── 4. Takeover / Release Handlers ───
	const handleTakeover = async () => {
		if (!activeConv) return;
		try {
			const res = await fetch(`/api/bots/chats/${encodeURIComponent(activeConv.senderId)}/takeover`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: activeConv.channel,
					operatorName,
				}),
			});
			if (res.ok) {
				showToast("Диалог перехвачен! Автоответчик бота поставлен на паузу.", "success");
				setConversations((prev) =>
					prev.map((c) =>
						c.key === activeConv.key
							? { ...c, isIntercepted: true, interceptedBy: operatorName }
							: c,
					),
				);
			} else {
				showToast("Ошибка при перехвате диалога", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при перехвате диалога", "error");
		}
	};

	const handleRelease = async () => {
		if (!activeConv) return;
		try {
			const res = await fetch(`/api/bots/chats/${encodeURIComponent(activeConv.senderId)}/release`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: activeConv.channel,
				}),
			});
			if (res.ok) {
				showToast("Диалог возвращён боту. Автоответчик возобновил работу.", "info");
				setConversations((prev) =>
					prev.map((c) =>
						c.key === activeConv.key
							? { ...c, isIntercepted: false, interceptedBy: null }
							: c,
					),
				);
			} else {
				showToast("Ошибка при возврате диалога боту", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка", "error");
		}
	};

	// ─── 5. Send Operator Message ───
	const handleSendMessage = async (textToSend?: string) => {
		const message = (textToSend ?? inputText).trim();
		if (!message || !activeConv || isSending) return;

		setIsSending(true);
		try {
			const res = await fetch("/api/bots/send-message", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: activeConv.channel,
					senderId: activeConv.senderId,
					message,
					operatorName,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				setInputText("");
				showToast("Сообщение отправлено пациенту", "success");
				// Optimistically append message
				const newMsg: ChatMessageItem = {
					id: data.messageId || `op-${Date.now()}`,
					channel: activeConv.channel,
					senderId: activeConv.senderId,
					direction: "outbound",
					sender: "operator",
					senderName: operatorName,
					text: message,
					createdAt: new Date().toISOString(),
				};
				setMessages((prev) => [...prev, newMsg]);
				// Ensure activeConv marked intercepted
				setConversations((prev) =>
					prev.map((c) =>
						c.key === activeConv.key
							? {
									...c,
									lastMessage: message,
									lastMessageAt: new Date().toISOString(),
									lastMessageDirection: "outbound",
									isIntercepted: true,
									interceptedBy: operatorName,
								}
							: c,
					),
				);
			} else {
				showToast(data.message || "Не удалось отправить сообщение", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка отправки", "error");
		} finally {
			setIsSending(false);
		}
	};

	// ─── 6. Simulate Incoming Message (Demo & Test Trigger) ───
	const handleSimulateIncoming = async () => {
		try {
			const randomChannels: BotChannel[] = ["telegram", "vk", "whatsapp", "max"];
			const ch = randomChannels[Math.floor(Math.random() * randomChannels.length)]!;
			const testNames = [
				"Алексей Николаевич С.",
				"Мария Дмитриевна В.",
				"Сергей Павлович К.",
				"Елена Александровна Т.",
			];
			const randomName = testNames[Math.floor(Math.random() * testNames.length)]!;
			const randomPhone = `79${Math.floor(100000000 + Math.random() * 900000000)}`;
			const testPhrases = [
				"Здравствуйте! Подскажите, есть ли свободное окно к терапевту на завтра?",
				"Добрый день! Сколько стоит профессиональная гигиена полости рта?",
				"Здравствуйте! Сильно разболелся зуб после пломбы, можно записаться на осмотр?",
				"Добрый день! Хочу проконсультироваться по установке импланта.",
			];
			const randomText = testPhrases[Math.floor(Math.random() * testPhrases.length)]!;

			const res = await fetch("/api/bots/test-incoming", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: ch,
					senderId: randomPhone,
					senderName: randomName,
					text: randomText,
				}),
			});

			if (res.ok) {
				showToast(`Тестовое сообщение от ${randomName} (${ch.toUpperCase()}) создано!`, "success");
				await fetchConversations();
			}
		} catch {
			showToast("Ошибка симуляции сообщения", "error");
		}
	};

	// ─── 7. Quick Booking Handler (Mandate 8e) ───
	const handleQuickBookingSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeConv) return;

		if (onBookAppointment) {
			onBookAppointment({
				patientId: activeConv.patientId,
				patientName: activeConv.patientName,
				phone: activeConv.phone,
			});
			setIsQuickBookingOpen(false);
			return;
		}

		if (!activeConv.patientId) {
			showToast("Сначала привяжите диалог к карте пациента", "warning");
			setIsQuickBookingOpen(false);
			setIsLinkPatientModalOpen(true);
			return;
		}

		setIsBookingSubmitting(true);
		try {
			const startsAt = `${bookingDate}T${bookingTime}:00Z`;
			const [hours, minutes] = bookingTime.split(":").map(Number);
			const endMinutes = ((minutes ?? 0) + 45) % 60;
			const endHours = (hours ?? 10) + Math.floor(((minutes ?? 0) + 45) / 60);
			const endsAt = `${bookingDate}T${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:00Z`;

			const res = await fetch(`/api/bots/chats/${encodeURIComponent(activeConv.senderId)}/book-appointment`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: activeConv.channel,
					patientId: activeConv.patientId,
					doctorUserId: bookingDoctorId || undefined,
					startsAt,
					endsAt,
					reason: bookingReason,
					sendConfirmationToChat: bookingSendConfirmation,
					operatorName,
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok) {
				showToast("✓ Запись на приём оформлена! Пациент уведомлен в чате.", "success");
				setIsQuickBookingOpen(false);
				await fetchMessages(activeConv, false);
			} else {
				showToast(data.message || "Ошибка при создании записи", "error");
			}
		} catch {
			showToast("Сетевая ошибка при бронировании приёма", "error");
		} finally {
			setIsBookingSubmitting(false);
		}
	};

	// ─── 8. Link Patient Handler (Mandate 8e) ───
	const handleLinkPatientSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeConv) return;
		const name = newPatientFullName.trim() || activeConv.senderName;
		if (!name) {
			showToast("Укажите ФИО пациента", "warning");
			return;
		}

		setIsLinkingSubmitting(true);
		try {
			const res = await fetch(`/api/bots/chats/${encodeURIComponent(activeConv.senderId)}/link-patient`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: activeConv.channel,
					createNew: {
						fullName: name,
						phone: newPatientPhone.trim() || activeConv.phone,
					},
				}),
			});

			const data = await res.json();
			if (res.ok && data.ok && data.patient) {
				showToast(`✓ Карта пациента ${data.patient.fullName} создана и привязана!`, "success");
				setConversations((prev) =>
					prev.map((c) =>
						c.key === activeConv.key
							? {
									...c,
									patientId: data.patient.id,
									patientName: data.patient.fullName,
									phone: data.patient.phone || c.phone,
								}
							: c,
					),
				);
				setIsLinkPatientModalOpen(false);
			} else {
				showToast(data.message || "Ошибка привязки карты", "error");
			}
		} catch {
			showToast("Сетевая ошибка при создании пациента", "error");
		} finally {
			setIsLinkingSubmitting(false);
		}
	};

	const handleOpenQuickBooking = useCallback(() => {
		if (!activeConv) return;
		if (!activeConv.patientId) {
			setNewPatientFullName(
				activeConv.senderName !== `${activeConv.channel.toUpperCase()} Пациент`
					? activeConv.senderName
					: "",
			);
			setNewPatientPhone(
				activeConv.phone || (activeConv.senderId.startsWith("79") ? `+${activeConv.senderId}` : ""),
			);
			setIsLinkPatientModalOpen(true);
		} else {
			setIsQuickBookingOpen(true);
		}
	}, [activeConv]);

	const handleOpenLinkPatient = useCallback(() => {
		if (!activeConv) return;
		setNewPatientFullName(
			activeConv.senderName !== `${activeConv.channel.toUpperCase()} Пациент`
				? activeConv.senderName
				: "",
		);
		setNewPatientPhone(
			activeConv.phone || (activeConv.senderId.startsWith("79") ? `+${activeConv.senderId}` : ""),
		);
		setIsLinkPatientModalOpen(true);
	}, [activeConv]);

	return {
		conversations,
		setConversations,
		isLoadingList,
		selectedKey,
		setSelectedKey,
		activeConv,
		filteredConversations,
		channelFilter,
		setChannelFilter,
		statusFilter,
		setStatusFilter,
		searchQuery,
		setSearchQuery,
		messages,
		isLoadingMessages,
		inputText,
		setInputText,
		isSending,
		operatorName,
		setOperatorName,
		isMobileThreadOpen,
		setIsMobileThreadOpen,
		messagesEndRef,
		isQuickBookingOpen,
		setIsQuickBookingOpen,
		bookingDate,
		setBookingDate,
		bookingTime,
		setBookingTime,
		bookingReason,
		setBookingReason,
		bookingDoctorId,
		setBookingDoctorId,
		bookingSendConfirmation,
		setBookingSendConfirmation,
		isBookingSubmitting,
		doctorsList,
		isLinkPatientModalOpen,
		setIsLinkPatientModalOpen,
		newPatientFullName,
		setNewPatientFullName,
		newPatientPhone,
		setNewPatientPhone,
		isLinkingSubmitting,
		fetchConversations,
		fetchMessages,
		handleTakeover,
		handleRelease,
		handleSendMessage,
		handleSimulateIncoming,
		handleQuickBookingSubmit,
		handleLinkPatientSubmit,
		handleOpenQuickBooking,
		handleOpenLinkPatient,
	};
}

export type UseOmnichannelOperatorDeskReturn = ReturnType<typeof useOmnichannelOperatorDesk>;
