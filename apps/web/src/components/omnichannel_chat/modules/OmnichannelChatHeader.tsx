import React from "react";
import { MessageSquare } from "lucide-react";
import type { OmnichannelChannel } from "../types";

export interface OmnichannelChatHeaderProps {
	selectedChannel: OmnichannelChannel | "all";
	onSelectChannel: (channel: OmnichannelChannel | "all") => void;
	mobileViewMode: "list" | "chat";
}

const CHANNELS: Array<{ id: OmnichannelChannel | "all"; label: string }> = [
	{ id: "all", label: "Все каналы" },
	{ id: "whatsapp", label: "WhatsApp" },
	{ id: "telegram", label: "Telegram" },
	{ id: "vk", label: "VK" },
	{ id: "max", label: "MAX" },
	{ id: "sms", label: "SMS" },
];

export function OmnichannelChatHeader({
	selectedChannel,
	onSelectChannel,
	mobileViewMode,
}: OmnichannelChatHeaderProps): React.JSX.Element {
	return (
		<header
			className={`items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] gap-2 flex-wrap ${
				mobileViewMode === "chat" ? "hidden sm:flex" : "flex"
			}`}
		>
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface,#f0fdfa)] border border-[var(--teal-soft,#99f6e4)] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
					<MessageSquare size={16} />
				</div>
				<div>
					<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight">
						Омниканальный мессенджер клиники
					</h2>
					<p className="text-[11px] text-[var(--muted)] hidden sm:block">
						Единый центр диалогов WhatsApp, Telegram, VK, MAX и SMS
					</p>
				</div>
			</div>

			<div className="flex items-center p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 text-xs">
				{CHANNELS.map((ch) => {
					const isActive = selectedChannel === ch.id;
					return (
						<button
							key={ch.id}
							type="button"
							onClick={() => onSelectChannel(ch.id)}
							className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-lg font-bold transition-all ${
								isActive
									? "bg-[var(--paper-card)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid={`channel-filter-${ch.id}`}
						>
							{ch.label}
						</button>
					);
				})}
			</div>
		</header>
	);
}
