import type React from "react";
import { useEffect, useState } from "react";
import type { DoctorSubTab } from "../doctorSettingsTabs";
import { DoctorAssistantsCard } from "./DoctorAssistantsCard";
import { DoctorSettingsSubNav } from "./DoctorSettingsSubNav";
import { DoctorSubTabContent } from "./DoctorSubTabContent";
import type { DoctorSettingsSectionProps } from "./doctorSettingsTypes";

export const DoctorSettingsView: React.FC<DoctorSettingsSectionProps> = ({
	props,
	initialTab = "profile",
	onSelectTab,
}) => {
	const [activeSubTab, setActiveSubTab] = useState<DoctorSubTab>(initialTab);

	useEffect(() => {
		if (initialTab) {
			setActiveSubTab(initialTab);
		}
	}, [initialTab]);

	const handleTabChange = (tabId: DoctorSubTab) => {
		setActiveSubTab(tabId);
		onSelectTab?.(tabId);
	};

	return (
		<div className="space-y-4" data-testid="doctor-settings-section">
			<DoctorSettingsSubNav activeSubTab={activeSubTab} onTabChange={handleTabChange} />
			{activeSubTab === "profile" && <DoctorAssistantsCard />}
			<DoctorSubTabContent activeSubTab={activeSubTab} props={props} />
		</div>
	);
};
