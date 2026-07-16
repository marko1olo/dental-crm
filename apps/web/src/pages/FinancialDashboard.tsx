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
		<div className="financial-dashboard" aria-label="Financial Dashboard">
			<header
				className="financial-header"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<h2>Финансовый Дашборд</h2>
			</header>

			<div className="metrics-grid">
				<article className="metric-card">
					<h3>Средний чек</h3>
					<p className="metric-value">
						{metrics.averageInvoice.toLocaleString("ru-RU")} ₽
					</p>
				</article>

				<article className="metric-card">
					<h3>Конверсия</h3>
					<p className="metric-value">{metrics.conversionRate.toFixed(1)}%</p>
				</article>

				<article className="metric-card highlight">
					<h3>Чистая прибыль</h3>
					<p className="metric-value">{margin.toLocaleString("ru-RU")} ₽</p>
				</article>

				<article className="metric-card danger">
					<h3>Дебиторская задолженность</h3>
					<p className="metric-value">
						{metrics.totalDebts.toLocaleString("ru-RU")} ₽
					</p>
				</article>
			</div>

			<DoctorPayoutDashboard />
		</div>
	);
}
