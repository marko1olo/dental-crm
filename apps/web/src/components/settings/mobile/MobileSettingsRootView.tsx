/**
 * apps/web/src/components/settings/mobile/MobileSettingsRootView.tsx
 *
 * Root Mobile Settings View compliant with Apple iOS Settings HIG.
 * Facade <= 80 lines.
 */

import React, { useState, useMemo } from "react";
import { useClinicCapabilities } from "../../../hooks/useClinicCapabilities";
import { MobileSettingsTopHeader } from "./MobileSettingsTopHeader";
import { MobileClinicIdentityCard } from "./MobileClinicIdentityCard";
import { MobileSettingsGroupedList } from "./MobileSettingsGroupedList";
import { createMobileSettingsGroups } from "./mobileSettingsGroupsFactory";
import type { MobileSettingsRootViewProps } from "./mobileSettingsTypes";

export type { MobileSettingsRootViewProps } from "./mobileSettingsTypes";

export const MobileSettingsRootView: React.FC<MobileSettingsRootViewProps> = ({
	appLogic,
	onSelectSection,
}) => {
	const { dashboard } = appLogic;
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const capabilities = useClinicCapabilities(dashboard?.clinicSettings?.profile?.mode);

	const clinicName = dashboard?.clinicSettings?.profile?.clinicName || dashboard?.clinicName || "Стоматология ДЕНТЕ";
	const serviceCatalogCount = (dashboard?.serviceCatalog ?? []).length;
	const staffCount = (dashboard?.clinicSettings?.staff ?? []).length;
	const chairsCount = (dashboard?.clinicSettings?.chairs ?? []).length;

	const settingGroups = useMemo(
		() => createMobileSettingsGroups(chairsCount, serviceCatalogCount, staffCount),
		[chairsCount, serviceCatalogCount, staffCount],
	);

	const filteredGroups = useMemo(() => {
		let groups = settingGroups;
		if (selectedCategory !== "all") {
			groups = groups.filter((g) => g.id === selectedCategory);
		}
		if (!searchQuery.trim()) return groups;
		const q = searchQuery.toLowerCase().trim();
		return groups
			.map((group) => ({
				...group,
				items: group.items.filter(
					(item) =>
						item.title.toLowerCase().includes(q) ||
						item.subtitle.toLowerCase().includes(q) ||
						group.header.toLowerCase().includes(q),
				),
			}))
			.filter((group) => group.items.length > 0);
	}, [settingGroups, searchQuery, selectedCategory]);

	return (
		<div
			className="mobile-settings-root flex flex-col w-full max-w-[100vw] overflow-x-clip pb-24"
			data-testid="mobile-settings-root-view"
		>
			<MobileSettingsTopHeader
				presetLabel={capabilities.presetLabel}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				selectedCategory={selectedCategory}
				setSelectedCategory={setSelectedCategory}
			/>

			{!searchQuery && (
				<MobileClinicIdentityCard
					clinicName={clinicName}
					presetLabel={capabilities.presetLabel}
					onSelectClinic={() => onSelectSection("clinic")}
				/>
			)}

			<MobileSettingsGroupedList
				filteredGroups={filteredGroups}
				onSelectSection={onSelectSection}
			/>
		</div>
	);
};

export default MobileSettingsRootView;
