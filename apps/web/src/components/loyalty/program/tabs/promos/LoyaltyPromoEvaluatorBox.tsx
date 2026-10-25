import type React from "react";
import { Check } from "lucide-react";
import type { PromoCodeEvaluationResult } from "../../loyaltyEngine";

export interface LoyaltyPromoEvaluatorBoxProps {
	readonly promoInput: string;
	readonly onPromoInputChange: (input: string) => void;
	readonly promoResult: PromoCodeEvaluationResult | null;
	readonly onEvaluatePromo: () => void;
	readonly onApplyPromoResultToInvoice: () => void;
}

export const LoyaltyPromoEvaluatorBox: React.FC<LoyaltyPromoEvaluatorBoxProps> = ({
	promoInput,
	onPromoInputChange,
	promoResult,
	onEvaluatePromo,
	onApplyPromoResultToInvoice,
}) => {
	return (
		<div
			style={{
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "0.5rem",
				padding: "0.75rem 1rem",
				marginTop: "1rem",
			}}
		>
			<h5 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.75rem" }}>
				Проверка промокода к текущему счету
			</h5>
			<div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
				<input
					type="text"
					placeholder="Введите промокод (например: FIRST20)"
					value={promoInput}
					onChange={(e) => onPromoInputChange(e.target.value)}
					style={{
						width: "260px",
						padding: "0.5rem 0.75rem",
						borderRadius: "0.5rem",
						border: "1px solid var(--line)",
						fontSize: "0.875rem",
						fontWeight: 700,
					}}
				/>
				<button
					type="button"
					onClick={onEvaluatePromo}
					style={{
						padding: "0.5rem 1.25rem",
						minHeight: "44px",
						borderRadius: "0.5rem",
						border: "none",
						background: "var(--teal)",
						color: "var(--on-teal, var(--paper))",
						fontWeight: 700,
						fontSize: "0.875rem",
						cursor: "pointer",
					}}
				>
					Рассчитать скидку
				</button>
			</div>

			{promoResult && (
				<div
					style={{
						marginTop: "1rem",
						padding: "0.875rem",
						borderRadius: "0.5rem",
						background: promoResult.isValid ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
						border: promoResult.isValid ? "1px solid var(--ok-fg)" : "1px solid var(--bad-fg)",
					}}
				>
					<div
						style={{
							fontWeight: 700,
							fontSize: "0.875rem",
							color: promoResult.isValid ? "var(--ok-fg)" : "var(--bad-fg)",
						}}
					>
						{promoResult.isValid ? "Промокод применен!" : "Промокод не применен"}
					</div>
					<p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>{promoResult.messageRu}</p>
					{promoResult.isValid && (
						<div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
							<div style={{ fontSize: "0.875rem", fontWeight: 700 }}>
								Скидка: {promoResult.discountRub.toLocaleString("ru-RU")} ₽ • К оплате:{" "}
								{(promoResult.finalPayableKop / 100).toLocaleString("ru-RU")} ₽
							</div>
							<button
								type="button"
								onClick={onApplyPromoResultToInvoice}
								style={{
									padding: "0.5rem 1rem",
									minHeight: "44px",
									borderRadius: "0.5rem",
									border: "none",
									background: "var(--teal)",
									color: "var(--on-teal, var(--paper))",
									fontWeight: 700,
									fontSize: "0.8125rem",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.375rem",
								}}
							>
								<Check size={16} />
								Применить скидку {promoResult.discountRub} ₽ к чеку
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
