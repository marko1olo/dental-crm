/**
 * Пошаговая воронка конверсии виджета онлайн-записи (6 этапов).
 */

import { formatKopecksRu, type Kopecks } from "@dental/shared";
import React from "react";

export interface OnlineBookingFunnelViewProps {
	readonly onlineSummary: {
		readonly totalViews: number;
		readonly totalSlotSelected: number;
		readonly totalBookings: number;
		readonly totalAttended: number;
		readonly totalPaid: number;
		readonly totalRevenueKopecks: number;
		readonly avgCheckKopecks: number;
	};
}

export function OnlineBookingFunnelView({
	onlineSummary,
}: OnlineBookingFunnelViewProps) {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
			<h4 className="text-sm font-bold text-[var(--ink)] m-0">
				6 этапов конверсии онлайн-записи (от показа до кассового чека)
			</h4>

			{onlineSummary.totalViews === 0 && (
				<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] text-center">
					За выбранный период нет переходов в виджет самозаписи. Данные конверсии обновятся автоматически при первом обращении пациента.
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-6 gap-2">
				{[
					{
						step: "1. Просмотры",
						count: onlineSummary.totalViews,
						label: "Открытий виджета",
						dropoff:
							onlineSummary.totalViews > 0
								? `${((onlineSummary.totalSlotSelected / onlineSummary.totalViews) * 100).toFixed(0)}% перешли`
								: "0% перешли",
						color: "bg-[var(--paper-soft)] text-[var(--ink)]",
					},
					{
						step: "2. Выбор слота",
						count: onlineSummary.totalSlotSelected,
						label: "Выбрали время",
						dropoff:
							onlineSummary.totalSlotSelected > 0
								? `${((onlineSummary.totalBookings / onlineSummary.totalSlotSelected) * 100).toFixed(0)}% ввели контакты`
								: "0% ввели контакты",
						color: "bg-[var(--paper-soft)] text-[var(--ink)]",
					},
					{
						step: "3. Бронь создана",
						count: onlineSummary.totalBookings,
						label: "Подтверждено СМС",
						dropoff:
							onlineSummary.totalBookings > 0
								? `${((onlineSummary.totalAttended / onlineSummary.totalBookings) * 100).toFixed(0)}% явились`
								: "0% явились",
						color: "bg-[var(--paper-soft)] text-[var(--ink)]",
					},
					{
						step: "4. Явка в клинику",
						count: onlineSummary.totalAttended,
						label: "Сели в кресло",
						dropoff:
							onlineSummary.totalAttended > 0
								? `${((onlineSummary.totalPaid / onlineSummary.totalAttended) * 100).toFixed(0)}% оплатили`
								: "0% оплатили",
						color: "bg-[var(--paper-soft)] text-[var(--ink)]",
					},
					{
						step: "5. Оплата лечения",
						count: onlineSummary.totalPaid,
						label: "Оплачено в кассе",
						dropoff: "100% конверсия",
						color: "bg-[var(--paper-soft)] text-[var(--ink)]",
					},
					{
						step: "6. Выручка",
						count: formatKopecksRu(onlineSummary.totalRevenueKopecks || (0 as Kopecks)),
						label: "Итоговая выручка",
						dropoff: `Ср. чек ${formatKopecksRu(onlineSummary.avgCheckKopecks || (0 as Kopecks))}`,
						color: "bg-[var(--teal)]/10 text-[var(--teal)] font-bold border-[var(--teal)]/30",
					},
				].map((item) => (
					<div
						key={item.step}
						className={`p-2.5 rounded-lg border border-[var(--line)] space-y-1 ${item.color}`}
					>
						<span className="text-xs font-bold block">{item.step}</span>
						<div className="text-lg font-extrabold">{item.count}</div>
						<span className="text-xs text-[var(--muted)] block truncate" title={item.label}>
							{item.label}
						</span>
						<span className="text-xs font-semibold text-[var(--teal)] block mt-0.5 truncate" title={item.dropoff}>
							{item.dropoff}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
