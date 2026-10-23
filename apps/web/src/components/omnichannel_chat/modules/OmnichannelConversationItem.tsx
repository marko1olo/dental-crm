import React from "react";
import { formatPhoneDisplay } from "../../../store/telephonyStore";
import type { OmnichannelConversation } from "../types";
import { OmnichannelChannelBadge } from "./OmnichannelChannelBadge";

export interface OmnichannelConversationItemProps {
	conversation: OmnichannelConversation;
	isSelected: boolean;
	onSelect: (conv: OmnichannelConversation) => void;
}

export function OmnichannelConversationItem({
	conversation: c,
	isSelected,
	onSelect,
}: OmnichannelConversationItemProps): React.JSX.Element {
	const formattedTime = React.useMemo(() => {
		try {
			return new Date(c.lastMessageTime).toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return "";
		}
	}, [c.lastMessageTime]);

	return (
		<div
			onClick={() => onSelect(c)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(c);
				}
			}}
			tabIndex={0}
			role="button"
			className={`flex items-start gap-2.5 p-3 min-h-[58px] cursor-pointer transition-colors text-left ${
				isSelected
					? "bg-[var(--teal-surface,#f0fdfa)] border-l-4 border-l-[var(--teal,#0d9488)]"
					: "hover:bg-[var(--paper-soft)]"
			}`}
			data-testid={`conversation-item-${c.id}`}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-1">
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						{c.patientName}
					</span>
					<span className="text-[10px] text-[var(--muted)] shrink-0 font-mono">
						{formattedTime}
					</span>
				</div>

				<div className="flex items-center gap-1.5 mt-0.5">
					<OmnichannelChannelBadge channel={c.channel} />
					<span className="text-[11px] font-mono text-[var(--muted)]">
						{formatPhoneDisplay(c.patientPhone)}
					</span>
				</div>

				<p className="text-xs text-[var(--muted)] truncate mt-1">
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
}
