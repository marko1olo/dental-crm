import React, { useEffect } from "react";
import "./FinancialDashboard.css";
import { DoctorPayoutDashboard } from "./DoctorPayoutDashboard.js";

export interface FinancialMetrics {
	averageInvoice: number;
	conversionRate: number; // percentage
	revenueByDepartment: {
		therapy: number;
		orthopedics: number;
		surgery: number;
	};
	totalRevenue: number;
	totalLabCosts: number;
	totalDebts: number;
}

export function FinancialDashboard({ metrics }: { metrics: FinancialMetrics }) {
	const margin = metrics.totalRevenue - metrics.totalLabCosts;
	const marginPercentage =
		metrics.totalRevenue > 0
			? ((margin / metrics.totalRevenue) * 100).toFixed(1)
			: "0.0";

	return (
		<div className="financial-dashboard p-4 rounded-xl border my-4 shadow-sm" style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }} aria-label="Financial Dashboard">
			<header
				className="financial-header mb-4 pb-2 border-b"
				style={{
					borderColor: "var(--line)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<h2 className="text-xl font-bold text-sky-600 dark:text-sky-400">Финансовая аналитика клиники</h2>
			</header>

			<div className="metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
				<article className="metric-card p-3 rounded-lg border space-y-1" style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}>
					<h3 className="text-xs" style={{ color: "var(--muted)" }}>Средний чек</h3>
					<p className="metric-value text-lg font-bold font-mono text-sky-600 dark:text-sky-400">
						{metrics.averageInvoice.toLocaleString("ru-RU")} ₽
					</p>
				</article>

				<article className="metric-card p-3 rounded-lg border space-y-1" style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}>
					<h3 className="text-xs" style={{ color: "var(--muted)" }}>Конверсия планов</h3>
					<p className="metric-value text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">{metrics.conversionRate.toFixed(1)}%</p>
				</article>

				<article className="metric-card highlight p-3 rounded-lg border space-y-1" style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}>
					<h3 className="text-xs" style={{ color: "var(--muted)" }}>Чистая маржа</h3>
					<p className="metric-value text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{margin.toLocaleString("ru-RU")} ₽</p>
				</article>

				<article className="metric-card danger p-3 rounded-lg border space-y-1" style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}>
					<h3 className="text-xs" style={{ color: "var(--muted)" }}>Дебиторская задолженность</h3>
					<p className="metric-value text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
						{metrics.totalDebts.toLocaleString("ru-RU")} ₽
					</p>
				</article>
			</div>

			<DoctorPayoutDashboard />
		</div>
	);
}
