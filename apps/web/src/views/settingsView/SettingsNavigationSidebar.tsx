/**
 * @file apps/web/src/views/settingsView/SettingsNavigationSidebar.tsx
 * @description Layer 4: Catalogue navigation sidebar for settings tabs.
 */

import type React from "react";
import type { KeyboardEvent } from "react";
import {
	Bot,
	Building2,
	Database,
	DollarSign,
	FileText,
	HardDrive,
	HardDriveDownload,
	Layers,
	LineChart,
	Lock,
	MessageSquare,
	Puzzle,
	Send,
	ShieldAlert,
	ShieldCheck,
	SlidersHorizontal,
	User,
	Users,
	Wand2,
} from "lucide-react";
import { settingsTabGroups } from "../../AppConstants";
import type { SettingsNavigationSidebarProps } from "./types.js";

const SETTINGS_TAB_ICONS: Record<
	string,
	React.ComponentType<{ size?: number; className?: string }>
> = {
	profile: User,
	preferences: Wand2,
	clinic: Building2,
	modules: Puzzle,
	staff: Users,
	access: Lock,
	telegram: MessageSquare,
	hardware: HardDrive,
	protocols: FileText,
	rules: ShieldAlert,
	"procedure-boms": Layers,
	prices: DollarSign,
	ai: Bot,
	insurance: ShieldCheck,
	marketing: Send,
	bpmn: SlidersHorizontal,
	sources: Database,
	reporting: LineChart,
	imports: HardDriveDownload,
	audit: Lock,
};

export function SettingsNavigationSidebar({
	typedSettingsTabs,
	settingsTab,
	selectSettingsTab,
	handleSettingsTabKeyDown,
	activeSettingsTabButtonRef,
	settingsTabButtonId,
	settingsTabPanelId,
}: SettingsNavigationSidebarProps) {
	const renderTabButton = (tab: (typeof typedSettingsTabs)[number]) => {
		const tabSelected = settingsTab === tab.id;
		const Icon = SETTINGS_TAB_ICONS[tab.id] || SlidersHorizontal;
		return (
			<button
				aria-controls={settingsTabPanelId(tab.id)}
				aria-selected={tabSelected}
				className={`settings-catalogue-btn ${tabSelected ? "active" : ""} flex-shrink-0 whitespace-nowrap`}
				id={settingsTabButtonId(tab.id)}
				key={tab.id}
				onClick={() => selectSettingsTab(tab.id)}
				onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
					handleSettingsTabKeyDown(event, tab.id)
				}
				ref={tabSelected ? activeSettingsTabButtonRef : undefined}
				role="tab"
				tabIndex={tabSelected ? 0 : -1}
				type="button"
			>
				<Icon size={14} className="shrink-0" />
				<span className="truncate">{tab.title}</span>
			</button>
		);
	};

	return (
		<div
			className="settings-catalogue-sidebar settings-tabs scrollbar-none touch-pan-x"
			role="tablist"
			aria-label="Раздел настроек"
		>
			{(settingsTabGroups ?? []).map((group) => {
				const tabsInGroup = (typedSettingsTabs ?? []).filter(
					(t) => t?.group === group?.id,
				);
				if (tabsInGroup.length === 0) return null;
				return (
					<div
						className="settings-catalogue-group settings-tabs-group"
						key={group.id}
					>
						<span className="settings-catalogue-group-header settings-tabs-group-header">
							{group.title}
						</span>
						{tabsInGroup.map(renderTabButton)}
					</div>
				);
			})}
		</div>
	);
}
