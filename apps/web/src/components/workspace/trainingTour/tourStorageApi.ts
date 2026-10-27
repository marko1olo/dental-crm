import {
	DENTE_TOUR_STORAGE_KEY,
	type QuestStep,
	type QuestTrackId,
	SOLO_DOCTOR_TRACK_STEPS,
	dismissQuestTourPermanently,
	loadQuestProgress,
	pauseQuestTour,
	resetQuestProgress,
	startQuestTrack,
} from "../ClinicalQuestTourEngine";

export { DENTE_TOUR_STORAGE_KEY };
export { pauseQuestTour as pauseDoctorTour };

export type ClinicalTourStep = QuestStep;

export const CLINICAL_TRAINING_STEPS: readonly ClinicalTourStep[] = SOLO_DOCTOR_TRACK_STEPS;

export function isTourCompleted(): boolean {
	const progress = loadQuestProgress();
	return progress.isDismissedPermanently || progress.tracksProgress.solo_doctor.completed;
}

export function completeTourPermanently(): void {
	dismissQuestTourPermanently();
}

export function resetDoctorTour(): void {
	resetQuestProgress();
}

export function startDoctorTour(trackId: QuestTrackId = "solo_doctor"): void {
	if (typeof window === "undefined") return;
	startQuestTrack(trackId);
	window.dispatchEvent(new CustomEvent("dente:start-doctor-tour", { detail: { trackId } }));
}
