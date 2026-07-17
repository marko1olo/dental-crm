import React, { useEffect, useState } from "react";
import "./AnalyticsDashboardView.css";
import { Activity, BarChart3, TrendingUp, Users } from "lucide-react";
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
import { useIsActiveTab } from "../hooks/useIsActiveTab";
import { useAppLogicContext } from "../contexts/AppLogicContext";

export function AnalyticsDashboardView() {
	const isActive = useIsActiveTab("analytics");
	const { denteClinicalReadHeaders } = useAppLogicContext();
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [dateRange, setDateRange] = useState<string>("all");

	useEffect(() => {
		if (!isActive) return;

		let mounted = true;
		const fetchData = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/analytics/dashboard?range=${dateRange}`, {
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) throw new Error("Failed to fetch analytics");
				const json = await res.json();
				if (mounted && json.success) {
					setData(json.data);
				}
			} catch (err) {
				console.error("Error fetching analytics:", err);
			} finally {
				if (mounted) setLoading(false);
			}
		};

		fetchData();
		// Poll every 30 seconds if active
		const interval = setInterval(fetchData, 30000);

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, [isActive, dateRange]);

	if (!isActive) {
		// OOM protection: completely unmount charts when not active
		return null;
	}

	if (loading || !data) {
		return (
			<div className="analytics-dashboard">
				<div className="analytics-empty-state">
					Загрузка аналитики...
				</div>
			</div>
		);
	}

	const {
		cohortLtvJson,
		planFunnelJson,
		chairUtilizationJson,
		doctorProfitabilityJson,
	} = data;

	return (
		<div className="analytics-dashboard" aria-label="Аналитика клиники">
			<header className="analytics-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<h2>Аналитика клиники</h2>
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
						fontSize: "14px"
					}}
				>
					<option value="all">За всё время</option>
					<option value="last_month">Последний месяц</option>
					<option value="last_3_months">Последние 3 месяца</option>
					<option value="this_year">Текущий год</option>
				</select>
			</header>

			<div className="analytics-grid">
				{/* Widget 1: Cohort LTV */}
				<article className="glass-widget">
					<h3>
						<TrendingUp className="w-5 h-5 text-dente-teal" /> Выручка по когортам (LTV)
					</h3>
					<div className="widget-chart-container">
						{cohortLtvJson && cohortLtvJson.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={cohortLtvJson}
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
											<stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
											<stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
										</linearGradient>
										<linearGradient
											id="colorMonth12"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
											<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
										tickFormatter={(val) => `${val / 1000}k`}
									/>
									<RechartsTooltip
										contentStyle={{
											backgroundColor: "#18181b",
											borderColor: "#27272a",
											borderRadius: "8px",
											color: "#e4e4e7",
										}}
										itemStyle={{ color: "#e4e4e7" }}
									/>
									<Legend />
									<Area
										type="monotone"
										name="Первый месяц"
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
							<div className="analytics-empty-state">Нет данных о когортах</div>
						)}
					</div>
				</article>

				{/* Widget 2: Plan Funnel */}
				<article className="glass-widget">
					<h3>
						<BarChart3 className="w-5 h-5 text-sky-500" /> Воронка планов лечения
					</h3>
					<div className="widget-chart-container">
						{planFunnelJson && planFunnelJson.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart
									data={planFunnelJson}
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
									/>
									<RechartsTooltip
										contentStyle={{
											backgroundColor: "#18181b",
											borderColor: "#27272a",
											borderRadius: "8px",
										}}
										itemStyle={{ color: "#e4e4e7" }}
									/>
									<Bar dataKey="value" name="Количество" barSize={32} radius={[0, 4, 4, 0]} />
								</ComposedChart>
							</ResponsiveContainer>
						) : (
							<div className="analytics-empty-state">
								Нет данных по воронке
							</div>
						)}
					</div>
				</article>

				{/* Widget 3: Chair Utilization */}
				<article className="glass-widget">
					<h3>
						<Activity className="w-5 h-5 text-emerald-500" /> Загруженность кресел
					</h3>
					<div className="widget-chart-container">
						{chairUtilizationJson && chairUtilizationJson.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<RadialBarChart
									cx="50%"
									cy="50%"
									innerRadius="20%"
									outerRadius="100%"
									barSize={16}
									data={chairUtilizationJson}
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
										formatter={(value: any) => `${value} приемов`}
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

				{/* Widget 4: Doctor Profitability Leaderboard */}
				<article className="glass-widget">
					<h3>
						<Users className="w-5 h-5 text-purple-500" /> Эффективность врачей
					</h3>
					<div className="widget-chart-container" style={{ overflowY: "auto" }}>
						{doctorProfitabilityJson && doctorProfitabilityJson.length > 0 ? (
							<table className="analytics-leaderboard-table">
								<thead>
									<tr>
										<th>Врач</th>
										<th>Выручка (₽)</th>
										<th>Прибыль (₽)</th>
										<th>Успешность %</th>
									</tr>
								</thead>
								<tbody>
									{doctorProfitabilityJson.map((doc: any, idx: number) => (
										<tr key={idx}>
											<td>{doc.name}</td>
											<td>{doc.revenue.toLocaleString("ru-RU")}</td>
											<td className="margin-positive">
												+{doc.margin.toLocaleString("ru-RU")}
											</td>
											<td>{doc.completionRate}%</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="analytics-empty-state">
								Нет данных по врачам
							</div>
						)}
					</div>
				</article>
			</div>
		</div>
	);
}
