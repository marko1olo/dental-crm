/**
 * ClinicalQuestTourEngine.ts
 *
 * DENTE CRM — Interactive Game Quest Tour & Guided Coach Marks Engine
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (Zero obstacles, no forced wizards).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero visual landfill, zero cartoon emojis).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-click workflows).
 * - Mandate 8p: The Elephant in the Room (No permanent blocking clutter).
 * - Mandate 8l: Guided Interactive Onboarding & Game Tour Inquisitor.
 *
 * Modularized per /decomposer skill into trainingTourModules/:
 * - trainingTourTypes.ts (Layer 0 types & storage keys)
 * - questCatalogTracks.ts (Layer 1 step catalogs and clinical tracks)
 * - questProgressStateMachine.ts (Layer 2 state machine & persistence)
 */

export {
	DENTE_TOUR_STORAGE_KEY,
	DENTE_QUEST_PROGRESS_STORAGE_KEY,
	type QuestTrackId,
	type QuestArrowDirection,
	type QuestActionTrigger,
	type QuestStep,
	type QuestTrack,
	type QuestTrackProgress,
	type QuestProgressState,
} from "./trainingTourModules/trainingTourTypes";

export {
	SOLO_DOCTOR_TRACK_STEPS,
	RECEPTION_ADMIN_TRACK_STEPS,
	IMAGING_DIAGNOSTICS_TRACK_STEPS,
	CLINICAL_QUEST_TRACKS,
} from "./trainingTourModules/questCatalogTracks";

export {
	getDefaultQuestProgress,
	loadQuestProgress,
	saveQuestProgress,
	pauseQuestTour,
	startQuestTrack,
	advanceQuestStep,
	skipQuestStep,
	dismissQuestTourPermanently,
	getNextTrackId,
	resetQuestProgress,
	isActionTriggerSatisfied,
	dispatchQuestActionCompleted,
} from "./trainingTourModules/questProgressStateMachine";
