/**
 * MarketingRomiMobileCard.tsx — Mobile Card View for Marketing ROMI Channel.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8ze (Apple HIG Touch Ergonomics >= 44px).
 */

import React from "react";
import type { AdvertisingChannelMetric } from "@dental/shared";
import type { RomiFieldKey } from "./MarketingRomiTableRow.js";

export interface MarketingRomiMobileCardProps {
	readonly metric: AdvertisingChannelMetric;
	readonly getInputValue: (id: string, field: RomiFieldKey, def: string) => string;
	readonly onInputChange: (id: string, field: RomiFieldKey, val: string) => void;
	readonly onInputBlur: (id: string, field: RomiFieldKey) => void;
	readonly onRemoveChannel: (id: string) => void;
}

export function MarketingRomiMobileCard({
	metric,
	getInputValue,
	onInputChange,
	onInputBlur,
	onRemoveChannel,
}: MarketingRomiMobileCardProps) {
	const spentVal = getInputValue(metric.id, "spentRub", (metric.spentKopecks / 100).toString());
	const patientsVal = getInputValue(metric.id, "patients", metric.primaryPatientsCount.toString());
	const revVal = getInputValue(metric.id, "revenueRub", (metric.revenueKopecks / 100).toString());

	const badgeCls =
		metric.romiStatus === "organic"
			? "organic"
			: metric.romiStatus === "super_profitable" || metric.romiStatus === "profitable"
				? "positive"
				: metric.romiStatus === "loss"
					? "negative"
					: "neutral";

	return (
		<div className="romi-mobile-card" data-testid={`romi-mobile-card-${metric.id}`}>
			<div className="romi-mobile-card-header">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="romi-mobile-card-title">{metric.nameRu}</span>
						<span className="romi-mobile-card-category">{metric.categoryRu}</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span className={`romi-badge ${badgeCls}`}>ROMI: {metric.romiFormatted}</span>
					<button
						type="button"
						onClick={() => onRemoveChannel(metric.id)}
						className="romi-delete-btn min-w-[36px] min-h-[36px] flex items-center justify-center"
						title={`Удалить ${metric.nameRu}`}
						aria-label={`Удалить ${metric.nameRu}`}
					>
						×
					</button>
				</div>
			</div>

			<div className="romi-mobile-card-grid">
				<div className="romi-mobile-field">
					<span className="romi-mobile-field-lbl">Потрачено (₽)</span>
					<input
						type="number"
						value={spentVal}
						onChange={(e) => onInputChange(metric.id, "spentRub", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "spentRub")}
						className="romi-table-input w-full min-h-[40px]"
					/>
				</div>
				<div className="romi-mobile-field">
					<span className="romi-mobile-field-lbl">Первичных (чел)</span>
					<input
						type="number"
						value={patientsVal}
						onChange={(e) => onInputChange(metric.id, "patients", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "patients")}
						className="romi-table-input w-full min-h-[40px]"
					/>
				</div>
				<div className="romi-mobile-field">
					<span className="romi-mobile-field-lbl">Выручка (₽)</span>
					<input
						type="number"
						value={revVal}
						onChange={(e) => onInputChange(metric.id, "revenueRub", e.target.value)}
						onBlur={() => onInputBlur(metric.id, "revenueRub")}
						className="romi-table-input w-full min-h-[40px]"
					/>
				</div>
				<div className="romi-mobile-field">
					<span className="romi-mobile-field-lbl">CAC / LTV</span>
					<div className="text-[12.5px] font-semibold text-[var(--ink)] pt-1.5">
						CAC: {metric.cacFormatted} <br />
						LTV: {metric.ltvFormatted}
					</div>
				</div>
			</div>
		</div>
	);
}
