import type React from "react";
import type { LoyaltyRedemptionResult } from "../../loyaltyEngine";

export interface LoyaltyFiscalSplitBoxProps {
	readonly redemptionCalc: LoyaltyRedemptionResult;
}

export const LoyaltyFiscalSplitBox: React.FC<LoyaltyFiscalSplitBoxProps> = ({
	redemptionCalc,
}) => {
	return (
		<div className="loyalty-fiscal-box">
			<div
				style={{
					fontWeight: 700,
					fontSize: "0.875rem",
					marginBottom: "0.5rem",
					color: "var(--ink)",
				}}
			>
				Расчет сплита чека кассы:
			</div>
			<div className="loyalty-fiscal-row">
				<span>База, доступная для оплаты бонусами:</span>
				<strong>
					{(redemptionCalc.redeemableBaseKop / 100).toLocaleString("ru-RU")} ₽
				</strong>
			</div>
			<div className="loyalty-fiscal-row">
				<span>Оплата бонусами (зачет баллов):</span>
				<strong style={{ color: "var(--teal)" }}>
					-
					{(
						redemptionCalc.fiscal54FzSplit.tag1215AdvancePrepaymentBonusKop / 100
					).toLocaleString("ru-RU")}{" "}
					₽
				</strong>
			</div>
			<div className="loyalty-fiscal-row highlight">
				<span>К доплате пациентом:</span>
				<span style={{ fontSize: "1.125rem", fontWeight: 800 }}>
					{redemptionCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
		</div>
	);
};
