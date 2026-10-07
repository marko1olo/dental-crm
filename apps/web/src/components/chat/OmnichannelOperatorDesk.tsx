import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	ArrowLeft,
	Bot,
	Calendar,
	Check,
	CheckCheck,
	CheckCircle2,
	Clock,
	Filter,
	MessageSquare,
	Phone,
	Plus,
	RefreshCw,
	Search,
	Send,
	Shield,
	Sparkles,
	User,
	UserCheck,
	UserX,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { formatPatientInitials, formatPhoneDisplay, getAvatarColor } from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";

export type BotChannel = "telegram" | "vk" | "whatsapp" | "max";

export interface InboxConversation {
	key: string;
	channel: BotChannel;
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
	interceptedBy: string | null;
	leadId: string | null;
	leadStatus: string | null;
	sourceBadge?: string;
	sourceType?: string;
}

export interface ChatMessageItem {
	id: string;
	channel: string;
	senderId: string;
	direction: "inbound" | "outbound";
	sender: "patient" | "bot" | "operator";
	senderName: string;
	text: string;
	actionExecuted?: string;
	createdAt: string;
}

export const SOURCE_BADGE_CONFIG: Record<
	string,
	{ name: string; badge: string; color: string; bgColor: string; borderColor: string }
> = {
	tg_bot: {
		name: "Telegram Бот",
		badge: "TG Бот",
		color: "#0284c7",
		bgColor: "rgba(2, 132, 199, 0.12)",
		borderColor: "rgba(2, 132, 199, 0.35)",
	},
	tg_account: {
		name: "Telegram Аккаунт",
		badge: "TG Аккаунт",
		color: "#4f46e5",
		bgColor: "rgba(79, 70, 229, 0.12)",
		borderColor: "rgba(79, 70, 229, 0.35)",
	},
	vk_group: {
		name: "VK Группа",
		badge: "VK Группа",
		color: "#0077ff",
		bgColor: "rgba(0, 119, 255, 0.12)",
		borderColor: "rgba(0, 119, 255, 0.35)",
	},
	vk_account: {
		name: "VK Аккаунт",
		badge: "VK Аккаунт",
		color: "#7c3aed",
		bgColor: "rgba(124, 58, 237, 0.12)",
		borderColor: "rgba(124, 58, 237, 0.35)",
	},
	wa_phone: {
		name: "WhatsApp Телефон",
		badge: "WA Телефон",
		color: "#059669",
		bgColor: "rgba(5, 150, 105, 0.12)",
		borderColor: "rgba(5, 150, 105, 0.35)",
	},
	wa_waba: {
		name: "WhatsApp WABA",
		badge: "WA WABA",
		color: "#16a34a",
		bgColor: "rgba(22, 163, 74, 0.12)",
		borderColor: "rgba(22, 163, 74, 0.35)",
	},
	max_bot: {
		name: "MAX by 1C",
		badge: "MAX",
		color: "#9333ea",
		bgColor: "rgba(147, 51, 234, 0.12)",
		borderColor: "rgba(147, 51, 234, 0.35)",
	},
};

export interface SourceBadgeInfo {
	name: string;
	badge: string;
	color: string;
	bgColor: string;
	borderColor: string;
}

export function getSourceBadgeInfo(conv: InboxConversation): SourceBadgeInfo {
	const defaultInfo: SourceBadgeInfo = {
		name: "Telegram Бот",
		badge: "TG Бот",
		color: "#0284c7",
		bgColor: "rgba(2, 132, 199, 0.12)",
		borderColor: "rgba(2, 132, 199, 0.35)",
	};

	if (conv.sourceType && SOURCE_BADGE_CONFIG[conv.sourceType]) {
		return SOURCE_BADGE_CONFIG[conv.sourceType] ?? defaultInfo;
	}
	if (conv.sourceBadge) {
		const matched = Object.values(SOURCE_BADGE_CONFIG).find((cfg) => cfg.badge === conv.sourceBadge);
		if (matched) return matched;
	}
	if (conv.channel === "telegram") return SOURCE_BADGE_CONFIG.tg_bot ?? defaultInfo;
	if (conv.channel === "vk") return SOURCE_BADGE_CONFIG.vk_group ?? defaultInfo;
	if (conv.channel === "whatsapp") return SOURCE_BADGE_CONFIG.wa_phone ?? defaultInfo;
	if (conv.channel === "max") return SOURCE_BADGE_CONFIG.max_bot ?? defaultInfo;
	return defaultInfo;
}

