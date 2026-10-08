import {
	Activity,
	BarChart3,
	Calendar,
	Printer,
	TrendingUp,
} from "lucide-react";
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
import { countLabel, money } from "../../AppHelpers";
import { EmptyState } from "../../components/EmptyState.js";
import { formatRub } from "../analyticsDoctorMetrics.js";
import type {
	AnalyticsRevenueChartsProps,
	CohortChartRow,
	NamedValueChartRow,
} from "./types";

/**
 * Значение из подсказки Recharts. Библиотека объявляет его как число, строку или
 * массив, поэтому приведение к числу делается здесь — один раз и с проверкой, а
 * не `(val: any)` в каждом форматере, как было раньше.
 */
function tooltipNumber(value: unknown): number | null {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/** Точная сумма в подсказке: полный денежный формат из AppHelpers. */
function moneyTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null ? "—" : money(parsed);
}

/** Склонение счётного слова: «1 план», «2 плана», «5 планов». */
function planCountTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null
		? "—"
		: countLabel(Math.round(parsed), "план", "плана", "планов");
}

/** Склонение счётного слова: «1 приём», «2 приёма», «5 приёмов». */
function appointmentCountTooltip(value: unknown): string {
	const parsed = tooltipNumber(value);
	return parsed === null
		? "—"
		: countLabel(Math.round(parsed), "приём", "приёма", "приёмов");
}

