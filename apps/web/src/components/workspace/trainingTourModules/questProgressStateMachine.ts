/**
 * questProgressStateMachine.ts
 *
 * Pure State Machine and LocalStorage Persistence for Clinical Quest Tour.
 * Mandates 8e (Doctor Autonomy), 8s (Friction-Killer), 8t (Unit Verification).
 */

import {
	DENTE_QUEST_PROGRESS_STORAGE_KEY,
	DENTE_TOUR_STORAGE_KEY,
	type QuestActionTrigger,
	type QuestProgressState,
	type QuestTrackId,
	type QuestTrackProgress,
} from "./trainingTourTypes";
import { CLINICAL_QUEST_TRACKS, SOLO_DOCTOR_TRACK_STEPS } from "./questCatalogTracks";

export function getDefaultQuestProgress(): QuestProgressState {
	return {
		activeTrackId: "solo_doctor",
		currentStepIndex: 0,
		completedStepIds: [],
		isTourActive: false,
		isDismissedPermanently: false,
		tracksProgress: {
			solo_doctor: { completed: false, completedStepIds: [] },
			reception_admin: { completed: false, completedStepIds: [] },
			imaging_diagnostics: { completed: false, completedStepIds: [] },
		},
	};
}

export function loadQuestProgress(): QuestProgressState {
	if (typeof window === "undefined" || !window.localStorage) {
		return getDefaultQuestProgress();
	}

	try {
		const legacyDismissed = window.localStorage.getItem(DENTE_TOUR_STORAGE_KEY) === "true";
		const raw = window.localStorage.getItem(DENTE_QUEST_PROGRESS_STORAGE_KEY);
		if (!raw) {
			const initial = getDefaultQuestProgress();
			if (legacyDismissed) {
				return {
					...initial,
					isDismissedPermanently: true,
					isTourActive: false,
					tracksProgress: {
						...initial.tracksProgress,
						solo_doctor: {
							completed: true,
							completedStepIds: SOLO_DOCTOR_TRACK_STEPS.map((s) => s.id),
						},
					},
				};
			}
			return initial;
		}

		const parsed = JSON.parse(raw) as Partial<QuestProgressState>;
		return {
			activeTrackId: parsed.activeTrackId || "solo_doctor",
			currentStepIndex: typeof parsed.currentStepIndex === "number" ? parsed.currentStepIndex : 0,
			completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
			isTourActive: Boolean(parsed.isTourActive),
			isDismissedPermanently: Boolean(parsed.isDismissedPermanently || legacyDismissed),
			tracksProgress: parsed.tracksProgress || {
				solo_doctor: { completed: false, completedStepIds: [] },
				reception_admin: { completed: false, completedStepIds: [] },
				imaging_diagnostics: { completed: false, completedStepIds: [] },
			},
		};
	} catch {
		return getDefaultQuestProgress();
	}
}

export function saveQuestProgress(state: QuestProgressState): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(DENTE_QUEST_PROGRESS_STORAGE_KEY, JSON.stringify(state));
		if (state.isDismissedPermanently || state.tracksProgress.solo_doctor.completed) {
			window.localStorage.setItem(DENTE_TOUR_STORAGE_KEY, "true");
		} else {
			window.localStorage.removeItem(DENTE_TOUR_STORAGE_KEY);
		}
		if (typeof window.dispatchEvent === "function") {
			const evt =
				typeof CustomEvent === "function"
					? new CustomEvent("dente:quest-progress-updated", { detail: state })
					: ({ type: "dente:quest-progress-updated", detail: state } as unknown as Event);
			window.dispatchEvent(evt);
		}
	} catch (e) {
		console.warn("DENTE Quest Tour Engine: failed to persist quest progress", e);
	}
}

export function pauseQuestTour(): QuestProgressState {
	const current = loadQuestProgress();
	const next: QuestProgressState = {
		...current,
		isTourActive: false,
	};
	saveQuestProgress(next);
	return next;
}

export function startQuestTrack(
	trackId: QuestTrackId,
	options: { reset?: boolean } = {},
): QuestProgressState {
	const current = loadQuestProgress();
	const track =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	let nextStepIndex = 0;
	if (!options.reset) {
		const trackProgress = current.tracksProgress[trackId];
		if (trackProgress && !trackProgress.completed && trackProgress.completedStepIds.length > 0) {
			const firstUncompleted = track.steps.findIndex(
				(s) => !trackProgress.completedStepIds.includes(s.id),
			);
			nextStepIndex =
				firstUncompleted >= 0
					? firstUncompleted
					: Math.min(current.currentStepIndex, track.steps.length - 1);
		} else if (current.activeTrackId === trackId && current.currentStepIndex > 0) {
			nextStepIndex = Math.min(current.currentStepIndex, track.steps.length - 1);
		}
	}

	const next: QuestProgressState = {
		...current,
		activeTrackId: trackId,
		currentStepIndex: nextStepIndex,
		isTourActive: true,
		isDismissedPermanently: false,
	};
	saveQuestProgress(next);
	return next;
}

