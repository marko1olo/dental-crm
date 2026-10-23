import { Clock } from "lucide-react";
import type React from "react";

export interface BookingSlotsEmptyStateProps {
	readonly onJoinWaitlist?: (() => void) | undefined;
}

export const BookingSlotsEmptyState: React.FC<BookingSlotsEmptyStateProps> = ({
	onJoinWaitlist,
}) => {
	return (
		<div className="dbw-slots-section" aria-live="polite">
			<div
				className="dbw-slots-empty-container text-center p-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
				data-testid="booking-slots-empty-state"
			>
				<Clock size={36} className="text-slate-400 mb-3" aria-hidden="true" />
				<div className="text-sm font-bold text-slate-800 dark:text-slate-100">
					На выбранную дату нет свободных окон для записи
				</div>
				<div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
					Выберите другой день в ленте выше или оставьте заявку в лист ожидания — администратор свяжется с вами при отмене записи
				</div>
				{onJoinWaitlist && (
					<button
						type="button"
						className="mt-4 primary-button px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all min-h-[44px] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
						data-testid="join-waitlist-btn"
						onClick={onJoinWaitlist}
					>
						<span>Оставить заявку в лист ожидания</span>
					</button>
				)}
			</div>
		</div>
	);
};
