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
		<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] print:hidden shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="p-1.5 rounded-lg bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)]">
					<FileText size={18} />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">
						Договор на оказание медицинских услуг и утвержденная смета
					</h3>
					<p className="text-[11px] text-[var(--ink-muted)] m-0">
						Официальный бланк клиники (Клинические протоколы СтАР)
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--line-subtle)] text-[11px] font-semibold">
					<button
						type="button"
						onClick={() => setViewMode("patient_friendly")}
						className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
							viewMode === "patient_friendly"
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs font-semibold"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
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
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs font-semibold"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="contract-view-official-btn"
					>
						Официальная смета
					</button>
				</div>

				<button
					type="button"
					onClick={onCopyForMessenger}
					className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
					title="Скопировать смету для отправки в WhatsApp или Telegram"
					data-testid="contract-copy-messenger-btn"
				>
					{isCopiedMessenger ? (
						<>
							<Check size={14} className="text-[var(--primary)]" />
							<span className="text-[var(--primary)]">Скопировано!</span>
						</>
					) : (
						<>
							<Share2 size={14} className="text-[var(--primary)]" />
							<span>В мессенджер</span>
						</>
					)}
				</button>

				<button
					type="button"
					onClick={() => window.print()}
					className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
					data-testid="contract-print-btn"
				>
					<Printer size={15} />
					<span>Печать (Ctrl+P)</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
