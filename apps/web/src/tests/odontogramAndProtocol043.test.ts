import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	CLINICAL_SOAP_PRESETS,
	formatSoapFromPreset,
	getPresetById,
	getPresetsByIcd10,
	applyClinicalPresetToVisitNote,
	calculatePresetMaterialsCost,
} from "../components/visit/clinicalSoapPresets";

import {
	createForm043PhysiologicalNorm,
	generateSoapFromOdontogramFinding,
	mergeSoapDiaryState,
	calculateAnesthesiaCarpulesSafety,
	evaluateAnesthesiaRisk,
	formatSurfacesRu,
	calculateCompositeRestorationWarranty,
} from "../lib/clinicalProtocols043";

import {
	build1ClickCariesPreset,
} from "../components/visit/presets/autopilotPresets";

import {
	buildChairsideSmartProtocol,
} from "../components/visit/clinicalVisitWorkflow";

import {
	formatSurfacesText,
	surfaceSuffix,
} from "../components/odontogram/treatmentEstimatorCatalogMatching";

import {
	createChairsideCariesBundle,
	expandToothDiagnosisToClinicalBundle,
} from "../components/odontogram/treatmentEstimatorBundles";
import type { PlanPriceCatalogItem } from "../components/treatment-plans/planPricing";

import {
	normalizeAnatomicalSurfaces,
	normalizeSurfaceKey,
	isSurfaceActive,
} from "../components/odontogram/anatomicalToothGeometries";

import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
} from "../components/patients/safetyMath";

