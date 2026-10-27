import type React from "react";
import { AdminSettingsView } from "./admin/AdminSettingsView";
import type { AdminSettingsSectionProps, AdminSubTab } from "./admin/AdminSettingsTypes";

// Опрос самочувствия (24ч) и каденция напоминаний: канонический <DelimitedTileCard /> в AdminCadenceCard
export type { AdminSettingsSectionProps, AdminSubTab };
export { ADMIN_TABS } from "./admin/AdminSettingsTypes";

export const AdminSettingsSection: React.FC<AdminSettingsSectionProps> = (props) => (
	<AdminSettingsView {...props} />
);

export default AdminSettingsSection;
