import React from "react";
/**
 * DENTE Dental CRM — Funnel Conversion Insights Panel
 * Mandate 8b (<= 120 lines)
 */

import { Sparkles } from "lucide-react";
import { FunnelLeakAuditCard } from "./FunnelLeakAuditCard";
import type { FunnelSummaryMetrics } from "./types";

export * from "./FunnelLeakAuditCard";
export * from "./FunnelModalFooter";

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
						style={{ color: "var(--teal)", display: "block", marginBottom: 2 }}
					>
						Маркетинговые рекомендации CRM ДЕНТЕ
					</strong>
					{summary.showUpRatePercent < 70 ? (
						<div>
							•{" "}
							<strong>
								Низкая доходимость ({summary.showUpRatePercent}%):
							</strong>{" "}
							Внедрите авто-напоминания по WhatsApp/SMS за 24 часа и за 2 часа
							до приема для роста Show-up до 80%+.
						</div>
					) : (
						<div>
							•{" "}
							<strong>
								Высокая доходимость ({summary.showUpRatePercent}%):
							</strong>{" "}
							Регистратура эффективно подтверждает записи.
						</div>
					)}
					{summary.planAcceptanceRatePercent < 60 ? (
						<div>
							•{" "}
							<strong>
								Согласование планов ({summary.planAcceptanceRatePercent}%):
							</strong>{" "}
							Рекомендуется демонстрация снимков радиовизиографа и интраоральной
							камеры на консультации врача у кресла.
						</div>
					) : (
						<div>
							•{" "}
							<strong>
								Конверсия планов ({summary.planAcceptanceRatePercent}%):
							</strong>{" "}
							Отличный показатель доверия пациентов к комплексным планам.
						</div>
					)}
				</div>
			</div>

			<FunnelLeakAuditCard onOpenLeakDetector={onOpenLeakDetector} />
		</>
	);
}
