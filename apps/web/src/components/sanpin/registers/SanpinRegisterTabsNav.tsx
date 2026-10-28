import React from "react";
import { SANPIN_CANONICAL_TABS, type SanpinRegisterTab } from "../sanpinNavigationConfig";

export interface SanpinRegisterTabsNavProps {
	readonly activeTab: SanpinRegisterTab;
	readonly onSelectTab: (tabId: SanpinRegisterTab) => void;
}

export const SanpinRegisterTabsNav: React.FC<SanpinRegisterTabsNavProps> = ({
	activeTab,
	onSelectTab,
}) => {
	return (
		<div
			className="sanpin-unified-nav"
			style={{
				padding: "4px 0",
				width: "100%",
				maxWidth: "100%",
				overflowX: "auto",
				WebkitOverflowScrolling: "touch",
				scrollbarWidth: "none",
			}}
		>
			<div
				className="sanpin-tabs-strip"
				role="tablist"
				aria-label="Разделы учета стерилизации и дезинфекции"
				style={{
					display: "inline-flex",
					gap: "6px",
					alignItems: "center",
					background: "var(--paper-soft, #f1f5f9)",
					padding: "4px",
					borderRadius: "12px",
					border: "1px solid var(--line, #e2e8f0)",
					minWidth: "max-content",
				}}
			>
				{SANPIN_CANONICAL_TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`sanpin-tab-btn touch-manipulation ${isActive ? "active" : ""}`}
							onClick={() => onSelectTab(tab.id)}
							data-testid={`tab-${tab.id}-btn`}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								padding: "8px 14px",
								minHeight: "44px",
								minWidth: "max-content",
								flexShrink: 0,
								fontSize: "0.825rem",
								fontWeight: isActive ? 700 : 500,
								borderRadius: "9px",
								border: "none",
								background: isActive ? "var(--paper, #ffffff)" : "transparent",
								color: isActive ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
								cursor: "pointer",
								boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
								transition: "all 0.15s ease",
								whiteSpace: "nowrap",
							}}
						>
							<Icon size={15} color={isActive ? "var(--teal, #0d9488)" : "currentColor"} className="shrink-0" />
							<span className="hidden sm:inline">{tab.label}</span>
							<span className="inline sm:hidden">{tab.shortLabel}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default SanpinRegisterTabsNav;
