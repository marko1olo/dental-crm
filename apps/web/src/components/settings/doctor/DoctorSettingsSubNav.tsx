import type React from "react";
import { DOCTOR_TABS, type DoctorSubTab } from "../doctorSettingsTabs";

interface DoctorSettingsSubNavProps {
	readonly activeSubTab: DoctorSubTab;
	readonly onTabChange: (tabId: DoctorSubTab) => void;
}

export const DoctorSettingsSubNav: React.FC<DoctorSettingsSubNavProps> = ({
	activeSubTab,
	onTabChange,
}) => {
	return (
		<div
			className="settings-subnav-strip overflow-x-auto pb-2 border-b border-[var(--line)]"
			role="tablist"
			aria-label="Разделы настроек врача"
		>
			{DOCTOR_TABS.map((tab) => {
				const Icon = tab.icon;
				const isSelected = activeSubTab === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isSelected}
						onClick={() => onTabChange(tab.id)}
						title={tab.description}
						className={`settings-subnav-btn ${isSelected ? "active" : ""}`}
						data-testid={`doctor-tab-${tab.id}`}
					>
						<Icon size={14} className="shrink-0" />
						<span className="whitespace-nowrap">{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
};
