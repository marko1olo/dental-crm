/**
 * MarketingView.tsx — Comprehensive Dental Marketing & Patient Acquisition Hub.
 * Two-column desktop dashboard: Promotions catalog & Message Simulator + 1-Click Launch.
 * Full-width tabs for Clinical Recalls and ROMI Channel Analytics.
 * Governed by Mandates 8c, 8d, 8e, 8n (Anti-Void, 1-Click Flow, Zero Dead-Ends).
 */

import React, { useState } from "react";
import { Tag, Users, BarChart3, Megaphone } from "lucide-react";
import { DEFAULT_MARKETING_PROMOS } from "./components/marketing/marketingPresets";
import type { MarketingPromo } from "./components/marketing/marketingTypes";
import { MarketingPromosList } from "./components/marketing/MarketingPromosList";
import { MarketingCampaignDetail } from "./components/marketing/MarketingCampaignDetail";
import { MarketingNewPromoModal } from "./components/marketing/MarketingNewPromoModal";
import { RecallListPanel } from "./components/patients/RecallListPanel";
import { MarketingRomiTable } from "./components/marketing/MarketingRomiTable";
import "./styles/modules/marketing.css";

export type MarketingTab = "promos" | "recalls" | "romi";

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
	const [promos, setPromos] = useState<readonly MarketingPromo[]>(DEFAULT_MARKETING_PROMOS);
	const [selectedPromoId, setSelectedPromoId] = useState<string>(
		DEFAULT_MARKETING_PROMOS[0]?.id ?? "",
	);
	const [isNewModalOpen, setIsNewModalOpen] = useState(false);

	const selectedPromo =
		promos.find((p) => p.id === selectedPromoId) ||
		promos[0] ||
		DEFAULT_MARKETING_PROMOS[0];

	const handleTogglePromoStatus = (promoId: string) => {
		setPromos((prev) =>
			prev.map((p) => {
				if (p.id !== promoId) return p;
				return {
					...p,
					status: p.status === "active" ? "archived" : "active",
				};
			}),
		);
	};

	const handleSaveNewPromo = (newPromo: MarketingPromo) => {
		setPromos((prev) => [newPromo, ...prev]);
		setSelectedPromoId(newPromo.id);
	};

	return (
		<section
			className="settings-zone marketing-zone panel p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
			id="marketing"
			aria-label="Маркетинг/Диспансеризация"
			data-testid="marketing-view"
		>
			{/* Top Header Row with Title, Status Pill and Mode Tabs */}
			<div className="marketing-header-row mb-4">
				<div className="marketing-header-title-wrap">
					<div className="flex items-center gap-2">
						<Megaphone size={20} className="text-teal" aria-hidden="true" />
						<h2 className="marketing-header-title" title="Маркетинг и акции клиники">
							Акции и реклама клиники
						</h2>
					</div>
					<span className="status-pill status-confirmed">активен</span>
				</div>

				{/* Primary Tabs */}
				<nav className="marketing-top-tabs" aria-label="Разделы маркетинга">
					<button
						type="button"
						className={`marketing-top-tab ${activeTab === "promos" ? "marketing-top-tab--active" : ""}`}
						onClick={() => setActiveTab("promos")}
						data-testid="tab-nav-promos"
					>
						<Tag size={14} aria-hidden="true" />
						<span>Акции и кампании</span>
					</button>

					<button
						type="button"
						className={`marketing-top-tab ${activeTab === "recalls" ? "marketing-top-tab--active" : ""}`}
						onClick={() => setActiveTab("recalls")}
						data-testid="tab-nav-recalls"
					>
						<Users size={14} aria-hidden="true" />
						<span>Диспансерный учет / Возврат пациентов</span>
					</button>

					<button
						type="button"
						className={`marketing-top-tab ${activeTab === "romi" ? "marketing-top-tab--active" : ""}`}
						onClick={() => setActiveTab("romi")}
						data-testid="tab-nav-romi"
					>
						<BarChart3 size={14} aria-hidden="true" />
						<span>Окупаемость рекламы (ROMI)</span>
					</button>
				</nav>
			</div>

			{/* TAB 1: АКЦИИ И КАМПАНИИ (Двухколоночный сбалансированный десктоп-дашборд) */}
			{activeTab === "promos" && (
				<div className="marketing-two-col" data-testid="marketing-two-col-dashboard">
					{/* Левая колонка (400px): Каталог активных и архивных акций */}
					<MarketingPromosList
						promos={promos}
						selectedPromoId={selectedPromo?.id ?? null}
						onSelectPromo={setSelectedPromoId}
						onOpenNewPromoModal={() => setIsNewModalOpen(true)}
					/>

					{/* Правая колонка (flex-1): Рабочая панель выбранной акции */}
					{selectedPromo ? (
						<MarketingCampaignDetail
							promo={selectedPromo}
							clinicName={clinicName}
							onTogglePromoStatus={handleTogglePromoStatus}
						/>
					) : (
						<div className="marketing-empty-workspace">
							<p>Выберите акцию из списка слева</p>
						</div>
					)}
				</div>
			)}

			{/* TAB 2: ДИСПАНСЕРНЫЙ УЧЕТ И ВОЗВРАТ ПАЦИЕНТОВ */}
			{activeTab === "recalls" && (
				<div className="marketing-recalls-container" data-testid="marketing-recalls-container">
					<RecallListPanel />
				</div>
			)}

			{/* TAB 3: ОКУПАЕМОСТЬ РЕКЛАМНЫХ КАНАЛОВ (ROMI) */}
			{activeTab === "romi" && (
				<div className="marketing-romi-container" data-testid="marketing-romi-container">
					<MarketingRomiTable />
				</div>
			)}

			{/* Модальное окно создания новой акции */}
			<MarketingNewPromoModal
				isOpen={isNewModalOpen}
				onClose={() => setIsNewModalOpen(false)}
				onSave={handleSaveNewPromo}
			/>
		</section>
	);
}

export default MarketingView;
