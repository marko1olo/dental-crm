import React from "react";
import { Download, Printer } from "lucide-react";

export interface TaxDeductionModalFooterProps {
	activeTab: "form" | "checks" | "family" | "xml";
	clinicName: string;
	clinicInn: string;
	clinicKpp: string;
	onClose: () => void;
	onDownloadBatchNoMedoplXml: () => void;
	onDownloadBatchXml: () => void;
	onPrintBatch: () => void;
	onDownloadNoMedoplXml: () => void;
	onDownloadXml: () => void;
	onPrintBlank: () => void;
	onPrint: () => void;
}

export const TaxDeductionModalFooter: React.FC<TaxDeductionModalFooterProps> = ({
	activeTab,
	clinicName,
	clinicInn,
	clinicKpp,
	onClose,
	onDownloadBatchNoMedoplXml,
	onDownloadBatchXml,
	onPrintBatch,
	onDownloadNoMedoplXml,
	onDownloadXml,
	onPrintBlank,
	onPrint,
}) => {
	return (
		<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
			<div className="text-xs text-[var(--muted,#64748b)]">
				{clinicName} • ИНН {clinicInn} • КПП {clinicKpp}
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-slate-500/10 cursor-pointer transition-colors"
				>
					Закрыть
				</button>
				{activeTab === "family" ? (
					<>
						<button
							type="button"
							onClick={onDownloadBatchNoMedoplXml}
							className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[var(--ink,#0f172a)] hover:bg-slate-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
							title="Скачать файл NO_MEDOPL Формат 5.01"
						>
							<Download size={15} />
							<span>NO_MEDOPL (5.01)</span>
						</button>
						<button
							type="button"
							onClick={onDownloadBatchXml}
							className="min-h-[44px] px-4 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Download size={16} />
							<span>Выгрузить пакет XML (ТКС)</span>
						</button>
						<button
							type="button"
							onClick={onPrintBatch}
							className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Printer size={16} />
							<span>Печать пакета справок (А4)</span>
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={onDownloadNoMedoplXml}
							className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[var(--ink,#0f172a)] hover:bg-slate-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
							title="Скачать файл NO_MEDOPL Формат 5.01"
						>
							<Download size={15} />
							<span>NO_MEDOPL (5.01)</span>
						</button>
						<button
							type="button"
							onClick={onDownloadXml}
							className="min-h-[44px] px-4 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Download size={16} />
							<span>Выгрузить XML (ТКС)</span>
						</button>
						<button
							type="button"
							data-testid="btn-tax-print-blank"
							onClick={onPrintBlank}
							className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[var(--ink,#0f172a)] hover:bg-slate-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
							title="Печать чистого бланка справки для налогового вычета со строками «________» для ручного заполнения"
						>
							<Printer size={15} />
							<span>Бланк («________»)</span>
						</button>
						<button
							type="button"
							onClick={onPrint}
							className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
							title="Печать справки КНД 1151156 (А4)"
							aria-label="Печать справки КНД 1151156 (А4)"
						>
							<Printer size={16} />
							<span>Печать справки КНД 1151156 (А4)</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};
