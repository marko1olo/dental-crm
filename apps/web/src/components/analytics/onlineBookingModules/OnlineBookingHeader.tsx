import React from "react";
import { Bot } from "lucide-react";
import type { OnlineBookingPeriod } from "./onlineBookingTypes";

interface OnlineBookingHeaderProps {
	readonly period: OnlineBookingPeriod;
	readonly onPeriodChange: (p: OnlineBookingPeriod) => void;
}

const PERIOD_OPTIONS: readonly { key: OnlineBookingPeriod; label: string }[] = [
	{ key: "7d", label: "7 дней" },
	{ key: "30d", label: "30 дней" },
	{ key: "90d", label: "Квартал" },
	{ key: "all", label: "Все время" },
];

export function OnlineBookingHeader({
	period,
	onPeriodChange,
}: OnlineBookingHeaderProps) {
	return (
		<div className="online-header-compact">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-[var(--teal)] flex items-center justify-center shrink-0">
					<Bot size={18} aria-hidden="true" />
				</div>
				<div className="min-w-0 flex flex-col justify-center">
					<h3 className="text-sm font-bold text-[var(--ink)] m-0 leading-tight truncate">
						Сквозная аналитика: Онлайн-записи vs Администраторы
					</h3>
					<p
						className="text-xs text-[var(--muted)] m-0 leading-tight truncate hidden md:block"
						title="Выделение автоматических каналов самозаписи из воронки АТС"
					>
						Выделение автоматических каналов самозаписи (Сайт, Карты, 2ГИС, ПроДокторов, Боты) из воронки АТС
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<div className="online-period-toggle" role="group" aria-label="Период отчета">
					{PERIOD_OPTIONS.map((p) => (
						<button
							key={p.key}
							type="button"
							onClick={() => onPeriodChange(p.key)}
							className={`online-period-btn ${period === p.key ? "active" : ""}`}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
