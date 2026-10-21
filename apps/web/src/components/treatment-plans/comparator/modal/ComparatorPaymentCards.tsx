import React from "react";
import type { PaymentSchedulesResult } from "../planComparatorEngine";

export interface ComparatorPaymentCardsProps {
	activePaymentTab: "staged" | "discount" | "installments" | "ndfl";
	currentPayments: PaymentSchedulesResult;
}

export const ComparatorPaymentCards: React.FC<ComparatorPaymentCardsProps> = ({
	activePaymentTab,
	currentPayments,
}) => {
	if (activePaymentTab === "staged") {
		return (
			<>
				<div className="plan-payment-card active">
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>1. Диагностика и аванс (30%)</span>
					<strong style={{ fontSize: "1rem", color: "var(--plan-text-main)" }}>
						{currentPayments.stagedPayment.stage1DiagnosticRub.toLocaleString("ru-RU")} ₽
					</strong>
					<span style={{ fontSize: "0.6875rem" }}>При заключении договора</span>
				</div>
				<div className="plan-payment-card active">
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>2. Хирургический этап (40%)</span>
					<strong style={{ fontSize: "1rem", color: "var(--plan-text-main)" }}>
						{currentPayments.stagedPayment.stage2SurgeryRub.toLocaleString("ru-RU")} ₽
					</strong>
					<span style={{ fontSize: "0.6875rem" }}>В день операции имплантации</span>
				</div>
				<div className="plan-payment-card active">
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>3. Ортопедический этап (30%)</span>
					<strong style={{ fontSize: "1rem", color: "var(--plan-text-main)" }}>
						{currentPayments.stagedPayment.stage3OrthopedicsRub.toLocaleString("ru-RU")} ₽
					</strong>
					<span style={{ fontSize: "0.6875rem" }}>При постоянной фиксации коронок</span>
				</div>
			</>
		);
	}

	if (activePaymentTab === "discount") {
		return (
			<>
				<div className="plan-payment-card active">
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Скидка за единовременную оплату</span>
					<strong style={{ fontSize: "1rem", color: "var(--plan-success)" }}>
						- {currentPayments.singlePaymentWith5PctDiscount.discountRub.toLocaleString("ru-RU")} ₽ (5%)
					</strong>
					<span style={{ fontSize: "0.6875rem" }}>Экономия бюджета пациента</span>
				</div>
				<div className="plan-payment-card active" style={{ gridColumn: "span 2" }}>
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Итого к оплате со скидкой</span>
					<strong style={{ fontSize: "1.125rem", color: "var(--plan-primary)" }}>
						{currentPayments.singlePaymentWith5PctDiscount.finalPayableRub.toLocaleString("ru-RU")} ₽
					</strong>
					<span style={{ fontSize: "0.6875rem" }}>100% предоплата перед началом лечения</span>
				</div>
			</>
		);
	}

	if (activePaymentTab === "installments") {
		return (
			<>
				{currentPayments.installments.map((inst) => (
					<div key={inst.months} className="plan-payment-card active">
						<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>
							Рассрочка на {inst.months} месяцев {inst.provider === "clinic_internal" ? "(Клиника)" : "(Банк)"}
						</span>
						<strong style={{ fontSize: "1.125rem", color: "var(--plan-primary)" }}>
							{inst.monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес.
						</strong>
						<span style={{ fontSize: "0.6875rem", color: "var(--plan-success)" }}>
							Переплата 0% &bull; Без первого взноса
						</span>
					</div>
				))}
			</>
		);
	}

	return (
		<div className="plan-payment-card active" style={{ gridColumn: "span 3" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<div>
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>
						{currentPayments.ndflRefund.codeNameRu}
					</span>
					<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-success)", marginTop: "2px" }}>
						Возврат НДФЛ: +{currentPayments.ndflRefund.refundAmountRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
				<div style={{ textAlign: "right" }}>
					<span style={{ fontSize: "0.75rem", color: "var(--plan-text-muted)" }}>Реальная стоимость с учетом возврата:</span>
					<div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--plan-primary)" }}>
						{currentPayments.ndflRefund.effectiveNetCostRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>
		</div>
	);
};
