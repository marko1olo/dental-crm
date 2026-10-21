import { Moon, Zap } from "lucide-react";
import type { TomorrowRemindersSummary } from "../tomorrowRemindersEngine";

interface TomorrowRemindersBatchFooterProps {
	summary: TomorrowRemindersSummary;
	isDispatching: boolean;
	dispatchProgress: { current: number; total: number } | null;
	allowQuietHoursOverride: boolean;
	setAllowQuietHoursOverride: (allow: boolean) => void;
	onBatchDispatch: () => void;
	onClose: () => void;
}

export function TomorrowRemindersBatchFooter({
	summary,
	isDispatching,
	dispatchProgress,
	allowQuietHoursOverride,
	setAllowQuietHoursOverride,
	onBatchDispatch,
	onClose,
}: TomorrowRemindersBatchFooterProps) {
	return (
		<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]">
				{summary.isQuietHoursActive && (
					<div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
						<Moon className="w-4 h-4 shrink-0" />
						<span>
							Сейчас тихие часы (21:00–09:00). Массовая отправка ограничена.
						</span>
					</div>
				)}
			</div>

			<div className="flex items-center gap-3 w-full sm:w-auto">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer w-full sm:w-auto"
				>
					Закрыть
				</button>
				<button
					type="button"
					onClick={summary.dispatchableCount === 0 ? () => {} : onBatchDispatch}
					aria-busy={isDispatching}
					className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-sm font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
				>
					<Zap className="w-4 h-4" />
					<span>
						{isDispatching
							? `Отправка (${dispatchProgress?.current || 0}/${dispatchProgress?.total || 0})...`
							: `Разослать все (Каскад)${summary.dispatchableCount > 0 ? ` (${summary.dispatchableCount})` : ""}`}
					</span>
				</button>
			</div>
		</div>
	);
}
