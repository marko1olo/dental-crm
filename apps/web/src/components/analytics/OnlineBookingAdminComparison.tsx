/**
 * Сравнение онлайн-самозаписи и телефонной воронки администраторов.
 */

import { formatKopecksRu, type Kopecks } from "@dental/shared";
import { Bot, PhoneCall } from "lucide-react";
import React from "react";
import type { AdminPhoneFunnelMetric } from "./OnlineBookingConversionPanel";

export interface OnlineBookingAdminComparisonProps {
	readonly comparison: {
		readonly onlineBookings: number;
		readonly adminBookings: number;
		readonly grandTotalBookings: number;
		readonly onlineSharePercent: number;
		readonly adminSharePercent: number;
		readonly onlineAttendancePercent: number;
		readonly adminAttendancePercent: number;
		readonly savedHours: number;
	};
	readonly onlineSummary: {
		readonly totalBookings: number;
		readonly totalAttended: number;
		readonly totalNoShow: number;
		readonly noShowRatePercent: number;
		readonly totalRevenueKopecks: number;
		readonly avgCheckKopecks: number;
	};
	readonly adminFunnel: AdminPhoneFunnelMetric;
}

export function OnlineBookingAdminComparison({
	comparison,
	onlineSummary,
	adminFunnel,
}: OnlineBookingAdminComparisonProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			{/* Online Self-Booking Card */}
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
						<span className="text-[var(--muted)]">
							Всего создано записей:
						</span>
						<span className="font-bold text-[var(--ink)]">
							{onlineSummary.totalBookings} записей
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Доходимость (Явка):</span>
						<span className="font-bold text-blue-600 dark:text-blue-400">
							{comparison.onlineAttendancePercent}% (
							{onlineSummary.totalAttended} чел.)
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Неявка (No-show):</span>
						<span className="font-bold text-rose-500">
							{Number.isFinite(onlineSummary.noShowRatePercent) ? onlineSummary.noShowRatePercent.toFixed(1) : "0.0"}% (
							{onlineSummary.totalNoShow} чел.)
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">
							Выручка от пациентов:
						</span>
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
						<span className="text-[var(--muted)]">
							Человеко-часов сэкономлено:
						</span>
						<span className="font-bold text-emerald-600 dark:text-emerald-400">
							~{comparison.savedHours} часов работы
						</span>
					</div>
				</div>
			</div>

			{/* Admin Phone Telephony Card */}
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
							<PhoneCall size={18} />
						</div>
						<div>
							<h4 className="text-sm font-bold text-[var(--ink)] m-0">
								Регистратура (АТС / Звонки)
							</h4>
							<p className="text-xs text-[var(--muted)] m-0">
								Входящие звонки, обработанные администраторами
							</p>
						</div>
					</div>
					<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
						{comparison.adminSharePercent}% потока
					</span>
				</div>

				<div className="space-y-1.5 text-xs">
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Входящих звонков:</span>
						<span className="font-bold text-[var(--ink)]">
							{adminFunnel.incomingCallsCount} (принято {adminFunnel.answeredCallsCount})
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Записей на прием:</span>
						<span className="font-bold text-[var(--ink)]">
							{adminFunnel.bookedAppointmentsCount} записей
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Доходимость (Явка):</span>
						<span className="font-bold text-blue-600 dark:text-blue-400">
							{comparison.adminAttendancePercent}% (
							{adminFunnel.attendedCount} чел.)
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Выручка от звонков:</span>
						<span className="font-bold text-[var(--ink)]">
							{formatKopecksRu(adminFunnel.revenueKopecks || (0 as Kopecks))}
						</span>
					</div>
					<div className="flex justify-between py-1.5 border-b border-[var(--line)]">
						<span className="text-[var(--muted)]">Ср. длительность разговора:</span>
						<span className="font-bold text-[var(--ink)]">
							{Math.round(adminFunnel.avgCallDurationSeconds / 60)} мин {adminFunnel.avgCallDurationSeconds % 60} сек
						</span>
					</div>
					<div className="flex justify-between py-1.5">
						<span className="text-[var(--muted)]">Конверсия звонок → запись:</span>
						<span className="font-bold text-emerald-600 dark:text-emerald-400">
							{adminFunnel.incomingCallsCount > 0
								? Math.round(
										(adminFunnel.bookedAppointmentsCount /
											adminFunnel.incomingCallsCount) *
											100,
									)
								: 0}
							%
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
