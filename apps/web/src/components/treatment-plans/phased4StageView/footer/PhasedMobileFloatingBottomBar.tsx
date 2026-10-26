import React from "react";
import type { InstallmentMonthsOption } from "../types.js";

export interface PhasedMobileFloatingBottomBarProps {
	readonly grandTotalRub: number;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly planApproved: boolean;
	readonly onApprovePlan: () => void;
	readonly onOpenInstallment?: ((totalRub: number) => void) | undefined;
	readonly onPrintContract?: (() => void) | undefined;
}

export const PhasedMobileFloatingBottomBar: React.FC<PhasedMobileFloatingBottomBarProps> = ({
	grandTotalRub,
	installmentMonths,
	installmentMonthlyRub,
	planApproved,
	onApprovePlan,
	onOpenInstallment,
	onPrintContract,
}) => {
	const handlePrint = () => {
		if (onPrintContract) {
			onPrintContract();
		} else if (typeof window !== "undefined") {
			window.print();
		}
	};

	return (
		<div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
			<div className="flex items-center justify-between gap-2 mb-2">
				<div>
					<div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
						Итого (4 этапа)
					</div>
					<div className="text-base font-extrabold text-[var(--ink)] tabular-nums leading-tight">
						{grandTotalRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
				<button
					type="button"
					onClick={() => onOpenInstallment?.(grandTotalRub)}
					className="text-right rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--teal)] tabular-nums"
				>
					Рассрочка 0% ({installmentMonths} мес): {installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
				</button>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					data-testid="phased-approve-plan-btn"
					onClick={onApprovePlan}
					className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
				>
					<svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{planApproved ? "План утвержден" : "Утвердить план"}</span>
				</button>
				<button
					type="button"
					onClick={handlePrint}
					className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-3 text-xs font-semibold text-[var(--ink)]"
				>
					Печать
				</button>
			</div>
		</div>
	);
};
