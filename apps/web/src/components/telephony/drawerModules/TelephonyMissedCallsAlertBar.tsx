import { CheckCircle2, Clock, PhoneMissed } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
	type CallHistoryItem,
	computeMissedCallsSlaSummary,
	formatDurationTimer,
} from "../../../store/telephonyStore";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export interface TelephonyMissedCallsAlertBarProps {
	callHistory: CallHistoryItem[];
	activeFilter: TelephonyCallLogFilter;
	onFilterChange: (filter: TelephonyCallLogFilter) => void;
}

export function TelephonyMissedCallsAlertBar({
	callHistory,
	activeFilter,
	onFilterChange,
}: TelephonyMissedCallsAlertBarProps): React.JSX.Element {
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			setNowMs(Date.now());
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	const slaSummary = useMemo(
		() => computeMissedCallsSlaSummary(callHistory, nowMs),
		[callHistory, nowMs],
	);

	const recordedCount = useMemo(
		() => callHistory.filter((c) => Boolean(c.recordingUrl)).length,
		[callHistory],
	);

	const hasUnhandled = slaSummary.totalUnhandledCount > 0;
	const hasOverdue = slaSummary.overdueCount > 0;

	return (
		<div
			className="space-y-2.5"
			data-testid="telephony-missed-calls-alert-bar"
		>
			{/* SLA 15-Minute Callback Status Banner */}
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
						{hasUnhandled ? (
							<PhoneMissed size={15} />
						) : (
							<CheckCircle2 size={15} />
						)}
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
								activeFilter === "missed_unhandled"
									? "all"
									: "missed_unhandled",
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

			{/* Single-Row Filter Bar (Hick's Law: strictly 3 clean filter buttons) */}
			<div
				className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
				role="tablist"
				aria-label="Фильтр журнала звонков"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeFilter === "all"}
					onClick={() => onFilterChange("all")}
					className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeFilter === "all"
							? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="call-log-filter-all"
				>
					<span>Все</span>
					<span className="font-mono text-[10px] opacity-80">
						({callHistory.length})
					</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeFilter === "missed_unhandled"}
					onClick={() => onFilterChange("missed_unhandled")}
					className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeFilter === "missed_unhandled"
							? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="call-log-filter-missed"
				>
					<span>Пропущенные</span>
					<span className="font-mono text-[10px] opacity-80">
						({slaSummary.totalUnhandledCount})
					</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeFilter === "recorded"}
					onClick={() => onFilterChange("recorded")}
					className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
						activeFilter === "recorded"
							? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="call-log-filter-recorded"
				>
					<span>Записи</span>
					<span className="font-mono text-[10px] opacity-80">
						({recordedCount})
					</span>
				</button>
			</div>
		</div>
	);
}
