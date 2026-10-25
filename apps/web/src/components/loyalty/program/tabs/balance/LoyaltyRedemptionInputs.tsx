import type React from "react";

export interface LoyaltyRedemptionInputsProps {
	readonly invoiceAmountRub: number;
	readonly onInvoiceAmountChange: (amount: number) => void;
	readonly excludedAmountRub: number;
	readonly onExcludedAmountChange: (amount: number) => void;
	readonly requestedPointsRub: number;
	readonly onRequestedPointsChange: (points: number) => void;
	readonly effectiveBalanceRub: number;
}

const inputWrapStyle: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
	gap: "1rem",
};

const labelStyle: React.CSSProperties = {
	display: "block",
	fontSize: "0.8125rem",
	fontWeight: 600,
	color: "var(--muted)",
	marginBottom: "0.375rem",
};

const inputBaseStyle: React.CSSProperties = {
	width: "100%",
	padding: "0.625rem 0.875rem",
	borderRadius: "0.5rem",
	background: "var(--paper)",
	fontSize: "1rem",
	fontWeight: 700,
};

export const LoyaltyRedemptionInputs: React.FC<LoyaltyRedemptionInputsProps> = ({
	invoiceAmountRub,
	onInvoiceAmountChange,
	excludedAmountRub,
	onExcludedAmountChange,
	requestedPointsRub,
	onRequestedPointsChange,
	effectiveBalanceRub,
}) => {
	return (
		<div style={inputWrapStyle}>
			<div>
				<label style={labelStyle}>Сумма счета (₽)</label>
				<input
					type="number"
					min={0}
					step={100}
					value={invoiceAmountRub}
					onChange={(e) => onInvoiceAmountChange(Number(e.target.value))}
					style={{ ...inputBaseStyle, border: "1px solid var(--line)", color: "var(--ink)" }}
				/>
			</div>

			<div>
				<label style={labelStyle}>Исключения (лаборатория CAD/CAM, импланты ₽)</label>
				<input
					type="number"
					min={0}
					step={100}
					value={excludedAmountRub}
					onChange={(e) => onExcludedAmountChange(Number(e.target.value))}
					style={{ ...inputBaseStyle, border: "1px solid var(--line)", color: "var(--ink)" }}
				/>
			</div>

			<div>
				<label style={labelStyle}>Списать бонусов (₽)</label>
				<input
					type="number"
					min={0}
					max={effectiveBalanceRub}
					value={requestedPointsRub}
					onChange={(e) => onRequestedPointsChange(Number(e.target.value))}
					style={{ ...inputBaseStyle, border: "1px solid var(--teal)", color: "var(--teal)" }}
				/>
			</div>
		</div>
	);
};
