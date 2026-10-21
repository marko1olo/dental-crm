/**
 * apps/web/src/components/sterilization/SterilizationDrawerFooter.tsx
 *
 * Липкий подвал шторки: кнопки Отмена и Утвердить цикл стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface SterilizationDrawerFooterProps {
	readonly isSubmitting: boolean;
	readonly onApprove: () => void;
	readonly onClose: () => void;
}

export function SterilizationDrawerFooter({
	isSubmitting,
	onApprove,
	onClose,
}: SterilizationDrawerFooterProps) {
	return (
		<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] sticky bottom-0 z-10 flex items-center gap-3">
			<button
				type="button"
				onClick={onClose}
				className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] min-h-[48px] touch-manipulation cursor-pointer border border-[var(--line,#e2e8f0)]"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={onApprove}
				aria-busy={isSubmitting}
				className="flex-1 px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-sm min-h-[48px] touch-manipulation cursor-pointer inline-flex items-center justify-center gap-2 transition-all"
				data-testid="approve-cycle-primary-cta"
			>
				<CheckCircle2 size={18} />
				<span>
					{isSubmitting ? "Утверждение..." : "✓ Утвердить цикл стерилизации"}
				</span>
			</button>
		</div>
	);
}
