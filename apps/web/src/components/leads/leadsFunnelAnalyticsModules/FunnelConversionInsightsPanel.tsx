import React from "react";
import { Clock, Sparkles } from "lucide-react";
import type { FunnelSummaryMetrics } from "./types";

export interface FunnelConversionInsightsPanelProps {
	readonly summary: FunnelSummaryMetrics;
	readonly onOpenLeakDetector?: (() => void) | undefined;
}

export function FunnelConversionInsightsPanel({
	summary,
	onOpenLeakDetector,
}: FunnelConversionInsightsPanelProps) {
	return (
		<>
			{/* MARKETING GROWTH INSIGHTS */}
			<div
				style={{
					background: "rgba(15, 118, 110, 0.06)",
					border: "1px solid rgba(15, 118, 110, 0.2)",
					borderRadius: 14,
					padding: "16px 20px",
					display: "flex",
					alignItems: "flex-start",
					gap: 12,
				}}
			>
				<Sparkles
					size={20}
					color="var(--teal)"
					style={{ flexShrink: 0, marginTop: 2 }}
				/>
				<div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>
					<strong
						style={{
							color: "var(--teal)",
							display: "block",
							marginBottom: 2,
						}}
					>
						Маркетинговые рекомендации CRM ДЕНТЕ
					</strong>
					{summary.showUpRatePercent < 70 ? (
						<div>
							• <strong>Низкая доходимость ({summary.showUpRatePercent}%):</strong>{" "}
							Внедрите авто-напоминания по WhatsApp/SMS за 24 часа и за 2 часа до
							приема для роста Show-up до 80%+.
						</div>
					) : (
						<div>
							• <strong>Высокая доходимость ({summary.showUpRatePercent}%):</strong>{" "}
							Регистратура эффективно подтверждает записи.
						</div>
					)}
					{summary.planAcceptanceRatePercent < 60 ? (
						<div>
							• <strong>Согласование планов ({summary.planAcceptanceRatePercent}%):</strong>{" "}
							Рекомендуется демонстрация снимков радиовизиографа и интраоральной
							камеры на консультации врача у кресла.
						</div>
					) : (
						<div>
							• <strong>Конверсия планов ({summary.planAcceptanceRatePercent}%):</strong>{" "}
							Отличный показатель доверия пациентов к комплексным планам.
						</div>
					)}
				</div>
			</div>

			{/* CLINICAL RETENTION & LEAK AUDIT CARD */}
			<div
				style={{
					background: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: 14,
					padding: "16px 20px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: 12,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 10,
							background: "rgba(245, 158, 11, 0.15)",
							color: "var(--warn-fg, #d97706)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Clock size={20} />
					</div>
					<div>
						<div
							style={{
								fontSize: 13,
								fontWeight: 700,
								color: "var(--ink)",
							}}
						>
							Клиническое удержание & Детектор утечек (210+ дней)
						</div>
						<div
							style={{
								fontSize: 11,
								color: "var(--muted)",
								marginTop: 2,
							}}
						>
							Контроль пациентов без визитов более 7 месяцев, брошенных планов
							лечения и реактивация оттока
						</div>
					</div>
				</div>
				{onOpenLeakDetector && (
					<button
						type="button"
						onClick={onOpenLeakDetector}
						className="secondary-button"
						data-testid="funnel-open-leak-detector-btn"
						style={{
							height: 34,
							padding: "0 14px",
							fontSize: 12,
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: 6,
							color: "var(--warn-fg, #d97706)",
							borderColor: "var(--line)",
						}}
						title="Перейти к реестру спящих пациентов и брошенных планов"
					>
						<Clock size={14} /> Открыть детектор утечек
					</button>
				)}
			</div>
		</>
	);
}

export interface FunnelModalFooterProps {
	readonly onClose: () => void;
}

export function FunnelModalFooter({ onClose }: FunnelModalFooterProps) {
	return (
		<footer
			style={{
				padding: "12px 24px",
				background: "var(--paper-soft)",
				borderTop: "1px solid var(--line)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<div style={{ fontSize: 11, color: "var(--muted)" }}>
				Сквозная воронка ДЕНТЕ CRM • 54-ФЗ • Расчет в реальном времени
			</div>
			<button
				type="button"
				className="primary-button"
				onClick={onClose}
				style={{ height: 34, padding: "0 18px", fontSize: 12 }}
			>
				Закрыть
			</button>
		</footer>
	);
}
