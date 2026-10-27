import type React from "react";
import { useEffect, useState } from "react";
import { AdminCadenceCard } from "./AdminCadenceCard";
import { AdminSettingsSubNav } from "./AdminSettingsSubNav";
import { AdminSubTabContent } from "./AdminSubTabContent";
import type { AdminSettingsSectionProps, AdminSubTab } from "./AdminSettingsTypes";

export const AdminSettingsView: React.FC<AdminSettingsSectionProps> = ({
	props,
	initialTab = "clinic",
	onSelectTab,
}) => {
	const resolvedInitialTab: AdminSubTab = initialTab === "telegram" ? "messengers" : initialTab;
	const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(resolvedInitialTab);

	useEffect(() => {
		if (initialTab) {
			setActiveSubTab(initialTab === "telegram" ? "messengers" : initialTab);
		}
	}, [initialTab]);

	const handleTabChange = (tabId: AdminSubTab) => {
		setActiveSubTab(tabId);
		onSelectTab?.(tabId);
	};

	return (
		<div className="space-y-4" data-testid="admin-settings-section">
			<AdminSettingsSubNav activeSubTab={activeSubTab} onTabChange={handleTabChange} />
			{activeSubTab === "messengers" && <AdminCadenceCard />}
			<AdminSubTabContent activeSubTab={activeSubTab} props={props} />
		</div>
	);
};
