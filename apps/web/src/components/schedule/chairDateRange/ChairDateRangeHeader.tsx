import { CalendarRange, X } from "lucide-react";
import React from "react";

export interface ChairDateRangeHeaderProps {
	onClose: () => void;
}

export function ChairDateRangeHeader({ onClose }: ChairDateRangeHeaderProps) {
	return (
		<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-3">
			<div className="flex items-center gap-2">
				<CalendarRange
					className="w-5 h-5 text-[var(--teal,#0d9488)]"
					aria-hidden="true"
				/>
				<div>
					<h2
						id="chair-date-range-modal-title"
						className="text-base font-bold text-[var(--ink,#0f172a)] leading-tight"
					>
						Назначить смену на диапазон дат
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
						Закрепление врача за установкой
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shrink-0"
				aria-label="Закрыть окно"
				data-testid="chair-range-modal-close-btn"
			>
				<X className="w-5 h-5" aria-hidden="true" />
			</button>
		</div>
	);
}
