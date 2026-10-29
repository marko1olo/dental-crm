/**
 * OmnichannelChatView.tsx — Unified Omnichannel Messaging Center (Mandates 8b sweet spot, 8e, 8n, Apple HIG)
 * 1-click booking, sovereign SSOT communication, zero-mock PostgreSQL streaming.
 */

import {
	ArrowLeft,
	CalendarCheck,
	Check,
	CheckCheck,
	FileText,
	MessageSquare,
	Paperclip,
	Search,
	Send,
	UserCheck,
} from "lucide-react";
import React, { useEffect, useId, useMemo, useRef } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { formatPhoneDisplay } from "../../store/telephonyStore";
import { executeBookAppointmentFromChat } from "../communications/bookFromChatAutonomy";
import { showToast } from "../GlobalToast";
import {
	CHANNEL_BADGES,
	useOmnichannelChatState,
} from "./modules/useOmnichannelChatState";
import { OMNICHANNEL_TEMPLATES } from "./omnichannelChatTemplates";
import type {
	OmnichannelChannel,
	OmnichannelConversation,
	OmnichannelMessage,
} from "./types";

export interface OmnichannelChatViewProps {
	initialChannel?: OmnichannelChannel | "all" | undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	onQuickBookAppointment?:
		| ((patientId: string, patientName: string) => void)
		| undefined;
	className?: string | undefined;
}

const CHANNELS: Array<{ id: OmnichannelChannel | "all"; label: string }> = [
	{ id: "all", label: "Все каналы" },
	{ id: "whatsapp", label: "WhatsApp" },
	{ id: "telegram", label: "Telegram" },
	{ id: "vk", label: "VK" },
	{ id: "max", label: "MAX" },
	{ id: "sms", label: "SMS" },
];

export function OmnichannelChannelBadge({
	channel,
}: {
	channel: OmnichannelChannel;
}): React.JSX.Element {
	const cfg = CHANNEL_BADGES[channel] || {
		label: channel.toUpperCase(),
		bg: "bg-slate-100 dark:bg-slate-800",
		text: "text-slate-700 dark:text-slate-300",
		border: "border-slate-300 dark:border-slate-700",
	};

	return (
		<span
			className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}
			data-testid={`channel-badge-${channel}`}
		>
			{cfg.label}
		</span>
	);
}

