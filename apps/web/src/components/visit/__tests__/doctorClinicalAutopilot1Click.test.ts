import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	AUTOPILOT_CARIES_K021,
	AUTOPILOT_PULPITIS_K040,
	AUTOPILOT_HYGIENE_AIRFLOW,
	AUTOPILOT_EXTRACTION_K045,
	AUTOPILOT_NORM_HEALTHY,
	DOCTOR_1CLICK_AUTOPILOT_PRESETS,
	DOCTOR_AUTOPILOT_PRESETS_MAP,
	build1ClickCariesPreset,
	build1ClickPulpitisPreset,
	build1ClickHygienePreset,
	build1ClickExtractionPreset,
	build1ClickNormPreset,
	apply1ClickClinicalAutopilot,
	CLINICAL_SOAP_PRESETS,
} from "../clinicalSoapPresets";

describe("Doctor Clinical Autopilot 1-Click Protocol Invariants (Mandate 8e, 8n, Order 804n, Order 1051n)", () => {
	describe("1. Complete Catalog of 1-Click Autopilot Presets", () => {
		it("provides all core presets in DOCTOR_1CLICK_AUTOPILOT_PRESETS", () => {
			assert.ok(DOCTOR_1CLICK_AUTOPILOT_PRESETS.length >= 5);
			const ids = DOCTOR_1CLICK_AUTOPILOT_PRESETS.map((p) => p.id);
			for (const expectedId of [
				"autopilot_caries_k021",
				"autopilot_pulpitis_k040",
				"autopilot_hygiene_airflow",
				"autopilot_extraction_k045",
				"autopilot_norm_healthy",
			]) {
				assert.ok(ids.includes(expectedId), `Must include ${expectedId}`);
			}
		});

		it("maps preset IDs and legacy aliases correctly in DOCTOR_AUTOPILOT_PRESETS_MAP", () => {
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.autopilot_caries_k021);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.caries_k021);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.caries_medium);

			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.autopilot_pulpitis_k040);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.pulpitis_k040);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.pulpitis_acute);

			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.autopilot_hygiene_airflow);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.hygiene_airflow);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.hygiene_complex);

			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.autopilot_extraction_k045);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.extraction_k045);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.surgery_extraction_simple);

			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.autopilot_norm_healthy);
			assert.ok(DOCTOR_AUTOPILOT_PRESETS_MAP.norm_healthy);
		});

		it("enforces zero cartoon emojis across all preset titles and badges (Mandate 8d pt 7)", () => {
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			for (const preset of DOCTOR_1CLICK_AUTOPILOT_PRESETS) {
				assert.strictEqual(
					emojiRegex.test(preset.title),
					false,
					`Preset ${preset.id} title contains cartoon emoji`,
				);
				assert.strictEqual(
					emojiRegex.test(preset.shortBadge),
					false,
					`Preset ${preset.id} badge contains cartoon emoji`,
				);
				assert.strictEqual(
					emojiRegex.test(preset.treatmentDescription),
					false,
					`Preset ${preset.id} treatmentDescription contains cartoon emoji`,
				);
			}
		});
	});

	describe("2. Preset 1: «1-клик Кариес (К02.1)»", () => {
		it("contains complete clinical data per Order 804n, 1051n and Star guidelines", () => {
			assert.equal(AUTOPILOT_CARIES_K021.icd10, "K02.1");
			assert.equal(AUTOPILOT_CARIES_K021.surfaces, "O/MOD");
			assert.equal(AUTOPILOT_CARIES_K021.is1ClickAutopilot, true);

			// Probing, percussion, cold test
			assert.ok(AUTOPILOT_CARIES_K021.statusLocalis.includes("Зондирование"));
			assert.ok(AUTOPILOT_CARIES_K021.statusLocalis.includes("Перкуссия безболезненна"));
			assert.ok(AUTOPILOT_CARIES_K021.statusLocalis.includes("Холодовая проба"));

			// Anesthesia: Articaine 1:200 000 1.7 ml
			assert.equal(AUTOPILOT_CARIES_K021.anesthetic?.drugKey, "ultracain_ds");
			assert.equal(AUTOPILOT_CARIES_K021.anesthetic?.volumeMl, 1.7);
			assert.ok(AUTOPILOT_CARIES_K021.anesthetic?.drugName.includes("1:200 000"));

			// Liner (Vitrebond/Ionoseal) + Composite (Filtek/Estelite) + Polishing (Enhance/Prisma Gloss)
			const desc = AUTOPILOT_CARIES_K021.treatmentDescription;
			assert.ok(desc.includes("Vitrebond") || desc.includes("Ionoseal"));
			assert.ok(desc.includes("Filtek") || desc.includes("Estelite"));
			assert.ok(desc.includes("Enhance") && desc.includes("Prisma Gloss"));

			// Statutory Order 804n Code A16.07.002.010
			assert.equal(AUTOPILOT_CARIES_K021.service804n?.code804n, "A16.07.002.010");
			assert.ok(AUTOPILOT_CARIES_K021.service804n?.title.includes("II, III класса"));

			// IDS (Informed Consent)
			assert.ok(
				AUTOPILOT_CARIES_K021.informedConsent?.includes("ИДС") ||
					AUTOPILOT_CARIES_K021.informedConsent?.includes("1051н"),
			);
			assert.ok(
				AUTOPILOT_CARIES_K021.anamnesis.includes("ИДС") ||
					AUTOPILOT_CARIES_K021.anamnesis.includes("1051н"),
			);

			// Material BOM deductions
			const materials = AUTOPILOT_CARIES_K021.materialsToDeduct ?? [];
			assert.ok(materials.some((m) => m.name.includes("Filtek") || m.name.includes("Estelite")));
			assert.ok(materials.some((m) => m.name.includes("Vitrebond") || m.name.includes("Ionoseal")));
			assert.ok(materials.some((m) => m.name.includes("OptiBond FL") || m.name.includes("Single Bond")));
			assert.ok(materials.some((m) => m.name.includes("Enhance") && m.name.includes("Prisma Gloss")));
		});

		it("supports dynamic customization of tooth and surfaces via build1ClickCariesPreset", () => {
			const custom = build1ClickCariesPreset(25, "MOD");
			assert.equal(custom.defaultTooth, 25);
			assert.equal(custom.surfaces, "MOD");
			assert.ok(custom.statusLocalis.startsWith("Зуб 25: "));
			assert.ok(custom.statusLocalis.includes("поверхностях MOD"));
			assert.ok(custom.service804n?.title.includes("(поверхности MOD) (Зуб 25)"));
		});
	});

	describe("3. Preset 2: «1-клик Пульпит / Эндодонтия (К04.0)»", () => {
		it("verifies ProTaper/Reciproc, NaOCl 3%, EDTA 17%, Calasept", () => {
			assert.equal(AUTOPILOT_PULPITIS_K040.icd10, "K04.0");
			const desc = AUTOPILOT_PULPITIS_K040.treatmentDescription;

			// ProTaper/Reciproc
			assert.ok(desc.includes("ProTaper") && desc.includes("Reciproc"));

			// NaOCl 3% + EDTA 17%
			assert.ok(desc.includes("NaOCl 3%") && desc.includes("ЭДТА 17%"));

			// Calasept temporary filling
			assert.ok(desc.includes("Каласепт") || desc.includes("Calasept"));

			// 804n statutory codes: mechanical/medicament canal prep + temporary filling
			assert.equal(AUTOPILOT_PULPITIS_K040.service804n?.code804n, "A16.07.030.001");
			assert.ok(
				AUTOPILOT_PULPITIS_K040.additionalServices804n?.some(
					(s) => s.code804n === "A16.07.008.002",
				),
			);

			// Material deduction
			const materials = AUTOPILOT_PULPITIS_K040.materialsToDeduct ?? [];
			assert.ok(materials.some((m) => m.name.includes("Каласепт") || m.name.includes("Calasept")));
			assert.ok(materials.some((m) => m.name.includes("NaOCl 3%")));
			assert.ok(materials.some((m) => m.name.includes("ЭДТА 17%")));
			assert.ok(materials.some((m) => m.name.includes("ProTaper") || m.name.includes("Reciproc")));
		});
	});

	describe("4. Preset 3: «1-клик Профгигиена / Air-Flow»", () => {
		it("verifies EMS/Piezon, Air-Flow glycine powder, Cleanic paste, fluoride varnish", () => {
			assert.equal(AUTOPILOT_HYGIENE_AIRFLOW.icd10, "K03.6");
			const desc = AUTOPILOT_HYGIENE_AIRFLOW.treatmentDescription;

			// EMS / Piezon ultrasonic scaling
			assert.ok(desc.includes("EMS") || desc.includes("Piezon"));

			// Air-Flow glycine powder
			assert.ok(desc.includes("Air-Flow") && desc.includes("глицина"));

			// Cleanic polishing paste
			assert.ok(desc.includes("Cleanic"));

			// Fluoride varnish Clinpro / Bifluorid
			assert.ok(desc.includes("Clinpro") || desc.includes("Bifluorid"));

			// 804n statutory code A16.07.051
			assert.equal(AUTOPILOT_HYGIENE_AIRFLOW.service804n?.code804n, "A16.07.051");

			// Materials
			const materials = AUTOPILOT_HYGIENE_AIRFLOW.materialsToDeduct ?? [];
			assert.ok(materials.some((m) => m.name.includes("Air-Flow")));
			assert.ok(materials.some((m) => m.name.includes("Cleanic")));
			assert.ok(materials.some((m) => m.name.includes("Clinpro") || m.name.includes("Bifluorid")));
		});
	});

	describe("5. Preset 4: «1-клик Удаление зуба (К04.5)»", () => {
		it("verifies anesthesia, elevator, forceps, Alvostaz/Collapol, post-op memo", () => {
			assert.equal(AUTOPILOT_EXTRACTION_K045.icd10, "K04.5");
			const desc = AUTOPILOT_EXTRACTION_K045.treatmentDescription;

			// Infiltration / conduction anesthesia
			assert.ok(desc.includes("проводниковая") && desc.includes("анестезия"));

			// Elevator & Forceps
			assert.ok(desc.includes("элеватор"));
			assert.ok(desc.includes("щипцы") || desc.includes("щипцов"));

			// Alvostaz / Collapol
			assert.ok(desc.includes("Альвостаз") || desc.includes("Коллапол"));

			// Post-op care memo
			assert.ok(AUTOPILOT_EXTRACTION_K045.postOpMemo);
			assert.ok(AUTOPILOT_EXTRACTION_K045.postOpMemo?.includes("Памятка по уходу"));

			// 804n statutory code A16.07.001.001
			assert.equal(AUTOPILOT_EXTRACTION_K045.service804n?.code804n, "A16.07.001.001");

			// Materials
			const materials = AUTOPILOT_EXTRACTION_K045.materialsToDeduct ?? [];
			assert.ok(materials.some((m) => m.name.includes("Альвостаз") || m.name.includes("Коллапол")));
			assert.ok(materials.some((m) => m.category === "suture"));
		});
	});

	describe("6. Preset 5: «1-клик Физиологическая норма (Z01.2)»", () => {
		it("provides full Form 043/u somatic norm where doctor only touches pathologies", () => {
			assert.equal(AUTOPILOT_NORM_HEALTHY.icd10, "Z01.2");
			assert.ok(AUTOPILOT_NORM_HEALTHY.anamnesis.includes("Соматически здоров"));
			assert.ok(AUTOPILOT_NORM_HEALTHY.statusLocalis.includes("Слизистая оболочка"));
			assert.ok(AUTOPILOT_NORM_HEALTHY.statusLocalis.includes("бледно-розового цвета"));
			assert.ok(AUTOPILOT_NORM_HEALTHY.statusLocalis.includes("ВНЧС"));
		});
	});

	describe("7. Execution Engine: apply1ClickClinicalAutopilot", () => {
		it("executes clean_replace mode properly and formats diary state", () => {
			const res = apply1ClickClinicalAutopilot("autopilot_caries_k021", {
				toothNumber: 36,
				surfaces: "MOD",
				mode: "clean_replace",
			});

			assert.equal(res.toothNumber, 36);
			assert.equal(res.diary.diagnosisTooth, "36");
			assert.equal(res.diary.diagnosisIcd10, "K02.1");
			assert.ok(res.diary.statusLocalis.includes("Зуб 36: "));
			assert.ok(res.diary.statusLocalis.includes("поверхностях MOD"));

			// Treatment description includes IDS, anesthesia, description, 804n bill, materials, recommendations
			assert.ok(res.diary.treatmentDescription.includes("[ИДС]:"));
			assert.ok(res.diary.treatmentDescription.includes("Артикаин 1:200 000"));
			assert.ok(res.diary.treatmentDescription.includes("A16.07.002.010"));
			assert.ok(res.diary.treatmentDescription.includes("Списание со склада"));
			assert.ok(res.diary.treatmentDescription.includes("[Рекомендации]:"));
		});

		it("executes smart_append mode properly without overwriting existing diary data", () => {
			const existingDiary = {
				anamnesis: "Пациент ранее жаловался на чувствительность десен.",
				statusLocalis: "Зуб 11 интактен.",
				diagnosisIcd10: "K00.0",
				diagnosisTooth: "11",
				treatmentDescription: "Проведена консультация.",
				complications: "Нет",
				comorbidities: "Сахарный диабет 2 типа",
			};

			const res = apply1ClickClinicalAutopilot("autopilot_pulpitis_k040", {
				toothNumber: 46,
				currentDiary: existingDiary,
				mode: "smart_append",
			});

			assert.ok(res.diary.anamnesis.includes("Пациент ранее жаловался"));
			assert.ok(res.diary.anamnesis.includes("острые приступообразные"));
			assert.ok(res.diary.statusLocalis.includes("Зуб 11 интактен."));
			assert.ok(res.diary.statusLocalis.includes("Зуб 46: "));
			assert.ok(res.diary.treatmentDescription.includes("Проведена консультация."));
			assert.ok(res.diary.treatmentDescription.includes("ProTaper/Reciproc"));
			assert.equal(res.diary.comorbidities, "Сахарный диабет 2 типа");
		});

		it("returns correct warehouse BOM materials and 804n service bill line", () => {
			const res = apply1ClickClinicalAutopilot("autopilot_extraction_k045", {
				toothNumber: 48,
			});
			assert.equal(res.service804n?.code804n, "A16.07.001.001");
			assert.ok(res.materials.length >= 4);
			assert.ok(res.postOpMemo);
		});
	});

	describe("8. Doctor Autonomy & Mandate 8e Compliance", () => {
		it("guarantees caries_medium matches 1-click clinical autopilot specifications", () => {
			const preset = CLINICAL_SOAP_PRESETS.find((p) => p.id === "caries_medium");
			assert.ok(preset);
			assert.ok(preset.treatmentDescription.includes("Vitrebond") || preset.treatmentDescription.includes("Ionoseal"));
			assert.ok(preset.treatmentDescription.includes("Filtek") || preset.treatmentDescription.includes("Estelite"));
			assert.ok(
				preset.service804n?.code804n === "A16.07.002.001" || preset.service804n?.code804n === "A16.07.002.010",
				"Код 804н должен соответствовать восстановлению зуба фотополимером",
			);
		});

		it("guarantees pulpitis_visit1 matches ProTaper/Reciproc, NaOCl 3%, EDTA 17%, Calasept", () => {
			const preset = CLINICAL_SOAP_PRESETS.find((p) => p.id === "pulpitis_visit1");
			assert.ok(preset);
			assert.ok(preset.treatmentDescription.includes("ProTaper") || preset.treatmentDescription.includes("Reciproc"));
			assert.ok(preset.treatmentDescription.includes("NaOCl 3%"));
			assert.ok(preset.treatmentDescription.includes("Каласепт") || preset.treatmentDescription.includes("Calasept"));
		});

		it("guarantees surgery_extraction_simple matches extraction mandate", () => {
			const preset = CLINICAL_SOAP_PRESETS.find((p) => p.id === "surgery_extraction_simple");
			assert.ok(preset);
			assert.ok(preset.treatmentDescription.includes("элеватор"));
			assert.ok(preset.treatmentDescription.includes("Альвостаз") || preset.treatmentDescription.includes("Коллапол"));
			assert.equal(preset.service804n?.code804n, "A16.07.001.001");
		});

		it("guarantees hygiene_complex matches hygiene mandate", () => {
			const preset = CLINICAL_SOAP_PRESETS.find((p) => p.id === "hygiene_complex");
			assert.ok(preset);
			assert.ok(preset.treatmentDescription.includes("EMS") || preset.treatmentDescription.includes("Piezon"));
			assert.ok(preset.treatmentDescription.includes("Cleanic"));
			assert.equal(preset.service804n?.code804n, "A16.07.051");
		});
	});
});