const CHANNEL_CONFIGS: Record<
	BotChannel,
	{ name: string; badge: string; color: string; bgColor: string; borderColor: string }
> = {
	telegram: {
		name: "Telegram",
		badge: "TG",
		color: "#0284c7",
		bgColor: "rgba(2, 132, 199, 0.12)",
		borderColor: "rgba(2, 132, 199, 0.35)",
	},
	vk: {
		name: "ВКонтакте",
		badge: "VK",
		color: "#0077ff",
		bgColor: "rgba(0, 119, 255, 0.12)",
		borderColor: "rgba(0, 119, 255, 0.35)",
	},
	whatsapp: {
		name: "WhatsApp",
		badge: "WA",
		color: "#16a34a",
		bgColor: "rgba(22, 163, 74, 0.12)",
		borderColor: "rgba(22, 163, 74, 0.35)",
	},
	max: {
		name: "MAX (1С)",
		badge: "MAX",
		color: "#7c3aed",
		bgColor: "rgba(124, 58, 237, 0.12)",
		borderColor: "rgba(124, 58, 237, 0.35)",
	},
};

const CLINICAL_QUICK_REPLIES = [
	{ label: "Ждём на приём", text: "Здравствуйте! Напоминаем о вашем визите в клинику DENTE сегодня. Ждём вас!" },
	{ label: "Схема проезда", text: "Наш адрес: ул. Стоматологическая, 12. Парковка во дворе клиники (шлагбаум открываем по звонку)." },
	{ label: "Прайс на приём", text: "Стоимость первичной консультации и осмотра с составлением плана лечения составляет 1 500 ₽." },
	{ label: "Перенос записи", text: "Подскажите, пожалуйста, какой день и временной интервал вам будут удобны для переноса визита?" },
	{ label: "Подтверждение", text: "Пожалуйста, подтвердите ваш визит ответным сообщением «Да» или «1»." },
];

export interface OmnichannelOperatorDeskProps {
	className?: string;
	onOpenPatientCard?: (patientId: string) => void;
	onBookAppointment?: (patient: {
		patientId: string | null;
		patientName: string;
		phone: string | null;
	}) => void;
}

