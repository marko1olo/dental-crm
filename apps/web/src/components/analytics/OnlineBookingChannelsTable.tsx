/**
 * Таблица эффективности каналов автоматической самозаписи.
 */

import { formatKopecksRu } from "@dental/shared";
import { Activity, Globe, MapPin, MessageSquare, Send } from "lucide-react";
import React from "react";
import type {
	SelfBookingChannelMetric,
} from "./OnlineBookingConversionPanel";

export interface OnlineBookingChannelsTableProps {
	readonly channels: readonly SelfBookingChannelMetric[];
	readonly selectedChannelKey: string;
	readonly onSelectChannelKey: (key: string) => void;
	readonly savedHours: number;
	readonly onlineSummary: {
		readonly totalViews: number;
		readonly totalBookings: number;
		readonly conversionRatePercent: number;
		readonly totalAttended: number;
		readonly attendanceRatePercent: number;
		readonly totalNoShow: number;
		readonly totalRevenueKopecks: number;
		readonly romiPercent: number | null;
	};
}

export function OnlineBookingChannelsTable({
	channels,
	selectedChannelKey,
	onSelectChannelKey,
	savedHours,
	onlineSummary,
}: OnlineBookingChannelsTableProps) {
	const renderIcon = (type: SelfBookingChannelMetric["iconType"]) => {
		switch (type) {
			case "globe":
				return <Globe size={16} className="text-blue-500" />;
			case "yandex":
				return <MapPin size={16} className="text-red-500" />;
			case "gis":
				return <MapPin size={16} className="text-emerald-500" />;
			case "prodoc":
				return <Activity size={16} className="text-indigo-500" />;
			case "tg":
				return <Send size={16} className="text-sky-500" />;
			case "wa":
				return <MessageSquare size={16} className="text-teal-500" />;
			default:
				return <Globe size={16} className="text-[var(--teal)]" />;
		}
	};

	return (
		<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<h4 className="text-sm font-bold text-[var(--ink)] m-0">
						Эффективность каналов автоматической самозаписи
					</h4>
					{channels.length > 0 && (
						<select
							aria-label="Фильтр по каналу записи"
							value={selectedChannelKey}
							onChange={(e) => onSelectChannelKey(e.target.value)}
							className="h-7 text-xs rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] px-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
						>
							<option value="all">Все каналы ({channels.length})</option>
							{channels.map((ch) => (
								<option key={ch.key} value={ch.key}>
									{ch.nameRu}
								</option>
							))}
						</select>
					)}
				</div>
				<div className="text-xs text-[var(--muted)]">
					Сэкономлено времени администраторов:{" "}
					<span className="font-bold text-[var(--teal)]">
						{savedHours} ч.
					</span>
				</div>
			</div>

			{channels.length === 0 ? (
				<div className="text-center py-8 px-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
					<Globe size={32} className="mx-auto text-[var(--muted)] mb-2 opacity-50" aria-hidden="true" />
					<div className="text-sm font-semibold text-[var(--ink)]">Нет подключенных каналов онлайн-самозаписи</div>
					<p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
						Подключите виджет самозаписи на сайт клиники, настройте кнопки в Яндекс Картах, 2ГИС или чат-ботах Telegram/WhatsApp для автоматического привлечения пациентов.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] text-[var(--muted)] font-semibold">
								<th className="py-2.5 px-3">Канал самозаписи</th>
								<th className="py-2.5 px-3">Категория</th>
								<th className="py-2.5 px-3 text-right">Просмотры</th>
								<th className="py-2.5 px-3 text-right">Записи</th>
								<th className="py-2.5 px-3 text-right">Конверсия</th>
								<th className="py-2.5 px-3 text-right">Явка (чел / %)</th>
								<th className="py-2.5 px-3 text-right">Неявки</th>
								<th className="py-2.5 px-3 text-right">Выручка (₽)</th>
								<th className="py-2.5 px-3 text-right">ROMI</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{channels.map((ch) => {
								const convPercent =
									ch.viewsCount > 0
										? (ch.bookingsCount / ch.viewsCount) * 100
										: 0;
								const attendPercent =
									ch.bookingsCount > 0
										? (ch.attendedCount / ch.bookingsCount) * 100
										: 0;
								const profit = ch.revenueKopecks - ch.spentKopecks;
								const romi =
									ch.spentKopecks > 0
										? Math.round((profit / ch.spentKopecks) * 100)
										: 0;

								return (
									<tr
										key={ch.key}
										className="hover:bg-[var(--paper-soft)]/50 transition-colors"
									>
										<td className="py-2.5 px-3 max-w-[240px]">
											<div className="flex items-center gap-2 font-bold text-[var(--ink)] min-w-0">
												{renderIcon(ch.iconType)}
												<span className="truncate" title={ch.nameRu}>{ch.nameRu}</span>
											</div>
										</td>
										<td className="py-2.5 px-3 text-[var(--muted)] max-w-[140px] truncate" title={ch.categoryRu}>
											{ch.categoryRu}
										</td>
										<td className="py-2.5 px-3 text-right font-medium text-[var(--ink)]">
											{ch.viewsCount.toLocaleString("ru-RU")}
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-[var(--teal)]">
											{ch.bookingsCount}
										</td>
										<td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
											{convPercent.toFixed(1)}%
										</td>
										<td className="py-2.5 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
											{ch.attendedCount}{" "}
											<span className="text-xs text-[var(--muted)]">
												({attendPercent.toFixed(0)}%)
											</span>
										</td>
										<td className="py-2.5 px-3 text-right font-medium text-rose-500">
											{ch.noShowCount}
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-[var(--ink)]">
											{formatKopecksRu(ch.revenueKopecks)}
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
											{ch.spentKopecks > 0 ? (romi > 0 ? `+${romi}%` : `${romi}%`) : "—"}
										</td>
									</tr>
								);
							})}
						</tbody>
						<tfoot>
							<tr className="border-t-2 border-[var(--line)] bg-[var(--paper-soft)]/40 font-bold text-[var(--ink)]">
								<td className="py-2.5 px-3" colSpan={2}>
									ИТОГО ПО САМОЗАПИСИ:
								</td>
								<td className="py-2.5 px-3 text-right">
									{onlineSummary.totalViews.toLocaleString("ru-RU")}
								</td>
								<td className="py-2.5 px-3 text-right text-[var(--teal)]">
									{onlineSummary.totalBookings}
								</td>
								<td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
									{onlineSummary.conversionRatePercent.toFixed(1)}%
								</td>
								<td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">
									{onlineSummary.totalAttended} (
									{onlineSummary.attendanceRatePercent.toFixed(0)}%)
								</td>
								<td className="py-2.5 px-3 text-right text-rose-500">
									{onlineSummary.totalNoShow}
								</td>
								<td className="py-2.5 px-3 text-right text-[var(--teal)]">
									{formatKopecksRu(onlineSummary.totalRevenueKopecks)}
								</td>
								<td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
									{onlineSummary.romiPercent !== null
										? onlineSummary.romiPercent > 0
											? `+${onlineSummary.romiPercent}%`
											: `${onlineSummary.romiPercent}%`
										: "—"}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}
		</div>
	);
}
