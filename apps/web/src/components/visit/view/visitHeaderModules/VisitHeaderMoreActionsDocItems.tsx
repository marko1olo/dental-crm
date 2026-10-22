import { Printer, ShieldCheck } from "lucide-react";

export interface VisitHeaderMoreActionsDocItemsProps {
	onCloseMenu: () => void;
	handlePrintForm043uFast: () => void;
	handlePrintInformedConsentFast: () => void;
}

export function VisitHeaderMoreActionsDocItems({
	onCloseMenu,
	handlePrintForm043uFast,
	handlePrintInformedConsentFast,
}: VisitHeaderMoreActionsDocItemsProps) {
	return (
		<>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					handlePrintForm043uFast();
				}}
				data-testid="visit-more-action-print-043u"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Printer className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Печать дневника приёма</span>
					<span className="text-[10px] text-[var(--muted)]">Медицинская карта приёма, статус, зубная формула</span>
				</div>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					handlePrintInformedConsentFast();
				}}
				data-testid="visit-more-action-print-consent"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<ShieldCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<span className="font-semibold">Печать согласия</span>
			</button>
		</>
	);
}
