import type React from "react";
import type { DocumentNavTabsProps, DocumentCategoryTab } from "./types";
import { DOCUMENT_NAV_TABS_CONFIG } from "./constants";

export function DocumentNavTabs({
	activeTab,
	onSelectTab,
	counts = {} as Record<DocumentCategoryTab, number>,
}: DocumentNavTabsProps): React.JSX.Element {
	return (
		<nav
			className="dente-segmented-bar document-nav-tabs overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x flex flex-nowrap w-full min-w-0"
			aria-label="Категории документов"
			role="tablist"
			onWheel={(e) => {
				if (e.deltaY !== 0) {
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
		>
			{DOCUMENT_NAV_TABS_CONFIG.map((tab) => {
				const isActive = activeTab === tab.id;
				const count = counts?.[tab.id] ?? 0;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						data-active={isActive}
						className={`dente-segmented-item document-nav-tab-btn ${isActive ? "active" : ""}`}
						onClick={() => onSelectTab(tab.id)}
					>
						{tab.icon}
						<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max text-[12.5px] leading-none">
							<span className="sm:hidden">{tab.mobileLabel}</span>
							<span className="hidden sm:inline 2xl:hidden">{tab.tabletLabel}</span>
							<span className="hidden 2xl:inline">{tab.label}</span>
						</span>
						<span
							className="document-nav-tab-badge text-[11px] h-[18px] min-w-[18px] px-1.5 shrink-0 flex-shrink-0 leading-none inline-flex items-center justify-center font-semibold rounded-full"
							aria-label={`Количество: ${count}`}
						>
							{count}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
