import React from "react";
import { Copy, Download, FileText } from "lucide-react";

export interface OneCExportFooterProps {
	readonly handleCopyAccountantSummary: () => void;
	readonly handleCopyXml: () => void;
	readonly handleDownloadXml: () => void;
	readonly onClose: () => void;
}

export const OneCExportFooter: React.FC<OneCExportFooterProps> = ({
	handleCopyAccountantSummary,
	handleCopyXml,
	handleDownloadXml,
	onClose,
}) => {
	return (
		<div className="sticky bottom-0 z-50 grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[var(--paper,#ffffff)] border-t border-[var(--line,#e2e8f0)] shrink-0 shadow-lg">
			<div className="contents sm:flex sm:items-center sm:gap-2">
				<button
					type="button"
					onClick={handleCopyAccountantSummary}
					className="min-h-[44px] px-2.5 sm:px-3.5 rounded-xl font-bold text-[11px] sm:text-xs bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-center whitespace-nowrap shrink-0 touch-manipulation"
					title="Сводка для бухгалтерии"
				>
					<FileText size={14} className="shrink-0" />
					<span>
						<span className="hidden sm:inline">Сводка для бухгалтерии</span>
						<span className="sm:hidden">Сводка</span>
					</span>
				</button>
				<button
					type="button"
					onClick={handleCopyXml}
					className="min-h-[44px] px-2.5 sm:px-3.5 rounded-xl font-bold text-[11px] sm:text-xs bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-center whitespace-nowrap shrink-0 touch-manipulation"
					title="Скопировать XML CommerceML"
				>
					<Copy size={14} className="shrink-0" />
					<span>
						<span className="hidden sm:inline">Скопировать XML</span>
						<span className="sm:hidden">XML</span>
					</span>
				</button>
			</div>

			<div className="contents sm:flex sm:items-center sm:gap-2">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] px-3 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] cursor-pointer transition-colors flex items-center justify-center text-center whitespace-nowrap touch-manipulation"
				>
					Закрыть
				</button>
				<button
					type="button"
					onClick={handleDownloadXml}
					className="w-full sm:w-auto min-h-[44px] px-2.5 sm:px-4 text-[11px] sm:text-xs font-bold shadow-md bg-teal-600 hover:bg-teal-700 text-white shrink-0 flex items-center justify-center gap-1.5 text-center whitespace-nowrap touch-manipulation cursor-pointer rounded-xl"
					title="Скачать официальный XML CommerceML 2.09 для загрузки в 1С:Бухгалтерия 8.3"
					data-testid="billing-1c-download-xml-button"
				>
					<Download size={14} className="shrink-0" />
					<span>Экспорт в 1С (XML)</span>
				</button>
			</div>
		</div>
	);
};
