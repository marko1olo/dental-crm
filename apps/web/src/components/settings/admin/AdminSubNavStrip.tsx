import React from "react";
import { ADMIN_TABS, type AdminSubTab } from "./AdminSettingsTypes";

export interface AdminSubNavStripProps {
	activeSubTab: AdminSubTab;
	onSelectTab: (tabId: AdminSubTab) => void;
}

export const AdminSubNavStrip: React.FC<AdminSubNavStripProps> = ({
	activeSubTab,
	onSelectTab,
}) => {
	return (
		<div
			className="settings-subnav-strip overflow-x-auto pb-1 border-b border-[var(--line)]"
			role="tablist"
			aria-label="Разделы настроек администратора"
		>
			{ADMIN_TABS.map((tab) => {
				const Icon = tab.icon;
				const isSelected = activeSubTab === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isSelected}
						onClick={() => onSelectTab(tab.id)}
						title={tab.description}
						className={`settings-subnav-btn ${isSelected ? "active" : ""}`}
						data-testid={`admin-tab-${tab.id}`}
					>
						<Icon size={14} className="shrink-0" />
						<span className="whitespace-nowrap">{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
};
