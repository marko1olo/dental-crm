import { Activity, BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	RadialBar,
	RadialBarChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useIsActiveTab } from "../hooks/useIsActiveTab";
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

function formatRub(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₽`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₽`;
	return `${n} ₽`;
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
	}, [isActive, dateRange]);

	if (!isActive) return null;

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
					{/* KPI Cards */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: 16,
							marginBottom: 24,
						}}
					>
						<KpiCard
							icon={<Users size={18} />}
							label="Пациентов"
							value={data.kpis.totalPatients.toLocaleString("ru-RU")}
							color="#3b82f6"
						/>
						<KpiCard
							icon={<DollarSign size={18} />}
							label="Выручка"
							value={formatRub(data.kpis.totalRevenue)}
							color="#10b981"
						/>
						<KpiCard
							icon={<Activity size={18} />}
							label="Приёмов"
							value={data.kpis.totalAppointments.toLocaleString("ru-RU")}
							color="#8b5cf6"
						/>
						<KpiCard
							icon={<TrendingUp size={18} />}
							label="Ср. выручка / пациент"
							value={formatRub(data.kpis.avgRevenuePerPatient)}
							color="#f59e0b"
						/>
					</div>

					<div className="analytics-grid">
						{/* Widget 1: Cohort LTV */}
						<article className="glass-widget">
							<h3>
								<TrendingUp className="w-5 h-5 text-dente-teal" /> Выручка по
								когортам (LTV)
							</h3>
							<div className="widget-chart-container">
								{data.cohortLtvJson && data.cohortLtvJson.length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart
											data={data.cohortLtvJson}
											margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
										>
											<defs>
												<linearGradient
													id="colorMonth1"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="#14b8a6"
														stopOpacity={0.8}
													/>
													<stop
														offset="95%"
														stopColor="#14b8a6"
														stopOpacity={0}
													/>
												</linearGradient>
												<linearGradient
													id="colorMonth12"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="#8b5cf6"
														stopOpacity={0.8}
													/>
													<stop
														offset="95%"
														stopColor="#8b5cf6"
														stopOpacity={0}
													/>
												</linearGradient>
											</defs>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#27272a"
												vertical={false}
											/>
											<XAxis
												dataKey="cohort"
												stroke="#a1a1aa"
												fontSize={12}
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												stroke="#a1a1aa"
												fontSize={12}
												tickLine={false}
												axisLine={false}
												tickFormatter={(val) => `${Math.round(val / 1000)}k`}
											/>
											<RechartsTooltip
												contentStyle={{
													backgroundColor: "#18181b",
													borderColor: "#27272a",
													borderRadius: "8px",
													color: "#e4e4e7",
												}}
												itemStyle={{ color: "#e4e4e7" }}
												formatter={(val: any) =>
													val.toLocaleString("ru-RU") + " ₽"
												}
											/>
											<Legend />
											<Area
												type="monotone"
												name="1-й месяц"
												dataKey="Month 1"
												stroke="#14b8a6"
												fillOpacity={1}
												fill="url(#colorMonth1)"
											/>
											<Area
												type="monotone"
												name="За год"
												dataKey="Month 12"
												stroke="#8b5cf6"
												fillOpacity={1}
												fill="url(#colorMonth12)"
											/>
										</AreaChart>
									</ResponsiveContainer>
								) : (
									<div className="analytics-empty-state">
										Недостаточно данных по когортам
									</div>
								)}
							</div>
						</article>

						{/* Widget 2: Plan Funnel */}
						<article className="glass-widget">
							<h3>
								<BarChart3 className="w-5 h-5 text-sky-500" /> Воронка планов
								лечения
							</h3>
							<div className="widget-chart-container">
								{data.planFunnelJson && data.planFunnelJson.filter((x) => x.value > 0).length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<ComposedChart
											data={data.planFunnelJson}
											layout="vertical"
											margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#27272a"
												horizontal={false}
											/>
											<XAxis
												type="number"
												stroke="#a1a1aa"
												fontSize={12}
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												dataKey="name"
												type="category"
												stroke="#a1a1aa"
												fontSize={12}
												tickLine={false}
												axisLine={false}
												width={90}
											/>
											<RechartsTooltip
												contentStyle={{
													backgroundColor: "#18181b",
													borderColor: "#27272a",
													borderRadius: "8px",
												}}
												itemStyle={{ color: "#e4e4e7" }}
												formatter={(val: any) =>
													`${val} планов`
												}
											/>
											<Bar
												dataKey="value"
												name="Количество"
												barSize={32}
												radius={[0, 4, 4, 0]}
											/>
										</ComposedChart>
									</ResponsiveContainer>
								) : (
									<div className="analytics-empty-state">Нет данных по планам</div>
								)}
							</div>
						</article>

						{/* Widget 3: Chair Utilization */}
						<article className="glass-widget">
							<h3>
								<Activity className="w-5 h-5 text-emerald-500" /> Загруженность
								кресел
							</h3>
							<div className="widget-chart-container">
								{data.chairUtilizationJson &&
								data.chairUtilizationJson.filter((x) => x.value > 0).length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<RadialBarChart
											cx="50%"
											cy="50%"
											innerRadius="20%"
											outerRadius="100%"
											barSize={16}
											data={data.chairUtilizationJson}
										>
											<RadialBar
												label={{
													position: "insideStart",
													fill: "#fff",
													fontSize: 11,
												}}
												background={{ fill: "#27272a" }}
												dataKey="value"
												cornerRadius={8}
											/>
											<Legend
												iconSize={10}
												layout="vertical"
												verticalAlign="middle"
												wrapperStyle={{ right: 0, color: "#a1a1aa" }}
											/>
											<RechartsTooltip
												contentStyle={{
													backgroundColor: "#18181b",
													borderColor: "#27272a",
													borderRadius: "8px",
												}}
												itemStyle={{ color: "#e4e4e7" }}
												formatter={(val: any) => `${val} приёмов`}
											/>
										</RadialBarChart>
									</ResponsiveContainer>
								) : (
									<div className="analytics-empty-state">
										Нет данных по загруженности
									</div>
								)}
							</div>
						</article>

						{/* Widget 4: Doctor Profitability */}
						<article className="glass-widget">
							<h3>
								<Users className="w-5 h-5 text-purple-500" /> Эффективность врачей
							</h3>
							<div className="widget-chart-container" style={{ overflowY: "auto" }}>
								{data.doctorProfitabilityJson &&
								data.doctorProfitabilityJson.filter((x) => x.revenue > 0).length > 0 ? (
									<table className="analytics-leaderboard-table">
										<thead>
											<tr>
												<th>Врач</th>
												<th>Выручка</th>
												<th>Прибыль</th>
												<th>Успешность</th>
											</tr>
										</thead>
										<tbody>
											{data.doctorProfitabilityJson.map((doc, idx) => (
												<tr key={idx}>
													<td>{doc.name}</td>
													<td>{formatRub(doc.revenue)}</td>
													<td className="margin-positive">
														+{formatRub(doc.margin)}
													</td>
													<td>
														<span
															style={{
																color:
																	doc.completionRate >= 80
																		? "#10b981"
																		: doc.completionRate >= 60
																			? "#f59e0b"
																			: "#ef4444",
																fontWeight: 600,
															}}
														>
															{doc.completionRate}%
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<div className="analytics-empty-state">Нет данных по врачам</div>
								)}
							</div>
						</article>
					</div>
				</>
			)}
		</div>
	);
}

function KpiCard({
	icon,
	label,
	value,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div
			style={{
				background: "var(--bg-elevated, #18181b)",
				border: "1px solid var(--border, #27272a)",
				borderRadius: 12,
				padding: "16px 20px",
				display: "flex",
				flexDirection: "column",
				gap: 8,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					color: color,
					fontSize: 13,
					fontWeight: 500,
				}}
			>
				{icon}
				{label}
			</div>
			<div
				style={{
					fontSize: 22,
					fontWeight: 700,
					color: "var(--fg-primary, #e4e4e7)",
					letterSpacing: "-0.5px",
				}}
			>
				{value}
			</div>
		</div>
	);
}
