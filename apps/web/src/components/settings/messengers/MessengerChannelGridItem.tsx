import { ArrowRight, Bot, CheckCircle2, Clock, RefreshCw, Smartphone, User } from "lucide-react";
import React from "react";
import { CHANNEL_THEMES, type MessengerChannelItem } from "./messengerChannelTypes";

interface Props {
	channel: MessengerChannelItem;
	isTesting: boolean;
	onTest: (ch: MessengerChannelItem) => void;
	onSelectTab: (tabId: string) => void;
}

export const MessengerChannelGridItem: React.FC<Props> = ({ channel, isTesting, onTest, onSelectTab }) => {
	const theme = CHANNEL_THEMES[channel.id] ?? CHANNEL_THEMES.tg_bot;

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 flex flex-col justify-between gap-3 shadow-xs">
			<div>
				<div className="flex items-start justify-between gap-2 mb-1.5">
					<div className="flex items-center gap-2 min-w-0">
						<div
							className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
							style={{ backgroundColor: theme.bgSoft, color: theme.iconColor }}
						>
							{channel.type === "account" ? <User size={15} /> : channel.type === "phone" ? <Smartphone size={15} /> : <Bot size={15} />}
						</div>
						<div className="min-w-0">
							<h4 className="text-xs font-bold leading-tight text-[var(--ink)] truncate m-0">{channel.title}</h4>
							<span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase text-white mt-0.5" style={{ backgroundColor: theme.iconColor }}>
								{channel.shortBadge}
							</span>
						</div>
					</div>

					<div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold">
						{channel.status === "connected" && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
								<CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
								<span>{channel.statusText}</span>
							</span>
						)}
						{channel.status === "pending_qr" && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
								<Clock size={11} className="text-amber-600 dark:text-amber-400" />
								<span>{channel.statusText}</span>
							</span>
						)}
						{channel.status === "unconfigured" && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
								<span>{channel.statusText}</span>
							</span>
						)}
					</div>
				</div>

				{channel.details && (
					<p className="text-[11px] text-[var(--muted)] m-0 truncate">{channel.details}</p>
				)}
			</div>

			<div className="flex items-center gap-2 pt-2 border-t border-[var(--line-subtle)]">
				<button
					type="button"
					onClick={() => onTest(channel)}
					disabled={isTesting}
					className="h-8 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-xs text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer transition-colors"
				>
					<RefreshCw size={12} className={isTesting ? "animate-spin" : ""} />
					<span>Проверить</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab(channel.configTab)}
					className="h-8 min-h-[36px] px-3 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] text-xs font-semibold inline-flex items-center gap-1 ml-auto cursor-pointer"
				>
					<span>Настроить</span>
					<ArrowRight size={12} />
				</button>
			</div>
		</div>
	);
};
