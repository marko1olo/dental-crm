/**
 * MarketingView.tsx — Comprehensive Dental Marketing & Patient Acquisition Hub.
 * Governed by Mandates 8b, 8c, 8d, 8e, 8n (<= 120 lines UI facade, PostgreSQL 18 backed).
 */

import React, { useState } from "react";
import { Tag, Users, BarChart3, Megaphone, TrendingUp, Plus } from "lucide-react";
import { MarketingPromosList } from "./components/marketing/MarketingPromosList";
import { MarketingCampaignDetail } from "./components/marketing/MarketingCampaignDetail";
import { MarketingNewPromoModal } from "./components/marketing/MarketingNewPromoModal";
import { useMarketingPromos } from "./components/marketing/useMarketingPromos";
import { RecallListPanel } from "./components/patients/RecallListPanel";
import { MarketingRomiTable } from "./components/marketing/MarketingRomiTable";
import { MarketingDashboardView } from "./pages/MarketingDashboardView";
import "./styles/modules/marketing.css";

export type MarketingTab = "promos" | "recalls" | "romi" | "analytics";
export { MarketingDashboardView };

export interface MarketingViewProps {
	readonly clinicName?: string;
	readonly clinicPhone?: string;
	readonly initialTab?: MarketingTab;
}

const MARKETING_TABS = [
	{ id: "analytics" as const, label: "Сводка и воронка", title: "Сквозная аналитика и воронка", testId: "tab-nav-analytics", Icon: TrendingUp },
	{ id: "promos" as const, label: "Акции и кампании", testId: "tab-nav-promos", Icon: Tag },
	{ id: "recalls" as const, label: "Профосмотр и возврат", title: "Плановый профосмотр / Возврат пациентов", testId: "tab-nav-recalls", Icon: Users },
	{ id: "romi" as const, label: "Окупаемость (ROMI)", testId: "tab-nav-romi", Icon: BarChart3 },
];

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
			<div className="marketing-header-row min-h-[48px] max-h-[52px] mb-3">
				<div className="marketing-header-title-wrap">
					<div className="flex items-center gap-2 min-w-0">
						<Megaphone size={18} className="text-[var(--primary)] shrink-0" aria-hidden="true" />
						<h2 className="marketing-header-title" title="Маркетинг и акции клиники">Акции и реклама клиники</h2>
					</div>
					<span className="status-pill status-confirmed">активен</span>
				</div>
				<nav className="marketing-top-tabs dente-segmented-bar" aria-label="Разделы маркетинга">
					{MARKETING_TABS.map(({ id, label, title, testId, Icon }) => (
						<button
							key={id} type="button" data-testid={testId} title={title}
							className={`marketing-top-tab dente-segmented-item ${activeTab === id ? "marketing-top-tab--active active" : ""}`}
							onClick={() => setActiveTab(id)}
						>
							<Icon size={14} className="shrink-0" aria-hidden="true" />
							<span>{label}</span>
						</button>
					))}
				</nav>
			</div>

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
					<RecallListPanel />
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
