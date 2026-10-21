import { X, Zap } from "lucide-react";
import type React from "react";

export interface ExpressWaybillHeaderProps {
	readonly onClose: () => void;
}

export const ExpressWaybillHeader: React.FC<ExpressWaybillHeaderProps> = ({ onClose }) => (
	<div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between">
		<div className="flex items-center gap-2">
			<div className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center">
				<Zap size={14} />
			</div>
			<div>
				<h3 className="text-sm font-bold text-[var(--ink)]">
					Экспресс-приход накладной
				</h3>
				<p className="text-xs text-[var(--muted)]">
					Пополнение склада и погашение овердрафта
				</p>
			</div>
		</div>
		<button
			type="button"
			onClick={onClose}
			className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition"
			aria-label="Закрыть"
		>
			<X size={16} />
		</button>
	</div>
);
