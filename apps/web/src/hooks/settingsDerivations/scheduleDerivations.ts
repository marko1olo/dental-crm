import type { Chair, ClinicMode, Dashboard } from "@dental/shared";
import type { WeekdayOption } from "./types";

export interface ScheduleDerivationsParams {
	clinicProfileSaveState?: string;
	clinicModeLabels?: Record<string, string>;
	dashboard?: Dashboard | null;
	weekdayOptions?: WeekdayOption[];
	uiLanguageOptions?: Array<{
		value: string;
		label: string;
		detail: string;
	}>;
}

export function deriveScheduleSettings(params: ScheduleDerivationsParams) {
	const {
		clinicProfileSaveState,
		clinicModeLabels,
		dashboard,
		weekdayOptions,
		uiLanguageOptions,
	} = params;

	const clinicProfileSaveButtonText =
		clinicProfileSaveState === "saving"
			? "Сохраняю профиль"
			: clinicProfileSaveState === "saved"
				? "Профиль сохранен"
				: "Сохранить профиль";

	const typedClinicModes = Object.keys(clinicModeLabels ?? {}) as ClinicMode[];
	const typedModeHints = (dashboard?.clinicSettings?.modeHints ?? []) as string[];
	const typedChairs = (dashboard?.clinicSettings?.chairs ?? []) as Chair[];
	const typedWeekdayOptions = (weekdayOptions ?? []) as WeekdayOption[];
	const typedUiLanguageOptions = (uiLanguageOptions ?? []) as Array<{
		value: string;
		label: string;
		detail: string;
	}>;

	return {
		clinicProfileSaveButtonText,
		_typedClinicModes: typedClinicModes,
		_typedModeHints: typedModeHints,
		_typedChairs: typedChairs,
		_typedWeekdayOptions: typedWeekdayOptions,
		_typedUiLanguageOptions: typedUiLanguageOptions,
	};
}
