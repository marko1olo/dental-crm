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
	{ id: "romi" as const, label: "Аналитика и ROMI", title: "Окупаемость рекламы и каналов (ROMI)", testId: "tab-nav-romi", Icon: BarChart3 },
	{ id: "promos" as const, label: "Промокоды", title: "Акции и промокоды", testId: "tab-nav-promos", Icon: Tag },
	{ id: "analytics" as const, label: "Воронка лидов", title: "Сквозная аналитика и воронка", testId: "tab-nav-analytics", Icon: TrendingUp },
	{ id: "recalls" as const, label: "Реактивация пациентов", title: "Плановый профосмотр / Возврат пациентов", testId: "tab-nav-recalls", Icon: Users },
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
			<div className="marketing-header-row min-h-[48px] mb-3 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="marketing-header-title-wrap flex items-center gap-2.5 min-w-0 shrink-0">
					<div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
						<Megaphone size={18} aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<h2 className="marketing-header-title text-base sm:text-lg font-bold tracking-tight text-[var(--ink)] truncate" title="Маркетинг и акции клиники">
							Акции и реклама клиники
						</h2>
					</div>
					<span className="status-pill status-confirmed hidden sm:inline-flex">активен</span>
				</div>

				<div className="marketing-header-actions flex items-center gap-2 shrink-0 ml-auto sm:order-3">
					<button
						type="button"
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs px-3.5 inline-flex items-center gap-1.5 font-medium text-xs sm:text-sm shrink-0 cursor-pointer"
						onClick={() => setIsNewModalOpen(true)}
						data-testid="btn-marketing-primary-cta"
						title="Создать новую рекламную кампанию или акцию"
					>
						<Plus size={15} aria-hidden="true" />
						<span className="hidden sm:inline">Запустить акцию</span>
						<span className="sm:hidden">Акция</span>
					</button>
				</div>

				<nav className="marketing-top-tabs w-full sm:w-auto order-3 sm:order-2" aria-label="Разделы маркетинга">
					{MARKETING_TABS.map(({ id, label, title, testId, Icon }) => (
						<button
							key={id} type="button" data-testid={testId} title={title}
							className={`marketing-top-tab ${activeTab === id ? "marketing-top-tab--active active" : ""}`}
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
