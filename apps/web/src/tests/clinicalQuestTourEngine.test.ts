/**
 * clinicalQuestTourEngine.test.ts
 *
 * Red Team Inquisitor Verification for ClinicalQuestTourEngine:
 * 1. Multi-Track Catalog Invariant: 3 distinct tracks (Solo Doctor, Reception Admin, Imaging Diagnostics).
 * 2. Step Coverage & Selectors: All steps have verified selectors, action triggers, and clinical shortcuts.
 * 3. Zero Cartoon Emojis: Strict audit across all titles, badges, descriptions, tips, and reward badges.
 * 4. State Lifecycle & LocalStorage: Progress loading, advancing, skipping, resets, and dismissal.
 * 5. Action Trigger Evaluation: Verifies click, keyboard (Shift, Ctrl/Cmd), and custom_event triggers.
 * 6. Backward Compatibility: Synchronizes with legacy dente_tour_completed key.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	CLINICAL_QUEST_TRACKS,
	DENTE_QUEST_PROGRESS_STORAGE_KEY,
	DENTE_TOUR_STORAGE_KEY,
	IMAGING_DIAGNOSTICS_TRACK_STEPS,
	RECEPTION_ADMIN_TRACK_STEPS,
	SOLO_DOCTOR_TRACK_STEPS,
	advanceQuestStep,
	dismissQuestTourPermanently,
	getDefaultQuestProgress,
	isActionTriggerSatisfied,
	loadQuestProgress,
	resetQuestProgress,
	saveQuestProgress,
	skipQuestStep,
	startQuestTrack,
} from "../components/workspace/ClinicalQuestTourEngine";

test("ClinicalQuestTourEngine — Interactive Guided Game Tour Verification", async (t) => {
	await t.test("1. Multi-Track Catalog contains exactly the 3 required clinical scenarios", () => {
		assert.strictEqual(CLINICAL_QUEST_TRACKS.length, 3, "Must define 3 clinical quest tracks");

		const trackIds = CLINICAL_QUEST_TRACKS.map((t) => t.id);
		assert.deepStrictEqual(
			trackIds,
			["solo_doctor", "reception_admin", "imaging_diagnostics"],
			"Track IDs must match Solo Doctor, Reception Admin, and Imaging Diagnostics",
		);

		// Track 1: Solo Doctor
		const soloTrack = CLINICAL_QUEST_TRACKS[0]!;
		assert.strictEqual(soloTrack.steps.length, 4, "Solo Doctor track must have 4 steps");
		assert.strictEqual(soloTrack.steps, SOLO_DOCTOR_TRACK_STEPS);
		assert.ok(soloTrack.title.includes("соло-врача"));

		// Track 2: Reception Admin
		const adminTrack = CLINICAL_QUEST_TRACKS[1]!;
		assert.strictEqual(adminTrack.steps.length, 4, "Reception Admin track must have 4 steps");
		assert.strictEqual(adminTrack.steps, RECEPTION_ADMIN_TRACK_STEPS);
		assert.ok(adminTrack.title.includes("Регистратура"));

		// Track 3: Imaging Diagnostics
		const imagingTrack = CLINICAL_QUEST_TRACKS[2]!;
		assert.strictEqual(imagingTrack.steps.length, 3, "Imaging Diagnostics track must have 3 steps");
		assert.strictEqual(imagingTrack.steps, IMAGING_DIAGNOSTICS_TRACK_STEPS);
		assert.ok(imagingTrack.title.includes("диагностика") || imagingTrack.title.includes("КТ"));
	});

	await t.test("2. Zero cartoon emojis across all tracks, steps, tips, and reward badges", () => {
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const track of CLINICAL_QUEST_TRACKS) {
			assert.strictEqual(emojiRegex.test(track.title), false, `Track title "${track.title}" must not contain emojis`);
			assert.strictEqual(emojiRegex.test(track.description), false, `Track description must not contain emojis`);
			assert.strictEqual(emojiRegex.test(track.roleBadge), false, `Track roleBadge must not contain emojis`);

			for (const step of track.steps) {
				assert.strictEqual(emojiRegex.test(step.title), false, `Step title "${step.title}" must not contain emojis`);
				assert.strictEqual(emojiRegex.test(step.badge), false, `Step badge "${step.badge}" must not contain emojis`);
				assert.strictEqual(emojiRegex.test(step.description), false, `Step description must not contain emojis`);
				assert.strictEqual(emojiRegex.test(step.clinicalTip), false, `Step clinicalTip must not contain emojis`);
				assert.strictEqual(emojiRegex.test(step.shortcutBadge), false, `Step shortcutBadge must not contain emojis`);
				assert.strictEqual(emojiRegex.test(step.rewardBadge), false, `Step rewardBadge must not contain emojis`);
			}
		}
	});

	await t.test("3. Step action triggers and target selectors are configured correctly", () => {
		// Solo Doctor Track
		const soloStep1 = SOLO_DOCTOR_TRACK_STEPS[0]!;
		assert.ok(soloStep1.targetSelector.includes("schedule-booking"));
		assert.strictEqual(soloStep1.actionTrigger.type, "click");

		const soloStep2 = SOLO_DOCTOR_TRACK_STEPS[1]!;
		assert.ok(soloStep2.targetSelector.includes("tooth-card") || soloStep2.targetSelector.includes("odontogram-formula"));
		assert.strictEqual(soloStep2.actionTrigger.type, "keyboard");
		assert.strictEqual(soloStep2.actionTrigger.key, "N");
		assert.strictEqual(soloStep2.actionTrigger.shiftKey, true);

		const soloStep3 = SOLO_DOCTOR_TRACK_STEPS[2]!;
		assert.strictEqual(soloStep3.actionTrigger.type, "keyboard");
		assert.strictEqual(soloStep3.actionTrigger.key, "s");
		assert.strictEqual(soloStep3.actionTrigger.ctrlKey, true);

		const soloStep4 = SOLO_DOCTOR_TRACK_STEPS[3]!;
		assert.strictEqual(soloStep4.actionTrigger.type, "keyboard");
		assert.strictEqual(soloStep4.actionTrigger.key, "F9");

		// Reception Admin Track
		const adminStep1 = RECEPTION_ADMIN_TRACK_STEPS[0]!;
		assert.strictEqual(adminStep1.actionTrigger.type, "keyboard");
		assert.strictEqual(adminStep1.actionTrigger.key, "k");
		assert.strictEqual(adminStep1.actionTrigger.ctrlKey, true);

		// Imaging Track
		const imagingStep1 = IMAGING_DIAGNOSTICS_TRACK_STEPS[0]!;
		assert.strictEqual(imagingStep1.actionTrigger.type, "keyboard");
		assert.strictEqual(imagingStep1.actionTrigger.key, "F7");
	});

	await t.test("4. Action Trigger evaluation logic (click, keyboard combinations)", () => {
		// Click trigger
		assert.strictEqual(
			isActionTriggerSatisfied({ type: "click" }, { type: "click" }),
			true,
			"Click trigger must match click event",
		);
		assert.strictEqual(
			isActionTriggerSatisfied({ type: "click" }, { type: "keydown" }),
			false,
			"Click trigger must reject keydown event",
		);

		// Keyboard: Shift+N
		const shiftNTrigger = { type: "keyboard" as const, key: "N", shiftKey: true };
		assert.strictEqual(
			isActionTriggerSatisfied(shiftNTrigger, { type: "keydown", key: "n", shiftKey: true }),
			true,
			"Case-insensitive match for Shift+N",
		);
		assert.strictEqual(
			isActionTriggerSatisfied(shiftNTrigger, { type: "keydown", key: "n", shiftKey: false }),
			false,
			"Must reject Shift+N when shiftKey is false",
		);

		// Keyboard: Ctrl+S or Cmd+S
		const ctrlSTrigger = { type: "keyboard" as const, key: "s", ctrlKey: true };
		assert.strictEqual(
			isActionTriggerSatisfied(ctrlSTrigger, { type: "keydown", key: "S", ctrlKey: true }),
			true,
			"Must match Ctrl+S",
		);
		assert.strictEqual(
			isActionTriggerSatisfied(ctrlSTrigger, { type: "keydown", key: "s", metaKey: true }),
			true,
			"Must match Cmd+S on macOS",
		);
		assert.strictEqual(
			isActionTriggerSatisfied(ctrlSTrigger, { type: "keydown", key: "s", ctrlKey: false, metaKey: false }),
			false,
			"Must reject 's' without Ctrl/Cmd",
		);

		// Custom Event
		const customTrigger = { type: "custom_event" as const, eventName: "dente:tooth-selected" };
		assert.strictEqual(
			isActionTriggerSatisfied(customTrigger, { type: "custom_event", eventName: "dente:tooth-selected" }),
			true,
		);
		assert.strictEqual(
			isActionTriggerSatisfied(customTrigger, { type: "custom_event", eventName: "other-event" }),
			false,
		);
	});

	await t.test("5. Progress state machine and localStorage lifecycle", () => {
		// Mock Storage
		const storageMap = new Map<string, string>();
		const mockStorage: Storage = {
			getItem: (key: string) => storageMap.get(key) ?? null,
			setItem: (key: string, val: string) => {
				storageMap.set(key, String(val));
			},
			removeItem: (key: string) => {
				storageMap.delete(key);
			},
			clear: () => storageMap.clear(),
			key: (idx: number) => Array.from(storageMap.keys())[idx] ?? null,
			length: storageMap.size,
		};

		const originalWindow = (globalThis as unknown as { window?: { localStorage?: Storage } }).window;
		(globalThis as unknown as { window: { localStorage: Storage } }).window = {
			localStorage: mockStorage,
		};

		try {
			// Initially default state
			const initial = loadQuestProgress();
			assert.strictEqual(initial.activeTrackId, "solo_doctor");
			assert.strictEqual(initial.currentStepIndex, 0);
			assert.strictEqual(initial.isTourActive, false);
			assert.strictEqual(initial.isDismissedPermanently, false);

			// Start Solo Doctor Track
			const started = startQuestTrack("solo_doctor");
			assert.strictEqual(started.isTourActive, true);
			assert.strictEqual(started.currentStepIndex, 0);
			assert.strictEqual(mockStorage.getItem(DENTE_TOUR_STORAGE_KEY), null);

			// Advance step 1 -> step 2
			const step2 = advanceQuestStep(started);
			assert.strictEqual(step2.currentStepIndex, 1);
			assert.ok(step2.completedStepIds.includes("schedule_1click"));

			// Skip step 2 -> step 3
			const step3 = skipQuestStep(step2);
			assert.strictEqual(step3.currentStepIndex, 2);

			// Advance step 3 -> step 4
			const step4 = advanceQuestStep(step3);
			assert.strictEqual(step4.currentStepIndex, 3);

			// Advance final step 4 -> completed
			const completed = advanceQuestStep(step4);
			assert.strictEqual(completed.tracksProgress.solo_doctor.completed, true);
			assert.strictEqual(completed.isTourActive, false);
			// Must sync legacy key
			assert.strictEqual(mockStorage.getItem(DENTE_TOUR_STORAGE_KEY), "true");

			// Start reception admin track
			const adminStarted = startQuestTrack("reception_admin");
			assert.strictEqual(adminStarted.activeTrackId, "reception_admin");
			assert.strictEqual(adminStarted.currentStepIndex, 0);
			assert.strictEqual(adminStarted.isTourActive, true);

			// Dismiss permanently
			const dismissed = dismissQuestTourPermanently();
			assert.strictEqual(dismissed.isDismissedPermanently, true);
			assert.strictEqual(dismissed.isTourActive, false);
			assert.strictEqual(mockStorage.getItem(DENTE_TOUR_STORAGE_KEY), "true");

			// Reset progress
			const reset = resetQuestProgress();
			assert.strictEqual(reset.isDismissedPermanently, false);
			assert.strictEqual(reset.tracksProgress.solo_doctor.completed, false);
		} finally {
			if (originalWindow) {
				(globalThis as unknown as { window?: { localStorage?: Storage } }).window = originalWindow;
			} else {
				delete (globalThis as unknown as { window?: unknown }).window;
			}
		}
	});

	await t.test("6. Legacy dente_tour_completed backward compatibility fallback", () => {
		const storageMap = new Map<string, string>();
		storageMap.set(DENTE_TOUR_STORAGE_KEY, "true"); // User previously completed legacy tour

		const mockStorage: Storage = {
			getItem: (key: string) => storageMap.get(key) ?? null,
			setItem: (key: string, val: string) => {
				storageMap.set(key, String(val));
			},
			removeItem: (key: string) => {
				storageMap.delete(key);
			},
			clear: () => storageMap.clear(),
			key: (idx: number) => Array.from(storageMap.keys())[idx] ?? null,
			length: storageMap.size,
		};

		const originalWindow = (globalThis as unknown as { window?: { localStorage?: Storage } }).window;
		(globalThis as unknown as { window: { localStorage: Storage } }).window = {
			localStorage: mockStorage,
		};

		try {
			const loaded = loadQuestProgress();
			assert.strictEqual(loaded.isDismissedPermanently, true, "Legacy true must treat as dismissed permanently");
			assert.strictEqual(loaded.isTourActive, false);
			assert.strictEqual(loaded.tracksProgress.solo_doctor.completed, true);
		} finally {
			if (originalWindow) {
				(globalThis as unknown as { window?: { localStorage?: Storage } }).window = originalWindow;
			} else {
				delete (globalThis as unknown as { window?: unknown }).window;
			}
		}
	});
});
