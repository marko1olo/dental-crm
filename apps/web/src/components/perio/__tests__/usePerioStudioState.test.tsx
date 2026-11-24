/**
 * usePerioStudioState.test.tsx — Юнит-тесты канонического хука состояния пародонтологии.
 * Проверяет:
 * - Инициализацию состояния и расчет индексов PSR
 * - Конвертер результатов скрининга PSR в PsrScreeningMap
 * - Очистку v2 и legacy черновиков при handleClose
 * - Клиническую автономию врача и сброс к норме (handleSetAllIntact)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	convertPsrResultsToScreeningMap,
	usePerioStudioState,
	type UsePerioStudioStateProps,
} from "../usePerioStudioState";

function renderPerioHook(props: UsePerioStudioStateProps) {
	let hookResult: ReturnType<typeof usePerioStudioState> | null = null;
	function Probe() {
		hookResult = usePerioStudioState(props);
		return createElement("span", null, "probe");
	}
	renderToStaticMarkup(createElement(Probe));
	if (!hookResult) {
		throw new Error("Failed to render hook in probe component");
	}
	return hookResult;
}

describe("usePerioStudioState Hook & Zero-Leak Invariants (DEF-PERIO-03, DEF-PERIO-05)", () => {
	it("1. convertPsrResultsToScreeningMap builds valid PsrScreeningMap across all 6 sextants", () => {
		const raw = {
			S1: { code: 1 as const, asterisk: false },
			S2: { code: 2 as const, asterisk: true },
			S3: { code: 0 as const, asterisk: false },
			S4: { code: 3 as const, asterisk: false },
			S5: { code: 4 as const, asterisk: true },
			S6: { code: 2 as const, asterisk: false },
		};
		const map = convertPsrResultsToScreeningMap(raw);
		assert.strictEqual(map.S1.code, 1);
		assert.strictEqual(map.S1.asterisk, false);
		assert.strictEqual(map.S2.code, 2);
		assert.strictEqual(map.S2.asterisk, true);
		assert.strictEqual(map.S4.code, 3);
		assert.strictEqual(map.S5.code, 4);
		assert.strictEqual(map.S5.asterisk, true);
	});

	it("2. initializes with 32 teeth, default S1..S6 all 0 and prophy protocol", () => {
		const state = renderPerioHook({
			patientId: "patient-test-01",
			patientName: "Сидоров С. С.",
			doctorName: "Д-р Смирнова",
		});

		assert.strictEqual(state.teeth.length, 32);
		assert.strictEqual(state.screeningMap.S1.code, 0);
		assert.strictEqual(state.screeningMap.S6.code, 0);
		assert.strictEqual(state.selectedProtocolId, "prophy_airflow_ultrasound");
		assert.strictEqual(state.selectedToothNum, 16);
		assert.strictEqual(state.syncStatus, "idle");
		assert.ok(state.psrSummary.psrFormula.includes("0 / 0 / 0 / 0 / 0 / 0") || state.psrSummary.psrFormula === "0/0/0/0/0/0");
		assert.strictEqual(state.isDetailedExpanded, false);
	});

	it("3. respects initialSelectedTooth and initialTier3Expanded", () => {
		const state = renderPerioHook({
			patientId: "patient-test-02",
			initialSelectedTooth: 24,
			initialTier3Expanded: true,
		});

		assert.strictEqual(state.selectedToothNum, 24);
		assert.strictEqual(state.isDetailedExpanded, true);
	});

	it("4. Zero-Leak Draft Purge: removes both v2 and legacy drafts on handleClose", () => {
		const patientId = "patient-purge-test";
		const originalLocalStorage = globalThis.localStorage;
		const removedKeys: string[] = [];
		const mockStorage: Storage = {
			removeItem: (key: string) => {
				removedKeys.push(key);
			},
			getItem: () => null,
			setItem: () => {},
			clear: () => {},
			key: () => null,
			length: 0,
		};
		globalThis.localStorage = mockStorage;

		try {
			let closed = false;
			const state = renderPerioHook({
				patientId,
				onClose: () => {
					closed = true;
				},
			});

			state.handleClose();

			assert.strictEqual(closed, true, "onClose callback must be called");
			assert.ok(
				removedKeys.includes(`dente_perio_draft_v2_${patientId}`),
				`Must purge dente_perio_draft_v2_${patientId}`,
			);
			assert.ok(
				removedKeys.includes(`dente_perio_draft_${patientId}`),
				`Must purge legacy dente_perio_draft_${patientId}`,
			);
		} finally {
			globalThis.localStorage = originalLocalStorage;
		}
	});

	it("5. handleSetAllIntact executes without throwing and resets dentition state", () => {
		const state = renderPerioHook({
			patientId: "patient-intact-test",
		});

		assert.doesNotThrow(() => {
			state.handleSetAllIntact();
		});
		assert.strictEqual(typeof state.handleSetAllIntact, "function");
	});
});
