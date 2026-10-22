import {
	Bell, Headphones, Hospital, MessageSquare, Radio, User, Users, Volume2, Wifi,
} from "lucide-react";
import type React from "react";
import { StaffChatMembersList } from "./StaffChatMembersList";
import type { StaffChatSidebarProps } from "./types";

export const StaffChatSidebar: React.FC<StaffChatSidebarProps> = ({
	channels, activeChannelId, members, mobileView,
	onSelectChannel, onOpenDirectChat, onPlayChimeTest,
}) => {
	const clinicChannels = channels.filter((c) => c.type === "channel");
	const directChannels = channels.filter((c) => c.type === "direct");

	return (
		<div
			className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--line)] bg-[var(--paper-soft)]/60 flex flex-col ${
				mobileView === "chat" ? "hidden md:flex" : "flex"
			}`}
		>
			<div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
						<Radio size={16} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)]">Персонал & Интерком</h3>
						<div className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
							<Wifi size={10} className="animate-pulse" />
							<span>LAN брокер онлайн</span>
						</div>
					</div>
				</div>
				<button
					type="button" onClick={onPlayChimeTest} title="Тест звукового оповещения интеркома"
					className="p-1.5 rounded-lg text-[var(--muted)] hover:text-teal-600 hover:bg-[var(--paper-soft)] transition-all cursor-pointer"
				>
					<Volume2 size={15} />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-3 space-y-4">
				<div>
					<div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
						<span>Каналы клиники</span>
						<span className="text-[10px] bg-[var(--paper-soft)] border border-[var(--line)] px-1.5 py-0.5 rounded text-[var(--ink)] font-bold">
							{clinicChannels.length}
						</span>
					</div>
					<div className="space-y-1">
						{clinicChannels.map((ch) => {
							const isActive = ch.id === activeChannelId;
							return (
								<button
									key={ch.id} type="button" onClick={() => onSelectChannel(ch.id)}
									className={`staff-chat-channel-btn ${isActive ? "active" : ""}`}
									data-testid={`staff-chat-channel-${ch.slug || ch.id}`}
								>
									<div className="flex items-center gap-2.5 truncate">
										<span className={isActive ? "text-white" : "text-teal-600 dark:text-teal-400"}>
											{ch.slug === "general" ? <Hospital size={15} /> : ch.slug === "reception" ? <Bell size={15} /> : ch.slug === "intercom_assistants" ? <Headphones size={15} /> : <MessageSquare size={15} />}
										</span>
										<span className="truncate">#{ch.name}</span>
									</div>
									{ch.unreadCount > 0 && <span className="staff-chat-badge">{ch.unreadCount}</span>}
								</button>
							);
						})}
					</div>
				</div>

				<div>
					<div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
						<span>Личные диалоги</span>
						<Users size={12} className="text-[var(--muted)]" />
					</div>
					<div className="space-y-1">
						{directChannels.map((ch) => {
							const isActive = ch.id === activeChannelId;
							return (
								<button
									key={ch.id} type="button" onClick={() => onSelectChannel(ch.id)}
									className={`staff-chat-channel-btn ${isActive ? "active" : ""}`}
								>
									<div className="flex items-center gap-2 truncate">
										<User size={14} className={isActive ? "text-white" : "text-slate-400"} />
										<span className="truncate">{ch.name}</span>
									</div>
									{ch.unreadCount > 0 && <span className="staff-chat-badge">{ch.unreadCount}</span>}
								</button>
							);
						})}
					</div>
				</div>

				<StaffChatMembersList members={members} onOpenDirectChat={onOpenDirectChat} />
			</div>
		</div>
	);
};
