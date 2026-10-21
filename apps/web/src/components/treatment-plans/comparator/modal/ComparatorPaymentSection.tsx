import React from "react";
import { Wallet } from "lucide-react";
import type { ComprehensivePlanVariant } from "../planPresentationPresets";
import type { PaymentSchedulesResult } from "../planComparatorEngine";
import { ComparatorPaymentCards } from "./ComparatorPaymentCards";

export interface ComparatorPaymentSectionProps {
	currentVariant: ComprehensivePlanVariant;
	currentPayments: PaymentSchedulesResult;
	activePaymentTab: "staged" | "discount" | "installments" | "ndfl";
	onSelectTab: (tab: "staged" | "discount" | "installments" | "ndfl") => void;
}

export const ComparatorPaymentSection: React.FC<ComparatorPaymentSectionProps> = ({
	currentVariant,
	currentPayments,
	activePaymentTab,
	onSelectTab,
}) => {
	return (
		<section className="plan-roadmap-section">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<h4 className="plan-roadmap-title" style={{ margin: 0 }}>
					<Wallet size={16} style={{ color: "var(--plan-primary)" }} />
					<span>Финансовый калькулятор и график оплат ({currentVariant.totalCostRub.toLocaleString("ru-RU")} ₽)</span>
				</h4>

				<div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
					<button
						type="button"
						className={`plan-proc-tag ${activePaymentTab === "staged" ? "plan-stage-num" : ""}`}
						style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
						onClick={() => onSelectTab("staged")}
					>
						Поэтапно (30/40/30)
					</button>
					<button
						type="button"
						className={`plan-proc-tag ${activePaymentTab === "discount" ? "plan-stage-num" : ""}`}
						style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
						onClick={() => onSelectTab("discount")}
					>
						Разово (-5%)
					</button>
					<button
						type="button"
						className={`plan-proc-tag ${activePaymentTab === "installments" ? "plan-stage-num" : ""}`}
						style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
						onClick={() => onSelectTab("installments")}
					>
						Рассрочка 0-0-12
					</button>
					<button
						type="button"
						className={`plan-proc-tag ${activePaymentTab === "ndfl" ? "plan-stage-num" : ""}`}
						style={{ cursor: "pointer", border: "none", minHeight: "28px", padding: "2px 8px" }}
						onClick={() => onSelectTab("ndfl")}
					>
						Вычет НДФЛ 13%
					</button>
				</div>
			</div>

			<div className="plan-payment-grid">
				<ComparatorPaymentCards activePaymentTab={activePaymentTab} currentPayments={currentPayments} />
			</div>
		</section>
	);
};
