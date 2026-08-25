import React, { useState, useMemo } from "react";
import {
	ArrowRight,
	Award,
	Check,
	Coins,
	CreditCard,
	Percent,
	QrCode,
	ShieldCheck,
	Sparkles,
	User,
	Users,
	Wallet,
} from "lucide-react";
import { money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface ToothFamilyLoyaltyAccordionProps {
	toothNumber: number;
	patientId?: string | undefined;
	patientName?: string | undefined;
	estimatedCostRub?: number | undefined;
	familyBalanceRub?: number | undefined;
	loyaltyPointsBalance?: number | undefined;
	familyMembers?: ReadonlyArray<{ id: string; fullName: string; phone?: string }> | undefined;
	onApplySplit?: ((split: { depositRub: number; bonusRub: number; cardCashRub: number }) => void) | undefined;
	onOpenFullFamilyBilling?: (() => void) | undefined;
}

export const BONUS_PRESET_CHIPS: readonly number[] = [500, 1000, 2000, 5000];

export const ToothFamilyLoyaltyAccordion: React.FC<ToothFamilyLoyaltyAccordionProps> = ({
	toothNumber,
	patientId = "pat-1",
	patientName = "Текущий пациент",
	estimatedCostRub = 4500,
	familyBalanceRub = 12500,
	loyaltyPointsBalance = 1850,
	familyMembers = [
		{ id: "pat-1", fullName: "Иванов Иван Иванович (Пациент)", phone: "+7 999 111-22-33" },
		{ id: "pat-2", fullName: "Иванова Мария Сергеевна (Супруга)", phone: "+7 999 222-33-44" },
		{ id: "pat-3", fullName: "Иванов Артем Иванович (Сын)", phone: "+7 999 333-44-55" },
	],
	onApplySplit,
	onOpenFullFamilyBilling,
}) => {
	const [depositDeductionRub, setDepositDeductionRub] = useState<number>(
		Math.min(estimatedCostRub, familyBalanceRub),
	);
	const [bonusDeductionRub, setBonusDeductionRub] = useState<number>(0);
	const [selectedPayerId, setSelectedPayerId] = useState<string>(patientId);

	const maxAllowedBonus = useMemo(() => {
		// Up to 30% of treatment cost or available loyalty points
		const maxByCost = Math.round(estimatedCostRub * 0.3);
		return Math.min(maxByCost, loyaltyPointsBalance);
	}, [estimatedCostRub, loyaltyPointsBalance]);

	const remainingCardCashRub = useMemo(() => {
		const totalDeductions = depositDeductionRub + bonusDeductionRub;
		return Math.max(0, estimatedCostRub - totalDeductions);
	}, [estimatedCostRub, depositDeductionRub, bonusDeductionRub]);

	const handleApplyBonusChip = (val: number) => {
		const clamped = Math.min(val, maxAllowedBonus);
		setBonusDeductionRub(clamped);
		showToast(`Применено ${clamped} бонусных баллов к смене!`, "info");
	};

	const handleApplyFullDeposit = () => {
		const needed = Math.max(0, estimatedCostRub - bonusDeductionRub);
		const clamped = Math.min(needed, familyBalanceRub);
		setDepositDeductionRub(clamped);
		showToast(`Списание с депозита: ${money(clamped)}`, "info");
	};

	const handleConfirmSplit = () => {
		onApplySplit?.({
			depositRub: depositDeductionRub,
			bonusRub: bonusDeductionRub,
			cardCashRub: remainingCardCashRub,
		});
		showToast(
			`Сплит-оплата зуба #${toothNumber}: Депозит ${money(depositDeductionRub)}, Бонусы ${bonusDeductionRub} ₽, Доплата ${money(remainingCardCashRub)}`,
			"success",
		);
	};

	return (
		<div className="dente-warm-tool-card" data-testid="tooth-family-loyalty-accordion">
			<div className="dente-warm-tool-header">
				<div className="dente-warm-tool-title-group">
					<Wallet size={18} color="var(--brand-primary, var(--teal))" />
					<h3 className="dente-warm-tool-title">
						Семейный депозит и бонусы лояльности (Сплит 54-ФЗ)
					</h3>
				</div>
				<span className="dente-warm-tag ok">
					Смета: {money(estimatedCostRub)}
				</span>
			</div>

			{/* Balance KPI Grid */}
			<div className="dente-wallet-kpi-grid">
				<div className="dente-kpi-card">
					<div className="dente-kpi-head">
						<Users size={15} color="var(--brand-primary, var(--teal))" />
						<span>Семейный депозит:</span>
					</div>
					<div className="dente-kpi-val">{money(familyBalanceRub)}</div>
					<div className="dente-kpi-sub">Доступен для {familyMembers.length} членов семьи</div>
				</div>

				<div className="dente-kpi-card">
					<div className="dente-kpi-head">
						<Sparkles size={15} color="#f59e0b" />
						<span>Баллы кешбэка:</span>
					</div>
					<div className="dente-kpi-val" style={{ color: "#d97706" }}>
						{loyaltyPointsBalance} баллов
					</div>
					<div className="dente-kpi-sub">Списание до 30% ({money(maxAllowedBonus)})</div>
				</div>
			</div>

			{/* Member Payer Selector */}
			<div className="dente-payer-selection-box">
				<label className="dente-field-label">Списать средства с карты члена семьи:</label>
				<div className="dente-payer-chips-row">
					{familyMembers.map((member) => {
						const isSelected = selectedPayerId === member.id;
						return (
							<button
								key={member.id}
								type="button"
								onClick={() => setSelectedPayerId(member.id)}
								className={`dente-payer-chip ${isSelected ? "selected" : ""}`}
							>
								<User size={13} />
								<span>{member.fullName.split(" ")[0]} ({member.fullName.split(" ")[1] || ""})</span>
								{isSelected && <Check size={13} />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Interactive Deductions Setup */}
			<div className="dente-deductions-setup-box">
				{/* 1. Deposit deduction */}
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
							onChange={(e) => setDepositDeductionRub(Number(e.target.value))}
							className="dente-range-slider"
						/>
						<button
							type="button"
							onClick={handleApplyFullDeposit}
							className="dente-mini-action-btn"
						>
							Весь баланс
						</button>
					</div>
				</div>

				{/* 2. Bonus deduction */}
				<div className="dente-deduction-row">
					<div className="dente-deduction-label">
						<span>Списание бонусов лояльности (1 балл = 1 ₽):</span>
						<strong style={{ color: "#d97706" }}>{bonusDeductionRub} бонусов</strong>
					</div>
					<div className="dente-bonus-chips-row">
						{BONUS_PRESET_CHIPS.map((chip) => (
							<button
								key={chip}
								type="button"
								onClick={() => handleApplyBonusChip(chip)}
								className={`dente-bonus-chip ${bonusDeductionRub === chip ? "active" : ""}`}
							>
								<Coins size={12} /> {chip} ₽
							</button>
						))}
						<button
							type="button"
							onClick={() => setBonusDeductionRub(maxAllowedBonus)}
							className="dente-bonus-chip max"
						>
							Макс. {maxAllowedBonus} ₽
						</button>
					</div>
				</div>

				{/* Summary Split Calculation */}
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
						<span style={{ color: "#d97706" }}>- {money(bonusDeductionRub)}</span>
					</div>
					<div className="dente-split-row total">
						<span>Остаток к доплате в кассу (Карта/QR/Нал):</span>
						<strong>{money(remainingCardCashRub)}</strong>
					</div>
				</div>
			</div>

			{/* Footer Actions */}
			<div className="dente-wallet-footer">
				<button
					type="button"
					onClick={handleConfirmSplit}
					className="dente-primary-action-btn"
				>
					<ShieldCheck size={16} />
					<span>Применить сплит к чеку 54-ФЗ</span>
				</button>

				<button
					type="button"
					onClick={() => onOpenFullFamilyBilling?.()}
					className="dente-secondary-btn"
				>
					<Sparkles size={14} />
					<span>Семейный расчет 54-ФЗ...</span>
				</button>
			</div>
		</div>
	);
};

export default ToothFamilyLoyaltyAccordion;
