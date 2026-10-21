import { Search } from "lucide-react";
import type { ReminderChannel } from "../tomorrowRemindersEngine";

interface TomorrowRemindersFilterBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	selectedChannel: "all" | ReminderChannel;
	setSelectedChannel: (channel: "all" | ReminderChannel) => void;
}

export function TomorrowRemindersFilterBar({
	searchQuery,
	setSearchQuery,
	selectedChannel,
	setSelectedChannel,
}: TomorrowRemindersFilterBarProps) {
	const channels: Array<{ id: "all" | ReminderChannel; label: string }> = [
		{ id: "all", label: "Все каналы" },
		{ id: "whatsapp", label: "WhatsApp" },
		{ id: "telegram", label: "Telegram" },
		{ id: "sms", label: "SMS" },
	];

	return (
		<div className="p-3 sm:p-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
			<div className="relative w-full sm:w-72">
				<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)]" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по пациенту, телефону, врачу..."
					className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
				/>
			</div>

			<div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
				{channels.map((ch) => {
					const isActive = selectedChannel === ch.id;
					return (
						<button
							key={ch.id}
							type="button"
							onClick={() => setSelectedChannel(ch.id)}
							className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
								isActive
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
							}`}
						>
							{ch.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
