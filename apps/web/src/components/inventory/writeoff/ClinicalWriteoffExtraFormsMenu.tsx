import { Download, FileText } from "lucide-react";
import type React from "react";

export interface ClinicalWriteoffExtraFormsMenuProps {
	readonly onPrintAct: (formType: "M11" | "TORG16") => void;
	readonly onExportCsv: () => void;
}

export const ClinicalWriteoffExtraFormsMenu: React.FC<ClinicalWriteoffExtraFormsMenuProps> = ({
	onPrintAct,
	onExportCsv,
}) => {
	return (
		<div className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1">
			<button
				type="button"
				className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
				onClick={() => onPrintAct("M11")}
				title="Печать Требования-накладной на списание (форма М-11)"
			>
				<FileText size={14} className="text-teal-600" />
				<span>Накладная на списание</span>
				<span className="text-[10px] opacity-60 ml-auto font-mono">Накладная</span>
			</button>

			<button
				type="button"
				className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
				onClick={() => onPrintAct("TORG16")}
				title="Печать акта о списании материалов"
			>
				<FileText size={14} className="text-teal-600" />
				<span>Акт списания материалов</span>
				<span className="text-[10px] opacity-60 ml-auto font-mono">Акт списания</span>
			</button>

			<button
				type="button"
				className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
				onClick={onExportCsv}
				title="Экспорт в CSV"
			>
				<Download size={14} className="text-teal-600" />
				<span>Экспорт в CSV</span>
			</button>
		</div>
	);
};
