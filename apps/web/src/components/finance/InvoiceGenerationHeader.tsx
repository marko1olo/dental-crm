import React from "react";
import { FileText, Lock, Sparkles, X } from "lucide-react";

export interface InvoiceGenerationHeaderProps {
	readonly planNumber: string;
	readonly planTitle: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly documentType: "invoice" | "work_order" | "completed_act";
	readonly onSetDocumentType: (type: "invoice" | "work_order" | "completed_act") => void;
	readonly onLockAllPrices: () => void;
	readonly onUpdateAllToCurrent: () => void;
	readonly onClose: () => void;
}

export const InvoiceGenerationHeader: React.FC<InvoiceGenerationHeaderProps> = ({
	planNumber, planTitle, patientName, doctorFullName, documentType,
	onSetDocumentType, onLockAllPrices, onUpdateAllToCurrent, onClose,
}) => {
	return (
		<>
			<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
						<FileText size={20} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-bold text-[var(--ink)] m-0">
								Выписка счета и наряда по плану {planNumber}
							</h3>
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								Фиксация цен плана
							</span>
						</div>
						<div className="text-xs text-[var(--ink-muted)] mt-0.5">
							{patientName} • {planTitle} • Врач: {doctorFullName}
						</div>
					</div>
				</div>
				<button type="button" onClick={onClose} className="p-2 rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover)] transition-colors cursor-pointer" aria-label="Закрыть">
					<X size={18} />
				</button>
			</div>
			<div className="flex items-center justify-between px-6 py-2.5 bg-[var(--paper-soft)]/50 border-b border-[var(--line)] text-xs">
				<div className="flex items-center gap-1.5">
					<span className="text-[var(--ink-muted)] font-medium mr-1">Тип документа:</span>
					<button type="button" onClick={() => onSetDocumentType("invoice")} className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${documentType === "invoice" ? "bg-teal-600 text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>
						Счет на оплату
					</button>
					<button type="button" onClick={() => onSetDocumentType("work_order")} className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${documentType === "work_order" ? "bg-teal-600 text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>
						Наряд-заказ
					</button>
					<button type="button" onClick={() => onSetDocumentType("completed_act")} className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${documentType === "completed_act" ? "bg-teal-600 text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>
						Акт работ
					</button>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[11px] text-[var(--ink-muted)] mr-1">Пакетные действия:</span>
					<button type="button" onClick={onLockAllPrices} className="px-2.5 py-1 rounded-md bg-[var(--paper-strong)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-medium flex items-center gap-1 transition-colors cursor-pointer">
						<Lock size={12} className="text-amber-500" /> Зафиксировать цены плана
					</button>
					<button type="button" onClick={onUpdateAllToCurrent} className="px-2.5 py-1 rounded-md bg-[var(--paper-strong)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-medium transition-colors cursor-pointer">
						Актуальный прайс
					</button>
				</div>
			</div>
		</>
	);
};
