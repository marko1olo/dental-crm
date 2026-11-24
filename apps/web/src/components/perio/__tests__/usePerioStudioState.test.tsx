/**
 * usePerioStudioState.test.tsx — Юнит-тесты канонического хука состояния пародонтологии (DEF-PERIO-03, DEF-PERIO-05).
 * Проверяет:
 * - Инициализацию состояния и расчет индексов PSR
 * - Конвертер результатов скрининга PSR в PsrScreeningMap
 * - Zero-Leak Draft Invariant (Мандат 8zq / DEF-PERIO-05): очистку v2 и legacy черновиков при handleClose
 * - Клиническую автономию врача и сброс к норме (handleSetAllIntact)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
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
		assert.strictEqual(state.psrSummary.psrFormula, "PSR: 0 / 0 / 0 / 0 / 0 / 0");
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

	it("4. Zero-Leak Draft Purge (DEF-PERIO-05 / Mandate 8zq): removes both v2 and legacy drafts on handleClose", () => {
		const patientId = "patient-purge-test";
		safeLocalStorageSetItem(
			`dente_perio_draft_v2_${patientId}`,
			JSON.stringify({ teeth: [], screeningMap: {} }),
		);
		safeLocalStorageSetItem(
			`dente_perio_draft_${patientId}`,
			JSON.stringify({ teeth: [], screeningMap: {} }),
		);

		assert.ok(safeLocalStorageGetItem(`dente_perio_draft_v2_${patientId}`));
		assert.ok(safeLocalStorageGetItem(`dente_perio_draft_${patientId}`));

		let closed = false;
		const state = renderPerioHook({
			patientId,
			onClose: () => {
				closed = true;
			},
		});

		state.handleClose();

		assert.strictEqual(closed, true, "onClose callback must be called");
		assert.strictEqual(
			safeLocalStorageGetItem(`dente_perio_draft_v2_${patientId}`),
			null,
			"Must purge dente_perio_draft_v2_${patientId}",
		);
		assert.strictEqual(
			safeLocalStorageGetItem(`dente_perio_draft_${patientId}`),
			null,
			"Must purge legacy dente_perio_draft_${patientId}",
		);
	});

	it("5. presets and action handlers are callable without exceptions", () => {
		const state = renderPerioHook({
			patientId: "patient-intact-test",
		});

		assert.strictEqual(typeof state.handleSetAllIntact, "function");
		assert.strictEqual(typeof state.handleApplyUpperJawNorm, "function");
		assert.strictEqual(typeof state.handleApplyLowerJawNorm, "function");
		assert.strictEqual(typeof state.handleApplyZeroBop, "function");
		assert.strictEqual(typeof state.handleApplyZeroCalculus, "function");
		assert.strictEqual(typeof state.handleApplyPreset, "function");
		assert.strictEqual(typeof state.handleSelectProtocol, "function");
		assert.strictEqual(typeof state.handleSave, "function");
		assert.strictEqual(typeof state.handlePrintProtocol, "function");

		// Execute handleSetAllIntact and presets safely
		assert.doesNotThrow(() => {
			state.handleSetAllIntact();
		});
		assert.doesNotThrow(() => {
			state.handleApplyUpperJawNorm();
		});
		assert.doesNotThrow(() => {
			state.handleApplyZeroBop();
		});
	});
});
