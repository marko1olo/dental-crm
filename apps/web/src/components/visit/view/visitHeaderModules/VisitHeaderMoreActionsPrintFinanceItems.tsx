import { Calculator, FileText, ShieldCheck } from "lucide-react";

export interface VisitHeaderMoreActionsPrintFinanceItemsProps {
	onCloseMenu: () => void;
	handlePrintCompletedActFast: () => void;
	handlePrintEstimateFast: () => void;
	setIsWarrantyModalOpen?: ((open: boolean) => void) | undefined;
}

export function VisitHeaderMoreActionsPrintFinanceItems({
	onCloseMenu,
	handlePrintCompletedActFast,
	handlePrintEstimateFast,
	setIsWarrantyModalOpen,
}: VisitHeaderMoreActionsPrintFinanceItemsProps) {
	return (
		<>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					handlePrintCompletedActFast();
				}}
				data-testid="visit-more-action-print-act"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<FileText className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Печать Акта выполненных работ</span>
					<span className="text-[10px] text-[var(--muted)]">Реестр оказанных медицинских услуг</span>
				</div>
			</button>
			<button
				type="button"
				onClick={() => {
					onCloseMenu();
					handlePrintEstimateFast();
				}}
				data-testid="visit-more-action-print-estimate"
				className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
				role="menuitem"
			>
				<Calculator className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
				<div className="flex flex-col">
					<span className="font-semibold">Печать Сметы и плана лечения</span>
					<span className="text-[10px] text-[var(--muted)]">Финансовый расчёт и гарантийные сроки</span>
				</div>
			</button>
			{setIsWarrantyModalOpen && (
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						setIsWarrantyModalOpen(true);
					}}
					data-testid="visit-more-action-warranty-passport"
					className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
					role="menuitem"
				>
					<ShieldCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" aria-hidden="true" />
					<div className="flex flex-col">
						<span className="font-semibold">Гарантийный паспорт</span>
						<span className="text-[10px] text-[var(--muted)]">Оформить гарантию на лечение</span>
					</div>
				</button>
			)}
		</>
	);
}
