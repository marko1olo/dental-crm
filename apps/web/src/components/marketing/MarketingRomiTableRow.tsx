/**
 * DENTE Dental CRM — Marketing ROMI Table Row.
 */

import React from "react";
import { Trash2 } from "lucide-react";
import type { AdvertisingChannelMetric } from "@dental/shared";

export type RomiFieldKey = "spentRub" | "leads" | "patients" | "revenueRub" | "repeatVisits";

export interface MarketingRomiTableRowProps {
	readonly metric: AdvertisingChannelMetric;
	readonly getInputValue: (
		channelId: string,
		field: RomiFieldKey,
		defaultValue: string,
	) => string;
	readonly onInputChange: (
		channelId: string,
		field: RomiFieldKey,
		rawValue: string,
	) => void;
	readonly onInputBlur: (channelId: string, field: RomiFieldKey) => void;
	readonly onRemoveChannel: (channelId: string) => void;
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

	const badgeClass =
		metric.romiStatus === "organic"
			? "organic"
			: metric.romiStatus === "super_profitable" || metric.romiStatus === "profitable"
				? "positive"
				: metric.romiStatus === "loss"
					? "negative"
					: "neutral";

	return (
		<tr className="romi-row" data-testid={`romi-row-${metric.id}`}>
			{/* Channel info */}
			<td className="romi-cell-channel">
				<div className="romi-channel-info">
					<strong className="romi-channel-name">{metric.nameRu}</strong>
					<span className="romi-channel-badge">{metric.categoryRu}</span>
				</div>
			</td>

			{/* Spend (editable) */}
			<td className="romi-cell-num">
				<div className="romi-cell-input-wrapper">
					<input
						type="number"
						min="0"
						step="500"
						value={getInputValue(metric.id, "spentRub", spentRub)}
						onChange={(e) => onInputChange(metric.id, "spentRub", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "spentRub")}
						aria-label={`Затраты на ${metric.nameRu}`}
						className="romi-table-input text-right"
					/>
				</div>
			</td>

			{/* Leads (editable) */}
			<td className="romi-cell-num">
				<div className="romi-cell-input-wrapper">
					<input
						type="number"
						min="0"
						step="1"
						value={getInputValue(metric.id, "leads", metric.leadsCount.toString())}
						onChange={(e) => onInputChange(metric.id, "leads", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "leads")}
						aria-label={`Лиды ${metric.nameRu}`}
						className="romi-table-input text-center"
					/>
				</div>
			</td>

			{/* Show-up rate (calculated) */}
			<td className="romi-cell-center font-bold text-[var(--teal-dark)]">
				{metric.showUpRatePercent}%
			</td>

			{/* Primary patients (editable) */}
			<td className="romi-cell-num">
				<div className="romi-cell-input-wrapper">
					<input
						type="number"
						min="0"
						step="1"
						value={getInputValue(
							metric.id,
							"patients",
							metric.primaryPatientsCount.toString(),
						)}
						onChange={(e) => onInputChange(metric.id, "patients", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "patients")}
						aria-label={`Первичные ${metric.nameRu}`}
						className="romi-table-input text-center"
					/>
				</div>
			</td>

			{/* Primary revenue (editable) */}
			<td className="romi-cell-num">
				<div className="romi-cell-input-wrapper">
					<input
						type="number"
						min="0"
						step="1000"
						value={getInputValue(metric.id, "revenueRub", revenueRub)}
						onChange={(e) => onInputChange(metric.id, "revenueRub", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "revenueRub")}
						aria-label={`Выручка ${metric.nameRu}`}
						className="romi-table-input text-right"
					/>
				</div>
			</td>

			{/* Average check (calculated) */}
			<td className="romi-cell-num text-right font-medium">
				{metric.averageCheckFormatted}
			</td>

			{/* Repeat visits (editable) */}
			<td className="romi-cell-num">
				<div className="romi-cell-input-wrapper">
					<input
						type="number"
						min="0"
						step="1"
						value={getInputValue(
							metric.id,
							"repeatVisits",
							metric.repeatVisitsCount.toString(),
						)}
						onChange={(e) =>
							onInputChange(metric.id, "repeatVisits", e.target.value)
						}
						onBlur={() => onInputBlur(metric.id, "repeatVisits")}
						aria-label={`Повторные визиты ${metric.nameRu}`}
						className="romi-table-input text-center"
					/>
				</div>
			</td>

			{/* Repeat rate % */}
			<td className="romi-cell-center text-[var(--muted)]">
				{metric.repeatRatePercent}%
			</td>

			{/* LTV revenue (calculated) */}
			<td className="romi-cell-num text-right font-semibold text-[var(--teal-dark)]">
				{metric.ltvFormatted}
			</td>

			{/* ROMI badge */}
			<td className="romi-cell-center">
				<span className={`romi-badge ${badgeClass}`}>
					{metric.romiFormatted}
				</span>
			</td>

			{/* CAC */}
			<td className="romi-cell-num text-right font-medium text-[var(--muted)]">
				{metric.cacFormatted}
			</td>

			{/* Delete action */}
			<td className="romi-cell-center">
				<button
					type="button"
					onClick={() => onRemoveChannel(metric.id)}
					className="romi-delete-btn"
					title={`Удалить канал ${metric.nameRu}`}
					aria-label={`Удалить канал ${metric.nameRu}`}
				>
					<Trash2 className="w-4 h-4" aria-hidden="true" />
				</button>
			</td>
		</tr>
	);
}