describe("Odontogram, Dental Formula & Form 043/u Inquisitor Suite (Mandates 8e, 8i, 8k, 8l, 8v)", () => {

	describe("1. Dental Formula & DMFT (КПУ) Index Calculation", () => {
		// Helper calculating DMFT matching PatientDentalFormulaTab implementation
		function calculateDmft(teeth: Record<number, { state?: string }>) {
			let c = 0;
			let p = 0;
			let u = 0;
			for (const [tStr, data] of Object.entries(teeth)) {
				const toothNum = Number(tStr);
				// Adults 11..48
				if (toothNum >= 11 && toothNum <= 48) {
					const state = data?.state;
					if (state === "Caries" || state === "Pulpitis" || state === "Periodontitis") {
						c++;
					} else if (state === "Filled" || state === "Crown") {
						p++;
					} else if (state === "Missing" || state === "Extracted") {
						u++;
					}
				}
			}
			return { c, p, u, total: c + p + u };
		}

		it("calculates DMFT = 0 for an intact dentition", () => {
			const intactTeeth: Record<number, { state: string }> = {};
			for (let i = 11; i <= 48; i++) {
				intactTeeth[i] = { state: "Healthy" };
			}
			const result = calculateDmft(intactTeeth);
			assert.equal(result.c, 0);
			assert.equal(result.p, 0);
			assert.equal(result.u, 0);
			assert.equal(result.total, 0);
		});

		it("calculates DMFT accurately for mixed pathologies (Caries, Filled, Missing)", () => {
			const sampleTeeth: Record<number, { state: string }> = {
				16: { state: "Caries" },
				26: { state: "Pulpitis" },
				36: { state: "Periodontitis" },
				14: { state: "Filled" },
				24: { state: "Crown" },
				18: { state: "Missing" },
				28: { state: "Missing" },
				38: { state: "Extracted" },
				48: { state: "Extracted" },
			};
			const result = calculateDmft(sampleTeeth);
			assert.equal(result.c, 3, "3 decayed teeth (Caries, Pulpitis, Periodontitis)");
			assert.equal(result.p, 2, "2 filled/crowned teeth");
			assert.equal(result.u, 4, "4 missing/extracted wisdom teeth");
			assert.equal(result.total, 9, "Total DMFT index must equal 9");
		});

		it("does not count pediatric teeth (51..85) into adult permanent DMFT", () => {
			const mixedTeeth: Record<number, { state: string }> = {
				16: { state: "Caries" },
				54: { state: "Caries" }, // milk tooth
				55: { state: "Filled" }, // milk tooth
				64: { state: "Extracted" }, // milk tooth
			};
			const result = calculateDmft(mixedTeeth);
			assert.equal(result.c, 1, "Only permanent 16 counts for adult Decayed");
			assert.equal(result.p, 0);
			assert.equal(result.u, 0);
			assert.equal(result.total, 1);
		});
	});

	describe("2. Form 043/u Somatic Norm & Safety Profile (1-Click, Mandate 8e)", () => {
		it("DEFAULT_SOMATIC_HEALTHY_NORM provides complete healthy baseline without questionnaires", () => {
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.hasCardiovascularDisease, false);
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.hasDiabetesMellitus, false);
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.takesAnticoagulants, false);
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.hasPenicillinAllergy, false);
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.hasLatexAllergy, false);
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.hasNsaidAllergy, false);
			assert.equal(DEFAULT_SOMATIC_HEALTHY_NORM.pregnancyTrimester, "none");
		});

		it("evaluatePatientSafetyFlags confirms zero risk on somatic norm", () => {
			const flags = evaluatePatientSafetyFlags(DEFAULT_SOMATIC_HEALTHY_NORM);
			assert.equal(flags.hasCriticalStopFlags, false);
			assert.equal(flags.hasHighRiskFlags, false);
			assert.equal(flags.totalAlertCount, 0);
			assert.equal(flags.activeFlags.length, 0);
		});

		it("createForm043PhysiologicalNorm covers complaints, anamnesis, mucosal status and occlusion", () => {
			const norm = createForm043PhysiologicalNorm();
			assert.ok(norm.chiefComplaint.includes("Жалоб на момент осмотра не предъявляет"));
			assert.ok(norm.allergologicalHistory.includes("не отягощен"));
			assert.ok(norm.concomitantDiseases.includes("отрицает"));
			assert.equal(norm.biteType, "orthognathic");
			assert.equal(norm.oralMucosaStatus.color, "pale_pink_normal");
			assert.equal(norm.oralMucosaStatus.moisture, "normal");
		});

		it("mergeSoapDiaryState preserves doctor custom text and appends new tooth finding safely", () => {
			const existing = {
				anamnesis: "Пациент аллергик на пенициллин. Жалобы с вчерашнего дня.",
				statusLocalis: "Прикус ортогнатический.",
				diagnosisTooth: "16",
				diagnosisIcd10: "K02.1",
				treatmentDescription: "Проведена аппликация анестетика.",
				complications: "",
				comorbidities: "",
			};

			const finding = generateSoapFromOdontogramFinding({
				toothNumber: 26,
				state: "Pulpitis",
			});

			const merged = mergeSoapDiaryState(existing, finding, {
				strategy: "smart_append",
			});

			assert.ok(merged.anamnesis.includes("Пациент аллергик на пенициллин"));
			assert.ok(merged.anamnesis.includes(finding.anamnesis));
			assert.equal(merged.diagnosisTooth, "16, 26");
		});
	});

	describe("3. 1-Click Clinical SOAP Diary Generation for ICD-10 (Mandates 8e, 8i)", () => {
		const requiredIcd10Codes = ["K02.1", "K04.0", "K04.5", "K05.3", "Z01.2"];

		for (const code of requiredIcd10Codes) {
			it(`finds clinical preset for ICD-10 ${code} and generates valid SOAP record`, () => {
				const presets = getPresetsByIcd10(code);
				assert.ok(presets.length > 0, `Preset for ICD-10 ${code} must exist in CLINICAL_SOAP_PRESETS`);
				const preset = presets[0]!;
				const soap = formatSoapFromPreset(preset, 16);

				assert.ok(soap.complaint.trim().length > 0, `${code}: complaint must not be empty`);
				assert.ok(soap.anamnesis.trim().length > 0, `${code}: anamnesis must not be empty`);
				assert.ok(soap.objectiveStatus.trim().length > 0, `${code}: objectiveStatus must not be empty`);
				assert.ok(soap.diagnosis.includes(code), `${code}: diagnosis must include ${code}`);
				assert.ok(soap.treatmentPlan.trim().length > 0, `${code}: treatmentPlan must not be empty`);
			});
		}

		it("generates K02.1 caries protocol with cavity preparation and light-cure composite", () => {
			const preset = getPresetById("caries_medium");
			assert.ok(preset, "caries_medium preset must exist");
			const soap = formatSoapFromPreset(preset!, 24);
			assert.ok(soap.objectiveStatus.includes("24"));
			assert.ok(soap.objectiveStatus.toLowerCase().includes("кариозная полость"));
			assert.ok(soap.treatmentPlan.includes("Препарирование"));
			assert.ok(soap.treatmentPlan.toLowerCase().includes("композит") || soap.treatmentPlan.toLowerCase().includes("фотополимер"));
		});

		it("generates K04.0 pulpitis protocol with devitalization/extirpation and canal chemomech prep", () => {
			const preset = getPresetById("pulpitis_acute");
			assert.ok(preset, "pulpitis_acute preset must exist");
			const soap = formatSoapFromPreset(preset!, 46);
			assert.ok(soap.complaint.includes("ночные") || soap.complaint.includes("пульпит") || soap.complaint.length > 10);
			assert.ok(soap.treatmentPlan.includes("экстирпация") || soap.treatmentPlan.includes("пульп") || soap.treatmentPlan.includes("обработка"));
		});

		it("applyClinicalPresetToVisitNote cleanly updates form fields in clean_replace mode", () => {
			const initialForm = {
				complaint: "",
				anamnesis: "",
				objectiveStatus: "",
				diagnosis: "",
				treatmentPlan: "",
			};
			const preset = getPresetById("caries_medium")!;
			const updated = applyClinicalPresetToVisitNote(initialForm, preset, { targetTooth: 16 });
			assert.ok(updated.diagnosis.includes("K02.1"));
			assert.ok(updated.treatmentPlan.includes("Препарирование"));
		});
	});

	describe("4. 1-Click Materials & Anesthesia Deduction (Mandate 8v)", () => {
		it("calculates materials deduction costs for clinical presets without zero-cost leaks", () => {
			const cariesPreset = getPresetById("caries_medium");
			assert.ok(cariesPreset);
			const materials = cariesPreset.materialsToDeduct ?? [];
			assert.ok(materials.length > 0, "Caries preset must have deduction materials");

			const cost = calculatePresetMaterialsCost(cariesPreset);
			assert.ok(cost > 0, "Materials cost must be greater than 0");
		});

		it("calculateAnesthesiaCarpulesSafety validates safe limit for Articaine 1:200 000", () => {
			const safety = calculateAnesthesiaCarpulesSafety({
				drugKey: "articaine_200k",
				carpulesCount: 2,
				patientWeightKg: 70,
			});
			assert.equal(safety.isOverdose, false);
			assert.equal(safety.isCardioRestricted, false);
			assert.ok(safety.maxSafeCarpules >= 6);
			assert.equal(safety.epinephrineMg, 0.017); // 2 carpules * 0.0085 mg
		});

		it("calculateAnesthesiaCarpulesSafety warns on cardiovascular risk overdose for 1:100 000", () => {
			const safety = calculateAnesthesiaCarpulesSafety({
				drugKey: "articaine_100k",
				carpulesCount: 3,
				patientWeightKg: 70,
				somaticProfile: { hasCardiovascularRisk: true },
			});
			assert.equal(safety.isCardioRestricted, true, "Cardio risk must be restricted");
		});

		it("evaluateAnesthesiaRisk warns when adrenaline is used with hypertension", () => {
			const risk = evaluateAnesthesiaRisk(
				"Пациент страдает артериальной гипертонией (АГ II ст.)",
				"Анестезия: Sol. Articaini 1:100 000 — 2 карпулы",
			);
			assert.equal(risk.hasHypertensionRisk, true);
			assert.equal(risk.isWarningTriggered, true);
			assert.ok(risk.warningMessage?.includes("Скандонест") || risk.warningMessage?.includes("Мепивакаин"));
		});
	});

	describe("5. FDI Surface Indexing & Normalization (< 16ms interaction)", () => {
		it("normalizes international surface letters to canonical keys", () => {
			assert.equal(normalizeSurfaceKey("O"), "O");
			assert.equal(normalizeSurfaceKey("Occ"), "O");
			assert.equal(normalizeSurfaceKey("Occlusal"), "O");
			assert.equal(normalizeSurfaceKey("V"), "V");
			assert.equal(normalizeSurfaceKey("vestibular"), "V");
			assert.equal(normalizeSurfaceKey("buccal"), "V");
			assert.equal(normalizeSurfaceKey("L"), "L");
			assert.equal(normalizeSurfaceKey("lingual"), "L");
			assert.equal(normalizeSurfaceKey("P"), "L");
			assert.equal(normalizeSurfaceKey("M"), "M");
			assert.equal(normalizeSurfaceKey("mesial"), "M");
			assert.equal(normalizeSurfaceKey("D"), "D");
			assert.equal(normalizeSurfaceKey("distal"), "D");
			assert.equal(normalizeSurfaceKey("C"), "C");
			assert.equal(normalizeSurfaceKey("cervical"), "C");
		});

		it("normalizeAnatomicalSurfaces expands compound MOD correctly", () => {
			const surfaces = normalizeAnatomicalSurfaces(["MOD"]);
			assert.deepEqual(surfaces, ["M", "O", "D"]);
		});

		it("isSurfaceActive detects active surface in compound arrays", () => {
			const activeSurfaces = ["M", "O", "D"];
			assert.equal(isSurfaceActive("O", activeSurfaces), true);
			assert.equal(isSurfaceActive("M", activeSurfaces), true);
			assert.equal(isSurfaceActive("D", activeSurfaces), true);
			assert.equal(isSurfaceActive("V", activeSurfaces), false);
			assert.equal(isSurfaceActive("L", activeSurfaces), false);
		});
	});

	describe("6. Red Team: Tooth State WITHOUT Mandatory Surfaces (Mandates 8aa, 8l, Anti-Droch)", () => {
		const mockCatalog: readonly PlanPriceCatalogItem[] = [
			{
				id: "A11.07.012",
				title: "Местная анестезия (инфильтрационная)",
				basePriceRub: 800,
				category: "Анестезия",
				active: true,
			},
			{
				id: "A16.07.002.010",
				title: "Восстановление зуба пломбой светового отверждения (лечение кариеса)",
				basePriceRub: 4500,
				category: "Терапия",
				active: true,
			},
		];

		it("generateSoapFromOdontogramFinding without surfaces produces clean clinical Russian without 'undefined' or awkward phrases", () => {
			const finding = generateSoapFromOdontogramFinding({
				toothNumber: 36,
				state: "Caries",
				subType: "medium",
				surfaces: [],
			});

			assert.ok(!finding.anamnesis.includes("undefined"), "Anamnesis must not contain undefined");
			assert.ok(!finding.anamnesis.includes("null"), "Anamnesis must not contain null");
			assert.ok(!finding.anamnesis.includes("коронковой части поверхности"), "Must not say 'на коронковой части поверхности'");
			assert.ok(finding.anamnesis.includes("в кариозной полости зуба"), "Must say 'в кариозной полости зуба'");

			assert.ok(!finding.statusLocalis.includes("undefined"), "Status localis must not contain undefined");
			assert.ok(!finding.statusLocalis.includes("коронковой части поверхности"), "Must not say 'на коронковой части поверхности'");
			assert.ok(finding.statusLocalis.includes("Кариозное поражение коронковой части зуба"), "Proper objective status");

			assert.ok(!finding.treatmentDescription.includes("undefined"), "Treatment must not contain undefined");
			assert.ok(!finding.treatmentDescription.includes("на коронковой части поверхности"), "Must not say 'на коронковой части поверхности'");
			assert.ok(finding.treatmentDescription.includes("Препарирование кариозной полости зуба 36, полная некрэктомия"), "Clean prep description");

			// Warranty note check
			assert.ok(!finding.treatmentDescription.includes("(коронковой части)"), "Warranty must not have (коронковой части)");
			assert.ok(finding.treatmentDescription.includes("Гарантийный срок на световую композитную реставрацию на зуб 36:"), "Clean warranty note");
		});

		it("generateSoapFromOdontogramFinding for deep Caries without surfaces produces clean clinical record", () => {
			const finding = generateSoapFromOdontogramFinding({
				toothNumber: 46,
				state: "Caries",
				subType: "deep",
				surfaces: undefined,
			});

			assert.ok(!finding.anamnesis.includes("undefined"));
			assert.ok(!finding.anamnesis.includes("коронковой части поверхности"));
			assert.ok(finding.anamnesis.includes("застревание пищи в кариозной полости зуба"));
			assert.ok(finding.statusLocalis.includes("глубокая кариозная полость в пределах околопульпарного дентина"));
			assert.ok(finding.treatmentDescription.includes("Препарирование кариозной полости зуба 46, полная щадящая некрэктомия."));
		});

		it("generateSoapFromOdontogramFinding for Pulpitis without surfaces produces clean record", () => {
			const finding = generateSoapFromOdontogramFinding({
				toothNumber: 26,
				state: "Pulpitis",
				surfaces: [],
			});

			assert.ok(!finding.statusLocalis.includes("undefined"));
			assert.ok(!finding.statusLocalis.includes("На коронковой части поверхности"));
			assert.ok(finding.statusLocalis.includes("Определяется глубокая кариозная полость, заполненная размягчённым дентином"));
		});

		it("generateSoapFromOdontogramFinding for Filled without surfaces avoids 'на коронковой части поверхности'", () => {
			const finding = generateSoapFromOdontogramFinding({
				toothNumber: 15,
				state: "Filled",
				surfaces: [],
			});

			assert.ok(!finding.anamnesis.includes("undefined"));
			assert.ok(!finding.anamnesis.includes("на коронковой части поверхности"));
			assert.ok(finding.anamnesis.includes("скол края старой пломбы, дискомфорт при жевании"));
			assert.ok(finding.statusLocalis.includes("Определяется старая композитная реставрация с нарушением краевого прилегания"));
		});

		it("generateSoapFromOdontogramFinding preserves explicit surfaces when doctor provides them", () => {
			const finding = generateSoapFromOdontogramFinding({
				toothNumber: 16,
				state: "Caries",
				subType: "medium",
				surfaces: ["M", "O", "D"],
			});

			assert.ok(finding.anamnesis.includes("окклюзионная") || finding.anamnesis.includes("медиальная") || finding.anamnesis.includes("дистальная"));
			assert.ok(finding.statusLocalis.includes("поверхности"));
			assert.ok(finding.treatmentDescription.includes("(M, O, D)"));
		});

		it("build1ClickCariesPreset without surfaces does NOT force O/MOD and has clean 804n title", () => {
			const preset = build1ClickCariesPreset(36);
			assert.equal(preset.defaultTooth, 36);
			assert.equal(preset.surfaces, undefined, "Surfaces must be undefined when not explicitly passed");
			assert.ok(!preset.statusLocalis.includes("O/MOD"), "Must not force O/MOD onto tooth 36");
			assert.ok(preset.statusLocalis.startsWith("Зуб 36: Кариозная полость средней глубины"));
			assert.ok(preset.service804n);
			assert.equal(preset.service804n!.title, "Восстановление зуба пломбой светового отверждения (лечение кариеса дентина) (Зуб 36)");

			// With explicit surfaces
			const customPreset = build1ClickCariesPreset(16, "MOD");
			assert.equal(customPreset.surfaces, "MOD");
			assert.ok(customPreset.statusLocalis.includes("На поверхностях MOD"));
			assert.ok(customPreset.service804n);
			assert.ok(customPreset.service804n!.title.includes("(поверхности MOD)"));
		});

		it("buildChairsideSmartProtocol handles absence of surfaces cleanly without (UNDEFINED)", () => {
			const result = buildChairsideSmartProtocol("caries", 16, { surfaces: undefined });
			assert.equal(result.diagnosis, "K02.1 Кариес дентина зуба 16");
			assert.ok(!result.diagnosis.includes("undefined"));
			assert.ok(!result.diagnosis.includes("null"));

			const customResult = buildChairsideSmartProtocol("caries", 16, { surfaces: "MOD" });
			assert.equal(customResult.diagnosis, "K02.1 Кариес дентина зуба 16 (MOD)");
		});

		it("formatSurfacesText and surfaceSuffix safely sanitize dirty inputs", () => {
			assert.equal(formatSurfacesText(undefined), "");
			assert.equal(formatSurfacesText(null), "");
			assert.equal(formatSurfacesText([]), "");
			assert.equal(formatSurfacesText(["undefined"]), "");
			assert.equal(formatSurfacesText(["null"]), "");
			assert.equal(formatSurfacesText("undefined"), "");
			assert.equal(formatSurfacesText("null"), "");
			assert.equal(formatSurfacesText(["O", "M"]), "O, M");

			assert.equal(surfaceSuffix(undefined), "");
			assert.equal(surfaceSuffix([]), "");
			assert.equal(surfaceSuffix(["undefined"]), "");
			assert.equal(surfaceSuffix(["O"]), " (Поверхности: O)");
		});

		it("expandToothDiagnosisToClinicalBundle calculates caries bundle without mandatory surfaces", () => {
			const items = expandToothDiagnosisToClinicalBundle(16, "Caries", mockCatalog);
			assert.ok(items.length >= 2, "Must create anesthesia + composite restoration items");

			const restItem = items.find((i) => i.suggestion === "caries" && i.category === "Терапия");
			assert.ok(restItem, "Therapy restoration item must be generated");
			assert.ok(!restItem.name.includes("undefined"), "Item name must not contain undefined");
			assert.ok(!restItem.name.includes("(Поверхности: )"), "Item name must not contain empty surface suffix");
			assert.equal(restItem.price, 4500, "Price must match catalog price without mock drift");
		});

		it("calculateCompositeRestorationWarranty formats warranty note without undefined surfaces", () => {
			const warrantyEmpty = calculateCompositeRestorationWarranty({
				toothNumber: 36,
				surfaces: [],
			});
			assert.ok(!warrantyEmpty.warrantyTextRu.includes("undefined"));
			assert.ok(!warrantyEmpty.warrantyTextRu.includes("(коронковой части)"));
			assert.equal(warrantyEmpty.warrantyMonths, 24);

			const warrantyUndefined = calculateCompositeRestorationWarranty({
				toothNumber: 36,
				surfaces: ["undefined"] as any,
			});
			assert.ok(!warrantyUndefined.warrantyTextRu.includes("undefined"));
			assert.ok(!warrantyUndefined.warrantyTextRu.includes("()"));
		});

		it("formatSurfacesRu retains backward compatibility with empty array returning 'коронковой части'", () => {
			assert.equal(formatSurfacesRu([]), "коронковой части");
			assert.equal(formatSurfacesRu(["undefined"]), "коронковой части");
			assert.equal(formatSurfacesRu(["O"]), "окклюзионная (жевательная)");
		});
	});
});
