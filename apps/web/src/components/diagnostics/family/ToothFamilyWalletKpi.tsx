import React from "react";
import { Check, Sparkles, User, Users } from "lucide-react";
import { money } from "../../../AppHelpers";

interface FamilyMember {
	id: string;
	fullName: string;
	phone?: string;
}

interface ToothFamilyWalletKpiProps {
	familyBalanceRub: number;
	loyaltyPointsBalance: number;
	maxAllowedBonus: number;
	resolvedFamilyMembers: readonly FamilyMember[];
	selectedPayerId: string;
	onSelectPayerId: (id: string) => void;
}

export const ToothFamilyWalletKpi: React.FC<ToothFamilyWalletKpiProps> = ({
	familyBalanceRub,
	loyaltyPointsBalance,
	maxAllowedBonus,
	resolvedFamilyMembers,
	selectedPayerId,
	onSelectPayerId,
}) => {
	return (
		<>
			<div className="dente-wallet-kpi-grid">
				<div className="dente-kpi-card">
					<div className="dente-kpi-head">
						<Users size={15} color="var(--brand-primary, var(--teal))" />
						<span>Семейный депозит:</span>
					</div>
					<div className="dente-kpi-val">{money(familyBalanceRub)}</div>
					<div className="dente-kpi-sub">Доступен для {resolvedFamilyMembers.length} членов семьи</div>
				</div>

				<div className="dente-kpi-card">
					<div className="dente-kpi-head">
						<Sparkles size={15} color="var(--warn-fg)" />
						<span>Баллы кешбэка:</span>
					</div>
					<div className="dente-kpi-val" style={{ color: "var(--warn-fg)" }}>
						{loyaltyPointsBalance} баллов
					</div>
					<div className="dente-kpi-sub">Списание до 30% ({money(maxAllowedBonus)})</div>
				</div>
			</div>

			<div className="dente-payer-selection-box">
				<label className="dente-field-label">Списать средства с карты члена семьи:</label>
				<div className="dente-payer-chips-row">
					{resolvedFamilyMembers.map((member) => {
						const isSelected = selectedPayerId === member.id;
						const firstName = member.fullName.split(" ")[0];
						const secondName = member.fullName.split(" ")[1] || "";
						return (
							<button
								key={member.id}
								type="button"
								onClick={() => onSelectPayerId(member.id)}
								className={`dente-payer-chip ${isSelected ? "selected" : ""}`}
							>
								<User size={13} />
								<span>{firstName} ({secondName})</span>
								{isSelected && <Check size={13} />}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};
