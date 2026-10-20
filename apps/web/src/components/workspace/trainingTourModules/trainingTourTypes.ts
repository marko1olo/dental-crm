/**
 * trainingTourTypes.ts
 *
 * Types, interfaces, and storage keys for ClinicalQuestTourEngine.
 * Mandates 8d, 8e, 8l, 8n, 8p.
 */

import type { AppView } from "../../../utils/routeUtils";

export const DENTE_TOUR_STORAGE_KEY = "dente_tour_completed";
export const DENTE_QUEST_PROGRESS_STORAGE_KEY = "dente_quest_progress_v2";

export type QuestTrackId = "solo_doctor" | "reception_admin" | "imaging_diagnostics";

export type QuestArrowDirection = "up" | "down" | "left" | "right";

export interface QuestActionTrigger {
	readonly type: "click" | "keyboard" | "custom_event";
	readonly key?: string;
	readonly shiftKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly eventName?: string;
}

export interface QuestStep {
	readonly id: string;
	readonly stepNumber: number;
	readonly title: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalTip: string;
	readonly shortcutBadge: string;
	readonly targetSelector: string;
	readonly fallbackTargetSelector?: string;
	readonly viewTarget?: AppView;
	readonly actionLabel: string;
	readonly rewardBadge: string;
	readonly arrowDirection: QuestArrowDirection;
	readonly actionTrigger: QuestActionTrigger;
}

export interface QuestTrack {
	readonly id: QuestTrackId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly roleBadge: string;
	readonly estimatedMinutes: number;
	readonly steps: readonly QuestStep[];
}

export interface QuestTrackProgress {
	readonly completed: boolean;
	readonly completedStepIds: readonly string[];
}

export interface QuestProgressState {
	readonly activeTrackId: QuestTrackId;
	readonly currentStepIndex: number;
	readonly completedStepIds: readonly string[];
	readonly isTourActive: boolean;
	readonly isDismissedPermanently: boolean;
	readonly tracksProgress: Record<QuestTrackId, QuestTrackProgress>;
}
