import React from "react";

export interface ToolbarPaymentModeSelectorProps {
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly onPaymentModeChange: (mode: "installment" | "staged" | "discount") => void;
}

export const ToolbarPaymentModeSelector: React.FC<ToolbarPaymentModeSelectorProps> = ({
	activePaymentMode,
	onPaymentModeChange,
}) => {
	return (
		<div
			className="tp-segmented-bar shrink-0"
			role="group"
			aria-label="Режим расчета оплаты"
		>
			<button
				type="button"
				onClick={() => onPaymentModeChange("installment")}
				className={`tp-status-btn status-draft ${activePaymentMode === "installment" ? "active" : ""}`}
			>
				<span>Рассрочка 0%</span>
			</button>
			<button
				type="button"
				onClick={() => onPaymentModeChange("staged")}
				className={`tp-status-btn status-draft ${activePaymentMode === "staged" ? "active" : ""}`}
			>
				<span>Этапы (30/40/30)</span>
			</button>
			<button
				type="button"
				onClick={() => onPaymentModeChange("discount")}
				className={`tp-status-btn status-draft ${activePaymentMode === "discount" ? "active" : ""}`}
			>
				<span>Скидка 5% (100%)</span>
			</button>
		</div>
	);
};
