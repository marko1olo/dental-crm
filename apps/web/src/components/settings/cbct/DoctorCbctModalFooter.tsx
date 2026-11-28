import { Check, RotateCcw } from "lucide-react";
import React from "react";

interface DoctorCbctModalFooterProps {
	onResetCanonical: () => void;
	onClose: () => void;
	onSaveDefaults: () => void;
}

export function DoctorCbctModalFooter({
	onResetCanonical,
	onClose,
	onSaveDefaults,
}: DoctorCbctModalFooterProps) {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--line)] bg-[var(--paper)]">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onResetCanonical}
					className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
					title="Сбросить все параметры на канон (4025 HU / 525 HU)"
				>
					<RotateCcw size={14} />
					<span>Сбросить на канон (4025/525)</span>
				</button>
			</div>

			<div className="flex items-center gap-2.5">
				<button
					type="button"
					onClick={onClose}
					className="px-4 py-2 rounded-xl border border-[var(--line)] bg-transparent hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
				>
					Отмена
				</button>

				<button
					type="button"
					onClick={onSaveDefaults}
					className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
				>
					<Check size={14} className="stroke-[3]" />
					<span>Сохранить как мой дефолт</span>
				</button>
			</div>
		</div>
	);
}
