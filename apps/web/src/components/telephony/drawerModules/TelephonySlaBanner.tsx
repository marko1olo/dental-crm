import { CheckCircle2, Clock, PhoneMissed } from "lucide-react";
import React from "react";
import {
	type MissedCallsSlaSummary,
	formatDurationTimer,
} from "../../../store/telephonyStore";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export interface TelephonySlaBannerProps {
	slaSummary: MissedCallsSlaSummary;
	activeFilter: TelephonyCallLogFilter;
	onFilterChange: (filter: TelephonyCallLogFilter) => void;
}

export function TelephonySlaBanner({
	slaSummary,
	activeFilter,
	onFilterChange,
}: TelephonySlaBannerProps): React.JSX.Element {
	const hasUnhandled = slaSummary.totalUnhandledCount > 0;
	const hasOverdue = slaSummary.overdueCount > 0;

	return (
		<div
			className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
				hasUnhandled
					? hasOverdue
						? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60"
						: "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/50"
					: "bg-[var(--paper-soft)] border-[var(--line)]"
			}`}
			data-testid="telephony-sla-status-banner"
		>
			<div className="flex items-center gap-2.5 min-w-0">
				<div
					className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
						hasUnhandled
							? hasOverdue
								? "bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300"
								: "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
							: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--teal)]"
					}`}
				>
					{hasUnhandled ? <PhoneMissed size={15} /> : <CheckCircle2 size={15} />}
				</div>
				<div className="min-w-0">
					<div className="text-xs font-bold text-[var(--ink)] truncate">
						{hasUnhandled
							? `Ждут перезвона: ${slaSummary.totalUnhandledCount}`
							: "Пропущенных без ответа нет"}
					</div>
					<div className="text-[11px] text-[var(--muted)] truncate">
						{hasUnhandled
							? hasOverdue
								? `Нарушен SLA 15 мин: ${slaSummary.overdueCount} вызов(а)`
								: "Регламент клиники: перезвон за 15 минут"
							: "Все входящие обращения обработаны"}
					</div>
				</div>
			</div>

			{hasUnhandled && (
				<button
					type="button"
					onClick={() =>
						onFilterChange(
							activeFilter === "missed_unhandled" ? "all" : "missed_unhandled",
						)
					}
					className="shrink-0 min-h-[34px] px-2.5 py-1 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
					data-testid="telephony-sla-countdown-chip"
					title="Отфильтровать необработанные звонки по SLA 15 минут"
				>
					<Clock size={12} className="text-[var(--teal)] shrink-0" />
					<span className="font-mono">
						{slaSummary.nearestRemainingSeconds !== null
							? `SLA ${formatDurationTimer(slaSummary.nearestRemainingSeconds)}`
							: "SLA < 00:00"}
					</span>
				</button>
			)}
		</div>
	);
}
