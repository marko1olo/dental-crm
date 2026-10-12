/**
 * @file apps/web/src/views/settingsView/SettingsNavigationSidebar.tsx
 * @description Layer 4: Catalogue navigation sidebar for settings tabs.
 */

import type React from "react";
import type { KeyboardEvent } from "react";
import {
	Bot,
	Building2,
	ChevronDown,
	Database,
	DollarSign,
	FileText,
	HardDrive,
	HardDriveDownload,
	Layers,
	LineChart,
	Lock,
	MessageSquare,
	Percent,
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
import {
	ENTERPRISE_ADVANCED_TABS,
	type SettingsNavigationSidebarProps,
} from "./types.js";

const SETTINGS_TAB_ICONS: Record<
	string,
	React.ComponentType<{ size?: number; className?: string }>
> = {
	profile: User,
	preferences: Wand2,
	clinic: Building2,
	modules: Puzzle,
	staff: Users,
	commissions: Percent,
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
				className={`settings-catalogue-btn h-9 min-h-[36px] px-3 rounded-xl ${
					tabSelected
						? "active bg-[var(--paper-soft)] border-[var(--primary)] text-[var(--ink)] font-semibold"
						: "bg-transparent border-transparent text-[var(--ink-muted)] hover:bg-[var(--paper-soft)] hover:border-[var(--line)] hover:text-[var(--ink)]"
				} flex-shrink-0 whitespace-nowrap transition-all`}
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
				<Icon
					size={16}
					className={`w-4 h-4 shrink-0 transition-colors ${
						tabSelected ? "text-[var(--primary)]" : "text-[var(--ink-muted)]"
					}`}
				/>
				<span className="truncate">{tab.title}</span>
			</button>
		);
	};

	const coreTabs = (typedSettingsTabs ?? []).filter(
		(t) => t && !ENTERPRISE_ADVANCED_TABS.has(t.id),
	);
	const advancedTabs = (typedSettingsTabs ?? []).filter(
		(t) => t && ENTERPRISE_ADVANCED_TABS.has(t.id),
	);
	const isAdvancedActive = ENTERPRISE_ADVANCED_TABS.has(String(settingsTab));

	return (
		<div
			className="settings-catalogue-sidebar settings-tabs scrollbar-none touch-pan-x"
			role="tablist"
			aria-label="Раздел настроек"
		>
			{(settingsTabGroups ?? []).map((group) => {
				const tabsInGroup = coreTabs.filter((t) => t?.group === group?.id);
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

			{advancedTabs.length > 0 && (
				<details
					className="settings-catalogue-group settings-tabs-group pt-2 border-t border-[var(--line)]"
					open={isAdvancedActive}
				>
					<summary className="settings-catalogue-group-header settings-tabs-group-header flex items-center justify-between cursor-pointer list-none rounded-xl px-3 py-1.5 hover:bg-[var(--paper-soft)]">
						<span>Сеть и аналитика ({advancedTabs.length})</span>
						<ChevronDown size={14} className="text-[var(--ink-muted)] shrink-0" />
					</summary>
					<div className="flex flex-col gap-1 mt-1">
						{advancedTabs.map(renderTabButton)}
					</div>
				</details>
			)}
		</div>
	);
}
