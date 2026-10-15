import React from "react";
import { Check, FileText, Printer, Share2, X } from "lucide-react";

export interface TreatmentPlanContractPrintHeaderProps {
	readonly viewMode: "patient_friendly" | "official_appendix";
	readonly setViewMode: (mode: "patient_friendly" | "official_appendix") => void;
	readonly isCopiedMessenger: boolean;
	readonly onCopyForMessenger: () => void;
	readonly onClose: () => void;
}

export const TreatmentPlanContractPrintHeader: React.FC<TreatmentPlanContractPrintHeaderProps> = ({
	viewMode,
	setViewMode,
	isCopiedMessenger,
	onCopyForMessenger,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 print:hidden shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="p-1.5 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)]">
					<FileText size={18} />
				</div>
				<div>
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
						Договор на оказание медицинских услуг и утвержденная смета
					</h3>
					<p className="text-[11px] text-slate-500 dark:text-slate-400">
						Официальный бланк клиники (Клинические протоколы СтАР)
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold">
					<button
						type="button"
						onClick={() => setViewMode("patient_friendly")}
						className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
							viewMode === "patient_friendly"
								? "bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs font-bold"
								: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
						}`}
						data-testid="contract-view-patient-friendly-btn"
					>
						Для пациента
					</button>
					<button
						type="button"
						onClick={() => setViewMode("official_appendix")}
						className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
							viewMode === "official_appendix"
								? "bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs font-bold"
								: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
						}`}
						data-testid="contract-view-official-btn"
					>
						Официальная смета
					</button>
				</div>

				<button
					type="button"
					onClick={onCopyForMessenger}
					className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
					title="Скопировать смету для отправки в WhatsApp или Telegram"
					data-testid="contract-copy-messenger-btn"
				>
					{isCopiedMessenger ? (
						<>
							<Check size={14} className="text-emerald-600" />
							<span className="text-emerald-600">Скопировано!</span>
						</>
					) : (
						<>
							<Share2 size={14} className="text-teal-600" />
							<span>В мессенджер</span>
						</>
					)}
				</button>

				<button
					type="button"
					onClick={() => window.print()}
					className="px-3.5 py-1.5 rounded-xl bg-[var(--teal-dark)] hover:bg-[var(--teal)] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
					data-testid="contract-print-btn"
				>
					<Printer size={15} />
					<span>Печать (Ctrl+P)</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
