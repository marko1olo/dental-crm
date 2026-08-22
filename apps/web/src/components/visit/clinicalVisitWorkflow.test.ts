import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ANESTHESIA_QUICK_PRESETS,
	appendAnesthesiaToSoap,
	appendRecommendationToSoap,
	CLINICAL_FAST_PRESETS,
	generateSoapFromOdontogramStates,
	mergeSoapDiaryState,
	PATIENT_RECOMMENDATIONS,
} from "../../lib/clinicalProtocols043";
import type { DiaryState } from "../useVisitDiaryLogic";

describe("Clinical Visit & SOAP Diary Ergonomics Engine", () => {
	const initialEmptyDiary: DiaryState = {
		anamnesis: "",
		statusLocalis: "",
		diagnosisIcd10: "",
		diagnosisTooth: "",
		treatmentDescription: "",
		complications: "",
		comorbidities: "",
	};

	describe("1-Click Fast Clinical Presets", () => {
		it("should contain all 5 essential clinical scenarios", () => {
			assert.equal(CLINICAL_FAST_PRESETS.length, 5);
			const ids = CLINICAL_FAST_PRESETS.map((p) => p.id);
			assert.ok(ids.includes("caries_dentin"));
			assert.ok(ids.includes("pulpitis"));
			assert.ok(ids.includes("periodontitis"));
			assert.ok(ids.includes("extraction"));
			assert.ok(ids.includes("hygiene"));
		});

		it("should correctly populate Caries Dentin (K02.1) scenario", () => {
			const preset = CLINICAL_FAST_PRESETS.find(
				(p) => p.id === "caries_dentin",
			);
			assert.ok(preset !== undefined);
			if (!preset) return;

			const payload: Partial<DiaryState> = {
				anamnesis: preset.anamnesis,
				statusLocalis: preset.statusLocalis,
				diagnosisIcd10: preset.defaultIcd10,
				treatmentDescription: preset.treatmentDescription,
			};
			if (preset.complications) payload.complications = preset.complications;
			if (preset.comorbidities) payload.comorbidities = preset.comorbidities;

			const merged = mergeSoapDiaryState(initialEmptyDiary, payload, {
				strategy: "smart_append",
			});

			assert.equal(merged.diagnosisIcd10, "K02.1");
			assert.ok(merged.anamnesis.includes("температурных"));
			assert.ok(
				merged.statusLocalis.includes("кариозная полость средней глубины") ||
					merged.statusLocalis.includes("Кариозная полость"),
			);
			assert.ok(
				merged.treatmentDescription.includes(
					"Препарирование кариозной полости",
				),
			);
		});

		it("should correctly populate Pulpitis (K04.0) scenario", () => {
			const preset = CLINICAL_FAST_PRESETS.find(
				(p) => p.id === "pulpitis",
			);
			assert.ok(preset !== undefined);
			if (!preset) return;

			const merged = mergeSoapDiaryState(
				initialEmptyDiary,
				{
					anamnesis: preset.anamnesis,
					statusLocalis: preset.statusLocalis,
					diagnosisIcd10: preset.defaultIcd10,
					treatmentDescription: preset.treatmentDescription,
				},
				{ strategy: "smart_append" },
			);

			assert.equal(merged.diagnosisIcd10, "K04.0");
			assert.ok(
				merged.anamnesis.includes("приступообразные"),
			);
			assert.ok(merged.treatmentDescription.includes("экстирпация") || merged.treatmentDescription.includes("Экстирпация"));
		});

		it("should correctly populate Periodontitis (K04.5) scenario", () => {
			const preset = CLINICAL_FAST_PRESETS.find(
				(p) => p.id === "periodontitis",
			);
			assert.ok(preset !== undefined);
			if (!preset) return;

			assert.equal(preset.defaultIcd10, "K04.5");
			assert.ok(preset.treatmentDescription.includes("гидроксида кальция") || preset.treatmentDescription.includes("гидроокиси"));
		});

		it("should correctly populate Tooth Extraction (K08.1) scenario", () => {
			const preset = CLINICAL_FAST_PRESETS.find(
				(p) => p.id === "extraction",
			);
			assert.ok(preset !== undefined);
			if (!preset) return;

			assert.ok(preset.treatmentDescription.includes("элевация") || preset.treatmentDescription.includes("Элевация"));
			assert.ok(preset.treatmentDescription.includes("лунки"));
		});

		it("should correctly populate Professional Hygiene scenario", () => {
			const preset = CLINICAL_FAST_PRESETS.find(
				(p) => p.id === "hygiene",
			);
			assert.ok(preset !== undefined);
			if (!preset) return;

			assert.ok(
				preset.treatmentDescription.includes("скейлинг") || preset.treatmentDescription.includes("Скейлинг"),
			);
			assert.ok(preset.treatmentDescription.includes("Air-Flow"));
		});
	});

	describe("Auto-Populate Diary from Odontogram states", () => {
		it("should return empty soap if no pathologic teeth marked", () => {
			const states = [
				{ toothNumber: 11, state: "healthy" },
				{ toothNumber: 12, state: "healthy" },
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.anamnesis ?? "", "");
			assert.equal(generated.statusLocalis ?? "", "");
			assert.equal(generated.diagnosisIcd10 ?? "", "");
		});

		it("should generate comprehensive SOAP for tooth 16 Caries and tooth 36 Pulpitis", () => {
			const states = [
				{
					toothNumber: 16,
					state: "caries",
					surfaces: ["O", "M"],
					notes: "Глубокий кариес",
				},
				{
					toothNumber: 36,
					state: "pulpitis",
					surfaces: ["O"],
				},
				{
					toothNumber: 24,
					state: "missing",
				},
			];

			const generated = generateSoapFromOdontogramStates(states);

			const diagTooth = generated.diagnosisTooth ?? "";
			assert.ok(diagTooth.includes("16"));
			assert.ok(diagTooth.includes("36"));
			assert.ok(diagTooth.includes("24"));

			// Subjective & Objective
			const statusLoc = generated.statusLocalis ?? "";
			assert.ok(statusLoc.includes("16 (верхний правый первый моляр)"));
			assert.ok(statusLoc.includes("жевательная"));
			assert.ok(statusLoc.includes("36 (нижний левый первый моляр)"));
			assert.ok(statusLoc.includes("24") && statusLoc.includes("Отсутствует"));

			// Assessment
			assert.equal(generated.diagnosisIcd10, "K04.0"); // Priority pulpitis over caries

			// Plan
			const treatDesc = generated.treatmentDescription ?? "";
			assert.ok(treatDesc.includes("16"));
			assert.ok(treatDesc.includes("36"));
			assert.ok(treatDesc.includes("24"));
		});
	});

	describe("Anesthesia Quick Logger", () => {
		it("should contain all 5 top anesthetics", () => {
			assert.equal(ANESTHESIA_QUICK_PRESETS.length, 5);
			const labels = ANESTHESIA_QUICK_PRESETS.map((a) => a.label);
			assert.ok(labels.includes("Ультракаин Д-С"));
			assert.ok(labels.includes("Ультракаин Д-С Форте"));
			assert.ok(labels.includes("Септанест"));
			assert.ok(labels.includes("Скандонест 3%"));
			assert.ok(labels.includes("Лидокаин 2%"));
		});

		it("should non-destructively append anesthesia to treatmentDescription", () => {
			const initial: DiaryState = {
				...initialEmptyDiary,
				treatmentDescription: "Препарирование зуба 16.",
			};

			const withAnesthesia = appendAnesthesiaToSoap(
				initial,
				"Инфильтрационная анестезия: Sol. Ultracaini D-S 1:200000 — 1.7 мл.",
			);

			assert.equal(
				withAnesthesia.treatmentDescription,
				"Инфильтрационная анестезия: Sol. Ultracaini D-S 1:200000 — 1.7 мл.\nПрепарирование зуба 16.",
			);
		});

		it("should prevent duplicate anesthesia logging when same entry appended", () => {
			const initial: DiaryState = {
				...initialEmptyDiary,
				treatmentDescription:
					"Инфильтрационная анестезия: Sol. Ultracaini D-S 1:200000 — 1.7 мл.\nПрепарирование.",
			};

			const withSecond = appendAnesthesiaToSoap(
				initial,
				"Инфильтрационная анестезия: Sol. Ultracaini D-S 1:200000 — 1.7 мл.",
			);

			assert.equal(
				withSecond.treatmentDescription,
				initial.treatmentDescription,
			);
		});
	});

	describe("Smart Merge Strategy", () => {
		it("should non-destructively merge SOAP fields with smart_append", () => {
			const prev: DiaryState = {
				anamnesis: "Жалобы на боль от сладкого.",
				statusLocalis: "Зуб 15: пломба сохранена.",
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "15",
				treatmentDescription: "Осмотр.",
				complications: "",
				comorbidities: "Сахарный диабет",
			};

			const next: Partial<DiaryState> = {
				anamnesis: "Дополнительно: ноющие боли в зубе 16.",
				statusLocalis: "Зуб 16: кариозная полость на жевательной поверхности.",
				diagnosisTooth: "16",
				treatmentDescription: "Препарирование зуба 16.",
			};

			const merged = mergeSoapDiaryState(prev, next, {
				strategy: "smart_append",
			});

			assert.equal(
				merged.anamnesis,
				"Жалобы на боль от сладкого.\n\nДополнительно: ноющие боли в зубе 16.",
			);
			assert.equal(
				merged.statusLocalis,
				"Зуб 15: пломба сохранена.\n\nЗуб 16: кариозная полость на жевательной поверхности.",
			);
			assert.ok(merged.diagnosisTooth.includes("15") && merged.diagnosisTooth.includes("16"));
			assert.equal(
				merged.treatmentDescription,
				"Осмотр.\n\nПрепарирование зуба 16.",
			);
			assert.equal(merged.comorbidities, "Сахарный диабет");
		});
	});

	describe("ICD-10 Clinical Protocol Strict Coverage (K02.0, K02.1, K04.0, K04.5, K05.3, K08.1)", () => {
		it("K02.0: should generate enamel caries protocol with Icon infiltration details", () => {
			const states = [
				{
					toothNumber: 11,
					state: "caries",
					subType: "initial",
					surfaces: ["V"],
				},
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.diagnosisIcd10, "K02.0");
			assert.ok((generated.statusLocalis ?? "").includes("стадии пятна"));
			assert.ok(
				(generated.treatmentDescription ?? "").includes("Icon") ||
					(generated.treatmentDescription ?? "").includes("реминерализирующей"),
			);
		});

		it("K02.1: should generate dentin caries protocol with prep, adhesive and composite filling", () => {
			const states = [
				{
					toothNumber: 16,
					state: "caries",
					subType: "deep",
					surfaces: ["O", "M"],
				},
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.diagnosisIcd10, "K02.1");
			assert.ok((generated.statusLocalis ?? "").includes("околопульпарного дентина") || (generated.statusLocalis ?? "").includes("глубокая"));
			assert.ok((generated.treatmentDescription ?? "").includes("коффердам"));
			assert.ok((generated.treatmentDescription ?? "").includes("композит"));
		});

		it("K04.0: should generate pulpitis protocol with extirpation and root canal prep", () => {
			const states = [
				{
					toothNumber: 36,
					state: "pulpitis",
					surfaces: ["O"],
				},
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.diagnosisIcd10, "K04.0");
			assert.ok((generated.anamnesis ?? "").includes("ночное время"));
			assert.ok((generated.treatmentDescription ?? "").includes("экстирпация") || (generated.treatmentDescription ?? "").includes("Экстирпация"));
			assert.ok((generated.treatmentDescription ?? "").includes("гуттаперч"));
		});

		it("K04.5: should generate periodontitis protocol with calcium hydroxide medication", () => {
			const states = [
				{
					toothNumber: 46,
					state: "periodontitis",
				},
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.diagnosisIcd10, "K04.5");
			assert.ok((generated.statusLocalis ?? "").includes("периапикальн") || (generated.statusLocalis ?? "").includes("деструкции"));
			assert.ok((generated.treatmentDescription ?? "").includes("гидроксид") || (generated.treatmentDescription ?? "").includes("Ca(OH)2"));
		});

		it("K05.3: should generate chronic periodontitis protocol with scaling and curettage", () => {
			const states = [
				{
					toothNumber: 31,
					state: "periodontitis_chronic",
					pocketDepthMm: 5,
				},
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.diagnosisIcd10, "K05.3");
			assert.ok((generated.statusLocalis ?? "").includes("пародонтального кармана"));
			assert.ok((generated.treatmentDescription ?? "").includes("кюретаж") || (generated.treatmentDescription ?? "").includes("скейлинг"));
		});

		it("K08.1: should generate extraction/missing protocol with surgery details and recommendations", () => {
			const states = [
				{
					toothNumber: 48,
					state: "missing",
				},
			];
			const generated = generateSoapFromOdontogramStates(states);
			assert.equal(generated.diagnosisIcd10, "K08.1");
			assert.ok((generated.statusLocalis ?? "").includes("Отсутствует"));
			assert.ok((generated.treatmentDescription ?? "").includes("импланта"));
		});
	});

	describe("Patient Recommendations Engine (1-Click Presets & Auto-Append)", () => {
		it("should verify standard patient recommendations preset catalog", () => {
			assert.ok(PATIENT_RECOMMENDATIONS.length >= 7);
			const ids = PATIENT_RECOMMENDATIONS.map((r) => r.id);
			assert.ok(ids.includes("cold_pack"));
			assert.ok(ids.includes("nids_pain"));
			assert.ok(ids.includes("soft_diet"));
			assert.ok(ids.includes("no_rinse_clot"));
			assert.ok(ids.includes("followup_check"));
		});

		it("should non-destructively append cold pack, diet and analgesics recommendations", () => {
			let diary: DiaryState = {
				...initialEmptyDiary,
				treatmentDescription: "Операция удаления зуба 38. Наложены швы.",
			};

			const recCold = "Холод на область щеки по 15 мин первые 3-4 часа.";
			const recDiet = "Щадящая диета: мягкая негорячая пища 2-3 дня.";
			const recPain = "При болях: Нимесил 100 мг по 1 пак. после еды.";

			diary = appendRecommendationToSoap(diary, recCold);
			diary = appendRecommendationToSoap(diary, recDiet);
			diary = appendRecommendationToSoap(diary, recPain);

			assert.ok(diary.treatmentDescription.includes("Операция удаления зуба 38"));
			assert.ok(diary.treatmentDescription.includes("Рекомендации:"));
			assert.ok(diary.treatmentDescription.includes("Холод на область щеки"));
			assert.ok(diary.treatmentDescription.includes("Щадящая диета"));
			assert.ok(diary.treatmentDescription.includes("Нимесил 100 мг"));
		});
	});
});
