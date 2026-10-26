import React from "react";
import { FileText } from "lucide-react";
import type { BudgetPortalData } from "./budgetSignTypes";
import { formatRub } from "./budgetSignTypes";

export interface BudgetItemsTableCardProps {
	readonly budget: BudgetPortalData;
}

export const BudgetItemsTableCard: React.FC<BudgetItemsTableCardProps> = ({ budget }) => {
	return (
		<div className="patient-budget-card">
			<div className="patient-budget-card-title">
				<FileText size={16} />
				План лечения и смета услуг
			</div>

			{budget.items.length === 0 ? (
				<p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
					Список услуг уточняется.
				</p>
			) : (
				budget.items.map((item, idx) => (
					<div key={item.id || idx} className="patient-budget-item-row">
						<div className="patient-budget-item-info">
							{item.toothNumber && (
								<span className="patient-budget-tooth-badge">
									Зуб {item.toothNumber}
								</span>
							)}
							<span className="patient-budget-item-title">{item.title}</span>
							{item.quantity && item.quantity > 1 && (
								<span className="patient-budget-item-qty">{item.quantity} шт.</span>
							)}
						</div>
						<div className="patient-budget-item-price">
							{formatRub(item.priceRub * (item.quantity || 1))}
						</div>
					</div>
				))
			)}

			<div className="patient-budget-totals">
				{budget.discountRub > 0 && (
					<>
						<div className="patient-budget-total-line">
							<span>Сумма по прайсу:</span>
							<span>{formatRub(budget.totalPriceRub)}</span>
						</div>
						<div className="patient-budget-total-line" style={{ color: "var(--teal)" }}>
							<span>Скидка клиники:</span>
							<span>-{formatRub(budget.discountRub)}</span>
						</div>
					</>
				)}
				<div className="patient-budget-grand-total">
					<span>Итого к оплате:</span>
					<span className="patient-budget-grand-price">{formatRub(budget.netTotalRub)}</span>
				</div>
			</div>
		</div>
	);
};
