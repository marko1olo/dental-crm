import type React from "react";
import { Coins } from "lucide-react";

export interface LoyaltyFamilyDepositBarProps {
	readonly onCreditFamilyBalance: (amountRub: number) => void;
}

export const LoyaltyFamilyDepositBar: React.FC<LoyaltyFamilyDepositBarProps> = ({
	onCreditFamilyBalance,
}) => {
	return (
		<div
			style={{
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "0.75rem",
				padding: "1rem",
				marginBottom: "1.5rem",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "0.75rem",
			}}
		>
			<div>
				<div
					style={{
						fontWeight: 700,
						fontSize: "0.875rem",
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: "0.375rem",
					}}
				>
					<Coins size={16} color="var(--teal)" />
					Пополнение общего семейного кошелька:
				</div>
				<p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
					Единый кошелек: родители пополняют баланс, дети и супруг оплачивают приёмы без
					комиссий и ручных переводов
				</p>
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					flexWrap: "wrap",
				}}
			>
				{[1000, 3000, 5000, 10000].map((amt) => (
					<button
						key={amt}
						type="button"
						onClick={() => onCreditFamilyBalance(amt)}
						style={{
							padding: "0.375rem 0.625rem",
							minHeight: "36px",
							borderRadius: "0.375rem",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.75rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						+{amt.toLocaleString("ru-RU")} ₽
					</button>
				))}
			</div>
		</div>
	);
};
