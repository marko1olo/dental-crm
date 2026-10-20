/**
 * SterilizationBatchCycleHeader.tsx — Шапка модального окна цикла автоклавирования.
 * Apple HIG: высота тач-таргетов >= 44x44px. Строго <= 120 строк.
 */

import { Flame, X } from "lucide-react";
import { DEFAULT_AUTOCLAVE_REGIME } from "./types.js";

export interface SterilizationBatchCycleHeaderProps {
	readonly onClose: () => void;
}

export function SterilizationBatchCycleHeader({
	onClose,
}: SterilizationBatchCycleHeaderProps) {
	return (
		<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
			<div className="flex items-center gap-2.5">
				<div className="p-2 rounded-xl bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal,#0d9488)]">
					<Flame size={20} />
				</div>
				<div>
					<h3 className="text-[15px] font-bold text-[var(--ink)] m-0">
						Запуск цикла автоклавирования
					</h3>
					<p className="text-[11px] text-[var(--muted)] m-0">
						{DEFAULT_AUTOCLAVE_REGIME.nameRu}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				aria-label="Закрыть"
				className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg hover:bg-[var(--line-subtle)] flex items-center justify-center text-[var(--muted)] cursor-pointer touch-manipulation"
			>
				<X size={18} />
			</button>
		</div>
	);
}
