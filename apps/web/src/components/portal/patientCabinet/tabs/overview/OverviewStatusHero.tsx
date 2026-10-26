import React from "react";
import { Award, Heart, Sparkles } from "lucide-react";
import type { PatientPersonalCabinetData } from "../../patientCabinetEngine";

export interface OverviewStatusHeroProps {
	readonly data: PatientPersonalCabinetData;
}

export const OverviewStatusHero: React.FC<OverviewStatusHeroProps> = ({ data }) => {
	const hasFamily = (data.familyBonusPool !== undefined && data.familyBonusPool > 0) ||
		(data.familyBalanceRub !== undefined && data.familyBalanceRub > 0);

	return (
		<div className="pc-card pc-status-hero-card" data-testid="pc-patient-status-card">
			<div className="pc-status-hero-top">
				<div className="pc-avatar-large" aria-hidden="true">
					{data.fullName.charAt(0)}
				</div>
				<div className="pc-status-hero-details">
					<div className="pc-status-name-row">
						<h3 className="pc-patient-name">{data.fullName}</h3>
						<span className="pc-badge-card-number">
							Медицинская карта № {data.cardNumber}
						</span>
					</div>
					<p className="pc-doctor-subtitle">
						Лечащий врач: <strong>{data.curatingDoctor}</strong>
					</p>
				</div>
			</div>

			<div className="pc-loyalty-strip">
				<div className="pc-loyalty-pill">
					<Sparkles size={16} className="pc-icon-amber" />
					<div className="pc-loyalty-text">
						<span className="pc-loyalty-label">Бонусный баланс:</span>
						<strong className="pc-loyalty-val">
							{data.loyaltyBonusBalance.toLocaleString("ru-RU")} бонусов ({data.loyaltyBonusBalance.toLocaleString("ru-RU")} ₽)
						</strong>
					</div>
				</div>

				<div className="pc-loyalty-pill tier">
					<Award size={16} className="pc-icon-primary" />
					<div className="pc-loyalty-text">
						<span className="pc-loyalty-label">Уровень лояльности:</span>
						<strong className="pc-loyalty-val">{data.loyaltyTierRu}</strong>
					</div>
				</div>

				{hasFamily && (
					<div className="pc-loyalty-pill family" data-testid="pc-family-pool-pill">
						<Heart size={16} className="pc-icon-primary" />
						<div className="pc-loyalty-text">
							<span className="pc-loyalty-label">
								{`Семейный счет${data.familyMembersCount ? ` (${data.familyMembersCount} чел.)` : ""}:`}
							</span>
							<strong className="pc-loyalty-val">
								{data.familyBalanceRub !== undefined ? `${data.familyBalanceRub.toLocaleString("ru-RU")} ₽` : ""}
								{data.familyBonusPool !== undefined ? ` • ${data.familyBonusPool.toLocaleString("ru-RU")} бонусов` : ""}
							</strong>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
