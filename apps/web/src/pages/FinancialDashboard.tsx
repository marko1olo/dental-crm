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
		<div className="financial-dashboard p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] my-4 shadow-sm" aria-label="Financial Dashboard">
			<header className="financial-header mb-4 pb-2 border-b border-[var(--line)] flex justify-between items-center">
				<h2 className="text-xl font-bold text-[var(--brand-600,#0e7490)]">Финансовая аналитика клиники</h2>
			</header>

			<div className="metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
				<article className="metric-card p-3 rounded-lg border border-[var(--line)] bg-[var(--glass-panel)] space-y-1 hover:border-[var(--brand-300)] transition-all">
					<h3 className="text-xs text-[var(--muted)]">Средний чек</h3>
					<p className="metric-value text-lg font-bold font-mono text-[var(--brand-600,#0e7490)]">
						{metrics.averageInvoice.toLocaleString("ru-RU")} ₽
					</p>
				</article>

				<article className="metric-card p-3 rounded-lg border border-[var(--line)] bg-[var(--glass-panel)] space-y-1 hover:border-[var(--brand-300)] transition-all">
					<h3 className="text-xs text-[var(--muted)]">Конверсия планов</h3>
					<p className="metric-value text-lg font-bold font-mono text-[var(--indigo-600,#4f46e5)]">{metrics.conversionRate.toFixed(1)}%</p>
				</article>

				<article className="metric-card highlight p-3 rounded-lg border border-[var(--line)] bg-[var(--glass-panel)] space-y-1 hover:border-[var(--emerald-300)] transition-all">
					<h3 className="text-xs text-[var(--muted)]">Чистая маржа</h3>
					<p className="metric-value text-lg font-bold font-mono text-[var(--emerald-600,#059669)]">{margin.toLocaleString("ru-RU")} ₽</p>
				</article>

				<article className="metric-card danger p-3 rounded-lg border border-[var(--line)] bg-[var(--glass-panel)] space-y-1 hover:border-[var(--rose-300)] transition-all">
					<h3 className="text-xs text-[var(--muted)]">Дебиторская задолженность</h3>
					<p className="metric-value text-lg font-bold font-mono text-[var(--danger,#e11d48)]">
						{metrics.totalDebts.toLocaleString("ru-RU")} ₽
					</p>
				</article>
			</div>

			<DoctorPayoutDashboard />
		</div>
	);
}
