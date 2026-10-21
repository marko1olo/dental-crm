import React from "react";
/**
 * DENTE Dental CRM — Funnel Volume KPI Cards (Leads, Show-Up, Paid)
 * Mandate 8b (<= 120 lines)
 */

import { Award, CheckCircle2, Users } from "lucide-react";
import { resolveShowUpToneColor } from "./funnelAnalyticsUtils";
import type { FunnelSummaryMetrics } from "./types";

const cardStyle: React.CSSProperties = {
	background: "var(--paper)",
	border: "1px solid var(--line)",
	borderRadius: 12,
	padding: "14px",
};

const titleStyle: React.CSSProperties = {
	fontSize: 11,
	fontWeight: 600,
	color: "var(--muted)",
	marginBottom: 4,
	display: "flex",
	alignItems: "center",
	gap: 4,
};

export function FunnelVolumeKpiCards({ summary }: { summary: FunnelSummaryMetrics }) {
	return (
		<>
			<div style={cardStyle}>
				<div style={titleStyle}>
					<Users size={13} color="var(--brand-500)" /> Всего лидов
				</div>
				<div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
					{summary.totalLeads}
				</div>
				<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
					Конверсия в запись: {summary.bookingRatePercent}%
				</div>
			</div>

			<div style={cardStyle}>
				<div style={titleStyle}>
					<CheckCircle2 size={13} color="var(--warn-fg)" /> Дошли (Show-up)
				</div>
				<div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
					{summary.showUpLeads}
				</div>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						color: resolveShowUpToneColor(summary.showUpRatePercent),
						marginTop: 2,
					}}
				>
					Доходимость: {summary.showUpRatePercent}%
				</div>
			</div>

			<div style={cardStyle}>
				<div style={titleStyle}>
					<Award size={13} color="var(--ok-fg)" /> Оплатили
				</div>
				<div style={{ fontSize: 22, fontWeight: 700, color: "var(--ok-fg)" }}>
					{summary.paidLeads}
				</div>
				<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
					Итог. конверсия: {summary.overallConversionPercent}%
				</div>
			</div>
		</>
	);
}
