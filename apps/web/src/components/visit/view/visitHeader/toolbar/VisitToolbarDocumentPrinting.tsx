import React from "react";
import { Printer, FileText, Calculator } from "lucide-react";
import { showToast } from "../../../../GlobalToast";

interface VisitToolbarDocumentPrintingProps {
	readonly handlePrintClinicalDiaryFast: () => void;
	readonly handlePrintCompletedActFast?: (() => void) | undefined;
	readonly handlePrintEstimateFast?: (() => void) | undefined;
}

export function VisitToolbarDocumentPrinting({
	handlePrintClinicalDiaryFast,
	handlePrintCompletedActFast,
	handlePrintEstimateFast,
}: VisitToolbarDocumentPrintingProps) {
	return (
		<div
			className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-0 shrink-0 gap-0.5 min-h-[44px] sm:min-h-[36px] sm:h-9 h-11 shadow-xs"
			role="group"
			aria-label="Быстрая печать документов"
		>
			{/* Печать медицинской карты приёма */}
			<button
				type="button"
				onClick={handlePrintClinicalDiaryFast}
				data-testid="btn-visit-fast-print-medical-card"
				className="icon-button secondary-button min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] sm:h-9 sm:w-9 h-11 w-11 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
				title="Медицинская карта приёма (печать со штампом)"
				aria-label="Печать медицинской карты приёма"
			>
				<Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>
			<span data-testid="btn-visit-fast-print-043u" className="hidden" aria-hidden="true" onClick={handlePrintClinicalDiaryFast} />

			{/* Печать Акта выполненных работ */}
			<button
				type="button"
				onClick={() => {
					if (typeof handlePrintCompletedActFast === "function") {
						handlePrintCompletedActFast();
					} else {
						showToast("Печать Акта выполненных работ", "info");
					}
				}}
				data-testid="btn-visit-fast-print-act"
				className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] sm:h-9 sm:w-9 h-11 w-11 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
				title="Печать Акта выполненных работ"
				aria-label="Печать Акта выполненных работ"
			>
				<FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>

			{/* Печать Сметы и плана лечения */}
			<button
				type="button"
				onClick={() => {
					if (typeof handlePrintEstimateFast === "function") {
						handlePrintEstimateFast();
					} else {
						showToast("Печать Сметы и плана лечения", "info");
					}
				}}
				data-testid="btn-visit-fast-print-estimate"
				className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] sm:h-9 sm:w-9 h-11 w-11 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
				title="Печать Сметы и плана лечения"
				aria-label="Печать Сметы и плана лечения"
			>
				<Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>
		</div>
	);
}
