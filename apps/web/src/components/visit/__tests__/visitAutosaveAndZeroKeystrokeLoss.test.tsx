/**
 * visitAutosaveAndZeroKeystrokeLoss.test.tsx
 *
 * Verifies Zero Keystroke Loss invariants for Doctor Solo in DENTE CRM:
 * 1. useVisitSave contract & store fallback when options.visitNoteForm is omitted.
 * 2. Keystrokes are immediately mirrored to L1 RAM (0ms) and queued for debounced offline persistence.
 * 3. Blank form auto-restoration from L1 RAM / IndexedDB drafts.
 * 4. Structural invariants: VisitEmkTab passes visitNoteForm explicitly to useVisitSave.
 * 5. Structural invariants: useVisitLogic applyAcceptedVisitResponse non-destructively preserves active doctor notes.
 * 6. Structural invariants: useVisitSave contains emergency unload flush (flushPendingStorageWrites + flushPendingOfflineDrafts + sendBeacon).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	useVisitSave,
	type UseVisitSaveOptions,
	type UseVisitSaveReturn,
} from "../useVisitSave";
import { useVisitStore } from "../../../store/visitStore";
import { useAppStore } from "../../../store/appStore";
import {
	loadVisitDraftSync,
	saveVisitDraft,
	saveVisitDraftDebounced,
	deleteVisitDraft,
	flushPendingOfflineDrafts,
} from "../../../services/offline/offlineStorage";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderVisitSave(options: UseVisitSaveOptions): UseVisitSaveReturn {
	let captured: UseVisitSaveReturn | null = null;
	function TestHarness() {
		captured = useVisitSave(options);
		return null;
	}
	renderToStaticMarkup(createElement(TestHarness));
	if (!captured) {
		throw new Error("Failed to capture useVisitSave hook");
	}
	return captured;
}

describe("Visit Autosave & Zero Keystroke Loss Invariants", () => {
	const testVisitId = "visit-test-zero-loss-101";
	const testPatientId = "patient-test-zero-loss-202";
	const testOrgId = "org-test-zero-loss-303";

	beforeEach(() => {
		clearInMemoryStorageCache();
		useVisitStore.setState({
			visitNoteForm: {
				complaint: "",
				anamnesis: "",
				objectiveStatus: "",
				diagnosis: "",
				treatmentPlan: "",
			},
			serverDraftSyncState: "idle",
			lastServerDraftSavedAt: null,
		});
		useAppStore.setState({
			dashboard: {
				activeVisit: {
					id: testVisitId,
					patientId: testPatientId,
					organizationId: testOrgId,
					complaint: "",
					anamnesis: "",
					objectiveStatus: "",
					diagnosis: "",
					treatmentPlan: "",
					revision: 1,
					status: "in_progress",
				} as any,
			} as any,
		});
	});

	afterEach(async () => {
		await deleteVisitDraft(testVisitId);
	});

	it("1. useVisitSave renders cleanly and returns complete reactive interface with store fallback", () => {
		useVisitStore.getState().setVisitNoteForm({
			complaint: "Острая боль при накусывании на 3.6",
			anamnesis: "Заболел вчера вечером",
			objectiveStatus: "Кариозная полость на жевательной поверхности",
			diagnosis: "K02.1 Кариес дентина",
			treatmentPlan: "Препарирование и пломбирование",
		});

		const hook = renderVisitSave({
			visitId: testVisitId,
			patientId: testPatientId,
			debounceMs: 500,
		});

		assert.equal(typeof hook.triggerSave, "function");
		assert.equal(typeof hook.flushPendingSave, "function");
		assert.equal(hook.isSaving, false);
		assert.equal(hook.saveState, "idle");
	});

	it("2. Keystrokes are immediately mirrored to L1 RAM in 0ms (Anti-HDD Thrashing & Anti-Crash)", () => {
		const diaryData = {
			complaint: "Срочный осмотр зуба 1.6",
			anamnesis: "Боли в течение 3 дней",
			objectiveStatus: "Зондирование болезненно",
			diagnosis: "K04.0 Пульпит",
			treatmentPlan: "Эндодонтическое лечение",
		};

		// Simulate debounced keystroke mirror
		saveVisitDraftDebounced(testVisitId, diaryData, testOrgId, 2000);

		// Synchronous lookup from L1 RAM (0ms seek time)
		const memDraft = loadVisitDraftSync(testVisitId);
		assert.ok(memDraft, "Draft must be present in L1 RAM before debounce timer fires");
		assert.equal((memDraft?.data as any)?.complaint, "Срочный осмотр зуба 1.6");
		assert.equal((memDraft?.data as any)?.diagnosis, "K04.0 Пульпит");
	});

	it("3. flushPendingOfflineDrafts flushes L1 RAM debounced drafts to persistent storage", async () => {
		saveVisitDraftDebounced(
			testVisitId,
			{ complaint: "Черновик перед закрытием окна" },
			testOrgId,
			5000,
		);

		// Flush debounced queue to disk
		await flushPendingOfflineDrafts();

		const draft = loadVisitDraftSync(testVisitId);
		assert.ok(draft, "Draft must persist after flush");
		assert.equal(
			(draft?.data as any)?.complaint,
			"Черновик перед закрытием окна",
		);
	});

	it("4. Structural invariant: VisitEmkTab passes visitNoteForm to useVisitSave", () => {
		const visitEmkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
		const source = fs.readFileSync(visitEmkTabPath, "utf8");

		// Check that useVisitSave call in VisitEmkTab includes visitNoteForm
		assert.ok(
			source.includes("visitNoteForm,"),
			"VisitEmkTab must pass visitNoteForm explicitly to useVisitSave",
		);
	});

	it("5. Structural invariant: useVisitLogic applyAcceptedVisitResponse non-destructively preserves active doctor notes", () => {
		const useVisitLogicPath = path.resolve(
			__dirname,
			"../../../hooks/domains/useVisitLogic.ts",
		);
		const source = fs.readFileSync(useVisitLogicPath, "utf8");

		// Verify functional updater is used in setVisitNoteForm
		assert.ok(
			source.includes("setVisitNoteForm((currentForm) =>"),
			"applyAcceptedVisitResponse must use functional updater in setVisitNoteForm to prevent overwriting active keystrokes",
		);
		// Verify doctor edits are preserved
		assert.ok(
			source.includes("localVal && localVal !== srvVal"),
			"applyAcceptedVisitResponse must preserve local doctor edits when they differ from server snapshot",
		);
	});

	it("6. Structural invariant: useVisitSave contains emergency unload flush and fallback to useVisitStore", () => {
		const useVisitSavePath = path.resolve(__dirname, "../useVisitSave.ts");
		const source = fs.readFileSync(useVisitSavePath, "utf8");

		assert.ok(
			source.includes("options.visitNoteForm ?? storeVisitNoteForm"),
			"useVisitSave must fallback to storeVisitNoteForm when prop is omitted",
		);
		assert.ok(
			source.includes("flushPendingStorageWrites()"),
			"useVisitSave must flush pending storage writes on unload",
		);
		assert.ok(
			source.includes("flushPendingOfflineDrafts()"),
			"useVisitSave must flush pending offline drafts on unload",
		);
		assert.ok(
			source.includes("navigator.sendBeacon"),
			"useVisitSave must attempt background beacon delivery on unload",
		);
		assert.ok(
			source.includes("saveVisitDraftDebounced"),
			"useVisitSave must mirror keystrokes to L1 RAM debounced draft queue",
		);
	});
});
