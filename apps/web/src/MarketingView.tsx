/**
 * MarketingView.tsx — Comprehensive Dental Marketing & Patient Acquisition Hub.
 * Governed by Mandates 8b, 8c, 8d, 8e, 8n (Strict <= 120 lines UI facade).
 */

import React, { useState } from "react";
import { Tag, Plus } from "lucide-react";
import { MarketingPromosList } from "./components/marketing/MarketingPromosList";
import { MarketingCampaignDetail } from "./components/marketing/MarketingCampaignDetail";
import { MarketingNewPromoModal } from "./components/marketing/MarketingNewPromoModal";
import { useMarketingPromos } from "./components/marketing/useMarketingPromos";
import { MarketingRecallsHub } from "./components/marketing/MarketingRecallsHub";
import { MarketingRomiTable } from "./components/marketing/MarketingRomiTable";
import { MarketingDashboardView } from "./pages/MarketingDashboardView";
import { MarketingViewHeader, type MarketingTab } from "./components/marketing/MarketingViewHeader";
import "./styles/modules/marketing.css";

export type { MarketingTab };
export { MarketingDashboardView };

export interface MarketingViewProps {
	readonly clinicName?: string;
	readonly clinicPhone?: string;
	readonly initialTab?: MarketingTab;
}

export function MarketingView({
	clinicName = "Стоматология ДЕНТЕ Премиум",
	clinicPhone: _clinicPhone,
	initialTab = "promos",
}: MarketingViewProps) {
	const [activeTab, setActiveTab] = useState<MarketingTab>(initialTab);
	const {
		promos, selectedPromo, setSelectedPromoId, isNewModalOpen, setIsNewModalOpen,
		handleTogglePromoStatus, handleSaveNewPromo,
	} = useMarketingPromos();

	return (
		<section
			className="marketing-zone panel p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
			id="marketing" aria-label="Маркетинг/Возврат пациентов" data-testid="marketing-view"
		>
			<MarketingViewHeader
				activeTab={activeTab}
				onSelectTab={setActiveTab}
				onOpenNewPromoModal={() => setIsNewModalOpen(true)}
			/>

			{activeTab === "analytics" && (
				<MarketingDashboardView clinicName={clinicName} onNavigateToRecalls={() => setActiveTab("recalls")} embedded={true} />
			)}

			{activeTab === "promos" && (
				<div className="marketing-two-col" data-testid="marketing-two-col-dashboard">
					<MarketingPromosList
						promos={promos} selectedPromoId={selectedPromo?.id ?? null}
						onSelectPromo={setSelectedPromoId} onOpenNewPromoModal={() => setIsNewModalOpen(true)}
					/>
					{selectedPromo ? (
						<MarketingCampaignDetail promo={selectedPromo} clinicName={clinicName} onTogglePromoStatus={handleTogglePromoStatus} />
					) : (
						<div className="marketing-empty-workspace flex flex-col items-center justify-center p-8 text-center" data-testid="marketing-empty-workspace">
							<Tag size={40} className="text-[var(--ink-muted)] mb-3 opacity-60" aria-hidden="true" />
							<p className="text-[var(--ink)] font-medium mb-1" data-testid="marketing-empty-state-text">
								Акции клиники пока не созданы. Нажмите «Новая акция» для запуска рекламной кампании
							</p>
							<button type="button" className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs px-3.5 mt-3 inline-flex items-center gap-1.5" onClick={() => setIsNewModalOpen(true)} data-testid="btn-empty-new-promo">
								<Plus size={15} /><span>Новая акция</span>
							</button>
						</div>
					)}
				</div>
			)}

			{activeTab === "recalls" && (
				<div className="marketing-recalls-container" data-testid="marketing-recalls-container">
					<MarketingRecallsHub clinicName={clinicName} />
				</div>
			)}

			{activeTab === "romi" && (
				<div className="marketing-romi-container" data-testid="marketing-romi-container">
					<MarketingRomiTable />
				</div>
			)}

			<MarketingNewPromoModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSave={handleSaveNewPromo} />
		</section>
	);
}
export default MarketingView;