export function advanceQuestStep(currentProgress: QuestProgressState): QuestProgressState {
	const track =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === currentProgress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	const step = track.steps[currentProgress.currentStepIndex];
	const stepId = step ? step.id : "";

	const currentCompletedSteps = Array.from(
		new Set([...currentProgress.completedStepIds, ...(stepId ? [stepId] : [])]),
	);

	const isLastStep = currentProgress.currentStepIndex >= track.steps.length - 1;
	const nextIndex = isLastStep ? currentProgress.currentStepIndex : currentProgress.currentStepIndex + 1;

	const trackCompleted = isLastStep;
	const existingTrackProgress = currentProgress.tracksProgress[track.id] || {
		completed: false,
		completedStepIds: [],
	};

	const updatedTrackProgress: QuestTrackProgress = {
		completed: trackCompleted || existingTrackProgress.completed,
		completedStepIds: Array.from(
			new Set([...existingTrackProgress.completedStepIds, ...(stepId ? [stepId] : [])]),
		),
	};

	const nextState: QuestProgressState = {
		...currentProgress,
		completedStepIds: currentCompletedSteps,
		currentStepIndex: nextIndex,
		isTourActive: !isLastStep,
		tracksProgress: {
			...currentProgress.tracksProgress,
			[track.id]: updatedTrackProgress,
		},
	};

	saveQuestProgress(nextState);
	return nextState;
}

export function skipQuestStep(currentProgress: QuestProgressState): QuestProgressState {
	const track =
		CLINICAL_QUEST_TRACKS.find((t) => t.id === currentProgress.activeTrackId) ||
		CLINICAL_QUEST_TRACKS[0]!;

	const isLastStep = currentProgress.currentStepIndex >= track.steps.length - 1;
	const nextIndex = isLastStep ? currentProgress.currentStepIndex : currentProgress.currentStepIndex + 1;

	const nextState: QuestProgressState = {
		...currentProgress,
		currentStepIndex: nextIndex,
		isTourActive: !isLastStep,
	};

	saveQuestProgress(nextState);
	return nextState;
}

export function dismissQuestTourPermanently(): QuestProgressState {
	const current = loadQuestProgress();
	const next: QuestProgressState = {
		...current,
		isTourActive: false,
		isDismissedPermanently: true,
	};
	saveQuestProgress(next);
	return next;
}

export function getNextTrackId(currentTrackId: QuestTrackId): QuestTrackId | null {
	const currentIndex = CLINICAL_QUEST_TRACKS.findIndex((t) => t.id === currentTrackId);
	if (currentIndex >= 0 && currentIndex < CLINICAL_QUEST_TRACKS.length - 1) {
		return CLINICAL_QUEST_TRACKS[currentIndex + 1]!.id;
	}
	return null;
}

export function resetQuestProgress(trackId?: QuestTrackId): QuestProgressState {
	const current = loadQuestProgress();
	if (trackId) {
		const track = CLINICAL_QUEST_TRACKS.find((t) => t.id === trackId);
		const trackStepIds = new Set(track ? track.steps.map((s) => s.id) : []);
		const filteredCompletedStepIds = current.completedStepIds.filter((id) => !trackStepIds.has(id));

		const next: QuestProgressState = {
			...current,
			isTourActive: current.activeTrackId === trackId ? true : current.isTourActive,
			currentStepIndex: current.activeTrackId === trackId ? 0 : current.currentStepIndex,
			completedStepIds: filteredCompletedStepIds,
			tracksProgress: {
				...current.tracksProgress,
				[trackId]: { completed: false, completedStepIds: [] },
			},
		};
		saveQuestProgress(next);
		return next;
	}

	const next = getDefaultQuestProgress();
	saveQuestProgress(next);
	return next;
}

export function isActionTriggerSatisfied(
	trigger: QuestActionTrigger,
	event: {
		type: string;
		key?: string;
		ctrlKey?: boolean;
		metaKey?: boolean;
		shiftKey?: boolean;
		eventName?: string;
	},
): boolean {
	if (trigger.type === "click" && event.type === "click") {
		return true;
	}

	if (trigger.type === "keyboard" && event.type === "keydown") {
		if (trigger.key) {
			const expectedKey = trigger.key.toLowerCase();
			const actualKey = (event.key || "").toLowerCase();
			if (expectedKey !== actualKey) return false;
		}

		if (typeof trigger.shiftKey === "boolean" && Boolean(event.shiftKey) !== trigger.shiftKey) {
			return false;
		}

		if (typeof trigger.ctrlKey === "boolean") {
			const actualCtrlOrCmd = Boolean(event.ctrlKey || event.metaKey);
			if (actualCtrlOrCmd !== trigger.ctrlKey) return false;
		}

		return true;
	}

	if (trigger.type === "custom_event" && event.type === "custom_event") {
		return !trigger.eventName || trigger.eventName === event.eventName;
	}

	return false;
}

export function dispatchQuestActionCompleted(stepId: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("dente:quest-action-completed", {
			detail: { stepId },
		}),
	);
}
