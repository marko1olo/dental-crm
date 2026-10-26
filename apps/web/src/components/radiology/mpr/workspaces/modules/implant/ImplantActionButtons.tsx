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
		<div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-800/80">
			{handleExportToPlan && (
				<button
					type="button"
					onClick={handleExportToPlan}
					className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 hover:text-teal-200 border border-teal-500/50 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
					data-testid="cbct-implant-add-to-plan-btn"
					title="Добавить имплантат и операцию остеотомии в план лечения"
				>
					<Receipt className="w-3.5 h-3.5" />
					<span>+ В план & смету</span>
				</button>
			)}

			{handleExportToEmr && (
				<button
					type="button"
					onClick={handleExportToEmr}
					className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-500/50 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
					data-testid="cbct-implant-add-to-emr-btn"
					title="Зафиксировать позицию и протокол в медицинскую карту"
				>
					<Camera className="w-3.5 h-3.5" />
					<span>В медкарту</span>
				</button>
			)}
		</div>
	);
};
