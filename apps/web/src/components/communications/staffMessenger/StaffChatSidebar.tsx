import {
	Bell,
	Headphones,
	Hospital,
	MessageSquare,
	Radio,
	User,
	Users,
	Volume2,
	Wifi,
} from "lucide-react";
import type React from "react";
import type { StaffChatSidebarProps } from "./types";

export const StaffChatSidebar: React.FC<StaffChatSidebarProps> = ({
	channels,
	activeChannelId,
	members,
	mobileView,
	onSelectChannel,
	onOpenDirectChat,
	onPlayChimeTest,
}) => {
	return (
		<div
			className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-slate-50 dark:bg-[var(--paper-soft,#0f172a)] flex flex-col ${
				mobileView === "chat" ? "hidden md:flex" : "flex"
			}`}
		>
			{/* Шапка списка каналов */}
			<div className="p-4 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
						<Radio size={16} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
							Персонал & Интерком
						</h3>
						<div className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
							<Wifi size={10} className="animate-pulse" />
							<span>LAN брокер онлайн</span>
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onPlayChimeTest}
					className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
					title="Тест звукового оповещения интеркома"
				>
					<Volume2 size={15} />
				</button>
			</div>

			{/* Список каналов клиники */}
			<div className="flex-1 overflow-y-auto p-3 space-y-4">
				<div>
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
						<span>Каналы клиники</span>
						<span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
							{channels.filter((c) => c.type === "channel").length}
						</span>
					</div>
					<div className="space-y-1">
						{channels
							.filter((c) => c.type === "channel")
							.map((ch) => {
								const isActive = ch.id === activeChannelId;
								return (
									<button
										key={ch.id}
										type="button"
										onClick={() => onSelectChannel(ch.id)}
										className={`staff-chat-channel-btn ${isActive ? "active" : ""}`}
										data-testid={`staff-chat-channel-${ch.slug || ch.id}`}
									>
										<div className="flex items-center gap-2.5 truncate">
											<span
												className={
													isActive
														? "text-white"
														: "text-teal-600 dark:text-teal-400"
												}
											>
												{ch.slug === "general" ? (
													<Hospital size={15} />
												) : ch.slug === "reception" ? (
													<Bell size={15} />
												) : ch.slug === "intercom_assistants" ? (
													<Headphones size={15} />
												) : (
													<MessageSquare size={15} />
												)}
											</span>
											<span className="truncate">#{ch.name}</span>
										</div>
										{ch.unreadCount > 0 && (
											<span className="staff-chat-badge">{ch.unreadCount}</span>
										)}
									</button>
								);
							})}
					</div>
				</div>

				{/* Личные сообщения */}
				<div>
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
						<span>Личные диалоги</span>
						<Users size={12} className="text-slate-400" />
					</div>
					<div className="space-y-1">
						{channels
							.filter((c) => c.type === "direct")
							.map((ch) => {
								const isActive = ch.id === activeChannelId;
								return (
									<button
										key={ch.id}
										type="button"
										onClick={() => onSelectChannel(ch.id)}
										className={`staff-chat-channel-btn ${isActive ? "active" : ""}`}
									>
										<div className="flex items-center gap-2 truncate">
											<User
												size={14}
												className={isActive ? "text-white" : "text-slate-400"}
											/>
											<span className="truncate">{ch.name}</span>
										</div>
										{ch.unreadCount > 0 && (
											<span className="staff-chat-badge">{ch.unreadCount}</span>
										)}
									</button>
								);
							})}
					</div>
				</div>

				{/* Список сотрудников и онлайн-статус */}
				<div>
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5">
						<span>Сотрудники ({members.length})</span>
					</div>
					<div className="space-y-1 max-h-48 overflow-y-auto">
						{members.map((m) => (
							<div
								key={m.staffId}
								className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-all"
							>
								<div className="flex items-center gap-2 truncate">
									<span
										className={`w-2 h-2 rounded-full flex-shrink-0 ${
											m.status === "online"
												? "bg-emerald-500 shadow-xs"
												: m.status === "in_visit"
													? "bg-amber-500 animate-pulse"
													: "bg-slate-400 opacity-50"
										}`}
										title={
											m.status === "online"
												? "В сети"
												: m.status === "in_visit"
													? "На приёме"
													: "Офлайн"
										}
									/>
									<div className="truncate">
										<div className="truncate font-medium text-slate-800 dark:text-slate-200">
											{m.fullName}
										</div>
										<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
											{m.role}{" "}
											{m.cabinetNumber ? `• Каб. ${m.cabinetNumber}` : ""}
										</div>
									</div>
								</div>
								<button
									type="button"
									onClick={() => onOpenDirectChat(m.staffId)}
									className="p-1 rounded text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 text-[11px] font-semibold cursor-pointer"
									title="Написать личное сообщение"
								>
									Чат
								</button>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
