import { Check, Copy, MessageCircle, Send } from "lucide-react";
import type { TomorrowReminderItem } from "../tomorrowRemindersEngine";

interface TomorrowReminderCardProps {
	reminder: TomorrowReminderItem;
	isSent: boolean;
	onCopy: (r: TomorrowReminderItem) => void;
	onSendWhatsApp: (r: TomorrowReminderItem) => void;
	onSendTelegram: (r: TomorrowReminderItem) => void;
	onSendSms: (r: TomorrowReminderItem) => void;
}

export function TomorrowReminderCard({
	reminder,
	isSent,
	onCopy,
	onSendWhatsApp,
	onSendTelegram,
	onSendSms,
}: TomorrowReminderCardProps) {
	return (
		<div className="p-3.5 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
						{reminder.patientName}
					</span>
					{isSent && (
						<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
							<Check className="w-3 h-3" /> Отправлено
						</span>
					)}
				</div>
				<div className="text-xs text-[var(--muted,#64748b)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<span className="font-semibold text-[var(--teal,#0d9488)]">
						{reminder.timeRangeFormatted}
					</span>
					<span>•</span>
					<span>{reminder.doctorName}</span>
					{reminder.patientPhone && (
						<>
							<span>•</span>
							<span>{reminder.patientPhone}</span>
						</>
					)}
				</div>
				<p className="text-xs text-[var(--ink,#0f172a)]/80 mt-1.5 bg-[var(--paper-soft,#f8fafc)] p-2 rounded-xl border border-[var(--line-subtle,#f1f5f9)] line-clamp-2 select-text">
					{reminder.reminderText}
				</p>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
				<button
					type="button"
					onClick={() => onCopy(reminder)}
					className="min-h-[36px] min-w-[36px] px-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1 cursor-pointer"
					title="Скопировать текст"
				>
					<Copy className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
					<span className="hidden sm:inline">Копия</span>
				</button>
				{reminder.availableChannels.includes("whatsapp") && (
					<button
						type="button"
						onClick={() => onSendWhatsApp(reminder)}
						className="min-h-[36px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
					>
						<MessageCircle className="w-3.5 h-3.5" />
						<span>WhatsApp</span>
					</button>
				)}
				{reminder.availableChannels.includes("telegram") && (
					<button
						type="button"
						onClick={() => onSendTelegram(reminder)}
						className="min-h-[36px] px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
					>
						<Send className="w-3.5 h-3.5" />
						<span>Telegram</span>
					</button>
				)}
				{reminder.availableChannels.includes("sms") && (
					<button
						type="button"
						onClick={() => onSendSms(reminder)}
						className="min-h-[36px] px-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
					>
						SMS
					</button>
				)}
			</div>
		</div>
	);
}
