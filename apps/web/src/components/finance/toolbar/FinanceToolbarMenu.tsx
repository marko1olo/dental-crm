import React from "react";
import { MoreHorizontal } from "lucide-react";
import { FinanceToolbarMenuItems } from "./FinanceToolbarMenuItems.js";

export interface FinanceToolbarMenuProps {
	readonly isFinanceOptionsOpen: boolean;
	readonly onToggleFinanceOptions: () => void;
	readonly onCloseFinanceOptions: () => void;
	readonly onOpenPnl: () => void;
	readonly onGoToDocuments: () => void;
	readonly onOpenCashbox: () => void;
	readonly onOpenBillingAct?: (() => void) | undefined;
	readonly onOpenQuickExpense?: (() => void) | undefined;
	readonly onOpenTaxCertificate?: (() => void) | undefined;
	readonly onOpenT13Timesheet?: (() => void) | undefined;
	readonly onOpenFamilyBilling?: (() => void) | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly isCashShiftOpen: boolean;
	readonly onToggleCashShift: () => void;
}

export function FinanceToolbarMenu(p: FinanceToolbarMenuProps): React.JSX.Element {
	return (
		<div className="relative shrink-0">
			<button
				type="button"
				onClick={p.onToggleFinanceOptions}
				data-testid="finance-toolbar-options-btn"
				className="min-h-[36px] min-w-[36px] sm:min-w-0 sm:min-h-0 sm:h-7 w-9 sm:w-7 p-0 flex items-center justify-center shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
				title="Дополнительные финансовые отчеты и документы"
				aria-label="Дополнительные действия"
				aria-expanded={p.isFinanceOptionsOpen}
			>
				<MoreHorizontal size={15} className="shrink-0" aria-hidden="true" />
			</button>
			{p.isFinanceOptionsOpen && (
				<div
					className="absolute right-0 top-full mt-1 w-56 py-1.5 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 flex flex-col gap-1 text-left"
					role="menu"
				>
					<FinanceToolbarMenuItems {...p} />
				</div>
			)}
		</div>
	);
}
