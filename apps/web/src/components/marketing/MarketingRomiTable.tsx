/**
 * MarketingRomiTable.tsx — Owner Marketing ROMI & Acquisition Channels Table.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am, 8ze (Touch Ergonomics, Pure Domain).
 */

import React, { useState } from "react";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { MarketingDashboardView } from "../../pages/MarketingDashboardView.js";
import { MarketingRomiKpiStrip } from "./MarketingRomiKpiStrip.js";
import { MarketingRomiAddChannelForm } from "./MarketingRomiAddChannelForm.js";
import { MarketingRomiEmptyState } from "./MarketingRomiEmptyState.js";
import { MarketingRomiTableRow } from "./MarketingRomiTableRow.js";
import { MarketingRomiTableFooter } from "./MarketingRomiTableFooter.js";
import { MarketingRomiMobileCard } from "./MarketingRomiMobileCard.js";
import { MarketingRomiTableHeader } from "./MarketingRomiTableHeader.js";
import { MarketingSourcesCardsGrid } from "./MarketingSourcesCardsGrid.js";
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

					<div className="mt-4 pt-4 border-t border-[var(--line)]">
						<MarketingSourcesCardsGrid metrics={calculatedMetrics} onSyncWithCrm={handleSyncWithCrm} />
					</div>
				</>
			)}

			<div className="romi-footer-hint">
				<HelpCircle className="w-4 h-4 shrink-0 text-[var(--teal)]" aria-hidden="true" />
				<p>
					<strong>Справочник каналов:</strong> Реальные каналы стоматологии (Яндекс.Карты, 2ГИС, ПроДокторов, Сарафанное радио, Сайт, Telegram). Автоматический расчет первичных, доходимости и выручки по реальным картам и чекам оплат.
				</p>
			</div>

			{isRoiModalOpen && (
				<div
					className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-2 sm:p-4 flex items-center justify-center animate-in fade-in"
					data-testid="marketing-roi-modal-overlay"
					role="dialog"
					aria-modal="true"
				>
					<div className="w-full max-w-7xl h-[92vh] flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden relative">
						<div className="flex items-center justify-between p-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
							<h3 className="font-semibold text-base">Сквозная аналитика маркетинга и воронки</h3>
							<button
								type="button"
								onClick={() => setIsRoiModalOpen(false)}
								className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
								aria-label="Закрыть"
								data-testid="marketing-roi-close-btn"
							>
								✕
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-4">
							<MarketingDashboardView embedded={true} />
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
