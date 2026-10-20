import type React from "react";
import { Copy, Printer } from "lucide-react";
import type { FiscalReceiptFooterProps } from "./FiscalReceiptFooter.js";

/**
 * Print act and tax deduction certificate footer actions.
 * Mandate 8b: <= 120 lines.
 */
export const FiscalFooterPrintDocs: React.FC<FiscalReceiptFooterProps> = (p) => {
	const { activeTab, onClose, handleCopyActData, handleCopyCertData, handlePrintAct, handlePrintCertificate } = p;
	const isAct = activeTab === "act";

	return (
		<>
			<button type="button" onClick={isAct ? handleCopyActData : handleCopyCertData} className="min-h-[44px] sm:min-h-0 sm:h-9 px-3.5 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 cursor-pointer shadow-xs">
				<Copy size={14} /><span>{isAct ? "Скопировать текст Акта" : "Скопировать данные справки"}</span>
			</button>
			<div className="flex items-center gap-2.5">
				<button type="button" onClick={onClose} className="min-h-[44px] sm:min-h-0 sm:h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer">Закрыть</button>
				<button type="button" onClick={isAct ? (handlePrintAct || (() => window.print())) : (handlePrintCertificate || (() => window.print()))} className={`min-h-[44px] sm:min-h-0 sm:h-9 px-5 rounded-xl font-bold text-xs ${isAct ? "bg-[var(--ok-fg,#059669)]" : "bg-[var(--brand-primary,#0d9488)]"} text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-md`}>
					<Printer size={15} /><span>{isAct ? "Печать акта лечения" : "Печать справки для налогового вычета"}</span>
				</button>
			</div>
		</>
	);
};