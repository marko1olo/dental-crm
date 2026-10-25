/**
 * @file apps/web/src/views/settingsView/SettingsNavigationSidebar.tsx
 * @description Layer 4: Catalogue navigation sidebar for settings tabs.
 */

import type React from "react";
import type { KeyboardEvent } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { settingsTabGroups } from "../../AppConstants";
import {
	ENTERPRISE_ADVANCED_TABS,
	type SettingsNavigationSidebarProps,
} from "./types.js";
import { SETTINGS_TAB_ICONS } from "./settingsTabIcons.js";

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

	const CANONICAL_TAB_IDS = new Set([
		"clinic",
		"prices",
		"staff",
		"hardware",
		"imports",
	]);
	const canonicalTabs = [
		{ id: "clinic" as const, title: "Клиника и кресла", group: "main" as const },
		{ id: "prices" as const, title: "Прайс-лист процедур", group: "clinical" as const },
		{ id: "staff" as const, title: "Сотрудники и доступ", group: "main" as const },
		{ id: "hardware" as const, title: "Оборудование и касса", group: "main" as const },
		{ id: "imports" as const, title: "Импорт данных", group: "system" as const },
	];
	const otherTabs = (typedSettingsTabs ?? []).filter(
		(t) => t && !CANONICAL_TAB_IDS.has(t.id),
	);
	const isOtherActive = otherTabs.some((t) => t.id === settingsTab);

	return (
		<div
			className="settings-catalogue-sidebar settings-tabs scrollbar-none touch-pan-x"
			role="tablist"
			aria-label="Раздел настроек"
		>
			<div className="settings-catalogue-group settings-tabs-group">
				<span className="settings-catalogue-group-header settings-tabs-group-header">
					Настройки клиники
				</span>
				{canonicalTabs.map(renderTabButton)}
			</div>

			{otherTabs.length > 0 && (
				<details
					className="settings-catalogue-group settings-tabs-group pt-2 border-t border-[var(--line)]"
					open={isOtherActive}
				>
					<summary className="settings-catalogue-group-header settings-tabs-group-header flex items-center justify-between cursor-pointer list-none rounded-xl px-3 py-1.5 hover:bg-[var(--paper-soft)]">
						<span>Дополнительные параметры ({otherTabs.length})</span>
						<ChevronDown size={14} className="text-[var(--ink-muted)] shrink-0" />
					</summary>
					<div className="flex flex-col gap-1 mt-1">
						{otherTabs.map(renderTabButton)}
					</div>
				</details>
			)}
		</div>
	);
}
