/**
 * Сетка из 6 ключевых KPI-метрик сквозной маркетинговой аналитики.
 */

import {
	CalendarCheck,
	Coins,
	CreditCard,
	PhoneCall,
	TrendingUp,
	UserCheck,
} from "lucide-react";
import React from "react";

export interface MarketingRoiKpisGridProps {
	readonly summary: {
		readonly totalAdSpendFormatted: string;
		readonly totalCallsCount: number;
		readonly overallCplFormatted: string;
		readonly totalBookedAppointmentsCount: number;
		readonly overallCpaFormatted: string;
		readonly totalPaidPlansCount: number;
		readonly overallCacFormatted: string;
		readonly totalRevenueFormatted: string;
		readonly overallAverageCheckFormatted: string;
		readonly overallRomiFormatted: string;
		readonly totalProfitFormatted: string;
	};
}

export function MarketingRoiKpisGrid({ summary }: MarketingRoiKpisGridProps) {
	return (
		<div className="marketing-roi-kpis-grid">
			{/* Card 1: Total Spend */}
			<div className="marketing-roi-kpi-card" data-testid="kpi-spend">
				<div className="marketing-roi-kpi-header">
					<span>Маркетинговый бюджет</span>
					<Coins className="w-4 h-4 text-amber-400" />
				</div>
				<div className="marketing-roi-kpi-value">{summary.totalAdSpendFormatted}</div>
				<div className="marketing-roi-kpi-sub">
					Каналов в отчете: <b>Активны</b>
				</div>
			</div>

			{/* Card 2: Calls & CPL */}
			<div className="marketing-roi-kpi-card" data-testid="kpi-calls">
				<div className="marketing-roi-kpi-header">
					<span>Обращения (Лиды)</span>
					<PhoneCall className="w-4 h-4 text-teal-400" />
				</div>
				<div className="marketing-roi-kpi-value">
					{summary.totalCallsCount.toLocaleString("ru-RU")}
				</div>
				<div className="marketing-roi-kpi-sub">
					CPL: <b>{summary.overallCplFormatted}</b>
				</div>
			</div>

			{/* Card 3: Bookings & CPA */}
			<div className="marketing-roi-kpi-card" data-testid="kpi-bookings">
				<div className="marketing-roi-kpi-header">
					<span>Первичные записи</span>
					<CalendarCheck className="w-4 h-4 text-sky-400" />
				</div>
				<div className="marketing-roi-kpi-value">
					{summary.totalBookedAppointmentsCount.toLocaleString("ru-RU")}
				</div>
				<div className="marketing-roi-kpi-sub">
					CPA: <b>{summary.overallCpaFormatted}</b>
				</div>
			</div>

			{/* Card 4: Paid Patients & CAC */}
			<div className="marketing-roi-kpi-card" data-testid="kpi-paid">
				<div className="marketing-roi-kpi-header">
					<span>Оплатившие лечение</span>
					<UserCheck className="w-4 h-4 text-indigo-400" />
				</div>
				<div className="marketing-roi-kpi-value">
					{summary.totalPaidPlansCount.toLocaleString("ru-RU")}
				</div>
				<div className="marketing-roi-kpi-sub">
					CAC: <b>{summary.overallCacFormatted}</b>
				</div>
			</div>

			{/* Card 5: Revenue & Avg Check */}
			<div className="marketing-roi-kpi-card" data-testid="kpi-revenue">
				<div className="marketing-roi-kpi-header">
					<span>Выручка с рекламы</span>
					<CreditCard className="w-4 h-4 text-emerald-400" />
				</div>
				<div className="marketing-roi-kpi-value">{summary.totalRevenueFormatted}</div>
				<div className="marketing-roi-kpi-sub">
					Ср. чек: <b>{summary.overallAverageCheckFormatted}</b>
				</div>
			</div>

			{/* Card 6: ROMI & Profit */}
			<div className="marketing-roi-kpi-card" data-testid="kpi-romi">
				<div className="marketing-roi-kpi-header">
					<span>Окупаемость ROMI</span>
					<TrendingUp className="w-4 h-4 text-amber-400" />
				</div>
				<div className="marketing-roi-kpi-value text-emerald-400">
					{summary.overallRomiFormatted}
				</div>
				<div className="marketing-roi-kpi-sub">
					Прибыль: <b>{summary.totalProfitFormatted}</b>
				</div>
			</div>
		</div>
	);
}
