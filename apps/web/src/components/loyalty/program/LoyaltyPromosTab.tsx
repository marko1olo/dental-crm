import type React from "react";
import { Check, ShieldCheck, Tag } from "lucide-react";
import type { evaluatePromoCode } from "./loyaltyEngine";
import {
	LOYALTY_EXCLUSION_RULES,
	PROMO_CODE_PRESETS,
} from "./loyaltyPresets";

export interface LoyaltyPromosTabProps {
	readonly promoInput: string;
	readonly onPromoInputChange: (input: string) => void;
	readonly promoResult: ReturnType<typeof evaluatePromoCode> | null;
	readonly onEvaluatePromo: () => void;
	readonly onApplyPromoDirectly: (code: string) => void;
	readonly onApplyPromoResultToInvoice: () => void;
}

export const LoyaltyPromosTab: React.FC<LoyaltyPromosTabProps> = ({
	promoInput,
	onPromoInputChange,
	promoResult,
	onEvaluatePromo,
	onApplyPromoDirectly,
	onApplyPromoResultToInvoice,
}) => {
	return (
		<div>
			<h4 className="loyalty-section-title">
				<Tag size={20} color="var(--teal)" />
				Каталог маркетинговых промокодов клиники
			</h4>

			<div className="loyalty-promo-grid">
				{PROMO_CODE_PRESETS.map((promo) => (
					<div key={promo.code} className="loyalty-promo-card">
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								marginBottom: "0.5rem",
							}}
						>
							<span className="loyalty-promo-code-chip">{promo.code}</span>
							<button
								type="button"
								onClick={() => onApplyPromoDirectly(promo.code)}
								style={{
									border: "none",
									background: "rgba(13, 148, 136, 0.12)",
									color: "var(--teal)",
									cursor: "pointer",
									fontSize: "0.75rem",
									fontWeight: 700,
									display: "inline-flex",
									alignItems: "center",
									gap: "0.25rem",
									padding: "0.25rem 0.625rem",
									borderRadius: "0.375rem",
									minHeight: "44px",
								}}
								title="Рассчитать и применить промокод к чеку"
							>
								<Check size={14} /> Применить к чеку
							</button>
						</div>
						<h5 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "0.25rem 0" }}>
							{promo.titleRu}
						</h5>
						<p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
							{promo.descriptionRu}
						</p>
						<div
							style={{
								fontSize: "0.6875rem",
								color: "var(--teal)",
								marginTop: "0.5rem",
								fontWeight: 600,
							}}
						>
							{promo.validityLabelRu}
						</div>
					</div>
				))}
			</div>

			{/* Promo Code Interactive Evaluator */}
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
							background: promoResult.isValid
								? "rgba(16, 185, 129, 0.1)"
								: "rgba(239, 68, 68, 0.1)",
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
						<p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
							{promoResult.messageRu}
						</p>
						{promoResult.isValid && (
							<div
								style={{
									marginTop: "0.75rem",
									display: "flex",
									flexWrap: "wrap",
									gap: "0.75rem",
									alignItems: "center",
								}}
							>
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

			{/* Statutory Exclusion Rules Callout */}
			<div className="loyalty-exclusion-callout">
				<h5
					style={{
						fontSize: "0.875rem",
						fontWeight: 700,
						color: "var(--warn-fg)",
						display: "flex",
						alignItems: "center",
						gap: "0.375rem",
						marginBottom: "0.5rem",
					}}
				>
					<ShieldCheck size={18} />
					Официальные правила исключений из бонусной программы
				</h5>
				<ul
					style={{
						margin: 0,
						paddingLeft: "1.25rem",
						fontSize: "0.8125rem",
						color: "var(--ink)",
						lineHeight: 1.6,
					}}
				>
					{LOYALTY_EXCLUSION_RULES.map((rule) => (
						<li key={rule.id}>
							<strong>{rule.categoryNameRu}:</strong> {rule.reasonRu}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};
