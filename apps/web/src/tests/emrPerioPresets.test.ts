/**
 * emrPerioPresets.test.ts
 *
 * DENTE Dental CRM — Пародонтограмма, экспресс-скрининг PSR ВОЗ, одонтограмма
 * Декомпозиция в рамках Мандатов 8b, 8e, 8k, 8zi:
 * - Аудит пресетов пародонтограммы ВОЗ PSR (Мандат 8k).
 * - Автозаполнение физиологической нормы (Мандат 8e).
 * - Отсутствие навязывания 192 точек замера для рутинного осмотра.
 * - Детские возрастные пресеты и быстрые клинические протоколы зубной формулы.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

(globalThis as { React?: typeof React }).React = React;
import {
	ALL_PERIO_TEETH,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	PSR_SEXTANTS,
} from "@dental/shared";
import { PerioPresetActions } from "../components/perio/PerioPresetActions.js";
import {
	applyHealthyPeriodontiumPreset,
	applyGingivitisPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisSeverePreset,
	PERIO_EXPRESS_PRESETS,
	type PerioExpressPresetId,
} from "../components/perio/perioCatalogData.js";
import {
	UPPER_JAW_PRESETS,
	LOWER_JAW_PRESETS,
	OCCLUSION_PRESETS,
} from "../components/odontogram/JawOcclusionModal.js";
import { JawOcclusionFooter } from "../components/odontogram/JawOcclusionFooter.js";
import { OdontogramBatchBar } from "../components/odontogram/OdontogramBatchBar.js";
import { PediatricQuickProtocols } from "../components/odontogram/pediatricModal/PediatricQuickProtocols.js";
import {
	createIntactOdontogramRecords,
	createSanitizedOdontogramRecords,
	createWisdomExtractedOdontogramRecords,
} from "../lib/clinicalProtocols.js";
import {
	generatePerioSoap,
} from "../lib/protocols/perioAndHygieneProtocols.js";
import {
	FAST_TOOTH_PRESETS,
	ToothChart,
	applyFastProHygieneProtocol,
} from "../components/odontogram/ToothChart.js";
import {
	calculatePediatricPhysiologicalNorm,
	CANONICAL_PEDIATRIC_AGE_PRESETS,
} from "@dental/shared";

const FORBIDDEN_HOSPITAL_TERMS = [
	"025/у",
	"025-у",
	"гемотрансфуз",
	"переливание крови",
	"койко-день",
	"паллиатив",
	"лапаротом",
	"стационар",
];

describe("EMR & Periodontogram Presets Suite (Mandates 8e, 8k, 8zi)", () => {
	describe("1. Пресеты пародонтограммы ВОЗ PSR и физиологическая норма (Мандаты 8e, 8k)", () => {
		it("1.1. Пародонтограмма: физиологическая норма (perio_norm_express) устанавливает PSR 0 во всех 6 секстантах", () => {
			const initialTeeth = createDefaultPerioTeeth(2);
			const normTeeth = applyHealthyPeriodontiumPreset(initialTeeth);
			assert.equal(normTeeth.length, 32, "Все 32 зуба должны присутствовать");

			for (const tooth of normTeeth) {
				assert.equal(tooth.isMissing, false);
				assert.equal(tooth.mobility, 0);
				assert.equal(tooth.furcation, 0);
				assert.equal(tooth.distoBuccal?.bleedingOnProbing, false);
				assert.equal(tooth.midBuccal?.bleedingOnProbing, false);
				assert.equal(tooth.mesioBuccal?.bleedingOnProbing, false);
				assert.ok(
					(tooth.midBuccal?.probingDepthMm ?? 0) <= 2,
					`Глубина зуба ${tooth.toothNumber} должна быть <= 2 мм`,
				);
			}

			const psr = calculatePsrSextants(normTeeth);
			for (const s of PSR_SEXTANTS) {
				const sextantResult = psr[s.name];
				assert.ok(sextantResult, `Секстант ${s.name} обязан существовать`);
				assert.equal(
					sextantResult.code,
					0,
					`Секстант ${s.name} при норме обязан иметь PSR Код 0`,
				);
				assert.equal(sextantResult.asterisk, false);
			}
		});

		it("1.2. Окклюзия и челюсти (JawOcclusionModal): верхняя челюсть содержит 'ju_norm' (isNorm=true)", () => {
			const norm = UPPER_JAW_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Верхняя челюсть обязана содержать пресет нормы");
			assert.equal(norm.id, "ju_norm");
			assert.match(norm.titleRu, /Норма/i);
			assert.ok(norm.soapStatusLocalis.includes("альвеолярный отросток"));
		});

		it("1.3. Окклюзия и челюсти (JawOcclusionModal): нижняя челюсть содержит 'jl_norm' (isNorm=true)", () => {
			const norm = LOWER_JAW_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Нижняя челюсть обязана содержать пресет нормы");
			assert.equal(norm.id, "jl_norm");
			assert.match(norm.titleRu, /Норма/i);
			assert.ok(norm.soapStatusLocalis.includes("альвеолярная часть"));
		});

		it("1.4. Окклюзия и челюсти (JawOcclusionModal): прикус содержит 'c_orthognathic' (isNorm=true)", () => {
			const norm = OCCLUSION_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Окклюзия обязана содержать ортогнатический прикус");
			assert.equal(norm.id, "c_orthognathic");
			assert.match(norm.titleRu, /Ортогнатический/i);
			assert.ok(norm.soapStatusLocalis.includes("ортогнатический"));
		});

		it("1.5. Формула зубов: 1-клик пресеты формулы генерируют корректные структуры", () => {
			const intact = createIntactOdontogramRecords();
			assert.equal(Object.keys(intact).length, 32, "Все 32 зуба в интактной формуле");
			for (const toothNum of ALL_PERIO_TEETH) {
				assert.equal(intact[toothNum]?.statusCode, "healthy");
			}

			const sanitized = createSanitizedOdontogramRecords();
			assert.equal(sanitized[16]?.statusCode, "filled_satisfactory");
			assert.equal(sanitized[26]?.statusCode, "filled_satisfactory");
			assert.equal(sanitized[36]?.statusCode, "filled_satisfactory");
			assert.equal(sanitized[46]?.statusCode, "filled_satisfactory");

			const noWisdom = createWisdomExtractedOdontogramRecords();
			assert.equal(noWisdom[18]?.statusCode, "extracted_absent");
			assert.equal(noWisdom[28]?.statusCode, "extracted_absent");
			assert.equal(noWisdom[38]?.statusCode, "extracted_absent");
			assert.equal(noWisdom[48]?.statusCode, "extracted_absent");
		});

		it("1.6. Пресет 'pro_hygiene_express' генерирует комплексную запись профессиональной гигиены", () => {
			const prophy = PERIO_EXPRESS_PRESETS.pro_hygiene_express;
			assert.ok(prophy, "Пресет профгигиены должен существовать");
			assert.equal(prophy.icd10, "Z01.2");
			assert.equal(prophy.code804n, "A16.07.051");
			assert.match(prophy.titleRu, /Профгигиена/);
			assert.ok(prophy.defaultProtocolRu.includes("УЗ-скейлинг") || prophy.defaultProtocolRu.includes("ультразвук"));
			assert.ok((prophy.defaultProtocolRu.includes("воздушно-абразивная") || prophy.defaultProtocolRu.includes("Air-Flow")) && prophy.defaultProtocolRu.includes("глицин"));
			assert.ok(prophy.defaultProtocolRu.includes("Bifluorid") || prophy.defaultProtocolRu.includes("фторирование"));
		});

		it("1.7. Пресеты гингивита и пародонтита 1-3 степени не требуют ручного ввода 192 точек", () => {
			const initial = createDefaultPerioTeeth(2);
			const gingivitisTeeth = applyGingivitisPreset(initial);
			assert.equal(gingivitisTeeth.length, 32);
			const gingivitisPsr = calculatePsrSextants(gingivitisTeeth);
			const maxGingCode = Math.max(...Object.values(gingivitisPsr).map((v) => v.code));
			assert.ok(maxGingCode >= 1 && maxGingCode <= 2, `Ожидался код PSR 1-2, фактически: ${maxGingCode}`);

			const perioMildTeeth = applyPeriodontitisMildPreset(initial);
			const perioMildPsr = calculatePsrSextants(perioMildTeeth);
			const maxMildCode = Math.max(...Object.values(perioMildPsr).map((v) => v.code));
			assert.ok(maxMildCode >= 2 && maxMildCode <= 3, `Ожидался код PSR 2-3, фактически: ${maxMildCode}`);

			const perioSevereTeeth = applyPeriodontitisSeverePreset(initial);
			const perioSeverePsr = calculatePsrSextants(perioSevereTeeth);
			const maxSevereCode = Math.max(...Object.values(perioSeverePsr).map((v) => v.code));
			assert.equal(maxSevereCode, 4, "При тяжелом пародонтите PSR должен достигать 4");
		});

		it("1.8. В PERIO_EXPRESS_PRESETS пародонтограммы отсутствуют госпитальные термины", () => {
			const presetIds: PerioExpressPresetId[] = [
				"perio_norm_express",
				"pro_hygiene_express",
				"gingivitis_express",
				"periodontitis_mild_express",
				"periodontitis_moderate_express",
				"periodontitis_severe_express",
			];

			for (const id of presetIds) {
				const p = PERIO_EXPRESS_PRESETS[id];
				assert.ok(p, `Пресет ${id} обязан существовать`);
				const blob = `${p.titleRu} ${p.defaultProtocolRu}`.toLowerCase();
				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Пресет пародонтограммы «${id}» содержит термин: «${term}»`,
					);
				}
			}
		});

		it("1.9. В пресетах челюстей и окклюзии отсутствуют термины общей хирургии и стационара", () => {
			const allPresets = [
				...UPPER_JAW_PRESETS,
				...LOWER_JAW_PRESETS,
				...OCCLUSION_PRESETS,
			];

			for (const p of allPresets) {
				const blob = `${p.titleRu} ${p.soapStatusLocalis}`.toLowerCase();
				for (const term of FORBIDDEN_HOSPITAL_TERMS) {
					assert.ok(
						!blob.includes(term),
						`Пресет «${p.id}» содержит госпитальный термин: «${term}»`,
					);
				}
			}
		});

		it("1.10. generatePerioSoap: Интактный пародонт и норма генерируют Z01.2 (Мандат 8e / Red Team Invariant)", () => {
			const intactSoap = generatePerioSoap({ toothNumber: 11, state: "perio_intact" });
			assert.ok(intactSoap, "Протокол интактного пародонта обязан сгенерироваться");
			assert.equal(intactSoap.diagnosisIcd10, "Z01.2", "Интактный пародонт обязан иметь МКБ-10 Z01.2 (не K05.0!)");
			assert.match(intactSoap.diagnosisIcd10Label, /Интактный пародонт|Клиническая норма/);
			assert.ok(intactSoap.statusLocalis.includes("бледно-розовая, плотная"));

			const normSoap = generatePerioSoap({ toothNumber: 21, state: "healthy" });
			assert.ok(normSoap, "Протокол здорового зуба обязан сгенерироваться");
			assert.equal(normSoap.diagnosisIcd10, "Z01.2");

			const gingivitisSoap = generatePerioSoap({ toothNumber: 31, state: "gingivitis" });
			assert.ok(gingivitisSoap);
			assert.equal(gingivitisSoap.diagnosisIcd10, "K05.1");
		});
	});

	describe("2. UI-аудит тулбаров пародонтограммы и одонтограммы (Мандаты 8e, 8k, 8d)", () => {
		it("2.1. PerioPresetActions.tsx: Быстрый выбор нормы и профгигиены, тулбар 36px, тач >= 44px", () => {
			const noop = () => {};
			const renderedToolbar = renderToString(
				React.createElement(PerioPresetActions, {
					onSetAllIntact: noop,
					onApplyPreset: noop,
					onApplyUpperJawNorm: noop,
					onApplyLowerJawNorm: noop,
					onApplyZeroBop: noop,
					onApplyZeroCalculus: noop,
				}),
			);

			assert.ok(
				renderedToolbar.includes('data-testid="perio-toolbar-norm-btn"'),
				"PerioPresetActions обязан рендерить data-testid='perio-toolbar-norm-btn'",
			);
			assert.equal(
				renderedToolbar.includes("perio-toolbar-norm-1click-btn") || renderedToolbar.includes("perio-toolbar-prophy-1click-btn"),
				false,
				"Устаревший дев-сленг 1click-btn запрещён (Мандат 8zg)",
			);
			assert.ok(
				renderedToolbar.includes("Здоровый пародонт (Норма)"),
				"Кнопка нормы должна называться 'Здоровый пародонт (Норма)'",
			);
			assert.ok(
				renderedToolbar.includes("Быстрый выбор:"),
				"Секция макро-действий должна содержать чистый клинический заголовок 'Быстрый выбор:'",
			);
			assert.ok(
				renderedToolbar.includes('data-testid="perio-toolbar-prophy-btn"'),
				"PerioPresetActions обязан рендерить data-testid='perio-toolbar-prophy-btn'",
			);
			assert.ok(
				renderedToolbar.includes("Профгигиена"),
				"Кнопка профгигиены должна присутствовать",
			);
			assert.ok(
				renderedToolbar.includes("min-h-[44px]") && renderedToolbar.includes("min-w-[44px]"),
				"Кнопки тулбара пародонтограммы должны иметь тач-таргеты min-h-[44px] и min-w-[44px]",
			);
			assert.ok(
				renderedToolbar.includes("sm:min-h-[36px]") || renderedToolbar.includes("sm:h-9"),
				"Тулбар пародонтограммы обязан быть однострочным плотным на десктопе (36px, Мандат 8am)",
			);
		});

		it("2.2. JawOcclusionFooter.tsx: Кнопка применения разблокирована, авто-фоллбэк на норму и тач >= 44px", () => {
			const htmlNorm = renderToString(
				React.createElement(JawOcclusionFooter, {
					onClose: () => {},
					selectedPreset: undefined,
					activeTab: "JU",
					currentPresets: UPPER_JAW_PRESETS,
					onApplyPreset: () => {},
				}),
			);
			assert.ok(htmlNorm.includes('data-testid="jaw-modal-apply-btn"'));
			assert.equal(htmlNorm.includes(" disabled"), false);
			assert.ok(htmlNorm.includes("Физиологическая норма"));
			assert.ok(htmlNorm.includes("min-h-[44px]"));

			const htmlSelected = renderToString(
				React.createElement(JawOcclusionFooter, {
					onClose: () => {},
					selectedPreset: LOWER_JAW_PRESETS[0],
					activeTab: "JL",
					currentPresets: LOWER_JAW_PRESETS,
					onApplyPreset: () => {},
				}),
			);
			assert.ok(htmlSelected.includes("Внести в карту"));
			assert.equal(htmlSelected.includes(" disabled"), false);
			assert.ok(UPPER_JAW_PRESETS.some((p) => p.id === "ju_norm"));
			assert.ok(LOWER_JAW_PRESETS.some((p) => p.id === "jl_norm"));
			assert.ok(OCCLUSION_PRESETS.some((p) => p.id === "c_orthognathic"));
		});

		it("2.3. FAST_TOOTH_PRESETS содержит обязательные клинические экспресс-пресеты", () => {
			assert.ok(Array.isArray(FAST_TOOTH_PRESETS), "FAST_TOOTH_PRESETS должен быть массивом");
			const ids = FAST_TOOTH_PRESETS.map((p) => p.id);
			assert.ok(ids.includes("intact_dentition"), "Должен присутствовать пресет Интактный зубной ряд");
			assert.ok(ids.includes("pro_hygiene_done"), "Должен присутствовать пресет Профгигиена выполнена");
			assert.ok(ids.includes("fast_caries_k021"), "Должен присутствовать пресет Быстрая пломба K02.1");
			assert.ok(ids.includes("wisdom_missing"), "Должен присутствовать пресет Адентия 8-ок");
		});

		it("2.4. applyFastProHygieneProtocol: Генерирует протокол 043/у УЗ + Air-Flow и услугу A16.07.051", () => {
			const protocol = applyFastProHygieneProtocol();
			assert.ok(protocol.statusLocalis.includes("зубной камень"), "Status localis должен описывать зубные отложения");
			assert.ok(protocol.diagnosis.includes("Z01.2"), "Диагноз должен содержать Z01.2");
			assert.ok(protocol.diagnosis.includes("K05.0"), "Диагноз должен содержать K05.0");
			assert.ok(protocol.treatment.includes("ультразвуковой скейлинг"), "Лечение должно содержать УЗ-скейлинг");
			assert.ok(protocol.treatment.includes("Air-Flow"), "Лечение должно содержать воздушно-абразивную обработку");
			assert.ok(protocol.treatment.includes("Bifluorid"), "Лечение должно содержать глубокое фторирование");
			assert.equal(protocol.serviceCode, "A16.07.051", "Код услуги Номенклатуры 804н должен быть A16.07.051");
			assert.equal(protocol.price, 5500, "Стоимость профгигиены должна быть 5500 руб.");
		});

		it("2.5. ToothChart.tsx: Рендерит кнопки экспресс-действий и правильные testid", () => {
			const html = renderToString(
				React.createElement(ToothChart, {
					teethData: [],
					hideExpressActions: false,
					onMarkIntactDentition: () => {},
					onMarkProHygieneDone: () => {},
					onApplyFastCariesK021: () => {},
					onQuickStateChange: () => {},
				}),
			);

			assert.ok(
				html.includes("tooth-chart-mark-intact-btn") || html.includes("mark-intact-dentition-btn"),
				"ToothChart обязан рендерить кнопку Санирован / Интактный",
			);
			assert.ok(
				html.includes("tooth-chart-mark-pro-hygiene-btn") || html.includes("mark-front-intact-btn"),
				"ToothChart обязан рендерить кнопку Профгигиена",
			);
			assert.ok(
				html.includes("tooth-chart-apply-fast-caries-btn") || html.includes("mark-molars-missing-btn"),
				"ToothChart обязан рендерить кнопку Быстрая пломба K02.1",
			);
			assert.ok(
				html.includes("tooth-chart-mark-wisdom-missing-btn") || html.includes("mark-wisdom-missing-btn"),
				"ToothChart обязан рендерить кнопку Без 8-ок",
			);
		});

		it("2.6. ToothChart.tsx: Рендерит пункты быстрых клинических действий в экспресс-баре", () => {
			const html = renderToString(
				React.createElement(ToothChart, {
					teethData: [],
					hideExpressActions: false,
					onQuickStateChange: () => {},
				}),
			);

			assert.ok(html.includes('data-testid="tooth-chart-express-actions"'));
			assert.ok(html.includes("Санирован / Интактный"));
			assert.ok(html.includes("Без 8-ок"));
			assert.ok(html.includes("Профгигиена"));
			assert.ok(html.includes("Лечение кариеса"));
		});

		it("2.7. OdontogramBatchBar.tsx рендерит макро-выбор и групповые статусы для выделенных зубов", () => {
			const htmlWithSelection = renderToString(
				React.createElement(OdontogramBatchBar, {
					selectedTeeth: [11, 21],
					onSelectTeethGroup: () => {},
					onQuickStateChange: () => {},
					onClearSelection: () => {},
					onInvertSelection: () => {},
				}),
			);
			assert.ok(htmlWithSelection.includes("batch-apply-healthy-btn"));
			assert.ok(htmlWithSelection.includes("batch-select-wisdom-btn"));
			assert.ok(htmlWithSelection.includes("batch-select-front-sector-btn"));
			assert.ok(htmlWithSelection.includes("Выбрано: 2"));
		});

		it("2.8. OdontogramBatchBar.tsx клавиатурный и тач ввод не блокируется", () => {
			const htmlEmpty = renderToString(
				React.createElement(OdontogramBatchBar, {
					selectedTeeth: [],
					onSelectTeethGroup: () => {},
					onQuickStateChange: () => {},
				}),
			);
			assert.equal(htmlEmpty.includes(" disabled"), false, "Кнопки панели не должны быть disabled (Мандат 8e)");
			assert.ok(htmlEmpty.includes("min-h-[44px]"));
			assert.ok(htmlEmpty.includes("batch-select-upper-jaw-btn"));
			assert.ok(htmlEmpty.includes("batch-select-lower-jaw-btn"));
		});
	});

	describe("3. Детские возрастные пресеты и тяжелый пародонтит (Мандаты 8e, 8k, 8d)", () => {
		it("3.1. calculatePediatricPhysiologicalNorm: 3 года (молочный прикус 51–85, 0% резорбция)", () => {
			const norm3y = calculatePediatricPhysiologicalNorm("primary");
			assert.equal(norm3y.targetAgeYears, 3.0);
			assert.equal(norm3y.teethNumbers.length, 20, "Должно быть ровно 20 молочных зубов");
			assert.ok(norm3y.teethNumbers.includes(51) && norm3y.teethNumbers.includes(85));
			assert.equal(norm3y.diagnosisIcd10, "Z01.2");
			assert.ok(norm3y.statusLocalisRu.includes("Временный прикус"));
			for (const toothNum of norm3y.teethNumbers) {
				assert.equal(norm3y.resorptionStages[toothNum], 0, `Зуб ${toothNum} должен иметь 0% резорбцию`);
			}
		});

		it("3.2. calculatePediatricPhysiologicalNorm: 6 лет (первые моляры 16, 26, 36, 46 + 20 молочных)", () => {
			const norm6y = calculatePediatricPhysiologicalNorm("first_molar");
			assert.equal(norm6y.targetAgeYears, 6.0);
			assert.equal(norm6y.teethNumbers.length, 24, "Должно быть 24 зуба (4 моляра + 20 молочных)");
			assert.ok(norm6y.teethNumbers.includes(16) && norm6y.teethNumbers.includes(46));
			assert.equal(norm6y.diagnosisIcd10, "Z01.2");
			assert.ok(norm6y.statusLocalisRu.includes("16, 26, 36, 46"));
		});

		it("3.3. calculatePediatricPhysiologicalNorm: 9 лет (сменный прикус: резцы 11..42, моляры 16..46, молочные 53..85)", () => {
			const norm9y = calculatePediatricPhysiologicalNorm("mixed");
			assert.equal(norm9y.targetAgeYears, 9.0);
			assert.equal(norm9y.teethNumbers.length, 24, "Должно быть 24 зуба");
			assert.ok(norm9y.teethNumbers.includes(11) && norm9y.teethNumbers.includes(21));
			assert.ok(norm9y.teethNumbers.includes(55) && norm9y.teethNumbers.includes(85));
			assert.equal(norm9y.diagnosisIcd10, "Z01.2");
			assert.ok(norm9y.statusLocalisRu.includes("Сменный прикус"));
		});

		it("3.4. calculatePediatricPhysiologicalNorm: 12 лет (постоянный прикус 28 зубов 17..27, 47..37)", () => {
			const norm12y = calculatePediatricPhysiologicalNorm("permanent");
			assert.equal(norm12y.targetAgeYears, 12.0);
			assert.equal(norm12y.teethNumbers.length, 28, "Должно быть 28 постоянных зубов без 8-ок");
			assert.ok(norm12y.teethNumbers.includes(17) && norm12y.teethNumbers.includes(27));
			assert.ok(!norm12y.teethNumbers.includes(18) && !norm12y.teethNumbers.includes(48), "Зубы мудрости не должны входить в формулу 12 лет");
			assert.equal(norm12y.diagnosisIcd10, "Z01.2");
		});

		it("3.5. CANONICAL_PEDIATRIC_AGE_PRESETS содержит 4 канонических возраста", () => {
			assert.equal(CANONICAL_PEDIATRIC_AGE_PRESETS.length, 4);
			const ages = CANONICAL_PEDIATRIC_AGE_PRESETS.map((p) => p.ageYears);
			assert.deepEqual(ages, [3, 6, 9, 12]);
		});

		it("3.6. @dental/shared вычисляет нормы для всех 4 канонических детских возрастов", () => {
			const expectations: Array<[Parameters<typeof calculatePediatricPhysiologicalNorm>[0], number]> = [
				["primary", 20],
				["first_molar", 24],
				["mixed", 24],
				["permanent", 28],
			];
			assert.equal(CANONICAL_PEDIATRIC_AGE_PRESETS.length, 4);
			for (const [stage, expectedTeeth] of expectations) {
				const norm = calculatePediatricPhysiologicalNorm(stage);
				assert.equal(norm.teethNumbers.length, expectedTeeth);
				assert.equal(norm.diagnosisIcd10, "Z01.2");
			}
		});

		it("3.7. PediatricQuickProtocols.tsx рендерит кнопки возрастных норм и клинических протоколов", () => {
			const noop = () => {};
			const html = renderToString(
				React.createElement(PediatricQuickProtocols, {
					onApplyPrimaryNorm: noop,
					onApplyFirstMolarNorm: noop,
					onApplyEarlyMixedNorm: noop,
					onApplyPermanentNorm: noop,
					onApplyProcedurePreset: noop,
				}),
			);
			assert.ok(html.includes("pediatric-preset-3y-btn"), "Кнопка 3 года должна присутствовать");
			assert.ok(html.includes("pediatric-preset-6y-btn"), "Кнопка 6 лет должна присутствовать");
			assert.ok(html.includes("pediatric-preset-9y-btn"), "Кнопка 9 лет должна присутствовать");
			assert.ok(html.includes("pediatric-preset-12y-btn"), "Кнопка 12 лет должна присутствовать");
			assert.ok(html.includes("pediatric-preset-saforide-btn"), "Кнопка Сафорайд должна присутствовать");
			assert.ok(html.includes("pediatric-preset-fissurit-btn"), "Кнопка Фиссурит должна присутствовать");
			assert.ok(html.includes("pediatric-preset-pulpotec-btn"), "Кнопка Пульпотек должна присутствовать");
		});

		it("3.8. PerioPresetActions.tsx рендерит кнопку 'Пародонтит тяжелый (6-8 мм)' и применяет пресет", () => {
			const noop = () => {};
			const html = renderToString(
				React.createElement(PerioPresetActions, {
					onSetAllIntact: noop,
					onApplyPreset: noop,
					onApplyUpperJawNorm: noop,
					onApplyLowerJawNorm: noop,
					onApplyZeroBop: noop,
					onApplyZeroCalculus: noop,
				}),
			);
			assert.ok(html.includes("perio-preset-severe-btn"), "Кнопка perio-preset-severe-btn обязана рендериться в тулбаре");
			assert.ok(html.includes("Пародонтит тяжелый (6-8 мм)"));
			assert.equal(PERIO_EXPRESS_PRESETS.periodontitis_severe_express.icd10, "K05.32");
			const severePsr = calculatePsrSextants(applyPeriodontitisSeverePreset(createDefaultPerioTeeth(2)));
			assert.equal(Math.max(...Object.values(severePsr).map((v) => v.code)), 4);
		});
	});
});
