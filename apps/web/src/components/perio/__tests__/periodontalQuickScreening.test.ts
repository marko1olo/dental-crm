/**
 * periodontalQuickScreening.test.ts — Тестирование экспресс-скрининга пародонта (PSR / CPITN),
 * 1-клик пресетов нормы и ликвидации принудительного аппаратного симулятора
 * (Мандаты 8e, 8i, 8k, 8n).
 *
 * Проверяет:
 * 1. 1-Клик Пресет «Норма пародонта» (глубина <= 2 мм, BOP 0, PSR 0 во всех 6 секстантах).
 * 2. 1-Клик Пресет «Гингивит» (BOP+ диффузная кровоточивость, карманы < 3.5 мм, PSR 1-2).
 * 3. 1-Клик Пресет «Пародонтит средней степени» (карманы до 5 мм, PSR 3).
 * 4. Наложение кодов PSR (0..4, *) на отдельные секстанты (S1..S6).
 * 5. Формирование чистого регламентного протокола Формы 043/у без мусора и симуляций.
 * 6. Инварианты Мандатов 8e и 8k:
 *    - Запрет несанкционированного перехвата клавиатуры Numpad (по умолчанию отключен).
 *    - Рендеринг интерфейса без палок в колёса врачу и без мультяшных эмодзи.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	PSR_SEXTANTS,
} from "@dental/shared";
import React from "react";
import { renderToString } from "react-dom/server";
import { PeriodontogramChart } from "../PeriodontogramChart";
import {
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
} from "../perioMath";

describe("Periodontal Express Screening & Doctor Autonomy (Mandates 8e, 8i, 8k, 8n)", () => {
	const initialTeeth = createDefaultPerioTeeth();

	// ──────────────────────────────────────────────────────────────────────────
	// 1. ПРЕСЕТ: НОРМА ПАРОДОНТА (1 КЛИК)
	// ──────────────────────────────────────────────────────────────────────────
	test("1. Пресет «Норма пародонта»: глубина <= 2 мм, BOP = 0%, PSR 0 во всех 6 секстантах", () => {
		const normTeeth = applyHealthyPeriodontiumPreset(initialTeeth);

		// Проверяем зубы и точки
		assert.equal(normTeeth.length, 32, "Все 32 зуба обработаны");

		for (const tooth of normTeeth) {
			assert.equal(
				tooth.mobility,
				0,
				`Зуб ${tooth.toothNumber}: подвижность должна быть 0`,
			);
			assert.equal(
				tooth.furcation,
				0,
				`Зуб ${tooth.toothNumber}: фуркация должна быть 0`,
			);

			const sites = [
				tooth.distoBuccal,
				tooth.midBuccal,
				tooth.mesioBuccal,
				tooth.distoLingual,
				tooth.midLingual,
				tooth.mesioLingual,
			];

			for (const site of sites) {
				assert.ok(
					site.probingDepthMm <= 2,
					`Зуб ${tooth.toothNumber}: глубина должна быть <= 2 мм, получено: ${site.probingDepthMm}`,
				);
				assert.equal(
					site.bleedingOnProbing,
					false,
					`Зуб ${tooth.toothNumber}: кровоточивость BOP должна отсутствовать`,
				);
				assert.equal(site.plaque, false, "Налет должен отсутствовать");
				assert.equal(site.calculus, false, "Камень должен отсутствовать");
				assert.equal(site.suppuration, false, "Нагноение должно отсутствовать");
			}
		}

		// Расчет общих пародонтальных индексов через @dental/shared
		const indices = calculatePerioIndices(normTeeth);
		assert.equal(indices.totalSitesProbed, 192, "Всего 192 точки измерения");
		assert.equal(
			indices.fmbsPercent,
			0,
			"Индекс кровоточивости FMBS (BOP) должен быть 0%",
		);
		assert.equal(indices.fmpsPercent, 0, "Индекс налета FMPS должен быть 0%");
		assert.equal(
			indices.deepPocketsCount,
			0,
			"Глубоких карманов быть не должно",
		);
		assert.equal(
			indices.meanPocketDepthMm,
			2,
			"Средняя глубина зондирования 2 мм",
		);

		// Расчет секстантов PSR (ВОЗ)
		const psr = calculatePsrSextants(normTeeth);
		assert.equal(getPsrMaxCode(psr), 0, "Максимальный код PSR должен быть 0");
		assert.equal(
			hasPsrAsterisk(psr),
			false,
			"Символ * (патология фуркации/подвижности) должен отсутствовать",
		);

		for (const sextant of PSR_SEXTANTS) {
			const sResult = psr[sextant.name];
			assert.ok(sResult, `Секстант ${sextant.name} рассчитан`);
			assert.equal(
				sResult.code,
				0,
				`Секстант ${sextant.name}: код должен быть 0 (Здоров)`,
			);
			assert.equal(
				sResult.asterisk,
				false,
				`Секстант ${sextant.name}: asterisk должен быть false`,
			);
		}

		// Протокол дневника Формы 043/у
		const diaryText = generatePsrDiaryProtocol("perio_norm_express");
		assert.ok(
			diaryText.includes(
				"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет.",
			),
			"Протокол содержит нормативный текст по Мандату 8e/8k",
		);
		assert.ok(
			diaryText.includes("маргинальная десна бледно-розовая"),
			"Протокол содержит клиническое описание нормы",
		);
		assert.ok(
			diaryText.includes("глубина зубодесневой борозды 1-2 мм"),
			"Протокол фиксирует физиологическую борозду",
		);
		assert.ok(
			diaryText.includes("кровоточивость отсутствует"),
			"Протокол фиксирует отсутствие BOP",
		);
		assert.ok(
			diaryText.includes("Скрининг PSR: 0 во всех секстантах"),
			"Протокол фиксирует код PSR 0",
		);
		assert.ok(diaryText.includes("Z01.2"), "Протокол содержит МКБ-10 Z01.2");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 2. ПРЕСЕТ: ГИНГИВИТ (1 КЛИК)
	// ──────────────────────────────────────────────────────────────────────────
	test("2. Пресет «Гингивит»: карманы < 3.5 мм, диффузная кровоточивость BOP+, PSR 1-2", () => {
		const gingivitisTeeth = applyGingivitisPreset(initialTeeth);

		assert.equal(gingivitisTeeth.length, 32);

		for (const tooth of gingivitisTeeth) {
			assert.equal(tooth.mobility, 0, "При гингивите подвижности нет");
			assert.equal(tooth.furcation, 0, "При гингивите поражения фуркаций нет");

			const sites = [
				tooth.distoBuccal,
				tooth.midBuccal,
				tooth.mesioBuccal,
				tooth.distoLingual,
				tooth.midLingual,
				tooth.mesioLingual,
			];

			for (const site of sites) {
				assert.ok(
					site.probingDepthMm <= 3,
					`Зуб ${tooth.toothNumber}: глубина при гингивите <= 3 мм (ложный карман), получено: ${site.probingDepthMm}`,
				);
				assert.equal(
					site.bleedingOnProbing,
					true,
					"Диффузный BOP+ при зондировании",
				);
				assert.equal(site.plaque, true, "Наличие зубного налета");
			}
		}

		// Индексы
		const indices = calculatePerioIndices(gingivitisTeeth);
		assert.equal(
			indices.fmbsPercent,
			100,
			"FMBS (BOP) 100% (диффузная кровоточивость)",
		);
		assert.equal(
			indices.deepPocketsCount,
			0,
			"Истинные глубокие карманы (>= 5 мм) отсутствуют",
		);

		// Секстанты PSR
		const psr = calculatePsrSextants(gingivitisTeeth);
		const maxCode = getPsrMaxCode(psr);
		assert.ok(
			maxCode === 1 || maxCode === 2,
			`Максимальный код PSR должен быть 1 или 2, получено: ${maxCode}`,
		);
		assert.equal(hasPsrAsterisk(psr), false, "При гингивите звездочки * нет");

		// Протокол дневника Формы 043/у
		const diaryText = generatePsrDiaryProtocol("gingivitis_express");
		assert.ok(
			diaryText.includes("десна отечна, гиперемирована"),
			"Описание воспаления десны",
		);
		assert.ok(diaryText.includes("BOP+"), "Фиксация BOP+");
		assert.ok(diaryText.includes("ложные карманы"), "Фиксация ложных карманов");
		assert.ok(diaryText.includes("K05.1"), "МКБ-10 K05.1");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 3. ПРЕСЕТ: ПАРОДОНТИТ СРЕДНЕЙ СТЕПЕНИ (1 КЛИК)
	// ──────────────────────────────────────────────────────────────────────────
	test("3. Пресет «Пародонтит средней степени»: карманы до 5 мм, PSR 3, рецессия, подвижность", () => {
		const perioTeeth = applyPeriodontitisModeratePreset(initialTeeth);

		// Проверяем моляры: глубина 5 мм
		const molar16 = perioTeeth.find((t) => t.toothNumber === 16);
		assert.ok(molar16, "Моляр 16 найден");
		assert.equal(
			molar16.distoBuccal.probingDepthMm,
			5,
			"Глубина кармана моляра 5 мм (PSR 3)",
		);
		assert.equal(
			molar16.distoBuccal.gingivalMarginMm,
			1,
			"Рецессия десны 1 мм",
		);
		assert.equal(
			molar16.distoBuccal.calMm,
			6,
			"Потеря прикрепления CAL = 5 + 1 = 6 мм",
		);
		assert.equal(molar16.furcation, 1, "Фуркация I степени на моляре");

		// Индексы
		const indices = calculatePerioIndices(perioTeeth);
		assert.ok(
			indices.deepPocketsCount > 0,
			"Присутствуют патологические карманы >= 5 мм",
		);

		// PSR
		const psr = calculatePsrSextants(perioTeeth);
		assert.equal(
			getPsrMaxCode(psr),
			3,
			"Максимальный код PSR должен быть 3 (3.5-5.5 мм)",
		);
		assert.equal(
			hasPsrAsterisk(psr),
			true,
			"Символ * должен быть выставлен из-за фуркации/подвижности",
		);

		// Протокол
		const diaryText = generatePsrDiaryProtocol(
			"periodontitis_moderate_express",
		);
		assert.ok(
			diaryText.includes("глубина пародонтальных карманов 3.5–5.0 мм (PSR 3)"),
		);
		assert.ok(diaryText.includes("K05.3"), "МКБ-10 K05.3");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 3a. ПРЕСЕТ: ПАРОДОНТИТ ЛЕГКОЙ СТЕПЕНИ (1 КЛИК)
	// ──────────────────────────────────────────────────────────────────────────
	test("3a. Пресет «Пародонтит легкой степени»: карманы 3.5-4 мм, PSR 2-3, BOP+, CAL 1-2 мм", () => {
		const mildTeeth = applyPeriodontitisMildPreset(initialTeeth);

		const molar16 = mildTeeth.find((t) => t.toothNumber === 16);
		assert.ok(molar16, "Моляр 16 найден");
		assert.equal(molar16.distoBuccal.probingDepthMm, 4, "Глубина кармана 4 мм");
		assert.equal(molar16.distoBuccal.bleedingOnProbing, true, "BOP+");
		assert.equal(molar16.furcation, 0, "Фуркация 0 при легкой степени");

		const indices = calculatePerioIndices(mildTeeth);
		assert.equal(indices.deepPocketsCount, 0, "Глубоких карманов (>=5 мм) нет");
		assert.ok(indices.moderatePocketsCount > 0, "Есть умеренные карманы 4 мм");

		const diaryText = generatePsrDiaryProtocol("periodontitis_mild_express");
		assert.ok(diaryText.includes("K05.30"), "МКБ-10 K05.30");
		assert.ok(diaryText.includes("3.5–4.0 мм"), "Глубина карманов 3.5-4.0 мм");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 3b. ПРЕСЕТ: ПАРОДОНТИТ ТЯЖЕЛОЙ СТЕПЕНИ (1 КЛИК)
	// ──────────────────────────────────────────────────────────────────────────
	test("3b. Пресет «Пародонтит тяжелой степени»: карманы >=6 мм, PSR 4*, гноетечение, подвижность II-III", () => {
		const severeTeeth = applyPeriodontitisSeverePreset(initialTeeth);

		const molar16 = severeTeeth.find((t) => t.toothNumber === 16);
		assert.ok(molar16, "Моляр 16 найден");
		assert.equal(molar16.distoBuccal.probingDepthMm, 7, "Глубина кармана 7 мм");
		assert.equal(molar16.distoBuccal.suppuration, true, "Гноетечение из кармана");
		assert.equal(molar16.furcation, 2, "Фуркационный дефект II степени");
		assert.equal(molar16.mobility, 2, "Подвижность II степени");

		const indices = calculatePerioIndices(severeTeeth);
		assert.ok(indices.deepPocketsCount >= 8, "Множественные глубокие карманы (>=5 мм)");
		assert.ok(indices.sitesWithSuppurationCount > 0, "Точки гноетечения зафиксированы");

		const psr = calculatePsrSextants(severeTeeth);
		assert.equal(getPsrMaxCode(psr), 4, "Код PSR 4 (карманы >= 6 мм)");
		assert.equal(hasPsrAsterisk(psr), true, "Символ * выставлен");

		const diaryText = generatePsrDiaryProtocol("periodontitis_severe_express");
		assert.ok(diaryText.includes("K05.32"), "МКБ-10 K05.32");
		assert.ok(diaryText.includes("гноетечение"), "Фиксация гноетечения");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 4. ПОСЕКСТАНТНЫЙ СКРИНИНГ PSR (S1..S6)
	// ──────────────────────────────────────────────────────────────────────────
	test("4. Наложение кодов PSR на секстанты S1..S6 изолированно и с символом *", () => {
		let currentTeeth = applyHealthyPeriodontiumPreset(initialTeeth);

		// Секстант S1 (17..14) -> Код 3 (карманы 5 мм, камень, кровоточивость)
		currentTeeth = applyPsrSextantCode(currentTeeth, "S1", 3);

		const tooth16 = currentTeeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16, "Зуб 16 найден");
		assert.equal(tooth16.distoBuccal.probingDepthMm, 5);
		assert.equal(tooth16.distoBuccal.bleedingOnProbing, true);
		assert.equal(tooth16.distoBuccal.calculus, true);

		// Проверяем, что соседний зуб 13 (входит в S2) остался здоровым (код 0, глубина 2)
		const tooth13 = currentTeeth.find((t) => t.toothNumber === 13);
		assert.ok(tooth13, "Зуб 13 найден");
		assert.equal(tooth13.distoBuccal.probingDepthMm, 2);
		assert.equal(tooth13.distoBuccal.bleedingOnProbing, false);

		// Секстант S5 (33..43) -> Код 4 со звездочкой * (глубина 7 мм, нагноение, подвижность II)
		currentTeeth = applyPsrSextantCode(currentTeeth, "S5", 4, true);

		const tooth41 = currentTeeth.find((t) => t.toothNumber === 41);
		assert.ok(tooth41, "Зуб 41 найден");
		assert.equal(tooth41.midBuccal.probingDepthMm, 7);
		assert.equal(
			tooth41.midBuccal.suppuration,
			true,
			"Код 4 включает гноетечение",
		);
		assert.equal(
			tooth41.mobility,
			2,
			"Символ * установил патологическую подвижность II ст.",
		);

		// Проверяем итоговый расчет PSR
		const psr = calculatePsrSextants(currentTeeth);
		const s1Result = psr.S1;
		const s5Result = psr.S5;

		assert.ok(s1Result, "S1 результат найден");
		assert.ok(s5Result, "S5 результат найден");
		assert.equal(s1Result.code, 3, "S1 имеет код 3");
		assert.equal(s5Result.code, 4, "S5 имеет код 4");
		assert.equal(s5Result.asterisk, true, "S5 имеет флаг *");
		assert.equal(getPsrMaxCode(psr), 4, "Максимальный код челюсти = 4");
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 5. ИНВАРИАНТ МАНДАТА 8k: ОТСУТСТВИЕ ПРИНУДИТЕЛЬНОГО СИМУЛЯТОРА
	// ──────────────────────────────────────────────────────────────────────────
	test("5. Инвариант Мандата 8k: Numpad-перехват выключен по умолчанию", () => {
		const htmlDefault = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "patient-test-perio-autonomy",
				patientName: "Кузнецов Петр Сергеевич",
			}),
		);

		// 1. Проверяем наличие чекбокса отключения симулятора в быстром скрининге
		assert.ok(
			htmlDefault.includes('data-testid="perio-probe-keyboard-toggle"'),
			"В быстром скрининге присутствует переключатель клавиатуры Numpad",
		);

		// 2. Проверяем, что по умолчанию корневой контейнер имеет tabIndex=\"-1\" (не перехватывает фокус)
		assert.ok(
			htmlDefault.includes('tabindex="-1"') ||
				htmlDefault.includes('tabIndex="-1"'),
			"Контейнер пародонтограммы по умолчанию не перехватывает фокус клавиатуры",
		);

		// 3. Проверяем наличие всех 6 быстрых пресетов в разметке
		assert.ok(
			htmlDefault.includes('data-testid="perio-preset-norm-card"'),
			"Кнопка «Норма» доступна в 1 клик",
		);
		assert.ok(
			htmlDefault.includes('data-testid="perio-preset-prophy-card"'),
			"Кнопка «Профгигиена» доступна в 1 клик",
		);
		assert.ok(
			htmlDefault.includes('data-testid="perio-preset-gingivitis-card"'),
			"Кнопка «Гингивит» доступна в 1 клик",
		);
		assert.ok(
			htmlDefault.includes('data-testid="perio-preset-mild-periodontitis-card"'),
			"Кнопка «Пародонтит легкий» доступна в 1 клик",
		);
		assert.ok(
			htmlDefault.includes('data-testid="perio-preset-periodontitis-card"'),
			"Кнопка «Пародонтит средний» доступна в 1 клик",
		);
		assert.ok(
			htmlDefault.includes('data-testid="perio-preset-severe-periodontitis-card"'),
			"Кнопка «Пародонтит тяжелый» доступна в 1 клик",
		);
		assert.ok(
			htmlDefault.includes("Пародонтит легкий"),
			"Подпись легкого пародонтита присутствует",
		);
		assert.ok(
			htmlDefault.includes("Пародонтит средний"),
			"Подпись среднего пародонтита присутствует",
		);
		assert.ok(
			htmlDefault.includes("Пародонтит тяжелый"),
			"Подпись тяжелого пародонтита присутствует",
		);

		// 4. Проверяем секстанты PSR в разметке
		for (const sextant of PSR_SEXTANTS) {
			assert.ok(
				htmlDefault.includes(sextant.name),
				`Секстант ${sextant.name} отображается в карточке экспресс-скрининга`,
			);
		}

		// 5. Проверяем дублирующий переключатель в Tier 3 (6-точечное зондирование), когда Tier 3 раскрыт
		const htmlTier3 = renderToString(
			React.createElement(PeriodontogramChart, {
				patientId: "patient-test-perio-tier3",
				patientName: "Кузнецов Петр Сергеевич",
				initialTier3Expanded: true,
			}),
		);
		assert.ok(
			htmlTier3.includes('data-testid="perio-probe-keyboard-toggle-tier3"'),
			"В раскрытой панели Tier 3 пародонтограммы присутствует дублирующий переключатель клавиатуры",
		);

		// 6. Проверяем отсутствие мультяшных эмодзи в разметке (Мандат 8d / 7 смертных грехов)
		const emojiRegex =
			/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(
			emojiRegex.test(htmlDefault),
			false,
			"В разметке пародонтограммы не должно быть сырых мультяшных эмодзи",
		);
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 6. ПРЕСЕТ: ПРОФГИГИЕНА ПОЛОСТИ РТА (1 КЛИК)
	// ──────────────────────────────────────────────────────────────────────────
	test("6. Пресет «Профгигиена полости рта» (1 клик): протокол Detartrine + Bifluorid 12", () => {
		const prophyDiary = generatePsrDiaryProtocol("pro_hygiene_express");
		assert.ok(
			prophyDiary.includes(
				"Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений",
			),
			"Протокол содержит начало формулировки профгигиены",
		);
		assert.ok(
			prophyDiary.includes("Air-Flow порошком на основе глицина"),
			"Протокол содержит Air-Flow глицин",
		);
		assert.ok(
			prophyDiary.includes("полировка абразивной пастой Detartrine"),
			"Протокол содержит полировку Detartrine",
		);
		assert.ok(
			prophyDiary.includes("глубокое фторирование эмали Bifluorid 12"),
			"Протокол содержит глубокое фторирование Bifluorid 12",
		);
	});
});
