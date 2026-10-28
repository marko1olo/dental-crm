/**
 * MarketingSourcesCardsGrid.tsx
 * Grid of honest acquisition sources («Откуда узнали») with real 54-FZ revenue.
 * Governed by Mandate 8b (Strict <= 120 lines), Mandate 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { Compass, RefreshCw } from "lucide-react";
import type { AdvertisingChannelMetric } from "@dental/shared";
import { MarketingSourceCard } from "./MarketingSourceCard";

export interface MarketingSourcesCardsGridProps {
	readonly metrics: readonly AdvertisingChannelMetric[];
	readonly onSyncWithCrm?: () => void;
}

export function MarketingSourcesCardsGrid({ metrics, onSyncWithCrm }: MarketingSourcesCardsGridProps) {
	return (
		<div className="flex flex-col gap-3 w-full" data-testid="marketing-sources-grid-section">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Compass size={16} className="text-[var(--primary)]" />
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">
						Источники первичных пациентов («Откуда узнали»)
					</h3>
				</div>
				{onSyncWithCrm && (
					<button
						type="button"
						onClick={onSyncWithCrm}
						className="secondary-button h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
						title="Пересчитать выручку по кассовым чекам"
					>
						<RefreshCw size={12} />
						<span>Сверить с кассовыми чеками</span>
					</button>
				)}
			</div>

			<div className="marketing-source-cards-grid">
				{metrics.map((m) => (
					<MarketingSourceCard key={m.id} metric={m} />
				))}
			</div>
		</div>
	);
}
