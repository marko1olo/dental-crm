import type React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { MaterialBomsSettingsPanel } from "../../inventory/MaterialBomsSettingsPanel";
import { DoctorClinicalPreferencesSection } from "../DoctorClinicalPreferencesSection";
import type { DoctorSubTab } from "../doctorSettingsTabs";
import { HardwareSettingsTab } from "../HardwareSettingsTab";
import { SettingsAiTab } from "../SettingsAiTab";
import { SettingsProfileTab } from "../SettingsProfileTab";
import { SettingsProtocolsTab } from "../SettingsProtocolsTab";
import { SettingsRulesTab } from "../SettingsRulesTab";

interface DoctorSubTabContentProps {
	readonly activeSubTab: DoctorSubTab;
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	readonly props: Record<string, any>;
}

export const DoctorSubTabContent: React.FC<DoctorSubTabContentProps> = ({
	activeSubTab,
	props,
}) => {
	return (
		<div className="pt-2">
			{activeSubTab === "profile" && (
				<ErrorBoundary moduleName="Мой профиль">
					<SettingsProfileTab props={props} />
				</ErrorBoundary>
			)}

			{activeSubTab === "preferences" && (
				<ErrorBoundary moduleName="Клинические пресеты">
					<DoctorClinicalPreferencesSection
						soundNotificationsMuted={
							props?.soundNotificationsMuted ??
							props?.appLogic?.soundNotificationsMuted
						}
						onToggleSoundMuted={
							props?.setSoundNotificationsMuted ??
							props?.appLogic?.setSoundNotificationsMuted
						}
						onTestOnlineBookingSound={
							props?.testOnlineBookingSound ??
							props?.appLogic?.testOnlineBookingSound
						}
						onTestSlotEndSound={
							props?.testSlotEndSound ??
							props?.appLogic?.testSlotEndSound
						}
					/>
				</ErrorBoundary>
			)}

			{activeSubTab === "protocols" && (
				<ErrorBoundary moduleName="Клинические протоколы">
					<SettingsProtocolsTab />
				</ErrorBoundary>
			)}

			{activeSubTab === "rules" && (
				<ErrorBoundary moduleName="Клинические правила">
					<SettingsRulesTab />
				</ErrorBoundary>
			)}

			{activeSubTab === "procedure-boms" && (
				<ErrorBoundary moduleName="Техкарты расхода материалов">
					<MaterialBomsSettingsPanel
						{...(props?.auth?.currentUser?.organizationId
							? { organizationId: props.auth.currentUser.organizationId }
							: {})}
					/>
				</ErrorBoundary>
			)}

			{activeSubTab === "ai" && (
				<ErrorBoundary moduleName="ИИ-ассистент">
					<SettingsAiTab />
				</ErrorBoundary>
			)}

			{activeSubTab === "hardware" && (
				<ErrorBoundary moduleName="Оборудование кабинета">
					<HardwareSettingsTab />
				</ErrorBoundary>
			)}
		</div>
	);
};
