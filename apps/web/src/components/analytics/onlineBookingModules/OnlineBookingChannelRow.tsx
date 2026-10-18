import React from "react";
import { formatKopecksRu } from "@dental/shared";
import type { SelfBookingChannelMetric } from "./onlineBookingTypes";
import { OnlineBookingChannelIcon } from "./OnlineBookingChannelIcon";

interface ChannelRowProps {
	readonly channel: SelfBookingChannelMetric;
}

export function OnlineBookingChannelRow({ channel }: ChannelRowProps) {
	const convPercent =
		channel.viewsCount > 0
			? (channel.bookingsCount / channel.viewsCount) * 100
			: 0;
	const attendPercent =
		channel.bookingsCount > 0
			? (channel.attendedCount / channel.bookingsCount) * 100
			: 0;
	const profit = channel.revenueKopecks - channel.spentKopecks;
	const romi =
		channel.spentKopecks > 0
			? Math.round((profit / channel.spentKopecks) * 100)
			: 0;

	return (
		<tr className="hover:bg-[var(--paper-soft)]/50 transition-colors">
			<td className="py-2.5 px-3 max-w-[240px]">
				<div className="flex items-center gap-2 font-bold text-[var(--ink)] min-w-0">
					<OnlineBookingChannelIcon type={channel.iconType} />
					<span className="truncate" title={channel.nameRu}>
						{channel.nameRu}
					</span>
				</div>
			</td>
			<td className="py-2.5 px-3 text-[var(--muted)] max-w-[140px] truncate" title={channel.categoryRu}>
				{channel.categoryRu}
			</td>
			<td className="py-2.5 px-3 text-right font-medium text-[var(--ink)]">
				{channel.viewsCount.toLocaleString("ru-RU")}
			</td>
			<td className="py-2.5 px-3 text-right font-bold text-[var(--teal)]">
				{channel.bookingsCount}
			</td>
			<td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
				{convPercent.toFixed(1)}%
			</td>
			<td className="py-2.5 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
				{channel.attendedCount}{" "}
				<span className="text-xs text-[var(--muted)]">
					({attendPercent.toFixed(0)}%)
				</span>
			</td>
			<td className="py-2.5 px-3 text-right font-medium text-rose-500">
				{channel.noShowCount}
			</td>
			<td className="py-2.5 px-3 text-right font-bold text-[var(--ink)]">
				{formatKopecksRu(channel.revenueKopecks)}
			</td>
			<td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
				{channel.spentKopecks > 0 ? (romi > 0 ? `+${romi}%` : `${romi}%`) : "—"}
			</td>
		</tr>
	);
}
