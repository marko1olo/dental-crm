import React from "react";
import { CheckCircle2, Play, Sparkles, Thermometer } from "lucide-react";

export interface SanPinTableEmptyStateProps {
	readonly onAutofillShift?: (() => void) | undefined;
	readonly isAutofilling?: boolean | undefined;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121") => void) | undefined;
}

export const SanPinTableEmptyState: React.FC<SanPinTableEmptyStateProps> = ({
	onAutofillShift,
	isAutofilling = false,
	onQuickBatchNorm,
}) => {
	return (
		<tr>
			<td colSpan={8} style={{ padding: "48px 16px", textAlign: "center" }}>
				<div
					style={{
						maxWidth: 540,
						margin: "0 auto",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 14,
					}}
				>
					<div
						style={{
							width: 52,
							height: 52,
							borderRadius: "50%",
							background: "rgba(13, 148, 136, 0.12)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--teal, #0d9488)",
						}}
					>
						<Thermometer size={26} />
					</div>
					<div
						style={{
							fontWeight: 700,
							fontSize: "1rem",
							color: "var(--ink, #1e293b)",
							lineHeight: 1.4,
						}}
					>
						Нет зарегистрированных циклов за выбранный период
					</div>
					<div style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", lineHeight: 1.5, maxWidth: 460 }}>
						Журнал автоклавирования: нормативный цикл 134°C / 2.15 бар / 5 мин с химическими индикаторами 5 класса, контролем предстерилизационной очистки и автоматическим списанием расходников со склада.
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
						{onQuickBatchNorm && (
							<button
								type="button"
								className="primary-button sanpin-btn sanpin-btn-primary"
								onClick={() => onQuickBatchNorm(27, "134")}
								disabled={isAutofilling}
								data-testid="empty-start-morning-cycle-btn"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 8,
									minHeight: 44,
									padding: "0 20px",
									fontSize: "0.875rem",
									fontWeight: 600,
									cursor: isAutofilling ? "wait" : "pointer",
									opacity: isAutofilling ? 0.7 : 1,
								}}
							>
								<CheckCircle2 size={16} />
								<span>{isAutofilling ? "Запись цикла..." : "Зафиксировать цикл автоклава за смену"}</span>
							</button>
						)}

						{onAutofillShift && (
							<button
								type="button"
								className="secondary-button sanpin-btn sanpin-btn-secondary"
								onClick={onAutofillShift}
								disabled={isAutofilling}
								data-testid="empty-autofill-shift-btn"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									minHeight: 44,
									padding: "0 16px",
									fontSize: "0.875rem",
									fontWeight: 600,
									cursor: isAutofilling ? "wait" : "pointer",
									opacity: isAutofilling ? 0.7 : 1,
								}}
							>
								<Sparkles size={15} />
								<span>{isAutofilling ? "Заполнение смены..." : "Автозаполнение смены (134°C / 2.1 бар)"}</span>
							</button>
						)}
					</div>
				</div>
			</td>
		</tr>
	);
};