export function OmnichannelChatView({
	initialChannel = "all",
	onOpenPatientCard,
	onQuickBookAppointment,
	className = "",
}: OmnichannelChatViewProps): React.JSX.Element {
	const state = useOmnichannelChatState(initialChannel);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const fileInputId = useId();
	const scrollRef = useRef<HTMLDivElement | null>(null);

	// Auto-scroll messages stream on new arrivals
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [state.activeMessages.length, state.isThreadLoading]);

	const handleOpenCard = () => {
		if (!state.activeConv) return;
		if (state.activeConv.patientId)
			setSelectedPatientId(state.activeConv.patientId);
		if (onOpenPatientCard && state.activeConv.patientId) {
			onOpenPatientCard(state.activeConv.patientId);
		} else {
			useAppStore.getState().setCurrentView("patients");
			showToast(`Карта пациента: ${state.activeConv.patientName}`, "info");
		}
	};

	const handleBook = () => {
		if (!state.activeConv) return;
		if (onQuickBookAppointment && state.activeConv.patientId) {
			onQuickBookAppointment(
				state.activeConv.patientId,
				state.activeConv.patientName,
			);
		} else {
			executeBookAppointmentFromChat({
				id: state.activeConv.patientId,
				fullName: state.activeConv.patientName,
				phone: state.activeConv.patientPhone,
			});
		}
	};

	return (
		<div
			className={`omnichannel-chat-root flex flex-col w-full h-full max-w-full overflow-hidden rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-card,#ffffff)] text-[var(--ink,#0f172a)] shadow-lg ${className}`}
			data-testid="omnichannel-chat-root"
			style={{ maxWidth: "100vw", overflowX: "clip" }}
		>
			{/* Top Header & Channel Switcher */}
			<header
				className={`items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] gap-2 flex-wrap ${
					state.mobileViewMode === "chat" ? "hidden sm:flex" : "flex"
				}`}
			>
				<div className="flex items-center gap-2">
					<div className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-xl bg-[var(--teal-surface,#f0fdfa)] border border-[var(--teal-soft,#99f6e4)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
						<MessageSquare size={18} />
					</div>
					<div>
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] leading-tight">
							Омниканальный мессенджер клиники
						</h2>
						<p className="text-[11px] text-[var(--muted,#64748b)] hidden sm:block">
							Единый центр диалогов WhatsApp, Telegram, VK, MAX и SMS
						</p>
					</div>
				</div>

				{/* Channels filter bar (Touch targets >= 44x44px on mobile) */}
				<div className="flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] gap-1 text-xs overflow-x-auto max-w-full no-scrollbar">
					{CHANNELS.map((ch) => {
						const isActive = state.selectedChannel === ch.id;
						return (
							<button
								key={ch.id}
								type="button"
								onClick={() => state.setSelectedChannel(ch.id)}
								className={`min-h-[44px] sm:min-h-[32px] px-3 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
									isActive
										? "bg-[var(--paper-card,#ffffff)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-transparent"
								}`}
								data-testid={`channel-filter-${ch.id}`}
							>
								{ch.label}
							</button>
						);
					})}
				</div>
			</header>

			{/* Main Split View: Left list, Right active conversation */}
			<div className="flex-1 flex overflow-hidden relative">
				{/* 1. Left List of Conversations */}
				<section
					aria-label="Список диалогов с пациентами"
					className={`w-full sm:w-[320px] md:w-[360px] shrink-0 border-r border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col ${
						state.mobileViewMode === "chat" ? "hidden sm:flex" : "flex"
					}`}
					data-testid="omnichannel-conversations-list"
				>
					<div className="p-2.5 border-b border-[var(--line,#e2e8f0)]">
						<div className="relative flex items-center">
							<Search
								size={14}
								className="absolute left-3 text-[var(--muted,#64748b)] pointer-events-none"
							/>
							<input
								type="text"
								value={state.searchQuery}
								onChange={(e) => state.setSearchQuery(e.target.value)}
								placeholder="Поиск по имени или телефону..."
								className="dente-search-input w-full h-10 min-h-[40px] rounded-xl text-xs pl-9 pr-3 border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
								data-testid="conversations-search-input"
							/>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto divide-y divide-[var(--line-subtle,#e2e8f0)]">
						{state.isConversationsLoading ? (
							<div className="p-6 text-center text-xs text-[var(--muted,#64748b)]">
								Загрузка диалогов из базы данных...
							</div>
						) : state.filteredConversations.length === 0 ? (
							<div className="p-6 text-center text-xs text-[var(--muted,#64748b)]">
								Диалогов пока нет — новые обращения появятся здесь автоматически
							</div>
						) : (
							state.filteredConversations.map((c: OmnichannelConversation) => {
								const isSelected = state.activeConv?.id === c.id;
								return (
									<div
										key={c.id}
										onClick={() => state.handleSelectConversation(c)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												state.handleSelectConversation(c);
											}
										}}
										tabIndex={0}
										role="button"
										className={`flex items-start gap-3 p-3 min-h-[58px] cursor-pointer transition-colors text-left ${
											isSelected
												? "bg-[var(--teal-surface,#f0fdfa)] border-l-4 border-l-[var(--teal,#0d9488)]"
												: "hover:bg-[var(--paper-soft,#f8fafc)]"
										}`}
										data-testid={`conversation-item-${c.id}`}
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-1">
												<span className="text-xs font-bold text-[var(--ink,#0f172a)] truncate">
													{c.patientName}
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)] shrink-0 font-mono">
													{new Date(c.lastMessageTime).toLocaleTimeString(
														"ru-RU",
														{ hour: "2-digit", minute: "2-digit" },
													)}
												</span>
											</div>
											<div className="flex items-center gap-1.5 mt-0.5">
												<OmnichannelChannelBadge channel={c.channel} />
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

				{/* 2. Right Pane: Active Chat Conversation */}
				<main
					aria-label="Окно активного диалога и сообщений"
					className={`flex-1 flex flex-col bg-[var(--paper,#ffffff)] overflow-hidden ${
						state.mobileViewMode === "list" ? "hidden sm:flex" : "flex"
					}`}
					data-testid="omnichannel-active-chat-pane"
				>
					{state.activeConv ? (
						<>
							{/* Active Chat Header */}
							<div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] gap-2">
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<button
										type="button"
										onClick={() => state.setMobileViewMode("list")}
										className="sm:hidden min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-xl hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] shrink-0 cursor-pointer active:scale-95"
										title="Назад ко всем диалогам"
										data-testid="chat-mobile-back-btn"
									>
										<ArrowLeft size={20} />
									</button>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5 min-w-0">
											<h3
												className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] truncate"
												title={state.activeConv.patientName}
											>
												{state.activeConv.patientName}
											</h3>
											<OmnichannelChannelBadge
												channel={state.activeConv.channel}
											/>
										</div>
										<div className="text-[11px] text-[var(--muted,#64748b)] font-mono flex items-center gap-2 min-w-0">
											<span className="truncate">
												{formatPhoneDisplay(state.activeConv.patientPhone)}
											</span>
											{state.activeConv.balanceRub !== undefined && (
												<span
													className={`shrink-0 font-bold ${
														state.activeConv.balanceRub >= 0
															? "text-emerald-600 dark:text-emerald-400"
															: "text-rose-600 dark:text-rose-400"
													}`}
												>
													{state.activeConv.balanceRub >= 0
														? `+${state.activeConv.balanceRub.toLocaleString("ru-RU")} ₽`
														: `${state.activeConv.balanceRub.toLocaleString("ru-RU")} ₽`}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Header CTAs: Open Card & 1-click Book */}
								<div className="flex items-center gap-1.5 shrink-0">
									<button
										type="button"
										onClick={handleOpenCard}
										className="secondary-button min-h-[44px] sm:min-h-[34px] px-2.5 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 rounded-xl cursor-pointer"
										title="Открыть карту пациента"
										data-testid="chat-action-open-card"
									>
										<UserCheck
											size={15}
											className="text-[var(--teal,#0d9488)] shrink-0"
										/>
										<span className="hidden sm:inline">Открыть карту</span>
									</button>

									<button
										type="button"
										onClick={handleBook}
										className="primary-button min-h-[44px] sm:min-h-[34px] px-2.5 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 rounded-xl cursor-pointer"
										title="Записать на приём"
										data-testid="chat-action-quick-book"
									>
										<CalendarCheck size={15} className="shrink-0" />
										<span className="hidden sm:inline">Записать на приём</span>
										<span className="sm:hidden text-xs">Запись</span>
									</button>
								</div>
							</div>

							{/* Messages Stream */}
							<div
								ref={scrollRef}
								className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[var(--paper-soft,#f8fafc)]"
							>
								{state.isThreadLoading ? (
									<div className="p-8 text-center text-xs text-[var(--muted,#64748b)]">
										Загрузка истории переписки...
									</div>
								) : state.activeMessages.length === 0 ? (
									<div className="p-8 text-center text-xs text-[var(--muted,#64748b)]">
										В этом диалоге пока нет сообщений
									</div>
								) : (
									state.activeMessages.map((msg: OmnichannelMessage) => {
										const isOutbound =
											msg.senderRole === "operator" ||
											msg.senderRole === "doctor" ||
											msg.senderRole === "bot";
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
															: "bg-[var(--paper-card,#ffffff)] text-[var(--ink,#0f172a)] rounded-tl-xs border border-[var(--line,#e2e8f0)] shadow-xs"
													}`}
												>
													<div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-80">
														<span className="font-bold">{msg.senderName}</span>
														<span className="font-mono">
															{new Date(msg.timestamp).toLocaleTimeString(
																"ru-RU",
																{ hour: "2-digit", minute: "2-digit" },
															)}
														</span>
													</div>
													<p className="leading-relaxed whitespace-pre-wrap">
														{msg.text}
													</p>
													{isOutbound && (
														<div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
															{msg.status === "read" ? (
																<CheckCheck size={13} className="text-white" />
															) : (
																<Check size={13} className="text-white" />
															)}
														</div>
													)}
												</div>
											</div>
										);
									})
								)}
							</div>

							{/* Quick Templates Bar */}
							<div className="px-3 py-2 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
								<span className="text-[11px] font-bold text-[var(--muted,#64748b)] shrink-0 flex items-center gap-1">
									<FileText size={13} /> Шаблоны:
								</span>
								{OMNICHANNEL_TEMPLATES.map((tmpl) => (
									<button
										key={tmpl.id}
										type="button"
										onClick={() => state.handleApplyTemplate(tmpl.text)}
										className="shrink-0 min-h-[36px] sm:min-h-[30px] px-3 py-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--teal-surface,#f0fdfa)] text-[var(--ink,#0f172a)] hover:text-[var(--teal,#0d9488)] border border-[var(--line,#e2e8f0)] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer active:scale-95"
										data-testid={`quick-template-${tmpl.id}`}
									>
										{tmpl.title}
									</button>
								))}
							</div>

							{/* Message Input Bar (Single Primary CTA teal 'Отправить') */}
							<div className="p-2 sm:p-2.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-card,#ffffff)] flex items-end gap-2 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]">
								<label
									htmlFor={fileInputId}
									className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer shrink-0"
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
												showToast(
													`Файл прикреплён: ${e.target.files[0].name}`,
													"info",
												);
											}
										}}
									/>
								</label>

								<textarea
									ref={state.inputRef}
									value={state.draftText}
									onChange={(e) => state.setDraftText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
											e.preventDefault();
											state.handleSend();
										}
									}}
									rows={1}
									placeholder={`Написать в ${state.activeConv.channel.toUpperCase()}...`}
									className="flex-1 min-h-[44px] max-h-32 p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs text-[var(--ink,#0f172a)] placeholder-[var(--muted,#64748b)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
									data-testid="chat-message-draft-input"
								/>

								<button
									type="button"
									onClick={state.handleSend}
									className="primary-button min-h-[44px] min-w-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 shrink-0 text-xs font-bold rounded-xl cursor-pointer shadow-sm active:scale-95"
									title="Отправить сообщение (Ctrl+Enter)"
									data-testid="chat-send-message-btn"
								>
									<Send size={15} />
									<span className="hidden sm:inline">
										{state.isSending ? "Отправка..." : "Отправить"}
									</span>
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