export function AnalyticsRevenueCharts({ data }: AnalyticsRevenueChartsProps) {
	return (
		<>
			{/* Виджет 1 — сколько денег приносит пациент со временем. */}
			<article className="glass-widget">
				<div className="glass-widget-header">
					<h3 title="Пациенты сгруппированы по месяцу первого визита (когорты), и для каждой группы видно, сколько денег она принесла за год — LTV.">
						<TrendingUp className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
						<span>Сколько приносит пациент со временем</span>
					</h3>
					<div className="glass-widget-actions">
						<button
							type="button"
							className="glass-action-btn"
							onClick={() => window.print()}
							title="Распечатать график LTV"
						>
							<Printer size={13} aria-hidden="true" />
							<span>Печать</span>
						</button>
					</div>
				</div>
				<div className="analytics-chart-container pb-16 sm:pb-4 mb-4 sm:mb-0">
					{(data?.cohortLtvJson ?? []).length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={data?.cohortLtvJson as CohortChartRow[]}
								margin={{ top: 10, right: 15, left: 0, bottom: 15 }}
							>
								<defs>
									<linearGradient
										id="analyticsLtvGradient"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor="#10b981"
											stopOpacity={0.45}
										/>
										<stop
											offset="95%"
											stopColor="#10b981"
											stopOpacity={0.02}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="var(--line)"
									vertical={false}
								/>
								<XAxis
									dataKey="cohort"
									stroke="var(--muted)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke="var(--muted)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
									tickFormatter={(val: number) => formatRub(val)}
								/>
								<RechartsTooltip
									contentStyle={{
										backgroundColor: "var(--paper)",
										borderColor: "var(--line)",
										borderRadius: "8px",
										color: "var(--ink)",
										boxShadow: "var(--shadow-2)",
										fontSize: "12px",
									}}
									itemStyle={{ color: "var(--ink)" }}
									labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
									formatter={moneyTooltip}
								/>
								<Legend
									wrapperStyle={{
										fontSize: "11px",
										color: "var(--muted)",
										paddingTop: "4px",
									}}
								/>
								<Area
									type="monotone"
									name="За год"
									dataKey="Month 12"
									stroke="#10b981"
									strokeWidth={3}
									fillOpacity={1}
									fill="url(#analyticsLtvGradient)"
									dot={{ r: 4, fill: "#10b981", strokeWidth: 1, stroke: "var(--paper)" }}
									activeDot={{ r: 6, fill: "#06b6d4", stroke: "var(--paper)" }}
								/>
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							glass={false}
							icon={<TrendingUp size={24} aria-hidden="true" />}
							title="Пока нечего показать"
							description="График появится, когда в клинике будут оплаты хотя бы за два месяца: он сравнивает, сколько принесли пациенты, пришедшие в разные месяцы."
							className="analytics-chart-empty"
						/>
					)}
				</div>
			</article>

			{/* Виджет 2 — воронка планов лечения. */}
			<article className="glass-widget">
				<div className="glass-widget-header">
					<h3 title="Состояния планов лечения: черновик, в работе, согласован, завершён, отклонён">
						<BarChart3 className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
						<span>Воронка планов лечения</span>
					</h3>
					<div className="glass-widget-actions">
						<button
							type="button"
							className="glass-action-btn"
							onClick={() => window.print()}
							title="Распечатать воронку планов лечения"
						>
							<Printer size={13} aria-hidden="true" />
							<span>Печать</span>
						</button>
					</div>
				</div>
				<div className="analytics-chart-container">
					{Array.isArray(data?.planFunnelJson) &&
					(data?.planFunnelJson ?? []).filter(
						(x) => (x?.value ?? 0) > 0,
					).length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart
								data={data?.planFunnelJson as NamedValueChartRow[]}
								layout="vertical"
								margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="var(--line)"
									horizontal={false}
								/>
								<XAxis
									type="number"
									stroke="var(--muted)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									dataKey="name"
									type="category"
									stroke="var(--muted)"
									fontSize={11}
									tickLine={false}
									axisLine={false}
									width={90}
								/>
								<RechartsTooltip
									contentStyle={{
										backgroundColor: "var(--paper)",
										borderColor: "var(--line)",
										borderRadius: "8px",
										color: "var(--ink)",
										boxShadow: "var(--shadow-2)",
										fontSize: "12px",
									}}
									itemStyle={{ color: "var(--ink)" }}
									labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
									formatter={planCountTooltip}
								/>
								<Bar
									dataKey="value"
									name="Количество"
									barSize={24}
									radius={[0, 4, 4, 0]}
									fill="var(--teal, #0d9488)"
								/>
							</ComposedChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							glass={false}
							icon={<BarChart3 size={24} aria-hidden="true" />}
							title="Планов лечения ещё нет"
							description="Составьте план в карточке пациента — здесь будет видно, сколько смет в черновиках, сколько согласовано, сколько доведено до конца и от скольких пациент отказался."
							className="analytics-chart-empty"
						/>
					)}
				</div>
			</article>

			{/* Виджет 3 — загруженность кресел по фактическим приёмам. */}
			<article className="glass-widget">
				<div className="glass-widget-header">
					<h3 title="Загруженность кресел по фактическим приёмам">
						<Activity className="w-4 h-4 text-[var(--ok-fg)]" aria-hidden="true" />
						<span>Загруженность кресел</span>
					</h3>
					<div className="glass-widget-actions">
						<button
							type="button"
							className="glass-action-btn"
							onClick={() => window.print()}
							title="Распечатать график загруженности кресел"
						>
							<Printer size={13} aria-hidden="true" />
							<span>Печать</span>
						</button>
					</div>
				</div>
				<div className="analytics-chart-container">
					{Array.isArray(data?.chairUtilizationJson) &&
					(data?.chairUtilizationJson ?? []).filter(
						(x) => (x?.value ?? 0) > 0,
					).length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<RadialBarChart
								cx="50%"
								cy="50%"
								innerRadius="20%"
								outerRadius="100%"
								barSize={14}
								data={
									data?.chairUtilizationJson as NamedValueChartRow[]
								}
							>
								<RadialBar
									label={{
										position: "insideStart",
										fill: "var(--on-teal, #ffffff)",
										fontSize: 11,
										fontWeight: 600,
									}}
									background={{ fill: "var(--paper-soft)" }}
									dataKey="value"
									cornerRadius={6}
								/>
								<Legend
									iconSize={8}
									layout="vertical"
									verticalAlign="middle"
									wrapperStyle={{ right: 0, color: "var(--muted)", fontSize: "11px" }}
								/>
								<RechartsTooltip
									contentStyle={{
										backgroundColor: "var(--paper)",
										borderColor: "var(--line)",
										borderRadius: "8px",
										color: "var(--ink)",
										boxShadow: "var(--shadow-2)",
										fontSize: "12px",
									}}
									itemStyle={{ color: "var(--ink)" }}
									labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
									formatter={appointmentCountTooltip}
								/>
							</RadialBarChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							glass={false}
							icon={<Calendar size={24} aria-hidden="true" />}
							title="Приёмов за этот период нет"
							description="Смените период вверху страницы или запишите пациента в разделе «Записи» — загруженность считается по фактическим приёмам в креслах."
							className="analytics-chart-empty"
						/>
					)}
				</div>
			</article>
		</>
	);
}
