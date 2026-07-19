import React, { useState } from "react";
import { Calculator } from "lucide-react";

interface PlanInstallmentCalculatorProps {
	totalAmount: number;
}

export const PlanInstallmentCalculator: React.FC<PlanInstallmentCalculatorProps> = ({
	totalAmount,
}) => {
	const [months, setMonths] = useState<3 | 6 | 12>(6);

	if (totalAmount <= 0) return null;

	const monthlyPayment = Math.round(totalAmount / months);

	return (
		<div
			style={{
				padding: "16px",
				background: "var(--surface)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				marginTop: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					color: "var(--ink)",
					fontWeight: 600,
				}}
			>
				<Calculator size={18} className="text-teal-500" />
				Рассрочка клиники (0%)
			</div>
			
			<div style={{ display: "flex", gap: "8px" }}>
				{[3, 6, 12].map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => setMonths(m as 3 | 6 | 12)}
						style={{
							flex: 1,
							padding: "8px",
							borderRadius: "8px",
							border: `1px solid ${months === m ? "var(--teal-500)" : "var(--line)"}`,
							background: months === m ? "var(--teal-50)" : "transparent",
							color: months === m ? "var(--teal-700)" : "var(--muted)",
							fontWeight: months === m ? 600 : 400,
							cursor: "pointer",
							transition: "all 0.2s",
						}}
					>
						{m} мес
					</button>
				))}
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "12px",
					background: "var(--paper)",
					borderRadius: "8px",
				}}
			>
				<div style={{ color: "var(--muted)", fontSize: "14px" }}>Ежемесячный платеж:</div>
				<div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>
					{monthlyPayment.toLocaleString("ru-RU")} ₽
				</div>
			</div>
		</div>
	);
};
