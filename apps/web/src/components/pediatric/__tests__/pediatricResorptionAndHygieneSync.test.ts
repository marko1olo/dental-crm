import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveHygieneOrganizationId } from "../../hygiene/hygieneCatalogData.js";
import {
	dispatchApplySoapProtocol,
	updateVisitNoteStore,
} from "../protocolWidget/pediatricWidgetDispatch.js";
import { useVisitStore } from "../../../store/visitStore.js";
import { mergeTeethWithLocalCache } from "../../odontogram/syncModules/odontogramIndexedDbSync.js";
import type { ToothData } from "../../odontogram/ToothChart.js";

type EventListenerCallback = (e: unknown) => void;

interface MockWindow {
	addEventListener: (type: string, fn: EventListenerCallback) => void;
	removeEventListener: (type: string, fn: EventListenerCallback) => void;
	dispatchEvent: (evt: { type: string; detail?: unknown }) => boolean;
}

const mockWindowListeners = new Map<string, EventListenerCallback[]>();

if (typeof (globalThis as unknown as { window?: MockWindow }).window === "undefined") {
	(globalThis as unknown as { window: MockWindow }).window = {
		addEventListener: (type: string, fn: EventListenerCallback) => {
			const list = mockWindowListeners.get(type) || [];
			list.push(fn);
			mockWindowListeners.set(type, list);
		},
		removeEventListener: (type: string, fn: EventListenerCallback) => {
			const list = (mockWindowListeners.get(type) || []).filter((f) => f !== fn);
			mockWindowListeners.set(type, list);
		},
		dispatchEvent: (evt: { type: string; detail?: unknown }) => {
			for (const fn of mockWindowListeners.get(evt.type) || []) {
				fn(evt);
			}
			return true;
		},
	};
}

describe("Pediatric & Hygiene Red Team Fix Verification Suite", () => {
	it("Defect 2: resolveHygieneOrganizationId resolves real clinic organization and rejects 00000000-0000-0000-0000-000000000001", () => {
		// Explicit override
		assert.equal(
			resolveHygieneOrganizationId("clinic-org-42"),
			"clinic-org-42",
		);

		// Safe non-hardcoded clinic fallback
		const fallbackOrg = resolveHygieneOrganizationId(undefined);
		assert.notEqual(
			fallbackOrg,
			"00000000-0000-0000-0000-000000000001",
			"Must never fall back to hardcoded dummy org ID",
		);
		assert.ok(fallbackOrg.length > 0, "Must produce a valid tenant string");
	});

	it("Defect 3: updateVisitNoteStore prevents duplicate text insertion into objectiveStatus", () => {
		// Reset store state
		useVisitStore.getState().setVisitNoteForm({ objectiveStatus: "" });

		const sampleText = "Объективно: полость рта санирована. Зуб 54 интактен.";
		updateVisitNoteStore(sampleText);
		assert.equal(
			useVisitStore.getState().visitNoteForm.objectiveStatus,
			sampleText,
		);

		// Second dispatch of the same text must NOT duplicate
		updateVisitNoteStore(sampleText);
		assert.equal(
			useVisitStore.getState().visitNoteForm.objectiveStatus,
			sampleText,
			"Identical protocol text must not be appended multiple times",
		);
	});

	it("Defect 3: dispatchApplySoapProtocol deduplicates rapid identical dispatches (< 1200ms)", () => {
		let dispatchCount = 0;
		const listener: EventListenerCallback = () => {
			dispatchCount++;
		};
		window.addEventListener("dente-apply-soap-protocol", listener);

		try {
			const mockCalc = {
				diagnosisIcd10: "K02.1",
				treatmentDescription: "Лечение кариеса дентина зуба 54",
				statusLocalis: "Кариозная полость на окклюзионной поверхности",
				recommendations: "Контрольный осмотр через 6 месяцев",
				toothFindingState: "Caries" as const,
			};

			// First dispatch fires event
			dispatchApplySoapProtocol(mockCalc, 54, ["O"]);
			assert.equal(dispatchCount, 1);

			// Immediate identical dispatch must be suppressed by idempotency guard
			dispatchApplySoapProtocol(mockCalc, 54, ["O"]);
			assert.equal(dispatchCount, 1, "Duplicate dispatch within window must be suppressed");
		} finally {
			window.removeEventListener("dente-apply-soap-protocol", listener);
		}
	});

	it("Defect 1: mergeTeethWithLocalCache preserves rootResorptionStage and mobility during F5 rehydration", () => {
		const cachedTeeth: ToothData[] = [
			{
				toothNumber: 54,
				state: "Healthy",
				rootResorptionStage: 50,
				rootResorption: 50,
				mobility: 1,
				updatedAt: new Date(Date.now() - 5000).toISOString(),
			},
		];

		const incomingServerTeeth: ToothData[] = [
			{
				toothNumber: 54,
				state: "Healthy",
				updatedAt: new Date().toISOString(),
			},
		];

		const merged = mergeTeethWithLocalCache(cachedTeeth, incomingServerTeeth);
		const tooth54 = merged.find((t) => t.toothNumber === 54);
		assert.ok(tooth54, "Tooth 54 must be present in merged state");
		assert.equal(
			tooth54.rootResorptionStage,
			50,
			"Root resorption stage must be preserved after merge",
		);
		assert.equal(
			tooth54.rootResorption,
			50,
			"Root resorption alias must be preserved after merge",
		);
		assert.equal(tooth54.mobility, 1, "Mobility degree must be preserved after merge");
	});
});
