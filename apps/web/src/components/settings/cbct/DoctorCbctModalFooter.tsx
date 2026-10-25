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
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-[#0f172a]/95">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onResetCanonical}
					className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
					className="px-4 py-2 rounded-xl border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
				>
					Отмена
				</button>

				<button
					type="button"
					onClick={onSaveDefaults}
					className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/30 transition-all cursor-pointer"
				>
					<Check size={14} className="stroke-[3]" />
					<span>Сохранить как мой дефолт</span>
				</button>
			</div>
		</div>
	);
}
