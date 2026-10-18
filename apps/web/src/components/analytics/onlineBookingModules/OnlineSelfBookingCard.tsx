import React from "react";
import { Bot } from "lucide-react";
import { formatKopecksRu, type Kopecks } from "@dental/shared";
import type {
	OnlineBookingComparisonData,
	OnlineBookingSummary,
} from "./onlineBookingTypes";

interface OnlineSelfBookingCardProps {
	readonly comparison: OnlineBookingComparisonData;
	readonly onlineSummary: OnlineBookingSummary;
}

export function OnlineSelfBookingCard({
	comparison,
	onlineSummary,
}: OnlineSelfBookingCardProps) {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper)] border border-teal-500/30 space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-teal-500/10 text-[var(--teal)]">
						<Bot size={18} />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Онлайн-самозапись (Авто)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0">
							Виджет сайта, Яндекс Карты, 2ГИС, Telegram
						</p>
					</div>
				</div>
				<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-[var(--teal)]">
					{comparison.onlineSharePercent}% потока
				</span>
			</div>

			<div className="space-y-1.5 text-xs">
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Всего создано записей:</span>
					<span className="font-bold text-[var(--ink)]">{onlineSummary.totalBookings} записей</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Доходимость (Явка):</span>
					<span className="font-bold text-blue-600 dark:text-blue-400">
						{comparison.onlineAttendancePercent}% ({onlineSummary.totalAttended} чел.)
					</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Неявка (No-show):</span>
					<span className="font-bold text-rose-500">
						{Number.isFinite(onlineSummary.noShowRatePercent) ? onlineSummary.noShowRatePercent.toFixed(1) : "0.0"}% ({onlineSummary.totalNoShow} чел.)
					</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Выручка от пациентов:</span>
					<span className="font-bold text-[var(--teal)]">
						{formatKopecksRu(onlineSummary.totalRevenueKopecks || (0 as Kopecks))}
					</span>
				</div>
				<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Средний чек:</span>
					<span className="font-bold text-[var(--ink)]">
						{formatKopecksRu(onlineSummary.avgCheckKopecks || (0 as Kopecks))}
					</span>
				</div>
				<div className="flex justify-between py-1.5">
					<span className="text-[var(--muted)]">Человеко-часов сэкономлено:</span>
					<span className="font-bold text-emerald-600 dark:text-emerald-400">
						~{comparison.savedHours} часов работы
					</span>
				</div>
			</div>
		</div>
	);
}
