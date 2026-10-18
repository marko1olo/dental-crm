import React from "react";
import type { CuratorPatientQueueItem } from "@dental/shared";

export interface CuratorCardFinancialsProps {
	readonly item: CuratorPatientQueueItem;
}

export const CuratorCardFinancials: React.FC<CuratorCardFinancialsProps> = ({ item }) => {
	return (
		<div className="curator-patient-financials">
			<div className="curator-fin-item" style={{ flex: 1 }}>
				<span className="curator-fin-label">План лечения</span>
				<span className="curator-fin-value" style={{ fontSize: "13px" }}>
					{item.treatmentPlanTitle}
				</span>
			</div>
			<div className="curator-fin-item">
				<span className="curator-fin-label">Итого по смете</span>
				<span className="curator-fin-value">
					{item.planTotalPriceRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
			<div className="curator-fin-item">
				<span className="curator-fin-label">Внесено</span>
				<span className="curator-fin-value" style={{ color: "var(--teal, #0d9488)" }}>
					{item.paidAmountRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
			<div className="curator-fin-item">
				<span className="curator-fin-label">Остаток</span>
				<span
					className="curator-fin-value"
					style={{
						color:
							item.remainingAmountRub > 0
								? "var(--accent, #6366f1)"
								: "var(--ink-muted, #64748b)",
					}}
				>
					{item.remainingAmountRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
			<div className="curator-fin-item">
				<span className="curator-fin-label">Куратор</span>
				<span className="curator-fin-value" style={{ fontSize: "13px" }}>
					{item.curatorFullName}
				</span>
			</div>
		</div>
	);
};
