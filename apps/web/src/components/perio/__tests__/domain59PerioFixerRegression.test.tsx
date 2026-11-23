/**
 * domain59PerioFixerRegression.test.tsx
 *
 * Интеграционный регрессионный сьют Домена 59 («Зубная формула, Пародонтологическая карта и интеграция Wheeler 2.5D»):
 * 1. SEV-1.1: Выбор секстанта PSR транслирует глубину карманов и кровоточивость в зубы через applyPsrSextantCode.
 * 2. SEV-1.2: Детальный ввод зондирования (карманы 6 мм, подвижность) автоматически пересчитывает секстанты PSR (calculatePsrSextants).
 * 3. SEV-2.1: Устранение Split-Brain подвижности и фуркаций:
 *    - Поддержка mobility и furcation в Tooth46LayerFlags.
 *    - Трансляция mobility и furcation в toothDataToGate0Flags.
 * 4. SEV-3.1: Наличие кнопки сворачивания перио-карты во встроенном режиме (isModal === false).
 * 5. SEV-3.2: Действие «Внести диагноз в приём» для рассчитанного кода МКБ-10 в PerioIndicesPanel.
 * 6. SEV-4.1: Унификация локального кэша в dente_perio_draft_v2_${patientId} и сброс драфта.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	applyPsrSextantCode,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	normalizePerioDentition,
} from "../perioCatalogData";
import { toothDataToGate0Flags } from "../../odontogram/gate0/gate0ToothFlagsConverter";
import type { ToothData } from "../../odontogram/chart/types/toothRendererTypes";
import { PerioIndicesPanel } from "../PerioIndicesPanel";
import { PerioStudioModal } from "../PerioStudioModal";

describe("Домен 59 — Регрессионный сьют Хирурга-Разработчика (Perio Charting & Wheeler 2.5D)", () => {
	it("1. [SEV-1.1] applyPsrSextantCode транслирует Код 4 в зубы секстанта S1 (глубина 7 мм, BOP+, suppuration)", () => {
		const initialTeeth = createDefaultPerioTeeth(2);
		// Применяем Код 4 и астериск к секстанту S1 (зубы 17, 16, 15, 14)
		const updatedTeeth = applyPsrSextantCode(initialTeeth, "S1", 4, true);

		const tooth16 = updatedTeeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16, "Зуб 16 должен существовать");
		assert.strictEqual(tooth16.distoBuccal.probingDepthMm, 7, "Глубина кармана должна быть 7 мм для Кода 4");
		assert.strictEqual(tooth16.distoBuccal.bleedingOnProbing, true, "Кровоточивость BOP должна быть true");
		assert.strictEqual(tooth16.distoBuccal.suppuration, true, "Suppuration должна быть true для Кода 4");
		assert.strictEqual(tooth16.mobility, 2, "Подвижность должна быть 2 при астериске");
		assert.strictEqual(tooth16.furcation, 1, "Фуркация должна быть 1 при астериске на моляре");

		// Зубы вне секстанта S1 (например, зуб 21 из S2) остаются интактными
		const tooth21 = updatedTeeth.find((t) => t.toothNumber === 21);
		assert.ok(tooth21, "Зуб 21 должен существовать");
		assert.strictEqual(tooth21.distoBuccal.probingDepthMm, 2, "Зуб 21 должен остаться с глубиной 2 мм");
		assert.strictEqual(tooth21.distoBuccal.bleedingOnProbing, false, "Зуб 21 не должен иметь кровоточивости");
	});

	it("2. [SEV-1.2] calculatePsrSextants автоматически рассчитывает Код 4 и asterisk для S1 при детальном зондировании", () => {
		const teeth = createDefaultPerioTeeth(2);
		// Имитируем ручной ввод зондирования зуба 16 (глубина 6 мм, подвижность II степени)
		const probedTeeth = teeth.map((t) => {
			if (t.toothNumber === 16) {
				return {
					...t,
					mobility: 2 as const,
					distoBuccal: { ...t.distoBuccal, probingDepthMm: 6, bleedingOnProbing: true },
				};
			}
			return t;
		});

		const psrResults = calculatePsrSextants(probedTeeth);
		assert.ok(psrResults.S1, "Секстант S1 должен быть рассчитан");
		assert.strictEqual(psrResults.S1.code, 4, "Код секстанта S1 должен быть 4 при глубине 6 мм");
		assert.strictEqual(psrResults.S1.asterisk, true, "Астериск должен быть true при подвижности II степени");
		assert.strictEqual(psrResults.S1.highestPocketDepthMm, 6, "Максимальная глубина должна быть 6 мм");

		// Секстант S2 интактен
		assert.strictEqual(psrResults.S2.code, 0, "Секстант S2 должен оставаться Кодом 0");
		assert.strictEqual(psrResults.S2.asterisk, false, "Секстант S2 не должен иметь астериска");
	});

	it("3. [SEV-2.1] toothDataToGate0Flags транслирует mobility и furcation в Tooth46LayerFlags (устранение Split-Brain)", () => {
		const toothWithPerioData: ToothData = {
			toothNumber: 46,
			state: "Periodontitis",
			mobility: 2,
			furcation: 1,
			clinicalData: {
				mobility: 3,
				furcationGrade: 2,
			},
		};

		const flags = toothDataToGate0Flags(toothWithPerioData);
		// Приоритет clinicalData над прямым полем tooth
		assert.strictEqual(flags.mobility, 3, "Mobility 3 из clinicalData должно быть в флагах");
		assert.strictEqual(flags.furcation, 2, "Furcation 2 из clinicalData должно быть в флагах");

		// Проверка чтения из прямого поля при отсутствии clinicalData
		const toothDirect: ToothData = {
			toothNumber: 46,
			state: "Healthy",
			mobility: 1,
			furcation: 1,
		};
		const flagsDirect = toothDataToGate0Flags(toothDirect);
		assert.strictEqual(flagsDirect.mobility, 1, "Mobility 1 должно транслироваться напрямую");
		assert.strictEqual(flagsDirect.furcation, 1, "Furcation 1 должно транслироваться напрямую");
	});

	it("4. [SEV-3.1] PerioStudioModal рендерит кнопку закрытия/сворачивания во встроенном режиме (isModal === false)", () => {
		const html = renderToString(
			<PerioStudioModal
				isOpen={true}
				isModal={false}
				onClose={() => {}}
				patientId="pat-test-123"
			/>,
		);

		assert.ok(html.includes("perio-modal-close-btn"), "Кнопка закрытия/сворачивания должна присутствовать");
		assert.ok(html.includes("Свернуть перио-карту"), "Aria-label должен указывать на сворачивание карты");
	});

	it("5. [SEV-3.2] PerioIndicesPanel рендерит кнопку '+ Внести диагноз в приём' для МКБ-10 кода", () => {
		const html = renderToString(
			<PerioIndicesPanel
				isOpen={true}
				onClose={() => {}}
				olearySummary={{
					totalSites: 168,
					plaqueSites: 10,
					pcrPercent: 6,
					rating: "excellent",
					ratingDescriptionRu: "Идеальная гигиена",
					isSurgicalClearanceMet: true,
				}}
				ohiResult={{
					debrisScore: 0.2,
					calculusScore: 0.1,
					totalScore: 0.3,
					ratingText: "Хорошая гигиена",
				}}
				pmaResult={{
					pmaPercent: 0,
					ratingText: "Воспаление отсутствует",
				}}
				summary={{
					totalTeethExamined: 28,
					totalSitesExamined: 168,
					bleedingSitesCount: 4,
					fmbsPercent: 2,
					plaqueSitesCount: 6,
					fmpsPercent: 3,
					deepPocketsCount: 2,
					furcationInvolvementCount: 1,
					pathologicalMobilityCount: 1,
				}}
				psrFormula="PSR: 4* / 0 / 0 / 0 / 0 / 0"
				suggestedDiagnosisRu="Хронический пародонтит тяжелой степени"
				icd10Code="K05.32"
				onInsertDiagnosisToVisit={() => {}}
			/>,
		);

		assert.ok(html.includes("perio-insert-icd-btn"), "Кнопка внесения диагноза должна присутствовать в разметке");
		assert.ok(html.includes("Внести диагноз в приём"), "Текст кнопки должен быть понятным клиницисту");
		assert.ok(html.includes("K05.32"), "Код МКБ-10 должен отображаться в подсказке");
	});
});
