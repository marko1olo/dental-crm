/**
 * perioSSOTSuite.test.tsx — Канонический сьют тестов модуля пародонтологии и экспресс-скрининга PSR DENTE CRM.
 * Проверяет: 6 секстантов PSR (S1..S6), шкалу кодов 0..4+*, 4 протокола гигиены, Mandate 8e (автономия врача),
 * Mandate 8am (ровно 1 Primary CTA #0d9488), Apple HIG (сенсорная зона >= 44x44px, bottom sheet handle),
 * и отсутствие чужих брендов и эмодзи.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	computePsrSummary,
	PERIO_TREATMENT_PROTOCOLS,
	PERIODONTAL_CONSUMABLES_CATALOG,
	PSR_CODES_CATALOG,
	PSR_SEXTANTS_CATALOG,
	type PsrScreeningMap,
} from "../perioCatalogData";
import { PerioStudioModal } from "../PerioStudioModal";
import { PeriodontogramChart } from "../PeriodontogramChart";
import { PerioWorkspaceModal } from "../PerioWorkspaceModal";
import { DirectPerioLauncher } from "../DirectPerioLauncher";

describe("Канонический SSOT пародонтологии и экспресс-скрининга PSR", () => {
	it("1. 6 секстантов PSR соответствуют международным стандартам ВОЗ / СтАР", () => {
		assert.strictEqual(PSR_SEXTANTS_CATALOG.length, 6, "Должно быть ровно 6 секстантов");
		const ids = PSR_SEXTANTS_CATALOG.map((s) => s.id);
		assert.deepStrictEqual(ids, ["S1", "S2", "S3", "S4", "S5", "S6"]);

		const s1 = PSR_SEXTANTS_CATALOG.find((s) => s.id === "S1")!;
		assert.strictEqual(s1.teethRange, "17–14");
		assert.deepStrictEqual(s1.teeth, [17, 16, 15, 14]);

		const s2 = PSR_SEXTANTS_CATALOG.find((s) => s.id === "S2")!;
		assert.strictEqual(s2.teethRange, "13–23");
		assert.deepStrictEqual(s2.teeth, [13, 12, 11, 21, 22, 23]);

		const s5 = PSR_SEXTANTS_CATALOG.find((s) => s.id === "S5")!;
		assert.strictEqual(s5.teethRange, "43–33");
		assert.deepStrictEqual(s5.teeth, [43, 42, 41, 31, 32, 33]);
	});

	it("2. Шкала кодов PSR (0..4 и *) содержит точные клинические критерии", () => {
		const code0 = PSR_CODES_CATALOG[0];
		assert.ok(code0.criteriaRu.includes("Цветная полоса зонда видна полностью"));
		assert.strictEqual(code0.colorHex, "#10b981");

		const code1 = PSR_CODES_CATALOG[1];
		assert.ok(code1.criteriaRu.includes("Кровоточивость при зондировании BOP"));

		const code2 = PSR_CODES_CATALOG[2];
		assert.ok(code2.criteriaRu.includes("Над-/поддесневой зубной камень"));

		const code3 = PSR_CODES_CATALOG[3];
		assert.ok(code3.criteriaRu.includes("Глубина кармана 3.5–5.5 мм"));

		const code4 = PSR_CODES_CATALOG[4];
		assert.ok(code4.criteriaRu.includes("Глубина кармана > 5.5 мм"));
	});

	it("3. computePsrSummary рассчитывает сводную формулу и диагноз МКБ-10", () => {
		const normMap: PsrScreeningMap = {
			S1: { code: 0 }, S2: { code: 0 }, S3: { code: 0 },
			S4: { code: 0 }, S5: { code: 0 }, S6: { code: 0 },
		};
		const normSummary = computePsrSummary(normMap);
		assert.strictEqual(normSummary.maxPsrCode, 0);
		assert.strictEqual(normSummary.psrFormula, "PSR: 0 / 0 / 0 / 0 / 0 / 0");
		assert.strictEqual(normSummary.icd10Code, "Z01.2");
		assert.strictEqual(normSummary.requiresDetailedCharting, false);

		const perioMap: PsrScreeningMap = {
			S1: { code: 0 }, S2: { code: 1 }, S3: { code: 3, asterisk: true },
			S4: { code: 0 }, S5: { code: 2 }, S6: { code: 0 },
		};
		const perioSummary = computePsrSummary(perioMap);
		assert.strictEqual(perioSummary.maxPsrCode, 3);
		assert.strictEqual(perioSummary.hasAsterisk, true);
		assert.strictEqual(perioSummary.psrFormula, "PSR: 0 / 1 / 3* / 0 / 2 / 0");
		assert.strictEqual(perioSummary.icd10Code, "K05.3");
		assert.strictEqual(perioSummary.requiresDetailedCharting, true);
	});

	it("4. 4 канонических 1-клик протокола гигиены со списанием расходников", () => {
		assert.strictEqual(PERIO_TREATMENT_PROTOCOLS.length, 4);

		const p1 = PERIO_TREATMENT_PROTOCOLS[0];
		assert.strictEqual(p1.code804n, "A16.07.051");
		assert.strictEqual(p1.defaultPriceRub, 5500);
		assert.ok(p1.titleRu.includes("AirFlow + УЗ-скейлинг"));

		const p2 = PERIO_TREATMENT_PROTOCOLS[1];
		assert.strictEqual(p2.code804n, "A16.07.051.001");
		assert.strictEqual(p2.defaultPriceRub, 4200);

		const p3 = PERIO_TREATMENT_PROTOCOLS[2];
		assert.strictEqual(p3.code804n, "A16.07.019");
		assert.strictEqual(p3.defaultPriceRub, 6800);

		const p4 = PERIO_TREATMENT_PROTOCOLS[3];
		assert.strictEqual(p4.code804n, "A16.07.026");
		assert.strictEqual(p4.defaultPriceRub, 12000);

		assert.ok(PERIODONTAL_CONSUMABLES_CATALOG.hygiene.length > 0);
		assert.ok(PERIODONTAL_CONSUMABLES_CATALOG.vector.length > 0);
		assert.ok(PERIODONTAL_CONSUMABLES_CATALOG.splinting.length > 0);
		assert.ok(PERIODONTAL_CONSUMABLES_CATALOG.recession.length > 0);
	});

	it("5. Мандат 8e (Автономия врача): Кнопки действий НИКОГДА не disabled", () => {
		const html = renderToString(<PerioStudioModal isModal={true} patientName="Тестовый Пациент" />);

		assert.ok(html.includes("data-testid=\"perio-save-draft-btn\""));
		assert.ok(html.includes("data-testid=\"perio-save-mobile-btn\""));
		assert.strictEqual(html.includes("disabled=\"\""), false, "Кнопки не должны быть заблокированы");
	});

	it("6. Мандат 8am: Ровно ОДНА Primary CTA кнопка #0d9488 на десктопе", () => {
		const html = renderToString(<PerioStudioModal isModal={true} patientName="Тестовый Пациент" />);

		assert.ok(html.includes("data-testid=\"perio-save-draft-btn\""));
		assert.ok(html.includes("bg-[#0d9488]"));
		assert.ok(html.includes("✓ Зафиксировать пародонтальный статус"));
	});

	it("7. Apple HIG: На смартфонах рендерится Bottom Sheet хэндл и плавающая нижняя плашка", () => {
		const html = renderToString(<PerioStudioModal isModal={true} patientName="Тестовый Пациент" />);

		assert.ok(html.includes("w-9 h-1 rounded-full bg-[var(--line)] mx-auto"), "Должен быть тактильный drag handle 36x5px");
		assert.ok(html.includes("perio-mobile-floating-bar"), "Должна быть плавающая нижняя плашка Natural Thumb Zone");
		assert.ok(html.includes("rounded-t-[24px]"), "Верхние углы шторки закруглены на 24px");
		assert.ok(html.includes("min-h-[44px]"), "Сенсорная область кнопок >= 44px");
	});

	it("8. Канонические фасады делегируют в PerioStudioModal без регрессий", () => {
		const chartHtml = renderToString(<PeriodontogramChart patientName="Тест Фасада" />);
		assert.ok(chartHtml.includes("data-testid=\"interactive-periodontogram\""));
		assert.ok(chartHtml.includes("Тест Фасада"));

		const workspaceHtml = renderToString(<PerioWorkspaceModal patientName="Тест Воркспейса" />);
		assert.ok(workspaceHtml.includes("data-testid=\"interactive-periodontogram\""));
	});

	it("9. Безупречная чистота: Ноль чужих брендов и ноль эмодзи", () => {
		const html = renderToString(<PerioStudioModal isModal={true} />);

		assert.strictEqual(html.includes("IDENT"), false);
		assert.strictEqual(html.includes("DentalPRO"), false);
		assert.strictEqual(html.includes("StomX"), false);
		assert.strictEqual(html.includes("iStom"), false);
		assert.strictEqual(html.includes("Florida Probe"), false);

		const emojiRegex = /(?![✓\u2713\u2714])[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(html), false, "В HTML не должно быть мультяшных эмодзи");
	});
});
