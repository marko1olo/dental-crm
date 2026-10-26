/**
 * CbctHeaderExportActions.tsx — Кнопки экспорта в ЭМК, смету и протокол (Мандаты 8e, 8x, 8b).
 */

import React from "react";
import { Camera, FileText, Receipt, Sparkles } from "lucide-react";

export interface CbctHeaderExportActionsProps {
	readonly handleExportToEmr: () => void;
	readonly handleExportCbctToFinance?: (() => void) | undefined;
	readonly handleExportPdfReport: () => void;
	readonly onCopySnapshotToClipboard?: (() => void) | undefined;
}

export const CbctHeaderExportActions: React.FC<CbctHeaderExportActionsProps> = ({
	handleExportToEmr,
	handleExportCbctToFinance,
	handleExportPdfReport,
	onCopySnapshotToClipboard,
}) => {
	return (
		<div className="flex items-center gap-1.5 flex-shrink-0">
			{onCopySnapshotToClipboard && (
				<button
					type="button"
					onClick={onCopySnapshotToClipboard}
					className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)]/50 text-xs font-medium text-[var(--text)] transition-colors flex items-center gap-1.5"
					title="Скопировать текущий снимок в буфер обмена"
				>
					<Camera className="w-3.5 h-3.5 text-[var(--text-muted)]" />
					<span className="hidden xl:inline">Снимок</span>
				</button>
			)}

			{handleExportCbctToFinance && (
				<button
					type="button"
					onClick={handleExportCbctToFinance}
					className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)]/50 text-xs font-medium text-[var(--text)] transition-colors flex items-center gap-1.5"
					title="Добавить КЛКТ-исследование в смету приёма"
				>
					<Receipt className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span className="hidden xl:inline">В смету</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleExportToEmr}
				className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)]/50 text-xs font-medium text-[var(--text)] transition-colors flex items-center gap-1.5"
				title="Сохранить протокол в медицинскую карту приёма"
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--warning,orange)]" />
				<span className="hidden xl:inline">В карту</span>
			</button>

			<button
				type="button"
				onClick={handleExportPdfReport}
				className="h-8 px-3 rounded-lg bg-[var(--primary)] hover:opacity-90 text-xs font-semibold text-white shadow-sm transition-opacity flex items-center gap-1.5"
				title="Сформировать печатный клинический отчет A4"
			>
				<FileText className="w-3.5 h-3.5" />
				<span>Отчет A4</span>
			</button>
		</div>
	);
};
