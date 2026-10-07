/**
 * apps/web/src/components/odontogram/__tests__/odontogramLifecycleAndHistoryLedger.test.ts
 *
 * T.A.R.S. Adversarial Inquest:
 * Odontogram Persistence & History Ledger Lifecycle Test
 *
 * Verifies end-to-end:
 * 1. mapVisitUiStateToToothDataState accurately maps UI statuses to Clinical ToothState.
 * 2. applyServicesToToothState persists treated tooth states into odontogramStorage.
 * 3. applyServicesToToothState dispatches 'dente-odontogram-update' CustomEvent with patientId and states.
 * 4. ToothColors handles both PascalCase clinical states and lowercase UI aliases.
 * 5. toothHistoryEventsFromResponseBody parses state_change, treatment_procedure, diary_revision with visitId.
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";

if (typeof globalThis.window === "undefined") {
	const listeners = new Map<string, Function[]>();
	(globalThis as any).window = {
		addEventListener: (event: string, fn: Function) => {
			const list = listeners.get(event) || [];
			list.push(fn);
			listeners.set(event, list);
		},
		removeEventListener: (event: string, fn: Function) => {
			const list = listeners.get(event) || [];
			listeners.set(event, list.filter((f) => f !== fn));
		},
		dispatchEvent: (e: any) => {
			const list = listeners.get(e.type) || [];
			for (const fn of list) fn(e);
			return true;
		},
	};
	(globalThis as any).CustomEvent = class CustomEvent {
		type: string;
		detail: any;
		constructor(type: string, init?: any) {
			this.type = type;
			this.detail = init?.detail;
		}
	};
}

import {
	useVisitStore,
	mapVisitUiStateToToothDataState,
	inferToothStateFromService,
} from "../../../store/visitStore";
import {
	loadStoredTeethData,
	saveStoredTeethData,
	clearStoredTeethData,
} from "../odontogramStorage";
import { getToothColors } from "../chart/ToothColors";
import {
	toothHistoryEventsFromResponseBody,
	type ToothHistoryEvent,
} from "../toothHistoryEvents";

describe("Odontogram End-to-End Lifecycle & History Ledger", () => {
	it("1. mapVisitUiStateToToothDataState accurately maps UI states to Clinical ToothChart states", () => {
		assert.equal(mapVisitUiStateToToothDataState("done"), "Filled");
		assert.equal(mapVisitUiStateToToothDataState("crown"), "Crown");
		assert.equal(mapVisitUiStateToToothDataState("missing"), "Missing");
		assert.equal(mapVisitUiStateToToothDataState("treatment"), "Pulpitis");
		assert.equal(mapVisitUiStateToToothDataState("caries"), "Caries");
		assert.equal(mapVisitUiStateToToothDataState("pulpitis"), "Pulpitis");
		assert.equal(mapVisitUiStateToToothDataState("planned"), "Caries");
		assert.equal(mapVisitUiStateToToothDataState("watch"), "Healthy");
		assert.equal(mapVisitUiStateToToothDataState("idle"), "Healthy");
	});

	it("2. inferToothStateFromService infers state from 804n code and procedure title", () => {
		// Filling A16.07.002 -> done
		assert.equal(
			inferToothStateFromService({ code804n: "A16.07.002.010", title: "Световая пломба" }),
			"done",
		);
		// Extraction A16.07.001 -> missing
		assert.equal(
			inferToothStateFromService({ code804n: "A16.07.001", title: "Удаление зуба сложное" }),
			"missing",
		);
		// Crown A16.07.004 -> crown
		assert.equal(
			inferToothStateFromService({ code804n: "A16.07.004", title: "Коронка из диоксида циркония" }),
			"crown",
		);
		// Endo A16.07.030 -> treatment
		assert.equal(
			inferToothStateFromService({ code804n: "A16.07.030", title: "Пульпотомия / каналы" }),
			"treatment",
		);
	});

	it("3. applyServicesToToothState persists treated tooth states to odontogramStorage and dispatches update event", () => {
		const testPatientId = "pat-test-lifecycle-001";
		clearStoredTeethData(testPatientId);

		const eventsCaught: any[] = [];
		const listener = (e: Event) => {
			eventsCaught.push((e as CustomEvent).detail);
		};
		globalThis.window.addEventListener("dente-odontogram-update", listener);

		try {
			useVisitStore.getState().resetVisitToothState();

			useVisitStore.getState().applyServicesToToothState({
				patientId: testPatientId,
				services: [
					{
						code804n: "A16.07.002.010",
						title: "Восстановление зуба пломбой световой (зуб 16)",
						toothNumber: 16,
						price: 4500,
					},
					{
						code804n: "A16.07.004",
						title: "Коронка циркониевая (зуб 26)",
						toothNumber: 26,
						price: 25000,
					},
					{
						code804n: "A16.07.001",
						title: "Удаление зуба (зуб 48)",
						toothNumber: 48,
						price: 3500,
					},
				],
			});

			// Verify store state
			const state = useVisitStore.getState();
			assert.equal(state.visitToothStateByCode["16"], "done");
			assert.equal(state.visitToothStateByCode["26"], "crown");
			assert.equal(state.visitToothStateByCode["48"], "missing");

			// Verify persistence in odontogramStorage
			const stored = loadStoredTeethData(testPatientId);
			assert.ok(stored, "stored data must exist in odontogramStorage");

			const tooth16 = stored?.find((t) => t.toothNumber === 16);
			assert.equal(tooth16?.state, "Filled", "Tooth 16 must be persisted as Filled");

			const tooth26 = stored?.find((t) => t.toothNumber === 26);
			assert.equal(tooth26?.state, "Crown", "Tooth 26 must be persisted as Crown");

			const tooth48 = stored?.find((t) => t.toothNumber === 48);
			assert.equal(tooth48?.state, "Missing", "Tooth 48 must be persisted as Missing");

			// Verify dente-odontogram-update event dispatch
			assert.ok(eventsCaught.length > 0, "dente-odontogram-update must have fired");
			const lastEvent = eventsCaught[eventsCaught.length - 1];
			assert.equal(lastEvent.patientId, testPatientId);
			assert.ok(Array.isArray(lastEvent.states));
		} finally {
			globalThis.window.removeEventListener("dente-odontogram-update", listener);
			clearStoredTeethData(testPatientId);
		}
	});

	it("4. ToothColors provides visually correct styling for clinical states and UI aliases", () => {
		const filledColors = getToothColors("Filled");
		const doneColors = getToothColors("done" as any);
		assert.equal(filledColors.stroke, doneColors.stroke);
		assert.equal(filledColors.fill, doneColors.fill);

		const crownColors = getToothColors("Crown");
		const lowerCrownColors = getToothColors("crown" as any);
		assert.equal(crownColors.stroke, lowerCrownColors.stroke);

		const missingColors = getToothColors("Missing");
		const lowerMissingColors = getToothColors("missing" as any);
		assert.equal(missingColors.isMissing, true);
		assert.equal(lowerMissingColors.isMissing, true);
	});

	it("5. toothHistoryEventsFromResponseBody parses state_change, treatment_procedure, diary_revision with visitId", () => {
		const rawServerBody = JSON.stringify({
			events: [
				{
					type: "state_change",
					date: "2026-10-07T12:00:00.000Z",
					description: "Статус зуба: кариес → пломба / пролечен (Восстановление зуба пломбой световой)",
					authorId: "Петров И.С.",
					visitId: "0199bee2-86ee-7c60-a5ad-e836173df567",
				},
				{
					type: "treatment_procedure",
					date: "2026-10-07T12:15:00.000Z",
					description: "Выполненная процедура: A16.07.002.010 Восстановление зуба пломбой световой [Статус: completed]",
					authorId: "Клинический протокол",
					visitId: "0199bee2-86ee-7c60-a5ad-e836173df567",
				},
				{
					type: "diary_revision",
					date: "2026-10-07T12:30:00.000Z",
					description: "Ревизия записи: Исправленному верить",
					authorId: "Петров И.С.",
					visitId: "0199bee2-86ee-7c60-a5ad-e836173df567",
				},
			],
		});

		const events = toothHistoryEventsFromResponseBody(rawServerBody) as ToothHistoryEvent[];
		assert.ok(events !== null);
		assert.equal(events.length, 3);

		assert.equal(events[0]?.kind, "state_change");
		assert.equal(events[0]?.visitId, "0199bee2-86ee-7c60-a5ad-e836173df567");
		assert.ok(events[0]?.description?.includes("кариес → пломба"));

		assert.equal(events[1]?.kind, "treatment_procedure");
		assert.equal(events[1]?.visitId, "0199bee2-86ee-7c60-a5ad-e836173df567");

		assert.equal(events[2]?.kind, "diary_revision");
		assert.equal(events[2]?.visitId, "0199bee2-86ee-7c60-a5ad-e836173df567");
	});
});
