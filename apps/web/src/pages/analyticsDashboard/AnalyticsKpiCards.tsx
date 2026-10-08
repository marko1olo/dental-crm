import { Activity, DollarSign, TrendingUp, Users } from "lucide-react";
import type React from "react";
import { formatRub } from "../analyticsDoctorMetrics.js";
import type { AnalyticsKpiCardsProps, KpiCardProps } from "./types";

export function KpiCard({
	icon,
	label,
	value,
	color,
	subtitle,
}: KpiCardProps) {
	return (
		<div className="analytics-kpi-card">
			<div className="analytics-kpi-header">
				<span
					className="analytics-kpi-icon"
					style={{ color }}
					aria-hidden="true"
				>
					{icon}
				</span>
				<span className="truncate">{label}</span>
			</div>
			<div className="analytics-kpi-value">{value}</div>
			{subtitle && <div className="analytics-kpi-subtext">{subtitle}</div>}
		</div>
	);
}

export function AnalyticsKpiCards({ data }: AnalyticsKpiCardsProps) {
	return (
		<div className="analytics-kpi-grid">
			<KpiCard
				icon={<Users size={14} />}
				label="Пациенты"
				value={(data?.kpis?.totalPatients ?? 0).toLocaleString(
					"ru-RU",
				)}
				color="var(--teal, #0d9488)"
				subtitle={
					<span>
						Первичные: <strong>{data?.kpis?.primaryPatientsCount ?? 0}</strong> • Повторные: <strong>{data?.kpis?.repeatPatientsCount ?? 0}</strong>
					</span>
				}
			/>
			<KpiCard
				icon={<DollarSign size={14} />}
				label="Выручка кассы"
				value={formatRub(data?.kpis?.totalRevenue ?? 0)}
				color="var(--ok-fg, #10b981)"
				subtitle={
					<span>
						Нал: {formatRub(data?.kpis?.cashRevenue ?? 0)} • Карта: {formatRub(data?.kpis?.cardRevenue ?? 0)} • Безнал: {formatRub(data?.kpis?.cashlessRevenue ?? 0)} • Авансы: {formatRub(data?.kpis?.advanceRevenue ?? 0)}
					</span>
				}
			/>
			<KpiCard
				icon={<Activity size={14} />}
				label="Приёмы и кресла"
				value={(data?.kpis?.totalAppointments ?? 0).toLocaleString(
					"ru-RU",
				)}
				color="var(--brand-300, var(--teal))"
				subtitle={
					<span>
						Загрузка кресел: <strong>{data?.kpis?.chairOccupancyRatePercent ?? 0}%</strong>
					</span>
				}
			/>
			<KpiCard
				icon={<TrendingUp size={14} />}
				label="Средний чек"
				value={formatRub(data?.kpis?.averageCheck ?? data?.kpis?.avgRevenuePerPatient ?? 0)}
				color="var(--warn-fg, #f59e0b)"
				subtitle={
					<span>
						Выручка / пац: {formatRub(data?.kpis?.avgRevenuePerPatient ?? 0)}
					</span>
				}
			/>
		</div>
	);
}
