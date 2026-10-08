import React from "react";
import {
	Bot,
	MessageSquare,
	Plus,
	RefreshCw,
	Search,
	UserCheck,
	X,
} from "lucide-react";
import { formatPatientInitials, formatPhoneDisplay, getAvatarColor } from "../../../store/telephonyStore";
import { CHANNEL_CONFIGS, getSourceBadgeInfo } from "./constants";
import type { BotChannel, InboxConversation } from "./types";

export interface ChannelConversationListProps {
	conversations: InboxConversation[];
	filteredConversations: InboxConversation[];
	selectedKey: string | null;
	isLoadingList: boolean;
	channelFilter: "all" | BotChannel;
	statusFilter: "all" | "intercepted" | "bot";
	searchQuery: string;
	isMobileThreadOpen: boolean;
	onSelectConversation: (key: string) => void;
	onRefresh: () => void;
	onSimulateIncoming: () => void;
	onSetChannelFilter: (ch: "all" | BotChannel) => void;
	onSetStatusFilter: (status: "all" | "intercepted" | "bot") => void;
	onSetSearchQuery: (query: string) => void;
}

export function ChannelConversationList({
	conversations,
	filteredConversations,
	selectedKey,
	isLoadingList,
	channelFilter,
	statusFilter,
	searchQuery,
	isMobileThreadOpen,
	onSelectConversation,
	onRefresh,
	onSimulateIncoming,
	onSetChannelFilter,
	onSetStatusFilter,
	onSetSearchQuery,
}: ChannelConversationListProps) {
	return (
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
							onClick={onRefresh}
							className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)] transition-colors cursor-pointer"
							title="Обновить список диалогов"
						>
							<RefreshCw size={14} className={isLoadingList ? "animate-spin" : ""} />
						</button>
						<button
							type="button"
							onClick={onSimulateIncoming}
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
						onChange={(e) => onSetSearchQuery(e.target.value)}
						className="dente-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSetSearchQuery("")}
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
								onClick={() => onSetChannelFilter(ch)}
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
						onClick={() => onSetStatusFilter("all")}
						className={`dente-filter-chip ${
							statusFilter === "all" ? "active" : ""
						}`}
						data-active={statusFilter === "all"}
					>
						Все ({conversations.length})
					</button>
					<button
						type="button"
						onClick={() => onSetStatusFilter("intercepted")}
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
						onClick={() => onSetStatusFilter("bot")}
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
							onClick={onSimulateIncoming}
							className="mt-2 text-xs font-semibold text-teal-600 hover:underline"
						>
							Создать тестовое обращение
						</button>
					</div>
				) : (
					filteredConversations.map((conv) => {
						const isSelected = conv.key === selectedKey;
						const sourceInfo = getSourceBadgeInfo(conv);
						const initials = formatPatientInitials(conv.patientName);
						const avatarCol = getAvatarColor(conv.patientName);

						return (
							<button
								key={conv.key}
								type="button"
								onClick={() => onSelectConversation(conv.key)}
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
	);
}
