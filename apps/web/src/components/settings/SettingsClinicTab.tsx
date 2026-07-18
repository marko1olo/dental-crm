import type { Chair, ClinicMode, RoleQueue, StaffMember, StaffRole } from "@dental/shared";
import "./SettingsClinicTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsStore } from "../../store/settingsStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { useSettingsLogic } from "../../hooks/domains/useSettingsLogic";

// Sections
import { ClinicModeSection } from "./clinic/ClinicModeSection";
import { ClinicLegalProfileSection } from "./clinic/ClinicLegalProfileSection";
import { ClinicScheduleSection } from "./clinic/ClinicScheduleSection";
import { ClinicChairsSection } from "./clinic/ClinicChairsSection";
import { AuthArtSection } from "./clinic/AuthArtSection";

export function SettingsClinicTab({ settingsTab }: { settingsTab: string }) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const appLogicProps = Object.assign({}, appLogic, derivations) as any;
	const settingsStoreProps = useSettingsStore();
	
	const settingsLogic = useSettingsLogic({
		auth: appLogic.auth,
		setError: appLogic.setError,
		loadDashboard: appLogic.loadDashboard,
	});

	const newChairReadyToCreate =
		(appLogicProps.newChairName || "").trim().length > 0;
	const adminSecretReady =
		(settingsStoreProps.telegramAdminSecretDraft || "").trim().length > 0;

	const mergedProps: Record<string, any> = {
		...appLogicProps,
		...settingsStoreProps,
		...settingsLogic,

		newChairReadyToCreate,
		adminSecretReady,
	};

	const {
		dashboard,
		changeClinicMode,
		clinicProfileDraft,
		clinicProfileSaveState,
		updateClinicProfileDraft,
		saveClinicProfileFromDraft,
		toggleClinicWorkingDay,
		uiLanguage,
		setUiLanguage,
		normalizeUiLanguageInput,
		lookupClinicPublicProfile,
		isClinicPublicLookupLoading,
		newChairName,
		setNewChairName,
		addChair,
		newChairHasXraySensor,
		setNewChairHasXraySensor,
		newChairHasMicroscope,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit,
		setNewChairHasSurgeryKit,
		legalMissingFields,
		weekdayOptions,
		uiLanguageOptions,
		clinicModeLabels,
		deleteChair,
	} = mergedProps;

	if (settingsTab !== "clinic") return null;
	if (!dashboard) return null;

	const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
	const typedWeekdayOptions = weekdayOptions as Array<{ value: number; label: string }>;
	const typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const typedChairs = (dashboard.clinicSettings?.chairs ?? []) as Chair[];

	return (
		<div className="clinic-studio-container animate-fade-in">
			<ClinicModeSection
				dashboard={dashboard}
				clinicModeLabels={clinicModeLabels}
				typedClinicModes={typedClinicModes}
				changeClinicMode={changeClinicMode}
			/>

			<ClinicLegalProfileSection
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
				legalMissingFields={legalMissingFields}
				uiLanguage={uiLanguage}
				setUiLanguage={setUiLanguage}
				normalizeUiLanguageInput={normalizeUiLanguageInput}
				typedUiLanguageOptions={typedUiLanguageOptions}
				clinicProfileSaveState={clinicProfileSaveState}
				saveClinicProfileFromDraft={saveClinicProfileFromDraft}
			/>

			<ClinicScheduleSection
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				toggleClinicWorkingDay={toggleClinicWorkingDay}
				typedWeekdayOptions={typedWeekdayOptions}
			/>

			<ClinicChairsSection
				dashboard={dashboard}
				typedChairs={typedChairs}
				newChairName={newChairName}
				setNewChairName={setNewChairName}
				addChair={addChair}
				newChairReadyToCreate={newChairReadyToCreate}
				newChairHasXraySensor={newChairHasXraySensor}
				setNewChairHasXraySensor={setNewChairHasXraySensor}
				newChairHasMicroscope={newChairHasMicroscope}
				setNewChairHasMicroscope={setNewChairHasMicroscope}
				newChairHasSurgeryKit={newChairHasSurgeryKit}
				setNewChairHasSurgeryKit={setNewChairHasSurgeryKit}
				deleteChair={deleteChair}
			/>

			<AuthArtSection />
		</div>
	);
}
