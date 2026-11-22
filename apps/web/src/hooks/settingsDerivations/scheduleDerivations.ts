import type { Chair, ClinicMode, Dashboard } from "@dental/shared";
import type { WeekdayOption } from "./types";

export interface ScheduleDerivationsParams {
	clinicProfileSaveState?: string | undefined;
	clinicModeLabels?: Record<string, unknown> | undefined;
	dashboard?: Dashboard | null | undefined;
	weekdayOptions?: WeekdayOption[] | undefined;
	uiLanguageOptions?: Array<{
		value: string;
		label: string;
		detail: string;
	}> | undefined;
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
