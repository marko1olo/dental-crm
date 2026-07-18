import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useIsActiveTab } from "../hooks/useIsActiveTab";
import { useSettingsStore } from "../store/settingsStore";
import { ChairUtilizationWidget } from "../components/analytics/ChairUtilizationWidget";
import { CohortLtvWidget } from "../components/analytics/CohortLtvWidget";
import { DoctorProfitabilityWidget } from "../components/analytics/DoctorProfitabilityWidget";
import { KpiCardsWidget } from "../components/analytics/KpiCardsWidget";
import { PlanFunnelWidget } from "../components/analytics/PlanFunnelWidget";
import "./AnalyticsDashboardView.css";

interface Kpis {
	totalPatients: number;
	totalRevenue: number;
	totalAppointments: number;
	avgRevenuePerPatient: number;
}

interface AnalyticsData {
	kpis: Kpis;
	cohortLtvJson: Array<{ cohort: string; "Month 1": number; "Month 12": number }>;
	planFunnelJson: Array<{ name: string; value: number; fill: string }>;
	chairUtilizationJson: Array<{ name: string; value: number; fill: string }>;
	doctorProfitabilityJson: Array<{
		name: string;
		revenue: number;
		margin: number;
		completionRate: number;
	}>;
}

const DATE_RANGES = [
	{ value: "all", label: "За всё время" },
	{ value: "last_month", label: "Последний месяц" },
	{ value: "last_3_months", label: "Последние 3 месяца" },
	{ value: "this_year", label: "Текущий год" },
];

export function AnalyticsDashboardView() {
	const isActive = useIsActiveTab("analytics");
	const { denteClinicalReadHeaders } = useAppLogicContext();
	const { clinicMode } = useSettingsStore();

	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dateRange, setDateRange] = useState<string>("all");

	useEffect(() => {
		if (!isActive) return;

		let mounted = true;
		const fetchData = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
				const json = await res.json();
				if (mounted && json.success) {
					setData(json.data);
				}
			} catch (err) {
				if (mounted) setError(err instanceof Error ? err.message : "Ошибка загрузки");
			} finally {
				if (mounted) setLoading(false);
			}
		};

		fetchData();
		const interval = setInterval(fetchData, 60_000);

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, [isActive, dateRange, denteClinicalReadHeaders]);

	if (!isActive) return null;

	const isSolo = clinicMode === "solo_doctor";
	const isSingleChair = clinicMode === "one_chair" || clinicMode === "solo_doctor";

	return (
		<div className="analytics-dashboard" aria-label="Аналитика клиники">
			<header
				className="analytics-header"
				style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
			>
				<h2 style={{ margin: 0 }}>Аналитика клиники</h2>
				<select
					value={dateRange}
					onChange={(e) => setDateRange(e.target.value)}
					style={{
						padding: "6px 12px",
						borderRadius: "8px",
						backgroundColor: "var(--bg-elevated, #18181b)",
						color: "var(--fg-primary, #e4e4e7)",
						border: "1px solid var(--border, #27272a)",
						outline: "none",
						fontSize: "14px",
					}}
				>
					{DATE_RANGES.map((r) => (
						<option key={r.value} value={r.value}>
							{r.label}
						</option>
					))}
				</select>
			</header>

			{loading && (
				<div className="analytics-empty-state">Загрузка аналитики...</div>
			)}

			{!loading && error && (
				<div
					className="analytics-empty-state"
					style={{ color: "var(--red, #ef4444)" }}
				>
					{error}
				</div>
			)}

			{!loading && !error && data && (
				<>
					<KpiCardsWidget
						totalPatients={data.kpis.totalPatients}
						totalRevenue={data.kpis.totalRevenue}
						totalAppointments={data.kpis.totalAppointments}
						avgRevenuePerPatient={data.kpis.avgRevenuePerPatient}
					/>

					<div className="analytics-grid">
						<CohortLtvWidget data={data.cohortLtvJson} />
						<PlanFunnelWidget data={data.planFunnelJson} />

						{/* Hide these charts for solo doctors or single-chair setups */}
						{!isSingleChair && (
							<ChairUtilizationWidget data={data.chairUtilizationJson} />
						)}
						{!isSolo && (
							<DoctorProfitabilityWidget data={data.doctorProfitabilityJson} />
						)}
					</div>
				</>
			)}
		</div>
	);
}
