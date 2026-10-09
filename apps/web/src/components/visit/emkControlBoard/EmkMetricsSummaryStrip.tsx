import React from "react";
import type { CmoAuditSummaryMetrics } from "@dental/shared";

export interface EmkMetricsSummaryStripProps {
	readonly metrics: CmoAuditSummaryMetrics;
}

export function EmkMetricsSummaryStrip({ metrics }: EmkMetricsSummaryStripProps) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				gap: "12px",
			}}
		>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "14px 16px",
				}}
			>
				<div
					style={{
						fontSize: "12px",
						color: "var(--ink-2, #64748b)",
						marginBottom: "4px",
					}}
				>
					На проверке Главврача
				</div>
				<div
					style={{
						fontSize: "22px",
						fontWeight: 700,
						color: "var(--teal, #0d9488)",
					}}
				>
					{metrics.pendingReviewCount}
				</div>
			</div>

			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "14px 16px",
				}}
			>
				<div
					style={{
						fontSize: "12px",
						color: "var(--ink-2, #64748b)",
						marginBottom: "4px",
					}}
				>
					На доработке у врачей
				</div>
				<div
					style={{
						fontSize: "22px",
						fontWeight: 700,
						color: "var(--bad, #ef4444)",
					}}
				>
					{metrics.needsCorrectionCount}
				</div>
			</div>

			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "14px 16px",
				}}
			>
				<div
					style={{
						fontSize: "12px",
						color: "var(--ink-2, #64748b)",
						marginBottom: "4px",
					}}
				>
					Средняя полнота медицинских карт
				</div>
				<div
					style={{
						fontSize: "22px",
						fontWeight: 700,
						color:
							metrics.averageCompletenessScore >= 80
								? "var(--teal, #0d9488)"
								: "var(--warn, #f59e0b)",
					}}
				>
					{metrics.averageCompletenessScore}%
				</div>
			</div>

			<div
				style={{
					background: "var(--paper, #ffffff)",
					border: "1px solid var(--line, #e2e8f0)",
					borderRadius: "10px",
					padding: "14px 16px",
				}}
			>
				<div
					style={{
						fontSize: "12px",
						color: "var(--ink-2, #64748b)",
						marginBottom: "4px",
					}}
				>
					Соответствие СтАР / Минздрав
				</div>
				<div
					style={{
						fontSize: "22px",
						fontWeight: 700,
						color: "var(--good, #10b981)",
					}}
				>
					{metrics.complianceRatePercent}%
				</div>
			</div>
		</div>
	);
}
