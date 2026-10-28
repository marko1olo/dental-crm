/**
 * periodontalPsrExpressScreening.test.tsx — Тесты экспресс-скрининга ВОЗ (PSR) и рекомендаций гигиены
 * Проверяет клинические инварианты Мандата 8e, расчет формулы PSR и SSR-рендеринг (Мандат 8b: <= 180 строк).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	computePsrSummary,
	PerioPsrExpressScreening,
} from "../PerioPsrExpressScreening";
import { PeriodontalDetailedChart, createDefaultToothRecord } from "../PeriodontalDetailedChart";
import { PeriodontogramChart } from "../PeriodontogramChart";
import type { PsrScreeningMap } from "../perioTypes";

describe("Periodontal WHO Express Screening (PSR) & Hygiene SSOT", () => {
	it("1. computePsrSummary: All Code 0 sets physiological intact norm (Z01.2)", () => {
		const normMap: PsrScreeningMap = {
			S1: { code: 0 },
			S2: { code: 0 },
			S3: { code: 0 },
			S4: { code: 0 },
			S5: { code: 0 },
			S6: { code: 0 },
		};

		const summary = computePsrSummary(normMap);
		assert.equal(summary.maxPsrCode, 0);
		assert.equal(summary.hasAsterisk, false);
		assert.equal(summary.icd10Code, "Z01.2");
		assert.equal(summary.requiresDetailedCharting, false);
		assert.ok(summary.hygienePlanRu.includes("6 месяцев"));
		assert.equal(summary.psrFormula, "PSR: 0 / 0 / 0 / 0 / 0 / 0");
	});

	it("2. computePsrSummary: Code 2 sets calculus findings and ultrasonic scaling recommendation", () => {
		const calculusMap: PsrScreeningMap = {
			S1: { code: 2 },
			S2: { code: 1 },
			S3: { code: 0 },
			S4: { code: 0 },
			S5: { code: 2 },
			S6: { code: 0 },
		};

		const summary = computePsrSummary(calculusMap);
		assert.equal(summary.maxPsrCode, 2);
		assert.equal(summary.icd10Code, "K05.1");
		assert.ok(summary.hygienePlanRu.includes("ультразвуковое"));
		assert.ok(summary.hygienePlanRu.includes("Air-Flow"));
		assert.equal(summary.requiresDetailedCharting, false);
	});

	it("3. computePsrSummary: Code 3 & 4 flag deep pockets and require detailed charting", () => {
		const periodontitisMap: PsrScreeningMap = {
			S1: { code: 4, asterisk: true },
			S2: { code: 1 },
			S3: { code: 3 },
			S4: { code: 0 },
			S5: { code: 2 },
			S6: { code: 0 },
		};

		const summary = computePsrSummary(periodontitisMap);
		assert.equal(summary.maxPsrCode, 4);
		assert.equal(summary.hasAsterisk, true);
		assert.equal(summary.icd10Code, "K05.3");
		assert.equal(summary.requiresDetailedCharting, true);
		assert.ok(summary.hygienePlanRu.includes("кюретаж"));
		assert.ok(summary.hygienePlanRu.includes("шинирование"));
		assert.ok(summary.psrFormula.includes("4*"));
	});

	it("4. PerioPsrExpressScreening renders 6 sextants and 1-click intact button cleanly via SSR", () => {
		const screeningMap: PsrScreeningMap = {
			S1: { code: 0 },
			S2: { code: 0 },
			S3: { code: 0 },
			S4: { code: 0 },
			S5: { code: 0 },
			S6: { code: 0 },
		};

		const html = renderToString(
			<PerioPsrExpressScreening
				screeningMap={screeningMap}
				onUpdateSextant={() => {}}
				onSetAllIntact={() => {}}
				onApplyHygienePreset={() => {}}
				onApplyPeriodontitisPreset={() => {}}
				isDetailedExpanded={false}
				onToggleDetailed={() => {}}
			/>,
		);

		assert.ok(html.includes("data-testid=\"psr-all-intact-btn\""), "Must contain intact 1-click button");
		assert.ok(html.includes("data-testid=\"psr-hygiene-preset-btn\""), "Must contain hygiene preset button");
		assert.ok(html.includes("data-testid=\"psr-periodontitis-preset-btn\""), "Must contain perio preset button");
		assert.ok(html.includes("data-testid=\"psr-sextant-card-S1\""), "Must render sextant S1");
		assert.ok(html.includes("data-testid=\"psr-sextant-card-S6\""), "Must render sextant S6");
	});

	it("5. PeriodontalDetailedChart renders teeth arch and 6 probing sites cleanly via SSR", () => {
		const initialTooth = createDefaultToothRecord(16);
		const html = renderToString(
			<PeriodontalDetailedChart
				teeth={[initialTooth]}
				onUpdateTooth={() => {}}
				defaultSelectedTooth={16}
			/>,
		);

		assert.ok(html.includes("data-testid=\"perio-tooth-btn-16\""), "Must render tooth 16");
		assert.ok(html.includes("data-testid=\"perio-tooth-btn-26\""), "Must render tooth 26");
		assert.ok(html.includes("Дистально-вестибулярная"), "Must render probing site details");
		assert.ok(html.includes("BOP"), "Must render BOP toggle");
	});

	it("6. PeriodontogramChart integrates PSR Express & Detailed Chart with 1 Primary CTA", () => {
		const html = renderToString(
			<PeriodontogramChart
				patientName="Иванов И.И."
				readOnly={false}
			/>,
		);

		assert.ok(html.includes("data-testid=\"perio-toolbar-norm-1click-btn\""), "Must contain 1-click intact button");
		assert.ok(html.includes("data-testid=\"perio-save-draft-btn\""), "Must contain save CTA button");
		assert.ok(html.includes("data-testid=\"psr-all-intact-btn\""), "Must contain PSR intact button");

		assert.ok(html.includes("Иванов И.И."), "Must display patient name");
	});
});
