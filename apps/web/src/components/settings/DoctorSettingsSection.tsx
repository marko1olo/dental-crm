import type React from "react";
import { DoctorSettingsView } from "./doctor/DoctorSettingsView";
import type { DoctorSettingsSectionProps } from "./doctor/doctorSettingsTypes";

export { DOCTOR_TABS, type DoctorSubTab, type DoctorTabDefinition } from "./doctorSettingsTabs";
export type { DoctorSettingsSectionProps };

export const DoctorSettingsSection: React.FC<DoctorSettingsSectionProps> = (props) => (
	<DoctorSettingsView {...props} />
);

export default DoctorSettingsSection;
