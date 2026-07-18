import { Activity, DollarSign, TrendingUp, Users } from "lucide-react";
import React from "react";

interface KpiCardsWidgetProps {
	totalPatients: number;
	totalRevenue: number;
	totalAppointments: number;
	avgRevenuePerPatient: number;
}

function formatRub(n: number) {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₽`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₽`;
	return `${n} ₽`;
}

export function KpiCardsWidget({
	totalPatients,
	totalRevenue,
	totalAppointments,
	avgRevenuePerPatient,
}: KpiCardsWidgetProps) {
	return (
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
				value={totalPatients.toLocaleString("ru-RU")}
				color="#3b82f6"
			/>
			<KpiCard
				icon={<DollarSign size={18} />}
				label="Выручка"
				value={formatRub(totalRevenue)}
				color="#10b981"
			/>
			<KpiCard
				icon={<Activity size={18} />}
				label="Приёмов"
				value={totalAppointments.toLocaleString("ru-RU")}
				color="#8b5cf6"
			/>
			<KpiCard
				icon={<TrendingUp size={18} />}
				label="Ср. выручка / пациент"
				value={formatRub(avgRevenuePerPatient)}
				color="#f59e0b"
			/>
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
