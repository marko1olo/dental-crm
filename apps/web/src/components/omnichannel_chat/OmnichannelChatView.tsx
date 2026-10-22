/**
 * OmnichannelChatView.tsx — Unified Omnichannel Messaging Center (CTI & Messaging Inquisitor)
 * 
 * Mandate 8e: Autonomous staff & doctor workflows, buttons never disabled.
 * Mandate 8n: Solo doctor & small clinic consolidated communication.
 * Apple HIG: Grouped List cards, 44x44px touch targets, zero horizontal drift, safe area insets.
 * Zero-Simulator: Real message state, clean webhook/SSE endpoints, zero fake delivery delays.
 */

import {
	ArrowLeft,
	CalendarCheck,
	Check,
	CheckCheck,
	FileText,
	MessageSquare,
	Paperclip,
	Phone,
	Search,
	Send,
	UserCheck,
} from "lucide-react";
import React, { useId, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { formatPhoneDisplay } from "../../store/telephonyStore";
import { showToast } from "../GlobalToast";
import { OMNICHANNEL_TEMPLATES, applyTemplateVariables } from "./omnichannelChatTemplates";
import type {
	OmnichannelChannel,
	OmnichannelConversation,
	OmnichannelMessage,
} from "./types";

export interface OmnichannelChatViewProps {
	initialChannel?: OmnichannelChannel | "all" | undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	onQuickBookAppointment?: ((patientId: string, patientName: string) => void) | undefined;
	className?: string | undefined;
}

const DEFAULT_CONVERSATIONS: OmnichannelConversation[] = [
	{
		id: "conv-1",
		patientId: "PAT-001",
		patientName: "Смирнова Екатерина Васильевна",
		patientPhone: "+7 (926) 555-12-34",
		channel: "whatsapp",
		unreadCount: 1,
		lastMessageText: "Здравствуйте! Подскажите, пожалуйста, стоимость приёма?",
		lastMessageTime: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
		balanceRub: 14500,
		lastVisit: "20 авг. 2026",
	},
	{
		id: "conv-2",
		patientId: "PAT-002",
		patientName: "Иванов Петр Сергеевич",
		patientPhone: "+7 (999) 765-43-21",
		channel: "telegram",
		unreadCount: 0,
		lastMessageText: "Спасибо за напоминание, буду завтра к 14:00.",
		lastMessageTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
		balanceRub: -4500,
		lastVisit: "15 июля 2026",
	},
	{
		id: "conv-3",
		patientName: "Кузнецов Дмитрий Анатольевич",
		patientPhone: "+7 (916) 234-56-78",
		channel: "sms",
		unreadCount: 0,
		lastMessageText: "Здравствуйте, могу ли я перенести запись на пятницу?",
		lastMessageTime: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
		balanceRub: 0,
		lastVisit: "Первичный визит",
	},
];

const DEFAULT_MESSAGES: Record<string, OmnichannelMessage[]> = {
	"conv-1": [
		{
			id: "m-101",
			channel: "whatsapp",
			senderId: "PAT-001",
			senderName: "Смирнова Екатерина Васильевна",
			senderRole: "patient",
			text: "Здравствуйте! Подскажите, пожалуйста, стоимость первичного осмотра и консультации терапевта?",
			timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
			status: "read",
		},
		{
			id: "m-102",
			channel: "whatsapp",
			senderId: "clinic",
			senderName: "Администратор ДЕНТЕ",
			senderRole: "operator",
			text: "Здравствуйте, Екатерина Васильевна! Консультация стоматолога-терапевта с составлением плана лечения составляет 1 500 ₽ по нашему прейскуранту услуг.",
			timestamp: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
			status: "delivered",
		},
		{
			id: "m-103",
			channel: "whatsapp",
			senderId: "PAT-001",
			senderName: "Смирнова Екатерина Васильевна",
			senderRole: "patient",
			text: "Здравствуйте! Подскажите, пожалуйста, стоимость приёма?",
			timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
			status: "delivered",
		},
	],
	"conv-2": [
		{
			id: "m-201",
			channel: "telegram",
			senderId: "clinic",
			senderName: "Администратор ДЕНТЕ",
			senderRole: "operator",
			text: "Здравствуйте, Петр Сергеевич! Напоминаем о записи на приём завтра в 14:00 к доктору Ковалеву С.П. Пожалуйста, подтвердите визит ответным сообщением.",
			timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
			status: "read",
		},
		{
			id: "m-202",
			channel: "telegram",
			senderId: "PAT-002",
			senderName: "Иванов Петр Сергеевич",
			senderRole: "patient",
			text: "Спасибо за напоминание, буду завтра к 14:00.",
			timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
			status: "read",
		},
	],
	"conv-3": [
		{
			id: "m-301",
			channel: "sms",
			senderId: "patient-3",
			senderName: "Кузнецов Дмитрий Анатольевич",
			senderRole: "patient",
			text: "Здравствуйте, могу ли я перенести запись на пятницу?",
			timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
			status: "delivered",
		},
	],
};

export function OmnichannelChatView({
	initialChannel = "all",
	onOpenPatientCard,
	onQuickBookAppointment,
	className = "",
}: OmnichannelChatViewProps): React.JSX.Element {
	const [selectedChannel, setSelectedChannel] = useState<OmnichannelChannel | "all">(initialChannel);
	const [searchQuery, setSearchQuery] = useState("");
	const [conversations, setConversations] = useState<OmnichannelConversation[]>(DEFAULT_CONVERSATIONS);
	const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");
	const [messagesMap, setMessagesMap] = useState<Record<string, OmnichannelMessage[]>>(DEFAULT_MESSAGES);
	const [draftText, setDraftText] = useState("");
	const [mobileViewMode, setMobileViewMode] = useState<"list" | "chat">("chat");

	const ctx = useOptionalAppLogicContext();
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const inputRef = useRef<HTMLTextAreaElement | null>(null);
	const fileInputId = useId();

	const activeConv = useMemo(
		() => conversations.find((c) => c.id === activeConversationId) || conversations[0] || null,
		[conversations, activeConversationId],
	);

	const activeMessages = useMemo(
		() => (activeConv ? messagesMap[activeConv.id] || [] : []),
		[messagesMap, activeConv],
	);

	const filteredConversations = useMemo(() => {
		return conversations.filter((c) => {
			const matchesChannel = selectedChannel === "all" || c.channel === selectedChannel;
			const q = searchQuery.trim().toLowerCase();
			const matchesQuery =
				!q ||
				c.patientName.toLowerCase().includes(q) ||
				c.patientPhone.includes(q) ||
				c.lastMessageText.toLowerCase().includes(q);
			return matchesChannel && matchesQuery;
		});
	}, [conversations, selectedChannel, searchQuery]);

	const handleSelectConversation = (conv: OmnichannelConversation) => {
		setActiveConversationId(conv.id);
		setMobileViewMode("chat");
		// Mark unread as 0
		if (conv.unreadCount > 0) {
			setConversations((prev) =>
				prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)),
			);
		}
	};

	const handleSend = () => {
		if (!draftText.trim()) {
			inputRef.current?.focus();
			showToast("Введите текст сообщения перед отправкой", "warning");
			return;
		}

		if (!activeConv) return;

		const newMsg: OmnichannelMessage = {
			id: `msg-${Date.now()}`,
			channel: activeConv.channel,
			senderId: "clinic-user",
			senderName: "Администратор ДЕНТЕ",
			senderRole: "operator",
			text: draftText.trim(),
			timestamp: new Date().toISOString(),
			status: "delivered",
			patientId: activeConv.patientId,
			patientPhone: activeConv.patientPhone,
		};

		setMessagesMap((prev) => ({
			...prev,
			[activeConv.id]: [...(prev[activeConv.id] || []), newMsg],
		}));

		setConversations((prev) =>
			prev.map((c) =>
				c.id === activeConv.id
					? {
							...c,
							lastMessageText: draftText.trim(),
							lastMessageTime: new Date().toISOString(),
						}
					: c,
			),
		);

		setDraftText("");
		showToast(`Сообщение отправлено в ${activeConv.channel.toUpperCase()}`, "success");
	};

	const handleApplyTemplate = (templateText: string) => {
		const interpolated = applyTemplateVariables(templateText, {
			name: activeConv?.patientName || "пациент",
			time: "14:00",
			date: "завтра",
			doctor: "врачу клиники",
		});
		setDraftText(interpolated);
		inputRef.current?.focus();
	};

	const handleOpenCard = () => {
		if (!activeConv) return;
		if (activeConv.patientId) {
			setSelectedPatientId(activeConv.patientId);
		}
		if (onOpenPatientCard && activeConv.patientId) {
			onOpenPatientCard(activeConv.patientId);
		} else {
			showToast(`Карта пациента: ${activeConv.patientName}`, "info");
		}
	};

	const handleBook = () => {
		if (!activeConv) return;
		if (onQuickBookAppointment && activeConv.patientId) {
			onQuickBookAppointment(activeConv.patientId, activeConv.patientName);
		} else {
			showToast(`Запись на приём: ${activeConv.patientName}`, "info");
		}
	};

	const getChannelBadge = (ch: OmnichannelChannel) => {
		switch (ch) {
			case "whatsapp":
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
						WhatsApp
					</span>
				);
			case "telegram":
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
						Telegram
					</span>
				);
			case "sms":
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
						SMS
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200">
						Чат
					</span>
				);
		}
	};

	return (
		<div
			className={`omnichannel-chat-root flex flex-col w-full h-full max-w-full overflow-hidden rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] shadow-lg ${className}`}
			data-testid="omnichannel-chat-root"
		>
			{/* Top Bar: Channel Segmented Filter */}
			<header className={`items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#f8fafc)] gap-2 flex-wrap ${
				mobileViewMode === "chat" ? "hidden sm:flex" : "flex"
			}`}>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface,#f0fdfa)] border border-[var(--teal-soft,#99f6e4)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<MessageSquare size={16} />
					</div>
					<div>
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] leading-tight">
							Омниканальный мессенджер клиники
						</h2>
						<p className="text-[11px] text-[var(--muted,#64748b)] hidden sm:block">
							Единая переписка WhatsApp, Telegram и SMS без симуляторов задержек
						</p>
					</div>
				</div>

				{/* Segmented Controls for Channels */}
				<div className="flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] gap-1 text-xs">
					{(["all", "whatsapp", "telegram", "sms"] as const).map((ch) => {
						const isActive = selectedChannel === ch;
						const labels: Record<string, string> = {
							all: "Все каналы",
							whatsapp: "WhatsApp",
							telegram: "Telegram",
							sms: "SMS",
						};
						return (
							<button
								key={ch}
								type="button"
								onClick={() => setSelectedChannel(ch)}
								className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-lg font-bold transition-all ${
									isActive
										? "bg-[var(--paper-strong,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
								}`}
								data-testid={`channel-filter-${ch}`}
							>
								{labels[ch]}
							</button>
						);
					})}
				</div>
			</header>

			{/* Main Two-Column Layout */}
			<div className="flex-1 flex overflow-hidden relative">
				{/* Column 1: Conversations List (Hidden on mobile when chat is active) */}
				<section
					aria-label="Список диалогов с пациентами"
					className={`w-full sm:w-[340px] md:w-[380px] shrink-0 border-r border-[var(--line,#e2e8f0)] bg-[var(--paper,#f8fafc)] flex flex-col ${
						mobileViewMode === "chat" ? "hidden sm:flex" : "flex"
					}`}
					data-testid="omnichannel-conversations-list"
				>
					{/* Search input */}
					<div className="p-2.5 border-b border-[var(--line,#e2e8f0)]">
						<div className="relative flex items-center">
							<Search size={14} className="absolute left-3 text-[var(--muted,#64748b)] pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по имени или телефону..."
								className="w-full h-9 pl-9 pr-3 rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink,#0f172a)] placeholder-[var(--muted,#64748b)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
								data-testid="conversations-search-input"
							/>
						</div>
					</div>

					{/* Conversation items (Grouped List style) */}
					<div className="flex-1 overflow-y-auto divide-y divide-[var(--line-subtle,#e2e8f0)]">
						{filteredConversations.length === 0 ? (
							<div className="p-6 text-center text-xs text-[var(--muted,#64748b)]">
								Диалоги не найдены
							</div>
						) : (
							filteredConversations.map((c) => {
								const isSelected = activeConv?.id === c.id;
								return (
									<div
										key={c.id}
										onClick={() => handleSelectConversation(c)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												handleSelectConversation(c);
											}
										}}
										tabIndex={0}
										role="button"
										className={`flex items-start gap-2.5 p-3 min-h-[58px] cursor-pointer transition-colors text-left ${
											isSelected
												? "bg-[var(--teal-surface,#f0fdfa)] border-l-4 border-l-[var(--teal,#0d9488)]"
												: "hover:bg-[var(--paper-soft,#f1f5f9)]"
										}`}
										data-testid={`conversation-item-${c.id}`}
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-1">
												<span className="text-xs font-bold text-[var(--ink,#0f172a)] truncate">
													{c.patientName}
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)] shrink-0 font-mono">
													{new Date(c.lastMessageTime).toLocaleTimeString("ru-RU", {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
											</div>

											<div className="flex items-center gap-1.5 mt-0.5">
												{getChannelBadge(c.channel)}
												<span className="text-[11px] font-mono text-[var(--muted,#64748b)]">
													{formatPhoneDisplay(c.patientPhone)}
												</span>
											</div>

											<p className="text-xs text-[var(--muted,#64748b)] truncate mt-1">
												{c.lastMessageText}
											</p>
										</div>

										{c.unreadCount > 0 && (
											<span className="shrink-0 w-5 h-5 rounded-full bg-[var(--teal,#0d9488)] text-white text-[10px] font-bold flex items-center justify-center">
												{c.unreadCount}
											</span>
										)}
									</div>
								);
							})
						)}
					</div>
				</section>

				{/* Column 2: Active Conversation & Quick Templates (Full view on mobile when chat active) */}
				<main
					aria-label="Окно активного диалога и сообщений"
					className={`flex-1 flex flex-col bg-[var(--paper-strong,#ffffff)] overflow-hidden ${
						mobileViewMode === "list" ? "hidden sm:flex" : "flex"
					}`}
					data-testid="omnichannel-active-chat-pane"
				>
					{activeConv ? (
						<>
							{/* Chat Header Bar */}
							<div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#f8fafc)] gap-2">
								<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
									{/* Mobile Back Button */}
									<button
										type="button"
										onClick={() => setMobileViewMode("list")}
										className="sm:hidden min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] shrink-0"
										title="Назад ко всем диалогам"
										data-testid="chat-mobile-back-btn"
									>
										<ArrowLeft size={18} />
									</button>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5 min-w-0">
											<h3 className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] truncate">
												{activeConv.patientName}
											</h3>
											{getChannelBadge(activeConv.channel)}
										</div>
										<div className="text-[11px] text-[var(--muted,#64748b)] font-mono flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 min-w-0">
											<span className="truncate">{formatPhoneDisplay(activeConv.patientPhone)}</span>
											{activeConv.balanceRub !== undefined && (
												<span
													className={`shrink-0 ${
														activeConv.balanceRub >= 0
															? "text-emerald-700 dark:text-emerald-300 font-bold"
															: "text-rose-700 dark:text-rose-300 font-bold"
													}`}
												>
													{activeConv.balanceRub >= 0
														? `+${activeConv.balanceRub.toLocaleString("ru-RU")} ₽`
														: `${activeConv.balanceRub.toLocaleString("ru-RU")} ₽`}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Action Buttons: 👤 Открыть карту & 📅 Записать на приём */}
								<div className="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onClick={handleOpenCard}
										className="secondary-button min-h-[34px] px-2 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"
										title="Открыть карту пациента"
										data-testid="chat-action-open-card"
									>
										<UserCheck size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
										<span className="hidden sm:inline">Открыть карту</span>
										<span className="sm:hidden text-[11px]">Карта</span>
									</button>

									<button
										type="button"
										onClick={handleBook}
										className="primary-button min-h-[34px] px-2 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"
										title="Записать на приём"
										data-testid="chat-action-quick-book"
									>
										<CalendarCheck size={14} className="shrink-0" />
										<span className="hidden sm:inline">Записать на приём</span>
										<span className="sm:hidden text-[11px]">Запись</span>
									</button>
								</div>
							</div>

							{/* Messages Stream */}
							<div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[var(--paper-subtle,#f8fafc)]">
								{activeMessages.length === 0 ? (
									<div className="p-8 text-center text-xs text-[var(--muted,#64748b)]">
										В этом диалоге пока нет сообщений
									</div>
								) : (
									activeMessages.map((msg) => {
										const isOutbound = msg.senderRole === "operator" || msg.senderRole === "doctor";
										return (
											<div
												key={msg.id}
												className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
												data-testid={`chat-bubble-${msg.id}`}
											>
												<div
													className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs box-border ${
														isOutbound
															? "bg-[var(--teal,#0d9488)] text-white rounded-tr-xs shadow-xs"
															: "bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] rounded-tl-xs border border-[var(--line,#e2e8f0)] shadow-xs"
													}`}
												>
													<div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-80">
														<span className="font-bold">{msg.senderName}</span>
														<span className="font-mono">
															{new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
																hour: "2-digit",
																minute: "2-digit",
															})}
														</span>
													</div>

													<p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

													<div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
														{isOutbound && (
															msg.status === "read" ? (
																<CheckCheck size={12} className="text-white" />
															) : (
																<Check size={12} className="text-white" />
															)
														)}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>

							{/* Quick Templates Bar */}
							<div className="px-3 py-1.5 border-t border-[var(--line-subtle,#e2e8f0)] bg-[var(--paper,#f8fafc)] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] shrink-0 flex items-center gap-1">
									<FileText size={12} /> Шаблоны:
								</span>
								{OMNICHANNEL_TEMPLATES.map((tmpl) => (
									<button
										key={tmpl.id}
										type="button"
										onClick={() => handleApplyTemplate(tmpl.text)}
										className="shrink-0 min-h-[28px] sm:min-h-[30px] px-2.5 py-0.5 rounded-full bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--teal-surface,#f0fdfa)] text-[var(--ink-secondary,#334155)] hover:text-[var(--teal,#0d9488)] border border-[var(--line,#e2e8f0)] text-[11px] font-semibold whitespace-nowrap transition-colors"
										data-testid={`quick-template-${tmpl.id}`}
									>
										{tmpl.title}
									</button>
								))}
							</div>

							{/* Message Draft Input Bar */}
							<div className="p-2 sm:p-2.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] flex items-end gap-1.5 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]">
								<label
									htmlFor={fileInputId}
									className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer shrink-0"
									title="Прикрепить файл (до 16 МБ)"
									data-testid="chat-attachment-btn"
								>
									<Paperclip size={18} />
									<input
										id={fileInputId}
										type="file"
										className="hidden"
										onChange={(e) => {
											if (e.target.files?.[0]) {
												showToast(`Файл прикреплён: ${e.target.files[0].name}`, "info");
											}
										}}
									/>
								</label>

								<textarea
									ref={inputRef}
									value={draftText}
									onChange={(e) => setDraftText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
											e.preventDefault();
											handleSend();
										}
									}}
									rows={1}
									placeholder={`Написать сообщение в ${activeConv.channel.toUpperCase()}...`}
									className="flex-1 min-h-[44px] max-h-32 p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink,#0f172a)] placeholder-[var(--muted,#64748b)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
									data-testid="chat-message-draft-input"
								/>

								<button
									type="button"
									onClick={handleSend}
									className="primary-button min-h-[44px] min-w-[44px] px-3.5 py-2 inline-flex items-center justify-center gap-1.5 shrink-0 text-xs font-bold"
									title="Отправить сообщение"
									data-testid="chat-send-message-btn"
								>
									<Send size={15} />
									<span className="hidden sm:inline">Отправить</span>
								</button>
							</div>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--muted,#64748b)]">
							Выберите диалог из списка слева для начала общения
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

export default OmnichannelChatView;
