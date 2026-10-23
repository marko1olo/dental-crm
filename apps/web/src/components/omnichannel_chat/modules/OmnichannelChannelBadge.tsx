import React from "react";
import type { OmnichannelChannel } from "../types";

export interface OmnichannelChannelBadgeProps {
	channel: OmnichannelChannel;
	className?: string;
}

export function OmnichannelChannelBadge({ channel, className = "" }: OmnichannelChannelBadgeProps): React.JSX.Element {
	switch (channel) {
		case "whatsapp":
			return (
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 ${className}`}>
					WhatsApp
				</span>
			);
		case "telegram":
			return (
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 ${className}`}>
					Telegram
				</span>
			);
		case "sms":
			return (
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 ${className}`}>
					SMS
				</span>
			);
		case "vk":
			return (
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 ${className}`}>
					VK
				</span>
			);
		case "max":
			return (
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 ${className}`}>
					MAX
				</span>
			);
		default:
			return (
				<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] ${className}`}>
					Чат
				</span>
			);
	}
}
