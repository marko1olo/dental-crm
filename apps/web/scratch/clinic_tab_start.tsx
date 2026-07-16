		</div>
	);
}

export function SettingsClinicTab({
	props,
	settingsTab,
}: {
	props: Record<string, any>;
	settingsTab: string;
}) {
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
