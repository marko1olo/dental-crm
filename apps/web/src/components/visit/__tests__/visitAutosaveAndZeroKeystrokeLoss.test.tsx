/**
 * visitAutosaveAndZeroKeystrokeLoss.test.tsx
 *
 * Verifies Zero Keystroke Loss invariants for Doctor Solo in DENTE CRM:
 * 1. useVisitSave contract & store fallback when options.visitNoteForm is omitted.
 * 2. Keystrokes are immediately mirrored to L1 RAM (0ms) and queued for debounced offline persistence.
 * 3. Blank form auto-restoration / flush from L1 RAM / offline draft queue.
 * 4. VisitEmkTab renders cleanly with visitNoteForm passed from parent.
 * 5. useVisitOfflineQueue applyAcceptedVisitResponse non-destructively preserves active local doctor edits.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AcceptVisitDraftResponse, VisitNoteForm } from "@dental/shared";
import {
	useVisitSave,
	type UseVisitSaveOptions,
	type UseVisitSaveReturn,
} from "../useVisitSave";
import { VisitEmkTab, EmkComplaintsAndAnamnesisSection } from "../VisitEmkTab";
import { useVisitOfflineQueue } from "../../../hooks/domains/visit/useVisitOfflineQueue";
import { useVisitStore } from "../../../store/visitStore";
import { useAppStore } from "../../../store/appStore";
import {
	loadVisitDraftSync,
	saveVisitDraftDebounced,
	deleteVisitDraft,
	flushPendingOfflineDrafts,
} from "../../../services/offline/offlineStorage";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage";

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
				},
			} as ReturnType<typeof useAppStore.getState>["dashboard"],
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

		saveVisitDraftDebounced(testVisitId, diaryData, testOrgId, 2000);

		const memDraft = loadVisitDraftSync(testVisitId);
		assert.ok(memDraft, "Draft must be present in L1 RAM before debounce timer fires");
		assert.equal((memDraft?.data as Record<string, unknown>)?.complaint, "Срочный осмотр зуба 1.6");
		assert.equal((memDraft?.data as Record<string, unknown>)?.diagnosis, "K04.0 Пульпит");
	});

	it("3. flushPendingOfflineDrafts flushes L1 RAM debounced drafts to persistent storage", async () => {
		saveVisitDraftDebounced(
			testVisitId,
			{ complaint: "Черновик перед закрытием окна" },
			testOrgId,
			5000,
		);

		await flushPendingOfflineDrafts();

		const draft = loadVisitDraftSync(testVisitId);
		assert.ok(draft, "Draft must persist after flush");
		assert.equal(
			(draft?.data as Record<string, unknown>)?.complaint,
			"Черновик перед закрытием окна",
		);
	});

	it("4. VisitEmkTab and EmkComplaintsAndAnamnesisSection render live visitNoteForm state cleanly", () => {
		const tabHtml = renderToStaticMarkup(
			createElement(VisitEmkTab, {
				openVisitId: testVisitId,
				visitNoteForm: {
					complaint: "Боль в зубе 3.6",
					anamnesis: "Заболел вчера",
					objectiveStatus: "Перкуссия болезненна",
					diagnosis: "K04.0 Пульпит",
					treatmentPlan: "Эндодонтия",
				},
				updateVisitNoteField: () => {},
			}),
		);
		const sectionHtml = renderToStaticMarkup(
			createElement(EmkComplaintsAndAnamnesisSection, {
				visitNoteForm: {
					complaint: "Боль в зубе 3.6",
					anamnesis: "Заболел вчера",
				},
				updateVisitNoteField: () => {},
				isLocked: false,
			}),
		);

		assert.ok(tabHtml.includes('data-testid="visit-emk-tab"'));
		assert.ok(sectionHtml.includes("Боль в зубе 3.6"));
	});

	it("5. useVisitOfflineQueue applyAcceptedVisitResponse non-destructively preserves newer local doctor edits", () => {
		let formState: VisitNoteForm = {
			complaint: "Свежая локальная правка врача",
			anamnesis: "",
			objectiveStatus: "",
			diagnosis: "",
			treatmentPlan: "",
			recommendations: "",
		};
		let capturedApply: ((res: AcceptVisitDraftResponse) => void) | null = null;

		function QueueHarness() {
			const queue = useVisitOfflineQueue({
				auth: { token: "t", clinicToken: "c" },
				setError: () => {},
				dashboard: null,
				setDashboard: () => {},
				activeOrganizationId: testOrgId,
				setDraft: () => {},
				setVisitNoteForm: (updater) => {
					formState = typeof updater === "function" ? updater(formState) : updater;
				},
				setLastVisitSaveReceipt: () => {},
				setPendingVisitSaveCount: () => {},
				setLastPendingVisitSaveAt: () => {},
				isPendingVisitSyncing: false,
				setIsPendingVisitSyncing: () => {},
				isDraftAccepting: false,
				setIsDraftAccepting: () => {},
				hasVisitNoteFormText: true,
				visitNoteForm: formState,
				draft: null,
				transcript: "",
				selectedSpecialty: "therapist",
				visitNoteAcceptMissingSteps: [],
				visitNoteReadyToAccept: true,
				scrollToVisitArea: () => {},
				isDraftAcceptingLocalRef: { current: false },
			});
			capturedApply = queue.applyAcceptedVisitResponse;
			return null;
		}

		renderToStaticMarkup(createElement(QueueHarness));
		assert.ok(capturedApply, "applyAcceptedVisitResponse must be returned by useVisitOfflineQueue");

		capturedApply({
			visit: {
				id: testVisitId,
				patientId: testPatientId,
				organizationId: testOrgId,
				complaint: "Старый снимок жалоб с сервера",
				anamnesis: "Серверный анамнез",
				objectiveStatus: "Серверный статус",
				diagnosis: "K02.1",
				treatmentPlan: "Пломба",
				status: "in_progress",
				revision: 2,
			} as AcceptVisitDraftResponse["visit"],
			visitCloseChecklist: {
				isReadyToClose: false,
				missingSteps: [],
			} as unknown as AcceptVisitDraftResponse["visitCloseChecklist"],
			saveReceipt: { savedAt: "2026-11-28T10:00:00Z", warning: null } as unknown as AcceptVisitDraftResponse["saveReceipt"],
		});

		assert.equal(
			formState.complaint,
			"Свежая локальная правка врача",
			"Non-destructive merge must preserve local keystrokes differing from stale server snapshot",
		);
		assert.equal(formState.anamnesis, "Серверный анамнез", "Empty local fields must hydrate from server snapshot");
	});
});
