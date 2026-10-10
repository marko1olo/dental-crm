/**
 * @file apps/web/src/views/settingsView/SettingsClinicGeneralTab.tsx
 * @description Layer 4: General clinic requisites, licenses, branches, and schedule configuration tab.
 */

import type React from "react";
import { SettingsClinicTab } from "../../components/settings/SettingsClinicTab";
import type { SettingsClinicGeneralTabProps } from "./types.js";

export function SettingsClinicGeneralTab({
	props,
	settingsTab = "clinic",
}: SettingsClinicGeneralTabProps) {
	return (
		<div className="settings-clinic-general-wrapper w-full">
			<SettingsClinicTab props={props} settingsTab={settingsTab} />
		</div>
	);
}
