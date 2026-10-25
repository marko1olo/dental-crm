import { Coins, Sparkles } from "lucide-react";
import React from "react";

export interface SplitDepositLoyaltyInputsProps {
	readonly depositAmountRub: number;
	readonly setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly loyaltyAmountRub: number;
	readonly setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly totalAvailableDeposit: number;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly onInputEnterKeyDown?: (
		e: React.KeyboardEvent<HTMLInputElement>,
	) => void;
}

export const SplitDepositLoyaltyInputs: React.FC<
	SplitDepositLoyaltyInputsProps
> = ({
	depositAmountRub,
	setDepositAmountRub,
	loyaltyAmountRub,
	setLoyaltyAmountRub,
	totalAvailableDeposit,
	patientFamilyBalanceRub = 0,
	familyPayerName = "",
	onInputEnterKeyDown,
}) => {
	return (
		<>
			{/* Deposit / Prepayment */}
			<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
				<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between gap-1.5">
					<div className="flex items-center gap-1.5">
						<Coins size={14} className="text-amber-600" />
						<span>Депозит / Аванс</span>
					</div>
					{totalAvailableDeposit > 0 && (
						<span
							className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold"
							data-testid="deposit-balance-badge"
						>
							Доступно:{" "}
							{totalAvailableDeposit.toLocaleString("ru-RU", {
								minimumFractionDigits: 2,
							})}{" "}
							₽
							{patientFamilyBalanceRub > 0 && familyPayerName
								? ` (${familyPayerName})`
								: ""}
						</span>
					)}
				</span>
				<div className="relative">
					<input
						type="number"
						min={0}
						step="0.01"
						value={depositAmountRub || ""}
						onChange={(e) =>
							setDepositAmountRub(Math.max(0, parseFloat(e.target.value) || 0))
						}
						onKeyDown={onInputEnterKeyDown}
						className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
						placeholder="0.00 ₽"
						data-testid="split-input-deposit"
					/>
					<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">
						₽
					</span>
				</div>
			</div>

			{/* Loyalty / Bonus Points */}
			<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
				<span className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-indigo-600" />
					<span>Бонусные баллы</span>
				</span>
				<div className="relative">
					<input
						type="number"
						min={0}
						step="0.01"
						value={loyaltyAmountRub || ""}
						onChange={(e) =>
							setLoyaltyAmountRub(Math.max(0, parseFloat(e.target.value) || 0))
						}
						onKeyDown={onInputEnterKeyDown}
						className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
						placeholder="0.00 ₽"
						data-testid="split-input-loyalty"
					/>
					<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">
						₽
					</span>
				</div>
			</div>
		</>
	);
};
