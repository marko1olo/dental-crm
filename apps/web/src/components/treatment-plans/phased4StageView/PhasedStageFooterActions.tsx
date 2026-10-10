/**
 * PhasedStageFooterActions.tsx — Нижняя панель действий по 4-стадийному плану лечения
 * для ПК/планшета и адаптивный Floating Bottom Bar в зоне большого пальца для смартфонов.
 */

import React from "react";
import { showToast } from "../../GlobalToast";
import type { InstallmentMonthsOption } from "./types";

export interface PhasedStageFooterActionsProps {
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

export const PhasedStageFooterActions: React.FC<PhasedStageFooterActionsProps> = ({
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
	return (
		<>
			{/* Настольная / планшетная панель действий */}
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
									из {installmentMonths} мес по{" "}
									{installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
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
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
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
							onClick={() => {
								if (onPrintContract) {
									onPrintContract();
								} else if (typeof window !== "undefined") {
									window.print();
								}
							}}
							className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer min-h-[36px]"
						>
							Печать презентации
						</button>

						<button
							type="button"
							onClick={() => {
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
							}}
							className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer min-h-[36px]"
						>
							Передать координатору
						</button>
					</div>
				</div>
			</div>

			{/* Мобильный Floating Bottom Bar в Natural Thumb Zone */}
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
						Рассрочка 0% ({installmentMonths} мес):{" "}
						{installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
					</button>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						data-testid="phased-approve-plan-btn"
						onClick={onApprovePlan}
						className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--teal)] px-4 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
					>
						<svg
							className="w-4 h-4 shrink-0"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{planApproved ? "План согласован" : "Утвердить план"}</span>
					</button>
					<button
						type="button"
						onClick={() => {
							if (onPrintContract) {
								onPrintContract();
							} else if (typeof window !== "undefined") {
								window.print();
							}
						}}
						className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-3 text-xs font-semibold text-[var(--ink)]"
					>
						Печать
					</button>
				</div>
			</div>
		</>
	);
};
