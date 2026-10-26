import { showToast } from "../../GlobalToast";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export function dispatchAnamnesisSyncToDiary(
	diaryText: string,
	profile: PatientClinicalSafetyProfile,
	customCallback?: ((diarySnippet: string) => void) | undefined,
) {
	if (customCallback) {
		customCallback(diaryText);
	} else {
		window.dispatchEvent(
			new CustomEvent("dente-sync-anamnesis-to-emk", {
				detail: { diarySnippet: diaryText, profile },
			}),
		);
	}
	if (typeof navigator !== "undefined" && navigator.clipboard) {
		void navigator.clipboard.writeText(diaryText);
	}
	showToast("Анамнез скопирован и синхронизирован с дневником приёма", "info", 3000);
}
