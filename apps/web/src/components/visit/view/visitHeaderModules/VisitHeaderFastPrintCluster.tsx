import { Calculator, FileText, Printer } from "lucide-react";

export interface VisitHeaderFastPrintClusterProps {
	handlePrintForm043uFast: () => void;
	handlePrintCompletedActFast: () => void;
	handlePrintEstimateFast: () => void;
}

export function VisitHeaderFastPrintCluster({
	handlePrintForm043uFast,
	handlePrintCompletedActFast,
	handlePrintEstimateFast,
}: VisitHeaderFastPrintClusterProps) {
	return (
		<div
			className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] h-9 min-h-[36px] divide-x divide-[var(--line)] overflow-hidden shadow-xs shrink-0"
			role="group"
			aria-label="Быстрая печать документов"
		>
			<button
				type="button"
				onClick={handlePrintForm043uFast}
				data-testid="btn-visit-fast-print-043u"
				className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
				title="Печать дневника приёма (Форма 043/у)"
				aria-label="Печать дневника"
			>
				<Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>
			<button
				type="button"
				onClick={handlePrintCompletedActFast}
				data-testid="btn-visit-fast-print-act"
				className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
				title="Печать акта выполненных работ"
				aria-label="Печать Акта выполненных работ"
			>
				<FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>
			<button
				type="button"
				onClick={handlePrintEstimateFast}
				data-testid="btn-visit-fast-print-estimate"
				className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
				title="Печать сметы и плана лечения"
				aria-label="Печать Сметы и плана лечения"
			>
				<Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>
		</div>
	);
}
