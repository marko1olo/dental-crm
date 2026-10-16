import { Layers, X } from "lucide-react";
import React from "react";

export interface BatchTrackingHeaderProps {
	readonly onClose: () => void;
}

export const BatchTrackingHeader: React.FC<BatchTrackingHeaderProps> = ({ onClose }) => (
	<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
		<div className="flex items-center gap-3 min-w-0">
			<div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
				<Layers size={18} />
			</div>
			<div className="min-w-0">
				<h2 className="text-base font-bold leading-tight truncate">
					Партионный учёт и контроль сроков (FEFO)
				</h2>
				<p className="text-xs text-[var(--muted)] truncate">
					Приоритетный отпуск серий с минимальным остаточным сроком • СанПиН 3.3686-21
				</p>
			</div>
		</div>
		<button
			type="button"
			onClick={onClose}
			className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
			aria-label="Закрыть окно партионного учёта"
			data-testid="btn-close-batch-modal"
		>
			<X size={18} />
		</button>
	</header>
);
