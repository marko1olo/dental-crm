/**
 * MarketingViewHeader.tsx
 *
 * Шапка маркетингового хаба с табами и единым Primary CTA.
 * Mandate 8am: Exactly ONE primary CTA.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React from "react";
import { Megaphone, Plus, BarChart3, Tag, TrendingUp, Users } from "lucide-react";

export type MarketingTab = "promos" | "recalls" | "romi" | "analytics";

export const MARKETING_TABS = [
	{ id: "romi" as const, label: "Аналитика и ROMI", title: "Окупаемость рекламы и каналов (ROMI)", testId: "tab-nav-romi", Icon: BarChart3 },
	{ id: "promos" as const, label: "Промокоды", title: "Акции и промокоды", testId: "tab-nav-promos", Icon: Tag },
	{ id: "analytics" as const, label: "Воронка лидов", title: "Сквозная аналитика и воронка", testId: "tab-nav-analytics", Icon: TrendingUp },
	{ id: "recalls" as const, label: "Журнал напоминаний", title: "Плановый профосмотр / Возврат пациентов", testId: "tab-nav-recalls", Icon: Users },
];

interface MarketingViewHeaderProps {
	activeTab: MarketingTab;
	onSelectTab: (tab: MarketingTab) => void;
	onOpenNewPromoModal: () => void;
}

export function MarketingViewHeader({
	activeTab,
	onSelectTab,
	onOpenNewPromoModal,
}: MarketingViewHeaderProps) {
	return (
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

			{activeTab === "promos" && (
				<div className="marketing-header-actions flex items-center gap-2 shrink-0 ml-auto sm:order-3">
					<button
						type="button"
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs px-3.5 inline-flex items-center gap-1.5 font-medium text-xs sm:text-sm shrink-0 cursor-pointer"
						onClick={onOpenNewPromoModal}
						data-testid="btn-marketing-primary-cta"
						title="Создать новую рекламную кампанию или акцию"
					>
						<Plus size={15} aria-hidden="true" />
						<span className="hidden sm:inline">Запустить акцию</span>
						<span className="sm:hidden">Акция</span>
					</button>
				</div>
			)}

			<nav className="marketing-top-tabs w-full sm:w-auto order-3 sm:order-2" aria-label="Разделы маркетинга">
				{MARKETING_TABS.map(({ id, label, title, testId, Icon }) => (
					<button
						key={id}
						type="button"
						data-testid={testId}
						title={title}
						className={`marketing-top-tab ${activeTab === id ? "marketing-top-tab--active active" : ""}`}
						onClick={() => onSelectTab(id)}
					>
						<Icon size={14} className="shrink-0" aria-hidden="true" />
						<span>{label}</span>
					</button>
				))}
			</nav>
		</div>
	);
}
