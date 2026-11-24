import React from "react";
import { Camera, Receipt } from "lucide-react";

export interface ImplantActionButtonsProps {
	readonly handleExportToPlan?: (() => void) | undefined;
	readonly handleExportToEmr?: (() => void) | undefined;
}

export const ImplantActionButtons: React.FC<ImplantActionButtonsProps> = ({
	handleExportToPlan, handleExportToEmr,
}) => {
	return (
		<div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
			{handleExportToPlan && (
				<button
					type="button"
					onClick={handleExportToPlan}
					className="min-h-[44px] px-3 rounded-lg text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs transition-opacity cursor-pointer touch-manipulation"
					data-testid="cbct-implant-add-to-plan-btn"
					title="Добавить имплантат и операцию остеотомии в план лечения"
				>
					<Receipt className="w-4 h-4 shrink-0" />
					<span>+ В план и смету</span>
				</button>
			)}

			{handleExportToEmr && (
				<button
					type="button"
					onClick={handleExportToEmr}
					className="min-h-[44px] px-3 rounded-lg text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer touch-manipulation"
					data-testid="cbct-implant-add-to-emr-btn"
					title="Зафиксировать позицию и протокол в медицинскую карту"
				>
					<Camera className="w-4 h-4 shrink-0 text-[var(--ink-muted)]" />
					<span>В медкарту</span>
				</button>
			)}
		</div>
	);
};
