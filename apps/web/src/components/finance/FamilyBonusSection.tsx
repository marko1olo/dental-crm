import React from "react";
import { Award, Coins, Sparkles } from "lucide-react";
import { money } from "../../AppHelpers";
import { BONUS_PRESETS } from "./familyWalletHelpers";

export interface FamilyBonusSectionProps {
	balanceVal: number;
	amount: number;
	isPaying: boolean;
	onSelectAmount: (val: number) => void;
}

export const FamilyBonusSection: React.FC<FamilyBonusSectionProps> = ({
	balanceVal,
	amount,
	isPaying,
	onSelectAmount,
}) => {
	return (
		<div className="family-bonus-section">
			<div className="family-bonus-header">
				<h4 className="family-bonus-title">
					<Sparkles size={16} className="text-amber-500" />
					Бонусные баллы & Быстрое списание
				</h4>
				<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
					Баланс:{" "}
					<strong className="text-[var(--ink,#0f172a)]">
						{money(balanceVal)}
					</strong>
				</span>
			</div>
			<div
				className="family-bonus-chips-row"
				role="toolbar"
				aria-label="Быстрый выбор суммы списания"
			>
				{BONUS_PRESETS.map((bonusVal) => (
					<button
						key={bonusVal}
						type="button"
						className={`family-bonus-chip ${amount === bonusVal ? "active" : ""}`}
						onClick={() => onSelectAmount(bonusVal)}
						disabled={isPaying}
					>
						<Coins size={14} className="text-amber-500 shrink-0" />
						<span>{bonusVal.toLocaleString("ru-RU")} бонусов</span>
					</button>
				))}
				{balanceVal > 0 && (
					<button
						type="button"
						className={`family-bonus-chip ${amount === balanceVal ? "active" : ""}`}
						onClick={() => onSelectAmount(balanceVal)}
						disabled={isPaying}
					>
						<Award size={14} className="text-teal-500 shrink-0" />
						<span>Весь баланс ({money(balanceVal)})</span>
					</button>
				)}
			</div>
		</div>
	);
};
