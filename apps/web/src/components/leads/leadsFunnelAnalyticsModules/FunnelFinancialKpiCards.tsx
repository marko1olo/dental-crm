import React from "react";
/**
 * DENTE Dental CRM — Funnel Financial KPI Cards (Revenue, CAC, ROMI)
 * Mandate 8b (<= 120 lines)
 */

import { DollarSign, Flame, TrendingUp } from "lucide-react";
import { resolveRomiToneColor } from "./funnelAnalyticsUtils";
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

export function FunnelFinancialKpiCards({ summary }: { summary: FunnelSummaryMetrics }) {
	return (
		<>
			<div style={cardStyle}>
				<div style={titleStyle}>
					<DollarSign size={13} color="var(--teal)" /> Выручка
				</div>
				<div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
					{summary.totalRevenueRub.toLocaleString("ru-RU")} ₽
				</div>
				<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
					Ср. чек: {summary.avgBillRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div style={cardStyle}>
				<div style={titleStyle}>
					<TrendingUp size={13} color="var(--accent)" /> Стоимость привлечения (CAC)
				</div>
				<div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
					{summary.cacRub.toLocaleString("ru-RU")} ₽
				</div>
				<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
					Заявка: {summary.cplRub.toLocaleString("ru-RU")} ₽ | Визит:{" "}
					{summary.cpsRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div style={cardStyle}>
				<div style={titleStyle}>
					<Flame size={13} color="var(--teal)" /> Окупаемость рекламы (ROMI)
				</div>
				<div
					style={{
						fontSize: 20,
						fontWeight: 700,
						color: resolveRomiToneColor(summary.romiPercent),
					}}
				>
					{summary.romiPercent}%
				</div>
				<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
					Возврат на вложения: {summary.ltvToCacRatio}x
				</div>
			</div>
		</>
	);
}
