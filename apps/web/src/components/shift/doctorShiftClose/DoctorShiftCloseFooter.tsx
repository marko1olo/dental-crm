import React from "react";
import { CheckCircle2, Printer } from "lucide-react";

export interface DoctorShiftCloseFooterProps {
	readonly onPrintShiftStatement: () => void;
	readonly onClose: () => void;
	readonly onConfirmClose: () => void;
}

export const DoctorShiftCloseFooter: React.FC<DoctorShiftCloseFooterProps> = ({
	onPrintShiftStatement,
	onClose,
	onConfirmClose,
}) => {
	return (
		<div className="p-3.5 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			{/* Desktop / Tablet Actions Bar */}
			<div className="hidden sm:flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={onPrintShiftStatement}
					className="secondary-button h-9 px-3.5 text-xs font-bold"
					data-testid="btn-print-shift-statement"
					title="Распечатать сводку смены врача и фискальные итоги"
				>
					<Printer className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span>Печать сводки смены</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onClose}
						className="secondary-button h-9 px-3.5 text-xs font-bold"
						data-testid="btn-cancel-close-shift"
					>
						<span>Отмена</span>
					</button>

					<button
						type="button"
						data-testid="btn-confirm-close-shift-1click"
						onClick={onConfirmClose}
						className="primary-button h-9 px-4 text-xs font-bold gap-2"
						title="Завершить смену врача, рассчитать заработок и снять Z-отчет ККТ"
					>
						<CheckCircle2 className="w-4 h-4" />
						<span>Завершить смену и рассчитать (1 клик)</span>
					</button>
				</div>
			</div>

			{/* Mobile Bottom Thumb Zone Bar (Apple HIG: Touch targets >= 44x44px, safe-area-inset-bottom) */}
			<div className="sm:hidden flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom,0px)]">
				<button
					type="button"
					data-testid="btn-confirm-close-shift-1click-mobile"
					onClick={onConfirmClose}
					className="primary-button w-full min-h-[46px] text-sm font-bold flex items-center justify-center gap-2"
				>
					<CheckCircle2 className="w-5 h-5" />
					<span>Завершить смену и рассчитать</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onPrintShiftStatement}
						className="secondary-button flex-1 min-h-[44px] text-xs font-bold flex items-center justify-center gap-1.5"
					>
						<Printer className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>Печать сводки</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="secondary-button flex-1 min-h-[44px] text-xs font-bold flex items-center justify-center"
					>
						<span>Отмена</span>
					</button>
				</div>
			</div>
		</div>
	);
};
