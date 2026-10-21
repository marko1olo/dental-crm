import React from "react";
import { showToast } from "../../../GlobalToast.js";
import type { InstallmentMonthsOption } from "../types.js";

export interface PhasedDesktopFooterPanelProps {
	readonly totalItemsCount: number;
	readonly grandTotalRub: number;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly planApproved: boolean;
	readonly patientName?: string | undefined;
	readonly onApprovePlan: () => void;
	readonly onOpenInstallment?: ((totalRub: number) => void) | undefined;
	readonly onOpenStagePayment?: ((amountRub: number) => void) | undefined;
	readonly onPrintContract?: (() => void) | undefined;
}

export const PhasedDesktopFooterPanel: React.FC<PhasedDesktopFooterPanelProps> = ({
	totalItemsCount,
	grandTotalRub,
	installmentMonths,
	installmentMonthlyRub,
	planApproved,
	patientName,
	onApprovePlan,
	onOpenInstallment,
	onOpenStagePayment,
	onPrintContract,
}) => {
	const handlePrint = () => {
		if (onPrintContract) {
			onPrintContract();
		} else if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleTransferToCoordinator = () => {
		showToast(
			`Смета (${grandTotalRub.toLocaleString("ru-RU")} ₽) передана куратору лечения для оформления рассрочки и записи`,
			"info",
			3500,
		);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-transfer-to-coordinator", {
					detail: { patientName, totalRub: grandTotalRub },
				}),
			);
		}
	};

	return (
		<div className="hidden sm:block rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-6 flex-wrap">
					<div>
						<div className="text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
							Итоговая смета ({totalItemsCount} поз. в 4 этапах)
						</div>
						<div className="text-xl font-extrabold text-[var(--ink)] tabular-nums">
							{grandTotalRub.toLocaleString("ru-RU")} ₽
							<span className="ml-2 text-xs font-semibold text-[var(--teal)]">
								из {installmentMonths} мес по {installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						data-testid="phased-approve-plan-btn"
						onClick={onApprovePlan}
						className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--teal)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer min-h-[36px]"
					>
						<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{planApproved ? "План согласован с пациентом" : "Согласовать план"}
					</button>

					<button
						type="button"
						onClick={() => onOpenInstallment?.(grandTotalRub)}
						className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer min-h-[36px]"
					>
						Рассрочка 0% клиники
					</button>

					<button
						type="button"
						onClick={() => onOpenStagePayment?.(Math.round(grandTotalRub * 0.3))}
						className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer min-h-[36px]"
					>
						Этапы 30/40/30 (Эскроу)
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[36px]"
					>
						Печать презентации
					</button>

					<button
						type="button"
						onClick={handleTransferToCoordinator}
						className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer min-h-[36px]"
					>
						Передать координатору
					</button>
				</div>
			</div>
		</div>
	);
};
