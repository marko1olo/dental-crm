/**
 * ImplantQuickEstimateAction.tsx — Кнопка 1-клик добавления имплантата в смету (Мандаты 8e, 8b).
 */

import React from "react";
import { Receipt, Sparkles } from "lucide-react";

export interface ImplantQuickEstimateActionProps {
	readonly handleExportToEmr: () => void;
	readonly handleExportToPlan?: (() => void) | undefined;
}

export const ImplantQuickEstimateAction: React.FC<ImplantQuickEstimateActionProps> = ({
	handleExportToEmr,
	handleExportToPlan,
}) => {
	return (
		<div className="flex items-center gap-2">
			{handleExportToPlan && (
				<button
					type="button"
					onClick={handleExportToPlan}
					className="h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
					title="Добавить выбранный имплантат в смету приёма"
				>
					<Receipt className="w-3.5 h-3.5" />
					<span>Добавить в смету</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleExportToEmr}
				className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)] text-xs font-medium text-[var(--text)] transition-colors flex items-center gap-1.5"
				title="Внести протокол примерки в медицинскую карту"
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--warning,orange)]" />
				<span className="hidden sm:inline">В карту</span>
			</button>
		</div>
	);
};
