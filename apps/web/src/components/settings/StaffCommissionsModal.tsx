import { Calculator, X } from "lucide-react";
import type React from "react";
import { StaffCommissionsPanel } from "./StaffCommissionsPanel";

export interface StaffCommissionsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly props?: Record<string, unknown>;
}

export const StaffCommissionsModal: React.FC<StaffCommissionsModalProps> = ({
	isOpen,
	onClose,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			data-testid="settings-staff-commissions-modal-container"
		>
			<div className="relative w-full max-w-4xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col min-w-0">
				{/* High-contrast Modal Header with WCAG AAA typography (>= 15:1) */}
				<div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-3 min-w-0">
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
							<Calculator className="w-5 h-5" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0 break-words leading-tight">
								Ставки и комиссии врачей (Номенклатура 804н)
							</h3>
							<p className="text-xs text-slate-600 dark:text-slate-400 m-0 mt-0.5 break-words">
								Настройка процентов сдельной оплаты и удержаний за лабораторные этапы (ЗТЛ)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
						data-testid="close-settings-staff-commissions-modal-btn"
						aria-label="Закрыть модальное окно ставок"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Monolithic Content Area without card-in-card nesting */}
				<div className="flex-1 overflow-y-auto min-w-0 pr-1">
					<StaffCommissionsPanel isModalView={true} />
				</div>
			</div>
		</div>
	);
};

export default StaffCommissionsModal;
