/**
 * CbctSidebarExportButtons.tsx — Кнопки быстрых действий экспорта в сайдбаре (Мандаты 8e, 8b).
 */

import React from "react";
import { Download, FileText, Printer, Receipt, Sparkles } from "lucide-react";

export interface CbctSidebarExportButtonsProps {
	readonly handleExportToEmr: () => void;
	readonly handleExportPdfReport: () => void;
	readonly handleExportToPlan: () => void;
	readonly handleExportToFinance?: (() => void) | undefined;
	readonly handleExport300DpiSnapshot?: (() => void) | undefined;
}

export const CbctSidebarExportButtons: React.FC<CbctSidebarExportButtonsProps> = ({
	handleExportToEmr,
	handleExportPdfReport,
	handleExportToPlan,
	handleExportToFinance,
	handleExport300DpiSnapshot,
}) => {
	return (
		<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--line)]">
			{handleExportToFinance && (
				<button
					type="button"
					onClick={handleExportToFinance}
					className="w-full h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
					title="Добавить имплантат и КЛКТ в смету приёма"
				>
					<Receipt className="w-3.5 h-3.5" />
					<span>Добавить в смету</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleExportToEmr}
				className="w-full h-8 px-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--text)] text-xs font-medium hover:bg-[var(--line)] transition-colors flex items-center justify-center gap-2"
				title="Внести замеры и протокол в карту обследования"
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--warning,orange)]" />
				<span>В медицинскую карту</span>
			</button>

			<div className="grid grid-cols-2 gap-1.5">
				<button
					type="button"
					onClick={handleExportPdfReport}
					className="h-8 px-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--text)] text-xs font-medium hover:bg-[var(--line)] transition-colors flex items-center justify-center gap-1.5"
					title="Печать отчета исследования"
				>
					<Printer className="w-3.5 h-3.5" />
					<span>Печать A4</span>
				</button>

				{handleExport300DpiSnapshot ? (
					<button
						type="button"
						onClick={handleExport300DpiSnapshot}
						className="h-8 px-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--text)] text-xs font-medium hover:bg-[var(--line)] transition-colors flex items-center justify-center gap-1.5"
						title="Экспорт HD снимка 300 DPI"
					>
						<Download className="w-3.5 h-3.5" />
						<span>Экспорт HD</span>
					</button>
				) : (
					<button
						type="button"
						onClick={handleExportToPlan}
						className="h-8 px-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--text)] text-xs font-medium hover:bg-[var(--line)] transition-colors flex items-center justify-center gap-1.5"
						title="Перенести в план лечения"
					>
						<FileText className="w-3.5 h-3.5" />
						<span>В план</span>
					</button>
				)}
			</div>
		</div>
	);
};
