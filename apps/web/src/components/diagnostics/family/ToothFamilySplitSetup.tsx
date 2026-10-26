import React from "react";
import { Coins } from "lucide-react";
import { money } from "../../../AppHelpers";

interface ToothFamilySplitSetupProps {
	toothNumber: number;
	estimatedCostRub: number;
	familyBalanceRub: number;
	depositDeductionRub: number;
	bonusDeductionRub: number;
	remainingCardCashRub: number;
	maxAllowedBonus: number;
	bonusPresets: readonly number[];
	onChangeDeposit: (val: number) => void;
	onApplyFullDeposit: () => void;
	onApplyBonusChip: (val: number) => void;
	onApplyMaxBonus: () => void;
}

export const ToothFamilySplitSetup: React.FC<ToothFamilySplitSetupProps> = ({
	toothNumber,
	estimatedCostRub,
	familyBalanceRub,
	depositDeductionRub,
	bonusDeductionRub,
	remainingCardCashRub,
	maxAllowedBonus,
	bonusPresets,
	onChangeDeposit,
	onApplyFullDeposit,
	onApplyBonusChip,
	onApplyMaxBonus,
}) => {
	return (
		<div className="dente-deductions-setup-box">
			<div className="dente-deduction-row">
				<div className="dente-deduction-label">
					<span>Списание с семейного баланса:</span>
					<strong>{money(depositDeductionRub)}</strong>
				</div>
				<div className="dente-deduction-controls">
					<input
						type="range"
						min="0"
						max={Math.min(estimatedCostRub, familyBalanceRub)}
						step="100"
						value={depositDeductionRub}
						onChange={(e) => onChangeDeposit(Number(e.target.value))}
						className="dente-range-slider"
					/>
					<button
						type="button"
						onClick={onApplyFullDeposit}
						className="dente-mini-action-btn"
					>
						Весь баланс
					</button>
				</div>
			</div>

			<div className="dente-deduction-row">
				<div className="dente-deduction-label">
					<span>Списание бонусов лояльности (1 балл = 1 ₽):</span>
					<strong style={{ color: "var(--warn-fg)" }}>{bonusDeductionRub} бонусов</strong>
				</div>
				<div className="dente-bonus-chips-row">
					{bonusPresets.map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => onApplyBonusChip(chip)}
							className={`dente-bonus-chip ${bonusDeductionRub === chip ? "active" : ""}`}
						>
							<Coins size={12} /> {chip} ₽
						</button>
					))}
					<button
						type="button"
						onClick={onApplyMaxBonus}
						className="dente-bonus-chip max"
					>
						Макс. {maxAllowedBonus} ₽
					</button>
				</div>
			</div>

			<div className="dente-split-summary-card">
				<div className="dente-split-row">
					<span>К оплате по прайсу (Зуб #{toothNumber}):</span>
					<span>{money(estimatedCostRub)}</span>
				</div>
				<div className="dente-split-row">
					<span>Семейный депозит:</span>
					<span style={{ color: "var(--ok-fg)" }}>- {money(depositDeductionRub)}</span>
				</div>
				<div className="dente-split-row">
					<span>Бонусы кешбэка:</span>
					<span style={{ color: "var(--warn-fg)" }}>- {money(bonusDeductionRub)}</span>
				</div>
				<div className="dente-split-row total">
					<span>Остаток к доплате в кассу (Карта/QR/Нал):</span>
					<strong>{money(remainingCardCashRub)}</strong>
				</div>
			</div>
		</div>
	);
};
