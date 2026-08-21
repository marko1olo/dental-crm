import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCariogramRisk,
	calculateEruptionTimelineByAge,
	generatePediatricCariogramDiaryText,
	type PerioToothRecord,
} from "@dental/shared";
import {
	derivePeriodontalDiagnosis,
	formatPsrSextantsSummary,
	generatePerio043DiaryText,
} from "../components/odontogram/perio043Protocol";
import { ALL_PERIO_TEETH } from "../components/odontogram/perioTypes";

function createMockPerioTeeth(options?: {
	probingDepthMm?: number;
	gingivalMarginMm?: number;
	bleeding?: boolean;
	suppuration?: boolean;
	furcation?: 0 | 1 | 2 | 3 | 4;
	mobility?: 0 | 1 | 2 | 3;
}): PerioToothRecord[] {
	const pd = options?.probingDepthMm ?? 2;
	const gm = options?.gingivalMarginMm ?? 0;
	const bop = options?.bleeding ?? false;
	const supp = options?.suppuration ?? false;
	const furc = options?.furcation ?? 0;
	const mob = options?.mobility ?? 0;

	return ALL_PERIO_TEETH.map((toothNumber) => ({
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: mob,
		furcation: furc,
		distoBuccal: { probingDepthMm: pd, gingivalMarginMm: gm, bleedingOnProbing: bop, plaque: false, suppuration: supp, calculus: false },
		midBuccal: { probingDepthMm: pd, gingivalMarginMm: gm, bleedingOnProbing: bop, plaque: false, suppuration: supp, calculus: false },
		mesioBuccal: { probingDepthMm: pd, gingivalMarginMm: gm, bleedingOnProbing: bop, plaque: false, suppuration: supp, calculus: false },
		distoLingual: { probingDepthMm: pd, gingivalMarginMm: gm, bleedingOnProbing: bop, plaque: false, suppuration: supp, calculus: false },
		midLingual: { probingDepthMm: pd, gingivalMarginMm: gm, bleedingOnProbing: bop, plaque: false, suppuration: supp, calculus: false },
		mesioLingual: { probingDepthMm: pd, gingivalMarginMm: gm, bleedingOnProbing: bop, plaque: false, suppuration: supp, calculus: false },
	}));
}

describe("Periodontal 043 Protocol & Pediatric Cariogram Diary Integration", () => {
	it("1. generates healthy periodontal 043 diary protocol (Z01.2)", () => {
		const healthyTeeth = createMockPerioTeeth({ probingDepthMm: 2, gingivalMarginMm: 0, bleeding: false });
		const diag = derivePeriodontalDiagnosis(healthyTeeth);
		assert.equal(diag.icd10Code, "Z01.2");
		assert.equal(diag.severity, "intact");

		const diaryText = generatePerio043DiaryText(healthyTeeth, undefined, { doctorName: "Д-р Иванов" });
		assert.ok(diaryText.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ (ФОРМА 043/у)"));
		assert.ok(diaryText.includes("Скрининг пародонта PSR/CPITN"));
		assert.ok(diaryText.includes("Z01.2 — Клинически здоровый интактный пародонт"));
		assert.ok(diaryText.includes("Рекомендованный план лечения"));
	});

	it("2. generates moderate periodontitis protocol (K05.32) with deep pockets and SRP plan", () => {
		const moderateTeeth = createMockPerioTeeth({ probingDepthMm: 4, gingivalMarginMm: 0, bleeding: true });
		const diag = derivePeriodontalDiagnosis(moderateTeeth);
		assert.equal(diag.icd10Code, "K05.32");
		assert.equal(diag.severity, "moderate");

		const diaryText = generatePerio043DiaryText(moderateTeeth);
		assert.ok(diaryText.includes("K05.32"));
		assert.ok(diaryText.includes("пародонтит средней степени тяжести"));
		assert.ok(diaryText.includes("Scaling & Root Planing / SRP"));
		assert.ok(diaryText.includes("Вектор-терапия"));
	});

	it("3. generates severe periodontitis protocol (K05.33) with suppuration and furcation", () => {
		const severeTeeth = createMockPerioTeeth({ probingDepthMm: 7, gingivalMarginMm: 2, bleeding: true, suppuration: true, furcation: 2 });
		const diag = derivePeriodontalDiagnosis(severeTeeth);
		assert.equal(diag.icd10Code, "K05.33");
		assert.equal(diag.severity, "severe");
		assert.equal(diag.hasSuppuration, true);

		const diaryText = generatePerio043DiaryText(severeTeeth);
		assert.ok(diaryText.includes("K05.33"));
		assert.ok(diaryText.includes("тяжелой степени"));
		assert.ok(diaryText.includes("гноетечение"));
		assert.ok(diaryText.includes("Нагноение из карманов (Suppuration)"));
	});

	it("4. generates pediatric mixed dentition and Cariogram protocol for 8-year-old child", () => {
		const pediatricText = generatePediatricCariogramDiaryText({
			patientAgeYears: 8,
			resorptionStages: {
				51: 100,
				52: 75,
				61: 100,
				71: 100,
				72: 50,
				81: 100,
			},
			cariogramInput: {
				pastCariesExperience: 2,
				dietFrequency: 2,
				plaqueAmount: 1,
				fluorideProgram: 1,
			},
		});

		assert.ok(pediatricText.includes("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)"));
		assert.ok(pediatricText.includes("Хронологический возраст: 8 лет"));
		assert.ok(pediatricText.includes("Фаза прикуса: Ранний сменный прикус"));
		assert.ok(pediatricText.includes("Физиологическая резорбция корней временных зубов"));
		assert.ok(pediatricText.includes("Зуб #52: резорбция 75%"));
		assert.ok(pediatricText.includes("Зуб #72: резорбция 50%"));
		assert.ok(pediatricText.includes("Оценка риска кариеса по Кариограмме (Prof. D. Bratthall / ВОЗ)"));
		assert.ok(pediatricText.includes("Шанс избежать кариеса"));
		assert.ok(pediatricText.includes("Индивидуализированная программа детской профилактики"));
		assert.ok(pediatricText.includes("Неинвазивная герметизация фиссур"));
	});

	it("5. generates pediatric protocol for early toddler (4-year-old primary dentition)", () => {
		const toddlerText = generatePediatricCariogramDiaryText({
			patientAgeYears: 4,
			cariogramInput: {
				pastCariesExperience: 0,
				dietFrequency: 0,
				plaqueAmount: 0,
				fluorideProgram: 0,
			},
		});

		assert.ok(toddlerText.includes("Хронологический возраст: 4 лет"));
		assert.ok(toddlerText.includes("Временный прикус"));
		assert.ok(toddlerText.includes("Очень низкий риск"));
	});
});
