/**
 * MarketingSourceCard.tsx
 * Honest acquisition source card with closed 54-FZ receipt revenue.
 * Governed by Mandate 8b (Strict <= 120 lines), Apple HIG >= 44px.
 */

import React from "react";
import { Users, CreditCard, TrendingUp, Sparkles } from "lucide-react";
import type { AdvertisingChannelMetric } from "@dental/shared";

export interface MarketingSourceCardProps {
	readonly metric: AdvertisingChannelMetric;
}

export function MarketingSourceCard({ metric }: MarketingSourceCardProps) {
	const revRub = Math.round(metric.revenueKopecks / 100).toLocaleString("ru-RU");
	const spentRub = Math.round(metric.spentKopecks / 100).toLocaleString("ru-RU");

	const badgeCls =
		metric.romiStatus === "organic"
			? "organic bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
			: metric.romiStatus === "super_profitable" || metric.romiStatus === "profitable"
				? "positive bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
				: metric.romiStatus === "loss"
					? "negative bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
					: "neutral bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

	return (
		<div className="marketing-source-card" data-testid={`source-card-${metric.id}`}>
			<div className="marketing-source-card-header">
				<div>
					<h3 className="marketing-source-card-title m-0">{metric.nameRu}</h3>
					<span className="text-[11px] text-[var(--muted)]">{metric.categoryRu}</span>
				</div>
				<span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border border-current/20 ${badgeCls}`}>
					{metric.romiStatus === "organic" ? "Органика" : `ROMI ${metric.romiFormatted}`}
				</span>
			</div>

			<div className="my-1">
				<span className="text-[10.5px] uppercase font-bold text-[var(--muted)] block">Выручка по чекам 54-ФЗ</span>
				<strong className="marketing-source-card-revenue">{revRub} ₽</strong>
			</div>

			<div className="marketing-source-card-metrics pt-2 border-t border-[var(--line)]">
				<div className="flex items-center gap-1.5">
					<Users size={13} className="text-[var(--primary)] shrink-0" />
					<span>Первичных: <strong>{metric.primaryPatientsCount} чел.</strong></span>
				</div>
				<div className="flex items-center gap-1.5">
					<CreditCard size={13} className="text-[var(--muted)] shrink-0" />
					<span>Ср. чек: <strong>{metric.averageCheckFormatted}</strong></span>
				</div>
				<div className="flex items-center gap-1.5">
					<TrendingUp size={13} className="text-[var(--muted)] shrink-0" />
					<span>Потрачено: <strong>{spentRub} ₽</strong></span>
				</div>
				<div className="flex items-center gap-1.5">
					<Sparkles size={13} className="text-[var(--muted)] shrink-0" />
					<span>CAC: <strong>{metric.cacFormatted}</strong></span>
				</div>
			</div>
		</div>
	);
}
