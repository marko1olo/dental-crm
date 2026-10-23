/**
 * MarketingRomiTable.tsx — Owner Marketing ROMI & Acquisition Channels Table.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am, 8ze (Touch Ergonomics, Pure Domain).
 */

import React, { useState } from "react";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { MarketingRoiModal } from "../analytics/MarketingRoiModal.js";
import { MarketingRomiKpiStrip } from "./MarketingRomiKpiStrip.js";
import { MarketingRomiAddChannelForm } from "./MarketingRomiAddChannelForm.js";
import { MarketingRomiEmptyState } from "./MarketingRomiEmptyState.js";
import { MarketingRomiTableRow } from "./MarketingRomiTableRow.js";
import { MarketingRomiTableFooter } from "./MarketingRomiTableFooter.js";
import { MarketingRomiMobileCard } from "./MarketingRomiMobileCard.js";
import { MarketingRomiTableHeader } from "./MarketingRomiTableHeader.js";
import { useMarketingRomiChannels } from "./useMarketingRomiChannels.js";
import "./marketingRomi.css";

export function MarketingRomiTable() {
	const [isRoiModalOpen, setIsRoiModalOpen] = useState(false);
	const [isAddingChannel, setIsAddingChannel] = useState(false);
	const {
		channels,
		summary,
		calculatedMetrics,
		syncMessage,
		getInputValue,
		handleInputChange,
		handleInputBlur,
		handleSyncWithCrm,
		handleSaveNewChannel,
		handleRemoveChannel,
		handleResetDefaults,
	} = useMarketingRomiChannels();

	return (
		<section className="marketing-romi-card" aria-label="Окупаемость рекламы и каналов привлечения (ROMI)" data-testid="marketing-romi-table-section">
			<MarketingRomiTableHeader onSyncWithCrm={handleSyncWithCrm} onOpenRoiModal={() => setIsRoiModalOpen(true)} onResetDefaults={handleResetDefaults} isAddingChannel={isAddingChannel} onToggleAddChannel={() => setIsAddingChannel(!isAddingChannel)} />

			{syncMessage && (
				<div className="romi-sync-banner" data-testid="romi-sync-banner">
					<CheckCircle2 className="w-4 h-4 text-[var(--teal)] shrink-0" aria-hidden="true" />
					<span>{syncMessage}</span>
				</div>
			)}

			<MarketingRomiKpiStrip summary={summary} />

			{isAddingChannel && (
				<MarketingRomiAddChannelForm channelsCount={channels.length} onSaveChannel={(ch) => { handleSaveNewChannel(ch); setIsAddingChannel(false); }} onCancel={() => setIsAddingChannel(false)} />
			)}

			{channels.length === 0 && !isAddingChannel ? (
				<MarketingRomiEmptyState onAddChannel={() => setIsAddingChannel(true)} onSyncWithCrm={handleSyncWithCrm} onResetDefaults={handleResetDefaults} />
			) : (
				<>
					<div className="romi-table-container">
						<table className="romi-table" data-testid="romi-table">
							<thead>
								<tr>
									<th className="text-left">Канал рекламы</th>
									<th className="text-right">Потрачено (₽)</th>
									<th className="text-center">Лиды (чел)</th>
									<th className="text-center">Доходимость</th>
									<th className="text-center">Первичных</th>
									<th className="text-right">Выручка (₽)</th>
									<th className="text-right">Ср. чек (₽)</th>
									<th className="text-center">Повторных</th>
									<th className="text-center">Доля повт. (%)</th>
									<th className="text-right">LTV (₽)</th>
									<th className="text-center">ROMI (%)</th>
									<th className="text-right">CAC (₽ / чел)</th>
									<th className="text-center w-12"></th>
								</tr>
							</thead>
							<tbody>
								{calculatedMetrics.map((metric) => (
									<MarketingRomiTableRow key={metric.id} metric={metric} getInputValue={getInputValue} onInputChange={handleInputChange} onInputBlur={handleInputBlur} onRemoveChannel={handleRemoveChannel} />
								))}
							</tbody>
							<MarketingRomiTableFooter summary={summary} />
						</table>
					</div>

					<div className="romi-mobile-cards-list" data-testid="romi-mobile-cards-list">
						{calculatedMetrics.map((metric) => (
							<MarketingRomiMobileCard key={metric.id} metric={metric} getInputValue={getInputValue} onInputChange={handleInputChange} onInputBlur={handleInputBlur} onRemoveChannel={handleRemoveChannel} />
						))}
					</div>
				</>
			)}

			<div className="romi-footer-hint">
				<HelpCircle className="w-4 h-4 shrink-0 text-[var(--teal)]" aria-hidden="true" />
				<p>
					<strong>Справочник каналов:</strong> Реальные каналы стоматологии (Яндекс.Карты, 2ГИС, ПроДокторов, Сарафанное радио, Сайт, Telegram). Автоматический расчет первичных, доходимости и выручки по реальным картам и чекам оплат.
				</p>
			</div>

			{isRoiModalOpen && <MarketingRoiModal isOpen={isRoiModalOpen} onClose={() => setIsRoiModalOpen(false)} />}
		</section>
	);
}
