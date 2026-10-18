/**
 * apps/web/src/components/billing/cashRegisterDrawer/DrawerFooter.tsx
 *
 * Fixed Drawer Footer (Natural Thumb Zone with safe-area padding).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Plus } from "lucide-react";

interface DrawerFooterProps {
	readonly onClose: () => void;
	readonly onNewPayment: () => void;
}

export const DrawerFooter: React.FC<DrawerFooterProps> = ({
	onClose,
	onNewPayment,
}) => {
	return (
		<div className="p-3.5 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-between gap-2.5 shrink-0 pb-[max(14px,env(safe-area-inset-bottom))]">
			<button
				type="button"
				onClick={onClose}
				className="min-h-[46px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
			>
				Закрыть
			</button>

			<button
				type="button"
				onClick={onNewPayment}
				className="flex-1 min-h-[46px] px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 transition-all"
				data-testid="btn-drawer-new-payment"
			>
				<Plus size={18} />
				<span>Принять оплату</span>
			</button>
		</div>
	);
};
