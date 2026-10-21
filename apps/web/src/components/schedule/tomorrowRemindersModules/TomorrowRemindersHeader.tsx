import { Copy, MessageSquare, X } from "lucide-react";
import type { TomorrowRemindersSummary } from "../tomorrowRemindersEngine";

interface TomorrowRemindersHeaderProps {
	summary: TomorrowRemindersSummary;
	onCopyAll: () => void;
	onClose: () => void;
}

export function TomorrowRemindersHeader({
	summary,
	onCopyAll,
	onClose,
}: TomorrowRemindersHeaderProps) {
	return (
		<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/20 shrink-0">
					<MessageSquare className="w-5 h-5" aria-hidden="true" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] leading-tight">
							Напоминания на завтра ({summary.targetDateLabel})
						</h2>
						<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
							{summary.totalAppointmentsCount} записей
						</span>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Быстрая отправка через WhatsApp, Telegram, SMS или буфер обмена
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onCopyAll}
					className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer flex items-center gap-1.5"
					title="Скопировать все напоминания"
				>
					<Copy className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span className="hidden sm:inline">Копировать все</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer shrink-0"
					aria-label="Закрыть окно"
				>
					<X className="w-5 h-5" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
