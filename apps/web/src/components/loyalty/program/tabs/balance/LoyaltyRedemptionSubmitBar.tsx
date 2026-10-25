import type React from "react";
import { Check, CheckCircle2 } from "lucide-react";

export interface LoyaltyRedemptionSubmitBarProps {
	readonly redemptionSuccessMsg: string | null;
	readonly actualRedeemedPointsRub: number;
	readonly onExecuteRedemption: () => void;
}

export const LoyaltyRedemptionSubmitBar: React.FC<LoyaltyRedemptionSubmitBarProps> = ({
	redemptionSuccessMsg,
	actualRedeemedPointsRub,
	onExecuteRedemption,
}) => {
	return (
		<>
			{redemptionSuccessMsg && (
				<div
					style={{
						background: "rgba(16, 185, 129, 0.1)",
						border: "1px solid var(--line)",
						color: "var(--ok-fg)",
						padding: "0.75rem 1rem",
						borderRadius: "0.5rem",
						marginBottom: "1rem",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						fontWeight: 600,
					}}
				>
					<CheckCircle2 size={18} />
					{redemptionSuccessMsg}
				</div>
			)}
			<div style={{ marginTop: "1rem", textAlign: "right" }}>
				<button
					type="button"
					onClick={onExecuteRedemption}
					data-testid="loyalty-execute-redemption-btn"
					style={{
						padding: "0.75rem 1.75rem",
						minHeight: "44px",
						borderRadius: "0.625rem",
						border: "none",
						background: "var(--teal)",
						color: "var(--on-teal, var(--paper))",
						fontSize: "0.9375rem",
						fontWeight: 700,
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.5rem",
					}}
				>
					<Check size={18} />
					Применить списание бонусов ({actualRedeemedPointsRub} ₽)
				</button>
			</div>
		</>
	);
};