export function OmnichannelOperatorDesk({
	className = "",
	onOpenPatientCard,
	onBookAppointment,
}: OmnichannelOperatorDeskProps) {
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
	const [doctorsList] = useState<Array<{ id: string; fullName: string }>>([
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

	return (
		<div
			className={`flex flex-col md:flex-row h-[calc(100vh-230px)] min-h-[520px] md:h-[780px] w-full rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-sm overflow-hidden text-[var(--ink,#0f172a)] ${className}`}
			data-testid="omnichannel-operator-desk"
		>
			{/* ════════════ LEFT COLUMN: CONVERSATION LIST ════════════ */}
			<div
				className={`w-full md:w-[380px] shrink-0 border-r border-[var(--line,#e2e8f0)] flex flex-col bg-[var(--paper-soft,#f8fafc)] ${
					isMobileThreadOpen ? "hidden md:flex" : "flex"
				}`}
			>
				{/* Top Header & Search */}
				<div className="p-3 border-b border-[var(--line,#e2e8f0)] flex flex-col gap-2.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
								<MessageSquare size={16} />
							</div>
							<div>
								<h3 className="font-bold text-sm leading-tight">Пульт оператора ботов</h3>
								<p className="text-[11px] text-[var(--muted,#64748b)]">TG, VK, WA, MAX в одном окне</p>
							</div>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={fetchConversations}
								className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
								title="Обновить список диалогов"
							>
								<RefreshCw size={14} className={isLoadingList ? "animate-spin" : ""} />
							</button>
							<button
								type="button"
								onClick={handleSimulateIncoming}
								className="secondary-button h-7 min-h-[28px] max-h-7 px-2.5 rounded-lg text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer"
								title="Симулировать входящее сообщение от пациента"
								data-testid="simulate-incoming-btn"
							>
								<Plus size={13} />
								<span>Тест-бот</span>
							</button>
						</div>
					</div>

					{/* Search input */}
					<div className="dente-search-wrap">
						<Search size={14} className="dente-search-icon" />
						<input
							type="text"
							placeholder="Поиск по пациенту, телефону..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="dente-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={13} />
							</button>
						)}
					</div>

					{/* Channel Filter (Segmented Control) */}
					<div className="dente-segmented-bar w-full overflow-x-auto scrollbar-none">
						{(["all", "telegram", "vk", "whatsapp", "max"] as const).map((ch) => {
							const isSel = channelFilter === ch;
							const cfg = ch === "all" ? null : CHANNEL_CONFIGS[ch];
							return (
								<button
									key={ch}
									type="button"
									onClick={() => setChannelFilter(ch)}
									className={`dente-segmented-item flex-1 ${isSel ? "active" : ""}`}
									data-active={isSel}
								>
									{ch === "all" ? "Все" : cfg?.name}
								</button>
							);
						})}
					</div>

					{/* Status Sub-filter: All / Intercepted / Bot */}
					<div className="dente-filter-chips">
						<button
							type="button"
							onClick={() => setStatusFilter("all")}
							className={`dente-filter-chip ${
								statusFilter === "all" ? "active" : ""
							}`}
							data-active={statusFilter === "all"}
						>
							Все ({conversations.length})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("intercepted")}
							className={`dente-filter-chip flex items-center gap-1.5 ${
								statusFilter === "intercepted" ? "active" : ""
							}`}
							data-active={statusFilter === "intercepted"}
						>
							<UserCheck size={13} />
							<span>Перехвачен</span>
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("bot")}
							className={`dente-filter-chip flex items-center gap-1.5 ${
								statusFilter === "bot" ? "active" : ""
							}`}
							data-active={statusFilter === "bot"}
						>
							<Bot size={13} />
							<span>Отвечает бот</span>
						</button>
					</div>
				</div>

				{/* Conversations Scroll Area */}
				<div className="flex-1 overflow-y-auto divide-y divide-[var(--line,#e2e8f0)]">
					{filteredConversations.length === 0 ? (
						<div className="p-8 text-center text-[var(--muted,#64748b)] flex flex-col items-center justify-center gap-2">
							<Bot size={32} className="text-slate-300 dark:text-slate-600" />
							<p className="text-xs">Диалогов не найдено</p>
							<button
								type="button"
								onClick={handleSimulateIncoming}
								className="mt-2 text-xs font-semibold text-teal-600 hover:underline"
							>
								Создать тестовое обращение
							</button>
						</div>
					) : (
						filteredConversations.map((conv) => {
							const isSelected = conv.key === selectedKey;
							const chCfg = CHANNEL_CONFIGS[conv.channel] || CHANNEL_CONFIGS.telegram;
							const sourceInfo = getSourceBadgeInfo(conv);
							const initials = formatPatientInitials(conv.patientName);
							const avatarCol = getAvatarColor(conv.patientName);

							return (
								<button
									key={conv.key}
									type="button"
									onClick={() => {
										setSelectedKey(conv.key);
										setIsMobileThreadOpen(true);
									}}
									className={`w-full text-left p-3 transition-all flex items-start gap-3 cursor-pointer ${
										isSelected
											? "bg-[var(--paper,#ffffff)] shadow-xs border-l-4 border-l-teal-600"
											: "hover:bg-[var(--line,#f1f5f9)]/50"
									}`}
									data-testid={`conv-item-${conv.key}`}
								>
									{/* Avatar with Channel Badge */}
									<div className="relative shrink-0">
										<div
											className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-xs"
											style={{ backgroundColor: avatarCol.bg, color: avatarCol.text }}
										>
											{initials}
										</div>
										<span
											className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[8px] font-black uppercase text-white shadow-xs border border-white dark:border-slate-800"
											style={{ backgroundColor: sourceInfo.color }}
											title={`Канал: ${sourceInfo.name}`}
										>
											{sourceInfo.badge}
										</span>
									</div>

									{/* Main Item Text */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-1 mb-0.5">
											<strong className="text-xs font-semibold truncate text-[var(--ink,#0f172a)]">
												{conv.patientName}
											</strong>
											<span className="text-[10px] text-[var(--muted,#64748b)] shrink-0">
												{new Date(conv.lastMessageAt).toLocaleTimeString("ru-RU", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>

										{/* Phone, Source Badge and Intercept Pill */}
										<div className="flex items-center gap-1.5 mb-1 flex-wrap">
											<span
												className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold shadow-2xs border"
												style={{
													backgroundColor: sourceInfo.bgColor,
													color: sourceInfo.color,
													borderColor: sourceInfo.borderColor,
												}}
												title={`Источник сообщения: ${sourceInfo.name}`}
											>
												{sourceInfo.badge}
											</span>
											{conv.phone && (
												<span className="text-[10px] font-mono text-[var(--muted,#64748b)]">
													{formatPhoneDisplay(conv.phone)}
												</span>
											)}
											{conv.isIntercepted ? (
												<span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
													<UserCheck size={9} />
													<span>Оператор</span>
												</span>
											) : (
												<span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
													<Bot size={9} />
													<span>Бот</span>
												</span>
											)}
										</div>

										{/* Message Snippet */}
										<p className="text-[11px] text-[var(--muted,#64748b)] truncate">
											{conv.lastMessageDirection === "outbound" && (
												<span className="font-semibold text-teal-600 mr-1">Вы:</span>
											)}
											{conv.lastMessage}
										</p>
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>

			{/* ════════════ RIGHT COLUMN: CHAT WINDOW ════════════ */}
			<div
				className={`flex-1 min-h-0 flex flex-col bg-[var(--paper,#ffffff)] ${
					!isMobileThreadOpen ? "hidden md:flex" : "flex"
				} overflow-hidden`}
			>
				{activeConv ? (
					<>
						{/* Chat Top Header */}
						<div className="p-3.5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]/70">
							<div className="flex items-center gap-3 min-w-0">
								{/* Back button on mobile */}
								<button
									type="button"
									onClick={() => setIsMobileThreadOpen(false)}
									className="md:hidden p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--line)]"
									title="Назад к списку"
								>
									<ArrowLeft size={18} />
								</button>

								{/* Patient avatar */}
								<div
									className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
									style={{
										backgroundColor: getAvatarColor(activeConv.patientName).bg,
										color: getAvatarColor(activeConv.patientName).text,
									}}
								>
									{formatPatientInitials(activeConv.patientName)}
								</div>

								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5 min-w-0">
										<h4 className="font-bold text-sm truncate text-[var(--ink,#0f172a)]">
											{activeConv.patientName}
										</h4>
										{(() => {
											const activeSourceInfo = getSourceBadgeInfo(activeConv);
											return (
												<span
													className="px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs border shrink-0"
													style={{
														backgroundColor: activeSourceInfo.bgColor,
														color: activeSourceInfo.color,
														borderColor: activeSourceInfo.borderColor,
													}}
													title={`Источник: ${activeSourceInfo.name}`}
												>
													{activeSourceInfo.badge}
												</span>
											);
										})()}
									</div>
									<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)] flex-wrap">
										{activeConv.phone && (
											<span>{formatPhoneDisplay(activeConv.phone)}</span>
										)}
										<span>•</span>
										<span className="font-mono text-[11px]">
											ID: {activeConv.senderId}
										</span>
										{activeConv.patientId && onOpenPatientCard && (
											<button
												type="button"
												onClick={() => onOpenPatientCard(activeConv.patientId!)}
												className="text-teal-600 hover:underline font-semibold cursor-pointer"
											>
												Карточка
											</button>
										)}
									</div>
								</div>
							</div>

							{/* Action Buttons: Запись на приём / Привязать к карте / Перехватить диалог */}
							<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
								{/* Кнопка записи на прием в 1 клик (Мандат 8e) */}
								<button
									type="button"
									onClick={() => {
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
									}}
									className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
									title="Записать пациента на приём"
									data-testid="quick-book-chat-btn"
								>
									<Calendar size={15} />
									<span className="hidden sm:inline">Записать на приём</span>
									<span className="sm:hidden text-[11px]">Запись</span>
								</button>

								{/* Создать / привязать карту, если ещё не привязана */}
								{!activeConv.patientId && (
									<button
										type="button"
										onClick={() => {
											setNewPatientFullName(
												activeConv.senderName !== `${activeConv.channel.toUpperCase()} Пациент`
													? activeConv.senderName
													: "",
											);
											setNewPatientPhone(
												activeConv.phone || (activeConv.senderId.startsWith("79") ? `+${activeConv.senderId}` : ""),
											);
											setIsLinkPatientModalOpen(true);
										}}
										className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] transition-all flex items-center gap-1 cursor-pointer shrink-0"
										title="Создать или привязать карту пациента в 1 клик"
										data-testid="link-patient-chat-btn"
									>
										<Plus size={14} className="text-teal-600" />
										<span className="hidden md:inline">Создать карту</span>
									</button>
								)}

								{/* Перехват диалога */}
								{activeConv.isIntercepted ? (
									<button
										type="button"
										onClick={handleRelease}
										className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-teal-500/30 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
										title="Возобновить автоматические ответы бота для этого чата"
										data-testid="release-chat-btn"
									>
										<Bot size={15} />
										<span className="hidden sm:inline">Вернуть боту</span>
										<span className="sm:hidden text-[11px]">Боту</span>
									</button>
								) : (
									<button
										type="button"
										onClick={handleTakeover}
										className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold border border-amber-500/40 bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
										title="Поставить автоответчик бота на паузу и вести диалог лично"
										data-testid="takeover-chat-btn"
									>
										<UserCheck size={15} />
										<span className="hidden sm:inline">Перехватить</span>
										<span className="sm:hidden text-[11px]">Ручной</span>
									</button>
								)}
							</div>
						</div>

						{/* Intercept Banner Notice */}
						{activeConv.isIntercepted && (
							<div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5">
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<UserCheck size={14} className="text-amber-600 shrink-0" />
									<span className="leading-tight">
										Диалог перехвачен оператором (<strong>{activeConv.interceptedBy || operatorName}</strong>). Автоответчик бота спит.
									</span>
								</div>
								<button
									type="button"
									onClick={handleRelease}
									className="text-xs font-bold underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer shrink-0 ml-auto"
								>
									Возобновить бота
								</button>
							</div>
						)}

						{/* Messages Canvas */}
						<div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-2.5 bg-[var(--paper-subtle,#fbfcfd)]">
							{isLoadingMessages ? (
								<div className="h-full flex items-center justify-center text-xs text-[var(--muted,#64748b)]">
									<RefreshCw size={18} className="animate-spin text-teal-600 mr-2" />
									<span>Загрузка сообщений...</span>
								</div>
							) : messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted,#64748b)] gap-2">
									<Bot size={28} className="text-slate-300 dark:text-slate-600" />
									<p className="text-xs">В этом диалоге ещё нет сообщений</p>
								</div>
							) : (
								messages.map((m) => {
									const isOutbound = m.direction === "outbound";
									const isBot = m.sender === "bot";
									const isOperator = m.sender === "operator";

									return (
										<div
											key={m.id}
											className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
												isOutbound ? "ml-auto items-end" : "mr-auto items-start"
											}`}
										>
											{/* Sender Label */}
											<div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[var(--muted,#64748b)]">
												{isBot ? (
													<span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
														<Bot size={11} />
														<span>{m.senderName}</span>
													</span>
												) : isOperator ? (
													<span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
														<UserCheck size={11} />
														<span>{m.senderName}</span>
													</span>
												) : (
													<span className="font-semibold text-[var(--ink,#0f172a)]">
														{m.senderName}
													</span>
												)}
												<span>•</span>
												<span>
													{new Date(m.createdAt).toLocaleTimeString("ru-RU", {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
											</div>

											{/* Message Card Bubble */}
											<div
												className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-xs border ${
													!isOutbound
														? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] rounded-tl-sm"
														: isBot
															? "bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 border-sky-200 dark:border-sky-800 rounded-tr-sm"
															: "bg-teal-600 text-white border-teal-700 rounded-tr-sm"
												}`}
											>
												{m.text}

												{/* If bot executed an action */}
												{m.actionExecuted && (
													<div className="mt-2 pt-1.5 border-t border-sky-200/50 dark:border-sky-800/50 flex items-center gap-1 text-[10px] font-mono text-sky-700 dark:text-sky-300">
														<Sparkles size={10} />
														<span>Действие: {m.actionExecuted}</span>
													</div>
												)}
											</div>
										</div>
									);
								})
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Quick Response Clinical Templates */}
						<div className="px-3 py-2 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
							<span className="text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider shrink-0 flex items-center gap-1">
								<Sparkles size={11} className="text-teal-600" />
								<span>Шаблоны:</span>
							</span>
							{CLINICAL_QUICK_REPLIES.map((tpl, idx) => (
								<button
									// biome-ignore lint/suspicious/noArrayIndexKey: pure static list
									key={idx}
									type="button"
									onClick={() => handleSendMessage(tpl.text)}
									className="shrink-0 h-7 px-3 rounded-full text-[12.5px] font-medium border border-teal-500/20 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer min-w-max"
									title={tpl.text}
								>
									{tpl.label}
								</button>
							))}
						</div>

						{/* Bottom Send Bar */}
						<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-2">
							<div className="flex items-end gap-2">
								<textarea
									rows={2}
									placeholder={`Ответить пациенту от имени ${operatorName}...`}
									value={inputText}
									onChange={(e) => setInputText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSendMessage();
										}
									}}
									className="flex-1 p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
									data-testid="operator-message-input"
								/>
								<button
									type="button"
									onClick={() => handleSendMessage()}
									disabled={!inputText.trim() || isSending}
									className="min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
									data-testid="operator-send-btn"
								>
									{isSending ? (
										<RefreshCw size={15} className="animate-spin" />
									) : (
										<Send size={15} />
									)}
									<span>Отправить</span>
								</button>
							</div>

							<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] px-1 flex-wrap gap-1">
								<div className="flex items-center gap-1 shrink-0">
									<Shield size={12} className="text-teal-600 shrink-0" />
									<span className="truncate max-w-[210px] sm:max-w-none">152-ФЗ / 323-ФЗ: Защита тайны</span>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<span>Оператор:</span>
									<input
										type="text"
										value={operatorName}
										onChange={(e) => setOperatorName(e.target.value)}
										className="w-24 sm:w-28 text-[11px] px-1 py-0.5 rounded border border-[var(--line)] bg-transparent font-medium"
										title="Имя оператора для подписи в чате"
									/>
								</div>
							</div>
						</div>
					</>
				) : (
					/* No Active Conversation Selected */
					<div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--muted,#64748b)] gap-3">
						<div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
							<MessageSquare size={32} />
						</div>
						<h3 className="font-bold text-base text-[var(--ink,#0f172a)]">
							Выберите диалог из списка слева
						</h3>
						<p className="text-xs max-w-sm">
							Все обращения пациентов из Telegram, ВКонтакте, WhatsApp и MAX попадают сюда в реальном времени. Вы можете перехватить диалог или позволить боту консультировать пациента автоматически.
						</p>
					</div>
				)}
			</div>

			{/* ════════════ MODAL: QUICK APPOINTMENT BOOKING (MANDATE 8e) ════════════ */}
			{isQuickBookingOpen && activeConv && (
				<div
					className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
					data-testid="quick-booking-modal"
				>
					<div className="w-full max-w-lg rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-5 text-[var(--ink,#0f172a)] my-auto animate-in fade-in zoom-in-95 duration-150">
						{/* Header */}
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
									<Calendar size={18} />
								</div>
								<div>
									<h3 className="font-bold text-base leading-tight">
										Быстрая запись на приём из чата
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)]">
										{activeConv.channel.toUpperCase()} • Пациент: {activeConv.patientName}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsQuickBookingOpen(false)}
								className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
								title="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						{/* Form */}
						<form onSubmit={handleQuickBookingSubmit} className="mt-4 flex flex-col gap-3.5">
							{/* Patient Info Banner */}
							<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs">
								<div className="flex items-center gap-2">
									<User size={15} className="text-teal-600" />
									<span className="font-bold">{activeConv.patientName}</span>
								</div>
								{activeConv.phone && (
									<span className="font-mono text-[var(--muted,#64748b)]">
										{formatPhoneDisplay(activeConv.phone)}
									</span>
								)}
							</div>

							{/* Date & Time Row */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="flex flex-col gap-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-date">
										Дата приёма:
									</label>
									<input
										id="booking-date"
										type="date"
										value={bookingDate}
										onChange={(e) => setBookingDate(e.target.value)}
										className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
										required
									/>
								</div>

								<div className="flex flex-col gap-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-time">
										Время начала:
									</label>
									<input
										id="booking-time"
										type="time"
										value={bookingTime}
										onChange={(e) => setBookingTime(e.target.value)}
										className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
										required
									/>
								</div>
							</div>

							{/* Quick Time Chips */}
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-[10px] text-[var(--muted,#64748b)] uppercase font-bold mr-1">
									Слоты:
								</span>
								{["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setBookingTime(t)}
										className={`px-2.5 py-1 rounded-md text-[12px] font-medium border transition-colors cursor-pointer min-w-max ${
											bookingTime === t
												? "bg-teal-600 text-white border-teal-600 shadow-xs"
												: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
										}`}
									>
										{t}
									</button>
								))}
							</div>

							{/* Doctor Select */}
							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-doctor">
									Лечащий врач:
								</label>
								<select
									id="booking-doctor"
									value={bookingDoctorId}
									onChange={(e) => setBookingDoctorId(e.target.value)}
									className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
								>
									<option value="">Дежурный врач (первый доступный)</option>
									{doctorsList.map((doc) => (
										<option key={doc.id} value={doc.id}>
											{doc.fullName}
										</option>
									))}
								</select>
							</div>

							{/* Reason / Notes */}
							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="booking-reason">
									Причина обращения / услуга:
								</label>
								<input
									id="booking-reason"
									type="text"
									value={bookingReason}
									onChange={(e) => setBookingReason(e.target.value)}
									placeholder="Консультация, осмотр, острая боль..."
									className="w-full p-2 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
								{/* Quick Reason Chips */}
								<div className="flex items-center gap-1.5 flex-wrap mt-1">
									{[
										"Консультация и осмотр",
										"Острая зубная боль",
										"Профгигиена полости рта",
										"Лечение кариеса",
										"Удаление зуба",
									].map((r) => (
										<button
											key={r}
											type="button"
											onClick={() => setBookingReason(r)}
											className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink)] cursor-pointer"
										>
											{r}
										</button>
									))}
								</div>
							</div>

							{/* Confirmation in Chat Checkbox */}
							<label className="flex items-center gap-2 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 text-xs cursor-pointer select-none">
								<input
									type="checkbox"
									checked={bookingSendConfirmation}
									onChange={(e) => setBookingSendConfirmation(e.target.checked)}
									className="rounded text-teal-600 focus:ring-teal-500"
								/>
								<span className="font-semibold text-teal-900 dark:text-teal-200">
									Отправить красивое подтверждение визита пациенту в {activeConv.channel.toUpperCase()}
								</span>
							</label>

							{/* Modal Footer Buttons */}
							<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] mt-1">
								<button
									type="button"
									onClick={() => setIsQuickBookingOpen(false)}
									className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={isBookingSubmitting}
									className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
									data-testid="submit-quick-booking-btn"
								>
									{isBookingSubmitting ? (
										<RefreshCw size={15} className="animate-spin" />
									) : (
										<Check size={15} />
									)}
									<span>Забронировать визит</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ════════════ MODAL: LINK / CREATE PATIENT (MANDATE 8e) ════════════ */}
			{isLinkPatientModalOpen && activeConv && (
				<div
					className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
					data-testid="link-patient-modal"
				>
					<div className="w-full max-w-md rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl p-5 text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-150">
						{/* Header */}
						<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)]">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
									<UserCheck size={18} />
								</div>
								<div>
									<h3 className="font-bold text-base leading-tight">
										Привязать карту пациента
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)]">
										{activeConv.channel.toUpperCase()}: ID {activeConv.senderId}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsLinkPatientModalOpen(false)}
								className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
								title="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						{/* Form */}
						<form onSubmit={handleLinkPatientSubmit} className="mt-4 flex flex-col gap-3.5">
							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="link-patient-name">
									ФИО пациента:
								</label>
								<input
									id="link-patient-name"
									type="text"
									placeholder="Иванов Иван Иванович"
									value={newPatientFullName}
									onChange={(e) => setNewPatientFullName(e.target.value)}
									className="w-full p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
									required
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]" htmlFor="link-patient-phone">
									Номер телефона:
								</label>
								<input
									id="link-patient-phone"
									type="tel"
									placeholder="+7 (999) 000-00-00"
									value={newPatientPhone}
									onChange={(e) => setNewPatientPhone(e.target.value)}
									className="w-full p-2.5 text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
								/>
							</div>

							<p className="text-[11px] text-[var(--muted,#64748b)] leading-relaxed">
								После сохранения пациент появится в базе клиники (PostgreSQL 18), все последующие сообщения и звонки будут автоматически привязываться к его амбулаторной карте 043/у.
							</p>

							{/* Footer */}
							<div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line,#e2e8f0)] mt-1">
								<button
									type="button"
									onClick={() => setIsLinkPatientModalOpen(false)}
									className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={isLinkingSubmitting}
									className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
									data-testid="submit-link-patient-btn"
								>
									{isLinkingSubmitting ? (
										<RefreshCw size={15} className="animate-spin" />
									) : (
										<Check size={15} />
									)}
									<span>Создать карту в 1 клик</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
