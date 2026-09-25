import React from "react";
import { createPortal } from "react-dom";
import { PenTool, Printer, ShieldCheck, X } from "lucide-react";

export interface TreatmentEstimatorSignModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirmPaper: () => void;
	onPrint: () => void;
}

export const TreatmentEstimatorSignModal: React.FC<TreatmentEstimatorSignModalProps> = ({
	isOpen,
	onClose,
	onConfirmPaper,
	onPrint,
}) => {
	if (!isOpen || typeof window === "undefined") return null;

	return createPortal(
		<div className="modal-overlay">
			<div className="modal-content" style={{ maxWidth: "800px" }}>
				<div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-700">
					<h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
						<PenTool size={16} className="text-teal-600" />
						<span>Подписание плана лечения</span>
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={16} aria-hidden="true" />
					</button>
				</div>
				<div className="p-4 space-y-3 bg-[var(--paper,#18181b)] rounded-xl border border-[var(--line,#27272a)] text-center">
					<p className="text-xs text-slate-600 dark:text-slate-300">
						Смета согласована с пациентом в соответствии со ст. 84 323-ФЗ и ПП РФ № 736.
					</p>
					<div className="flex flex-col sm:flex-row gap-2">
						<button
							type="button"
							onClick={onConfirmPaper}
							className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] sm:min-h-[32px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-sm"
							data-testid="estimator-modal-paper-confirm-btn"
						>
							<ShieldCheck size={16} />
							<span>Подтвердить на бумаге (1 клик)</span>
						</button>
						<button
							type="button"
							onClick={onPrint}
							className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] sm:min-h-[32px] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
							data-testid="estimator-modal-print-btn"
						>
							<Printer size={16} />
							<span>Печать сметы (А4)</span>
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
