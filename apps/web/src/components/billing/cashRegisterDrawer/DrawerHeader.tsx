/**
 * apps/web/src/components/billing/cashRegisterDrawer/DrawerHeader.tsx
 *
 * Header for CashRegisterDrawer: Title, Shift Status Badge, Cashier Info, Close Button.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Wallet, CheckCircle2, X } from "lucide-react";

interface DrawerHeaderProps {
	readonly shiftNumber: number;
	readonly isShiftOpen: boolean;
	readonly cashierFullName: string;
	readonly clinicLegalName: string;
	readonly onClose: () => void;
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({
	shiftNumber,
	isShiftOpen,
	cashierFullName,
	clinicLegalName,
	onClose,
}) => {
	return (
		<>
			{/* Tactile Drag Handle (Mobile Only) */}
			<div className="flex md:hidden justify-center pt-2.5 pb-0.5 select-none shrink-0">
				<div className="mobile-drag-handle-bar" />
			</div>

			<div className="p-3.5 sm:p-4 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
						<Wallet size={18} />
					</div>
					<div>
						<h3 id="cash-register-drawer-title" className="text-sm sm:text-base font-extrabold m-0 text-[var(--ink,#0f172a)] flex items-center gap-2">
							<span>Касса и чеки</span>
							<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
								<CheckCircle2 size={12} />
								<span>{`Смена № ${shiftNumber} ${isShiftOpen ? "открыта" : "закрыта"}`}</span>
							</span>
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 truncate max-w-[200px] sm:max-w-none">
							{cashierFullName} • {clinicLegalName}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="w-9 h-9 rounded-full border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
					aria-label="Закрыть шторку кассы"
					data-testid="btn-close-cash-register-drawer"
				>
					<X size={16} />
				</button>
			</div>
		</>
	);
};
