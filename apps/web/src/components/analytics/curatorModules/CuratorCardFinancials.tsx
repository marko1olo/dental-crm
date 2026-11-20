import React from "react";
import type { CuratorPatientQueueItem } from "@dental/shared";

export interface CuratorCardFinancialsProps {
	readonly item: CuratorPatientQueueItem;
}

export const CuratorCardFinancials: React.FC<CuratorCardFinancialsProps> = ({ item }) => {
	return (
		<div className="curator-patient-financials">
			<div className="curator-fin-item flex-1">
				<span className="curator-fin-label">План лечения</span>
				<span className="curator-fin-value text-[13px]">
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
				<span className="curator-fin-value text-[var(--primary)]">
					{item.paidAmountRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
			<div className="curator-fin-item">
				<span className="curator-fin-label">Остаток</span>
				<span
					className={`curator-fin-value ${
						item.remainingAmountRub > 0
							? "text-[var(--primary)]"
							: "text-[var(--ink-muted)]"
					}`}
				>
					{item.remainingAmountRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
			<div className="curator-fin-item">
				<span className="curator-fin-label">Куратор</span>
				<span className="curator-fin-value text-[13px]">
					{item.curatorFullName}
				</span>
			</div>
		</div>
	);
};
