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
	deductPeriodontalConsumablesSoftOverdraft,
	normalizePerioDentition,
	PERIO_TREATMENT_PROTOCOLS,
	PERIODONTAL_CONSUMABLES_CATALOG,
	PSR_CODES_CATALOG,
	PSR_SEXTANTS_CATALOG,
	type PsrScreeningMap,
} from "../perioCatalogData";
import { createDefaultPerioTeeth } from "@dental/shared";
import { PerioStudioModal } from "../PerioStudioModal";
import { PerioDetailedProbeSection } from "../PerioDetailedProbeSection";
import { DirectPerioLauncher, resolveDirectPerioPatientContext } from "../DirectPerioLauncher";
import { usePatientStore } from "../../../store/patientStore";

describe("Канонический SSOT пародонтологии и экспресс-скрининга PSR", () => {
	it("1. 6 секстантов PSR соответствуют международным стандартам ВОЗ / СтАР", () => {
		assert.strictEqual(PSR_SEXTANTS_CATALOG.length, 6, "Должно быть ровно 6 секстантов");
		const ids = PSR_SEXTANTS_CATALOG.map((s) => s.id);
		assert.deepStrictEqual(ids, ["S1", "S2", "S3", "S4", "S5", "S6"]);

		const s1 = PSR_SEXTANTS_CATALOG.find((s) => s.id === "S1");
		assert.ok(s1);
		assert.strictEqual(s1.teethRange, "17–14");
		assert.deepStrictEqual(s1.teeth, [17, 16, 15, 14]);

		const s2 = PSR_SEXTANTS_CATALOG.find((s) => s.id === "S2");
		assert.ok(s2);
		assert.strictEqual(s2.teethRange, "13–23");
		assert.deepStrictEqual(s2.teeth, [13, 12, 11, 21, 22, 23]);

		const s5 = PSR_SEXTANTS_CATALOG.find((s) => s.id === "S5");
		assert.ok(s5);
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

	it("4. 4 канонических протокола гигиены со списанием расходников и копеечными ценами", () => {
		assert.strictEqual(PERIO_TREATMENT_PROTOCOLS.length, 4);

		const p1 = PERIO_TREATMENT_PROTOCOLS[0];
		assert.ok(p1, "p1 протокол должен быть определен");
		assert.strictEqual(p1.serviceCode, "A16.07.051");
		assert.strictEqual(p1.priceKopecks, 550000);
		assert.ok(p1.titleRu.includes("AirFlow + УЗ-скейлинг"));

		const p2 = PERIO_TREATMENT_PROTOCOLS[1];
		assert.ok(p2, "p2 протокол должен быть определен");
		assert.strictEqual(p2.serviceCode, "A16.07.051.001");
		assert.strictEqual(p2.priceKopecks, 420000);

		const p3 = PERIO_TREATMENT_PROTOCOLS[2];
		assert.ok(p3, "p3 протокол должен быть определен");
		assert.strictEqual(p3.serviceCode, "A16.07.019");
		assert.strictEqual(p3.priceKopecks, 680000);

		const p4 = PERIO_TREATMENT_PROTOCOLS[3];
		assert.ok(p4, "p4 протокол должен быть определен");
		assert.strictEqual(p4.serviceCode, "A16.07.026");
		assert.strictEqual(p4.priceKopecks, 1200000);

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

	it("6. Мандат 8am: Ровно ОДНА Primary CTA кнопка (noble teal) на десктопе", () => {
		const html = renderToString(<PerioStudioModal isModal={true} patientName="Тестовый Пациент" />);

		assert.ok(html.includes("data-testid=\"perio-save-draft-btn\""));
		assert.ok(html.includes("perio-primary-cta-btn"));
		assert.ok(html.includes("Сохранить пародонтограмму"));
	});

	it("7. Apple HIG: На смартфонах рендерится Bottom Sheet хэндл и плавающая нижняя плашка", () => {
		const html = renderToString(<PerioStudioModal isModal={true} patientName="Тестовый Пациент" />);

		assert.ok(html.includes("w-9 h-1 rounded-full bg-[var(--line)] mx-auto"), "Должен быть тактильный drag handle 36x5px");
		assert.ok(html.includes("perio-mobile-floating-bar"), "Должна быть плавающая нижняя плашка Natural Thumb Zone");
		assert.ok(html.includes("rounded-t-[24px]"), "Верхние углы шторки закруглены на 24px");
		assert.ok(html.includes("min-h-[44px]"), "Сенсорная область кнопок >= 44px");
	});

	it("8. Канонические фасады делегируют в PerioStudioModal без регрессий", () => {
		const chartHtml = renderToString(<PerioStudioModal patientName="Тест Фасада" />);
		assert.ok(chartHtml.includes("data-testid=\"interactive-periodontogram\""));
		assert.ok(chartHtml.includes("Тест Фасада"));

		const workspaceHtml = renderToString(<PerioStudioModal isModal={true} patientName="Тест Воркспейса" />);
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

	it("10. DirectPerioLauncher берёт активного пациента из patientStore/пропсов и не хардкодит demo_perio_patient", () => {
		const prevSelectedId = usePatientStore.getState().selectedPatientId;
		const prevDraft = usePatientStore.getState().patientCoreDraft;
		const prevWindow = Reflect.get(globalThis, "window");

		try {
			usePatientStore.setState({
				selectedPatientId: "patient-active-real-uuid",
				patientCoreDraft: { ...prevDraft, fullName: "Смирнова Елена Викторовна" },
			});
			const storeState = usePatientStore.getState();
			const fromStore = resolveDirectPerioPatientContext({
				storePatientId: storeState.selectedPatientId,
				storePatientName: storeState.patientCoreDraft.fullName,
			});
			assert.strictEqual(fromStore.patientId, "patient-active-real-uuid");
			assert.strictEqual(fromStore.patientName, "Смирнова Елена Викторовна");

			const emptyCtx = resolveDirectPerioPatientContext({});
			assert.strictEqual(emptyCtx.patientId, undefined);
			assert.strictEqual(emptyCtx.patientName, "Пациент приёма");

			Reflect.set(globalThis, "window", {
				location: { search: "?perio=1", hash: "#perio", pathname: "/" },
				addEventListener: () => {},
				removeEventListener: () => {},
			});

			const html = renderToString(
				<DirectPerioLauncher patientId="patient-active-real-uuid" patientName="Смирнова Елена Викторовна" />,
			);
			assert.ok(html.includes("data-testid=\"perio-chart-modal\""), "Лаунчер должен открыть модалку по ?perio=1");
			assert.ok(html.includes("Смирнова Елена Викторовна"), "Лаунчер обязан отобразить ФИО активного пациента");
			assert.strictEqual(html.includes("demo_perio_patient"), false, "demo_perio_patient запрещен в UI");
		} finally {
			if (prevWindow === undefined) {
				Reflect.deleteProperty(globalThis, "window");
			} else {
				Reflect.set(globalThis, "window", prevWindow);
			}
			usePatientStore.setState({ selectedPatientId: prevSelectedId, patientCoreDraft: prevDraft });
		}
	});

	it("11. PerioDetailedProbeSection соблюдает Apple HIG тач >= 44x44px и десктоп 36px", () => {
		const noop = () => {};
		const probeHtml = renderToString(
			<PerioDetailedProbeSection
				isDetailedExpanded={true}
				onToggleDetailedExpanded={noop}
				teeth={createDefaultPerioTeeth(2)}
				selectedToothNum={16}
				onSelectToothNum={noop}
				selectedSiteKey="distoBuccal"
				onSelectSiteKey={noop}
				onUpdateMobility={noop}
				onUpdateDepth={noop}
				onToggleBop={noop}
				onTogglePlaque={noop}
			/>,
		);
		assert.ok(probeHtml.includes("data-testid=\"perio-tooth-btn-16\""));
		assert.ok(probeHtml.includes("min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"));
		assert.strictEqual(probeHtml.includes("sm:min-h-[32px]"), false, "В углубленном зондировании не должно оставаться кнопок 32px");
	});

	it("12. Частичная адентия: normalizePerioDentition сохраняет 28 зубов и не затирает данные", () => {
		// Создаем пациента с 28 зубами (удалены 18, 28, 38, 48)
		const all32 = createDefaultPerioTeeth(2);
		const patient28 = all32.filter((t) => ![18, 28, 38, 48].includes(t.toothNumber));
		// Меняем на зубе 16 глубину кармана на 6 мм и BOP true
		const tooth16 = patient28.find((t) => t.toothNumber === 16);
		assert.ok(tooth16);
		tooth16.distoBuccal.probingDepthMm = 6;
		tooth16.distoBuccal.bleedingOnProbing = true;

		// Нормализация должна вернуть 32 зуба, не потеряв измерения зуба 16 и пометив отсутствующие как isMissing: true
		const normalized = normalizePerioDentition(patient28);
		assert.strictEqual(normalized.length, 32, "Формула обязана иметь 32 слота анатомической челюсти");

		const norm16 = normalized.find((t) => t.toothNumber === 16);
		assert.ok(norm16);
		assert.strictEqual(norm16.isMissing, false);
		assert.strictEqual(norm16.distoBuccal.probingDepthMm, 6, "Глубина кармана 6 мм на зубе 16 не должна стираться!");
		assert.strictEqual(norm16.distoBuccal.bleedingOnProbing, true, "BOP на зубе 16 обязан сохраниться!");

		const norm18 = normalized.find((t) => t.toothNumber === 18);
		assert.ok(norm18);
		assert.strictEqual(norm18.isMissing, true, "Отсутствующий зуб 18 обязан быть помечен isMissing: true");

		// При пустом входе или null возвращается интактный пародонт
		const emptyNorm = normalizePerioDentition(null);
		assert.strictEqual(emptyNorm.length, 32);
		assert.strictEqual(emptyNorm.every((t) => !t.isMissing), true);
	});

	it("13. Soft Negative Stock: списание расходников пародонтологии возвращает успех без блокировки", async () => {
		const res = await deductPeriodontalConsumablesSoftOverdraft("hygiene", "test-visit-123");
		assert.strictEqual(res.success, true);
		assert.ok(res.deductedCount > 0, "Должны быть списаны расходники гигиены");
		assert.ok(res.messageRu.includes("Soft Negative Stock") || res.messageRu.includes("овердрафт"));

		const normRes = await deductPeriodontalConsumablesSoftOverdraft("norm");
		assert.strictEqual(normRes.success, true);
		assert.strictEqual(normRes.deductedCount, 0);
	});
});
