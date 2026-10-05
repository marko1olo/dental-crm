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
}

export function OmnichannelOperatorDesk({
	className = "",
	onOpenPatientCard,
}: OmnichannelOperatorDeskProps) {
	// Conversations list
	const [conversations, setConversations] = useState<InboxConversation[]>([]);
	const [isLoadingList, setIsLoadingList] = useState(false);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
								className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center gap-1 cursor-pointer"
								title="Симулировать входящее сообщение от пациента"
								data-testid="simulate-incoming-btn"
							>
								<Plus size={12} />
								<span>Тест-бот</span>
							</button>
						</div>
					</div>

					{/* Search input */}
					<div className="relative">
						<Search size={14} className="absolute left-2.5 top-2.5 text-[var(--muted,#64748b)]" />
						<input
							type="text"
							placeholder="Поиск по пациенту, телефону..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] focus:outline-none focus:ring-1 focus:ring-teal-500"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2 top-2 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							>
								<X size={13} />
							</button>
						)}
					</div>

					{/* Channel Filter Chips */}
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
						{(["all", "telegram", "vk", "whatsapp", "max"] as const).map((ch) => {
							const isSel = channelFilter === ch;
							const cfg = ch === "all" ? null : CHANNEL_CONFIGS[ch];
							return (
								<button
									key={ch}
									type="button"
									onClick={() => setChannelFilter(ch)}
									className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
										isSel
											? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
											: "text-[var(--muted,#64748b)] bg-[var(--line,#e2e8f0)]/50 hover:bg-[var(--line,#e2e8f0)]"
									}`}
								>
									{ch === "all" ? "Все каналы" : cfg?.name}
								</button>
							);
						})}
					</div>

					{/* Status Sub-filter: All / Intercepted / Bot */}
					<div className="flex items-center gap-1.5 text-[11px]">
						<button
							type="button"
							onClick={() => setStatusFilter("all")}
							className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
								statusFilter === "all"
									? "font-bold text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-900/30"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
							}`}
						>
							Все ({conversations.length})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("intercepted")}
							className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
								statusFilter === "intercepted"
									? "font-bold text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
							}`}
						>
							<UserCheck size={11} />
							<span>Перехвачен</span>
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("bot")}
							className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
								statusFilter === "bot"
									? "font-bold text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-900/30"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink)]"
							}`}
						>
							<Bot size={11} />
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
											className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded text-[9px] font-black uppercase text-white shadow-xs border border-white dark:border-slate-800"
											style={{ backgroundColor: chCfg.color }}
											title={`Канал: ${chCfg.name}`}
										>
											{chCfg.badge}
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

										{/* Phone and Intercept Pill */}
										<div className="flex items-center gap-1.5 mb-1 flex-wrap">
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
										<span
											className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase text-white shrink-0"
											style={{
												backgroundColor:
													CHANNEL_CONFIGS[activeConv.channel]?.color || "#0284c7",
											}}
											title={`Канал: ${CHANNEL_CONFIGS[activeConv.channel]?.name}`}
										>
											{CHANNEL_CONFIGS[activeConv.channel]?.badge}
										</span>
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

							{/* Takeover Control Action Buttons */}
							<div className="flex items-center gap-2 shrink-0">
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
										<span className="hidden sm:inline">Перехватить диалог</span>
										<span className="sm:hidden text-[11px]">Перехватить</span>
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
									className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-teal-500/20 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
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
		</div>
	);
}
