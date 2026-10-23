/**
 * MarketingRomiTableRow.tsx — Table Row for Single Marketing Channel.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am (Unified Design System).
 */

import React from "react";
import { Trash2 } from "lucide-react";
import type { AdvertisingChannelMetric } from "@dental/shared";

export type RomiFieldKey = "spentRub" | "leads" | "patients" | "revenueRub" | "repeatVisits";

export interface MarketingRomiTableRowProps {
	readonly metric: AdvertisingChannelMetric;
	readonly getInputValue: (id: string, field: RomiFieldKey, def: string) => string;
	readonly onInputChange: (id: string, field: RomiFieldKey, val: string) => void;
	readonly onInputBlur: (id: string, field: RomiFieldKey) => void;
	readonly onRemoveChannel: (id: string) => void;
}

export function MarketingRomiTableRow({
	metric,
	getInputValue,
	onInputChange,
	onInputBlur,
	onRemoveChannel,
}: MarketingRomiTableRowProps) {
	const spentRub = (metric.spentKopecks / 100).toString();
	const revenueRub = (metric.revenueKopecks / 100).toString();
	const badgeCls =
		metric.romiStatus === "organic"
			? "organic"
			: metric.romiStatus === "super_profitable" || metric.romiStatus === "profitable"
				? "positive"
				: metric.romiStatus === "loss"
					? "negative"
					: "neutral";

	return (
		<tr className="romi-row" data-testid={`romi-row-${metric.id}`}>
			<td className="romi-cell-channel">
				<div className="romi-channel-info">
					<strong className="romi-channel-name">{metric.nameRu}</strong>
					<span className="romi-channel-badge">{metric.categoryRu}</span>
				</div>
			</td>
			<td className="romi-cell-num">
				<input
					type="number" min="0" step="500" value={getInputValue(metric.id, "spentRub", spentRub)}
					onChange={(e) => onInputChange(metric.id, "spentRub", e.target.value)} onBlur={() => onInputBlur(metric.id, "spentRub")}
					aria-label={`Затраты на ${metric.nameRu}`} className="romi-table-input text-right tabular-nums font-mono"
				/>
			</td>
			<td className="romi-cell-num">
				<input
					type="number" min="0" step="1" value={getInputValue(metric.id, "leads", metric.leadsCount.toString())}
					onChange={(e) => onInputChange(metric.id, "leads", e.target.value)} onBlur={() => onInputBlur(metric.id, "leads")}
					aria-label={`Лиды ${metric.nameRu}`} className="romi-table-input text-center tabular-nums font-mono"
				/>
			</td>
			<td className="romi-cell-center font-bold text-[var(--teal-dark)] tabular-nums font-mono">
				{metric.showUpRatePercent}%
			</td>
			<td className="romi-cell-num">
				<input
					type="number" min="0" step="1" value={getInputValue(metric.id, "patients", metric.primaryPatientsCount.toString())}
					onChange={(e) => onInputChange(metric.id, "patients", e.target.value)} onBlur={() => onInputBlur(metric.id, "patients")}
					aria-label={`Первичные ${metric.nameRu}`} className="romi-table-input text-center tabular-nums font-mono"
				/>
			</td>
			<td className="romi-cell-num">
				<input
					type="number" min="0" step="1000" value={getInputValue(metric.id, "revenueRub", revenueRub)}
					onChange={(e) => onInputChange(metric.id, "revenueRub", e.target.value)} onBlur={() => onInputBlur(metric.id, "revenueRub")}
					aria-label={`Выручка ${metric.nameRu}`} className="romi-table-input text-right tabular-nums font-mono"
				/>
			</td>
			<td className="romi-cell-num text-right font-medium tabular-nums font-mono">
				{metric.averageCheckFormatted}
			</td>
			<td className="romi-cell-num">
				<input
					type="number" min="0" step="1" value={getInputValue(metric.id, "repeatVisits", metric.repeatVisitsCount.toString())}
					onChange={(e) => onInputChange(metric.id, "repeatVisits", e.target.value)} onBlur={() => onInputBlur(metric.id, "repeatVisits")}
					aria-label={`Повторные ${metric.nameRu}`} className="romi-table-input text-center tabular-nums font-mono"
				/>
			</td>
			<td className="romi-cell-center text-[var(--muted)] tabular-nums font-mono">
				{metric.repeatRatePercent}%
			</td>
			<td className="romi-cell-num text-right font-semibold text-[var(--teal-dark)] tabular-nums font-mono">
				{metric.ltvFormatted}
			</td>
			<td className="romi-cell-center">
				<span className={`romi-badge ${badgeCls} tabular-nums font-mono`}>{metric.romiFormatted}</span>
			</td>
			<td className="romi-cell-num text-right font-medium text-[var(--muted)] tabular-nums font-mono">
				{metric.cacFormatted}
			</td>
			<td className="romi-cell-center">
				<button
					type="button" onClick={() => onRemoveChannel(metric.id)} className="romi-delete-btn"
					title={`Удалить канал ${metric.nameRu}`} aria-label={`Удалить канал ${metric.nameRu}`}
				>
					<Trash2 className="w-4 h-4" aria-hidden="true" />
				</button>
			</td>
		</tr>
	);
}
