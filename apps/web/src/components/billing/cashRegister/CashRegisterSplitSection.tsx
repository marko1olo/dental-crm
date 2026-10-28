/**
 * CashRegisterSplitSection.tsx — Combined Split Payment Section (Card + Cash + SBP + Deposit).
 * Mandate 8b: <= 140 lines. Mandate 8e: Doctor & Cashier Autonomy.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import type { SplitBalancesResult } from "@dental/shared";

export interface CashRegisterSplitSectionProps {
	readonly isSplitBalanced: boolean;
	readonly splitBalances: SplitBalancesResult;
	readonly effectiveDepositLimit: number;
	readonly totalDue: number;
	readonly splitCardRub: number;
	readonly onSplitCardChange: (val: number) => void;
	readonly splitCashRub: number;
	readonly onSplitCashChange: (val: number) => void;
	readonly splitSbpRub: number;
	readonly onSplitSbpChange: (val: number) => void;
	readonly splitDepositRub: number;
	readonly onSplitDepositChange: (val: number) => void;
	readonly onApplyPreset: (preset: "50-50" | "deposit-card" | "deposit-cash") => void;
}

export const CashRegisterSplitSection: React.FC<CashRegisterSplitSectionProps> = ({
	isSplitBalanced,
	splitBalances,
	effectiveDepositLimit,
	totalDue,
	splitCardRub,
	onSplitCardChange,
	splitCashRub,
	onSplitCashChange,
	splitSbpRub,
	onSplitSbpChange,
	splitDepositRub,
	onSplitDepositChange,
	onApplyPreset,
}) => {
	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-3 animate-in fade-in duration-150"
			data-testid="split-payment-section"
		>
			<div className="flex items-center justify-between text-xs font-semibold text-[var(--ink)]">
				<span>Комбинированный сплит</span>
				<span
					className={
						isSplitBalanced
							? "text-[var(--teal,#0d9488)]"
							: "text-amber-600 dark:text-amber-400 font-bold"
					}
				>
					{isSplitBalanced
						? "Сумма совпадает"
						: `Остаток: ${
								splitBalances.remainingRub > 0
									? `+${splitBalances.remainingRub}`
									: `${splitBalances.totalDueRub - splitBalances.allocatedRub}`
						  } ₽`}
				</span>
			</div>

			{/* Fast Split Presets in 1 Click */}
			<div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-[var(--line-subtle,var(--line))]">
				<span className="text-[11px] text-[var(--muted,#64748b)] flex items-center gap-1 mr-1">
					<Sparkles className="w-3 h-3 text-[var(--teal,#0d9488)]" /> Пресеты:
				</span>
				<button
					type="button"
					onClick={() => onApplyPreset("50-50")}
					className="min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft)]"
				>
					Поровну (50% / 50%)
				</button>
				{effectiveDepositLimit > 0 && (
					<>
						<button
							type="button"
							onClick={() => onApplyPreset("deposit-card")}
							className="min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft)]"
						>
							Аванс + Карта
						</button>
						<button
							type="button"
							onClick={() => onApplyPreset("deposit-cash")}
							className="min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft)]"
						>
							Аванс + Наличные
						</button>
					</>
				)}
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<div>
					<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
						Карта (₽)
					</label>
					<input
						type="number"
						min={0}
						max={totalDue}
						data-testid="split-input-card"
						value={splitCardRub || ""}
						onChange={(e) => onSplitCardChange(Number(e.target.value) || 0)}
						className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
					/>
				</div>
				<div>
					<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
						Наличные (₽)
					</label>
					<input
						type="number"
						min={0}
						max={totalDue}
						data-testid="split-input-cash"
						value={splitCashRub || ""}
						onChange={(e) => onSplitCashChange(Number(e.target.value) || 0)}
						className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
					/>
				</div>
				<div>
					<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
						QR СБП (₽)
					</label>
					<input
						type="number"
						min={0}
						max={totalDue}
						data-testid="split-input-sbp"
						value={splitSbpRub || ""}
						onChange={(e) => onSplitSbpChange(Number(e.target.value) || 0)}
						className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
					/>
				</div>
				<div>
					<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
						Аванс / Кошелёк (₽)
					</label>
					<input
						type="number"
						min={0}
						max={effectiveDepositLimit}
						data-testid="split-input-deposit"
						value={splitDepositRub || ""}
						onChange={(e) => onSplitDepositChange(Number(e.target.value) || 0)}
						className="w-full min-h-[44px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
					/>
				</div>
			</div>
		</div>
	);
};

export default CashRegisterSplitSection;
