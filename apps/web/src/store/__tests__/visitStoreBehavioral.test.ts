/**
 * apps/web/src/store/__tests__/visitStoreBehavioral.test.ts
 *
 * Behavioral unit test suite for VisitStore (Zustand).
 * Verifies OdontogramSlice, DiaryProtocolSlice, and BillingInvoiceSlice.
 * Mandates: 8e (Doctor autonomy, undo/redo snapshots), 8c/8x (Clean clinical nomenclature, 804n code inference).
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
	useVisitStore,
	inferToothStateFromService,
	mapVisitUiStateToToothDataState,
} from "../visitStore";

describe("VisitStore Behavioral Tests — Odontogram & Treatment History Slice", () => {
	beforeEach(() => {
		useVisitStore.getState().resetVisitToothState();
		useVisitStore.getState().clearVisitHistory();
		useVisitStore.getState().setActiveToothNumber(16);
	});

	it("1. updates active tooth number directly and via functional updater", () => {
		const store = useVisitStore.getState();
		assert.equal(store.activeToothNumber, 16);

		store.setActiveToothNumber(21);
		assert.equal(useVisitStore.getState().activeToothNumber, 21);

		store.setActiveToothNumber((prev) => (prev ? prev + 5 : 11));
		assert.equal(useVisitStore.getState().activeToothNumber, 26);
	});

	it("2. sets and updates individual tooth states with records", () => {
		const store = useVisitStore.getState();
		store.setToothState("16", "caries");

		const updated = useVisitStore.getState();
		assert.equal(updated.visitToothStateByCode["16"], "caries");
		assert.equal(updated.visitToothRecordsByCode["16"]?.state, "caries");
		assert.equal(updated.visitToothRecordsByCode["16"]?.toothNumber, 16);

		// Update to treatment with AI diagnosis
		store.setVisitToothRecord("16", {
			state: "treatment",
			diagnosis: "К04.0 Острый пульпит",
		});

		const afterRecord = useVisitStore.getState();
		assert.equal(afterRecord.visitToothStateByCode["16"], "treatment");
		assert.equal(afterRecord.visitAiDiagnosesByCode["16"], "К04.0 Острый пульпит");
		assert.equal(afterRecord.visitToothRecordsByCode["16"]?.diagnosis, "К04.0 Острый пульпит");
	});

	it("3. clears tooth record and removes state/diagnosis cleanly", () => {
		const store = useVisitStore.getState();
		store.setVisitToothRecord("46", {
			state: "pulpitis",
			diagnosis: "К04.0 Пульпит",
		});

		assert.equal(useVisitStore.getState().visitToothStateByCode["46"], "pulpitis");

		store.clearVisitToothRecord("46");
		const cleared = useVisitStore.getState();
		assert.equal(cleared.visitToothStateByCode["46"], undefined);
		assert.equal(cleared.visitToothRecordsByCode["46"], undefined);
		assert.equal(cleared.visitAiDiagnosesByCode["46"], undefined);
	});

	it("4. snapshot history: pushVisitSnapshot, undoVisit, and redoVisit (Mandate 8e)", () => {
		const store = useVisitStore.getState();
		assert.equal(store.canUndo, false);
		assert.equal(store.canRedo, false);

		// Take initial snapshot before change
		store.pushVisitSnapshot("Исходное состояние");
		store.setToothState("36", "caries");
		store.setActiveToothNumber(36);

		assert.equal(useVisitStore.getState().canUndo, true);
		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], "caries");

		// Perform Undo
		const restoredUndo = useVisitStore.getState().undoVisit();
		assert.equal(restoredUndo, true);
		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], undefined);
		assert.equal(useVisitStore.getState().canRedo, true);

		// Perform Redo
		const restoredRedo = useVisitStore.getState().redoVisit();
		assert.equal(restoredRedo, true);
		assert.equal(useVisitStore.getState().visitToothStateByCode["36"], "caries");
		assert.equal(useVisitStore.getState().activeToothNumber, 36);
	});

	it("5. applyAiToothCodes maps detected codes and states without erasing healthy teeth", () => {
		const store = useVisitStore.getState();
		store.setToothState("11", "done"); // already done

		store.applyAiToothCodes(
			["21", "22"],
			"planned",
			{ "21": "caries", "22": "pulpitis" },
			{ "21": "К02.1 Кариес дентина", "22": "К04.0 Пульпит" },
		);

		const updated = useVisitStore.getState();
		assert.equal(updated.visitToothStateByCode["11"], "done"); // untouched
		assert.equal(updated.visitToothStateByCode["21"], "caries");
		assert.equal(updated.visitToothStateByCode["22"], "pulpitis");
		assert.equal(updated.visitAiDiagnosesByCode["21"], "К02.1 Кариес дентина");
		assert.equal(updated.visitAiDiagnosesByCode["22"], "К04.0 Пульпит");
	});
});

describe("VisitStore Behavioral Tests — Service Inference & Billing Invoice Slice", () => {
	it("6. infers correct clinical tooth states from 804n nomenclature codes", () => {
		// A16.07.001 -> extraction -> missing
		assert.equal(inferToothStateFromService({ code804n: "A16.07.001.001" }), "missing");
		assert.equal(inferToothStateFromService({ code: "A16.07.001.002" }), "missing");

		// A16.07.004 -> crown -> crown
		assert.equal(inferToothStateFromService({ code804n: "A16.07.004.001" }), "crown");

		// A16.07.002 -> restoration -> done
		assert.equal(inferToothStateFromService({ code804n: "A16.07.002.001" }), "done");

		// A16.07.030 -> endodontics -> treatment
		assert.equal(inferToothStateFromService({ code804n: "A16.07.030.001" }), "treatment");
		assert.equal(inferToothStateFromService({ code804n: "A16.07.008.001" }), "treatment");
	});

	it("7. infers clinical tooth states from Russian title keywords when code is missing", () => {
		assert.equal(inferToothStateFromService({ title: "Сложное удаление зуба" }), "missing");
		assert.equal(inferToothStateFromService({ title: "Установка циркониевой коронки" }), "crown");
		assert.equal(inferToothStateFromService({ title: "Светоотверждаемая пломба (композит)" }), "done");
		assert.equal(inferToothStateFromService({ title: "Эндодонтическое лечение пульпита" }), "treatment");
	});

	it("8. adds and removes completed services in visit store", () => {
		const store = useVisitStore.getState();
		store.setCompletedServices([]);
		assert.equal(useVisitStore.getState().completedServices.length, 0);

		store.addCompletedService({
			serviceId: "srv-1",
			code: "A16.07.002.001",
			title: "Лечение кариеса",
			price: 3500,
			quantity: 1,
			amountKopecks: 350000,
		});

		assert.equal(useVisitStore.getState().completedServices.length, 1);
		assert.equal(useVisitStore.getState().completedServices[0].title, "Лечение кариеса");

		store.removeCompletedService(0);
		assert.equal(useVisitStore.getState().completedServices.length, 0);
	});

	it("9. maps visit UI states to clinical ToothChart states correctly", () => {
		assert.equal(mapVisitUiStateToToothDataState("done"), "Filled");
		assert.equal(mapVisitUiStateToToothDataState("crown"), "Crown");
		assert.equal(mapVisitUiStateToToothDataState("missing"), "Missing");
		assert.equal(mapVisitUiStateToToothDataState("treatment"), "Pulpitis");
		assert.equal(mapVisitUiStateToToothDataState("caries"), "Caries");
		assert.equal(mapVisitUiStateToToothDataState("pulpitis"), "Pulpitis");
		assert.equal(mapVisitUiStateToToothDataState("planned"), "Caries");
		assert.equal(mapVisitUiStateToToothDataState("idle"), "Healthy");
		assert.equal(mapVisitUiStateToToothDataState("watch"), "Healthy");
	});
});

describe("VisitStore Behavioral Tests — Diary Protocol Slice", () => {
	it("10. updates visit note form and draft sync states", () => {
		const store = useVisitStore.getState();

		store.setVisitNoteForm((prev) => ({
			...prev,
			complaints: "Болевые ощущения при приеме сладкой пищи",
			diagnosisIcd10: "K02.1",
		}));

		assert.equal(
			useVisitStore.getState().visitNoteForm.complaints,
			"Болевые ощущения при приеме сладкой пищи",
		);
		assert.equal(useVisitStore.getState().visitNoteForm.diagnosisIcd10, "K02.1");

		store.setServerDraftSyncState("saving");
		assert.equal(useVisitStore.getState().serverDraftSyncState, "saving");

		store.setServerDraftSyncState("saved");
		assert.equal(useVisitStore.getState().serverDraftSyncState, "saved");
	});

	it("11. manages audio/dictation telemetry and live RMS", () => {
		const store = useVisitStore.getState();
		store.setIsVisitDictating(true);
		store.setSpeechLiveRms(0.42);

		assert.equal(useVisitStore.getState().isVisitDictating, true);
		assert.equal(useVisitStore.getState().speechLiveRms, 0.42);

		store.setIsVisitDictating(false);
		store.setSpeechLiveRms(0);
		assert.equal(useVisitStore.getState().isVisitDictating, false);
		assert.equal(useVisitStore.getState().speechLiveRms, 0);
	});
});
