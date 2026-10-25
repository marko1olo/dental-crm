/**
 * ShiftCloseHeader.tsx — Top Header and Tab Navigation for Shift Close Modal.
 * Mandate 8x: Clear clinical & cashier domain terminology.
 * Apple HIG: >= 44px touch targets on mobile, 0 text clipping.
 */

import React from "react";
import { Lock, X } from "lucide-react";
import type { ShiftCloseActiveTab } from "./types";
import { ShiftCloseDesktopTabs, ShiftCloseMobileTabs } from "./ShiftCloseTabs";

export interface ShiftCloseHeaderProps {
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly kktRegNumber: string;
	readonly activeTab: ShiftCloseActiveTab;
	readonly onTabChange: (tab: ShiftCloseActiveTab) => void;
	readonly onOpenBatchModal: () => void;
	readonly onClose: () => void;
}

export const ShiftCloseHeader: React.FC<ShiftCloseHeaderProps> = ({
	shiftNumber,
	cashierFullName,
	kktRegNumber,
	activeTab,
	onTabChange,
	onOpenBatchModal,
	onClose,
}) => {
	return (
		<div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
					<div className="p-2 sm:p-2.5 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400 shrink-0">
						<Lock className="w-5 h-5 sm:w-6 sm:h-6" />
					</div>
					<div className="min-w-0 flex-1">
						<h2 id="shift-close-zreport-modal-title" className="text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2 m-0 flex-nowrap">
							<span className="shrink-0">Закрытие смены №{shiftNumber}</span>
							<span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))] shrink-0 whitespace-nowrap">
								Z-отчет
							</span>
						</h2>
						<div className="text-[11px] sm:text-xs text-[var(--muted)] m-0 mt-0.5 flex flex-wrap items-center gap-x-1.5 leading-tight">
							<span>Кассир: <strong className="text-[var(--ink)]">{cashierFullName}</strong></span>
							<span className="hidden sm:inline">•</span>
							<span className="text-[10px] sm:text-xs opacity-90">Касса: {kktRegNumber}</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<ShiftCloseDesktopTabs
						activeTab={activeTab}
						onTabChange={onTabChange}
						onOpenBatchModal={onOpenBatchModal}
					/>
					<button
						type="button"
						onClick={onClose}
						className="btn-icon cash-shift-close-btn shrink-0 min-h-[36px] min-w-[36px] sm:h-9 sm:w-9 flex items-center justify-center cursor-pointer"
						aria-label="Закрыть модальное окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			<ShiftCloseMobileTabs
				activeTab={activeTab}
				onTabChange={onTabChange}
				onOpenBatchModal={onOpenBatchModal}
			/>
		</div>
	);
};
