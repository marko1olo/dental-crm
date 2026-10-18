import React from "react";
import { Bot, DollarSign, TrendingUp, UserCheck } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type {
	OnlineBookingComparisonData,
	OnlineBookingSummary,
} from "./onlineBookingTypes";

interface OnlineBookingKpiCardsProps {
	readonly onlineSummary: OnlineBookingSummary;
	readonly comparison: OnlineBookingComparisonData;
}

export function OnlineBookingKpiCards({
	onlineSummary,
	comparison,
}: OnlineBookingKpiCardsProps) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
				<div className="flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Доля самозаписи</span>
					<Bot size={16} className="text-[var(--teal)]" />
				</div>
				<div className="text-2xl font-extrabold text-[var(--ink)]">
					{comparison.onlineSharePercent}%
				</div>
				<p className="text-xs text-[var(--muted)] m-0">
					{onlineSummary.totalBookings} из {comparison.grandTotalBookings} всех записей
				</p>
			</div>

			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
				<div className="flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Конверсия виджета</span>
					<TrendingUp size={16} className="text-emerald-500" />
				</div>
				<div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
					{Number.isFinite(onlineSummary.conversionRatePercent)
						? onlineSummary.conversionRatePercent.toFixed(1)
						: "0.0"}%
				</div>
				<p className="text-xs text-[var(--muted)] m-0">
					{onlineSummary.totalBookings} записей с {onlineSummary.totalViews} просмотров
				</p>
			</div>

			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
				<div className="flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Доходимость (Явка)</span>
					<UserCheck size={16} className="text-blue-500" />
				</div>
				<div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
					{Number.isFinite(onlineSummary.attendanceRatePercent)
						? onlineSummary.attendanceRatePercent.toFixed(1)
						: "0.0"}%
				</div>
				<p className="text-xs text-[var(--muted)] m-0">
					Неявка: {Number.isFinite(onlineSummary.noShowRatePercent)
						? onlineSummary.noShowRatePercent.toFixed(1)
						: "0.0"}% ({onlineSummary.totalNoShow} чел.)
				</p>
			</div>

			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
				<div className="flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Выручка от самозаписи</span>
					<DollarSign size={16} className="text-[var(--teal)]" />
				</div>
				<div className="text-2xl font-extrabold text-[var(--ink)]">
					{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
				</div>
				<p className="text-xs text-[var(--muted)] m-0">
					Ср. чек: {formatKopecksRu(onlineSummary.avgCheckKopecks)} · ROMI:{" "}
					{onlineSummary.romiPercent !== null
						? onlineSummary.romiPercent > 0
							? `+${onlineSummary.romiPercent}%`
							: `${onlineSummary.romiPercent}%`
						: "—"}
				</p>
			</div>
		</div>
	);
}
