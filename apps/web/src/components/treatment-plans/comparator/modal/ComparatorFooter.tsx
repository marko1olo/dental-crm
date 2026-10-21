import React from "react";
import { CheckCircle2, CreditCard } from "lucide-react";
import type { ComprehensivePlanVariant } from "../planPresentationPresets";

export interface ComparatorFooterProps {
	currentVariant: ComprehensivePlanVariant;
	onInstallment: () => void;
	onConfirmChoice: () => void;
}

export const ComparatorFooter: React.FC<ComparatorFooterProps> = ({
	currentVariant,
	onInstallment,
	onConfirmChoice,
}) => {
	return (
		<footer className="plan-comparator-footer">
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div style={{ fontSize: "0.8125rem", color: "var(--plan-text-main)" }}>
					Выбран план: <strong>{currentVariant.title}</strong> (
					<span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--plan-primary)" }}>
						{currentVariant.totalCostRub.toLocaleString("ru-RU")} ₽
					</span>
					)
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
				<button
					type="button"
					className="plan-action-btn-secondary"
					onClick={onInstallment}
					title="Оформить рассрочку 0%"
				>
					<CreditCard size={14} />
					<span>Рассрочка 0%</span>
				</button>

				<button
					type="button"
					className="plan-action-btn-primary"
					onClick={onConfirmChoice}
					data-testid="confirm-plan-choice-btn"
				>
					<CheckCircle2 size={16} />
					<span>Согласовать план с пациентом</span>
				</button>
			</div>
		</footer>
	);
};
