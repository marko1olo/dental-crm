import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_DRUG_DOSAGE_LIMITS,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type Form107_1uPayload,
	type PrescriptionDrugItem,
	renderForm107_1uHtml,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";
import {
	ANESTHESIA_QUICK_PRESETS,
	appendAnesthesiaToSoap,
	appendRecommendationToSoap,
	CLINICAL_FAST_PRESETS,
	generateSoapFromOdontogramStates,
	mergeSoapDiaryState,
	PATIENT_RECOMMENDATIONS,
} from "../../lib/clinicalProtocols043";
import {
	estimatorDismissalKeys,
	type EstimatorToothInput,
	reconcileAutoSuggestions,
} from "../odontogram/treatmentEstimatorPricing";
import type { PlanPriceCatalogItem } from "../plan/planPricing";
import { DENTAL_FAST_PRESCRIPTION_SETS } from "../prescriptions/PrescriptionPrintModal";
import type { DiaryState } from "../useVisitDiaryLogic";
import {
	completeClinicalVisitAndAssembleEstimate,
	extractProceduresFromDiary,
	CLINICAL_STANDARD_PRICE_CATALOG,
	type ClinicalEstimateItem,
} from "./clinicalVisitWorkflow";

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

	describe("1-Click Dental Prescriptions Engine (Form 107-1/u & Pharmacological Invariants)", () => {
		it("should verify standard dental prescription drug catalog and dosage limits", () => {
			assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 10);

			// 1. Amoxiclav (Antibiotic)
			const amoxiclav = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "amoxiclav_875_125",
			);
			assert.ok(amoxiclav !== undefined);
			assert.equal(amoxiclav?.category, "antibiotic");
			assert.ok(amoxiclav?.latinRp.includes("Amoxicillini 875 mg"));
			assert.ok(amoxiclav?.signaRu.includes("2 раза в сутки"));

			// 2. Ibuprofen (NSAID)
			const ibuprofen = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "ibuprofen_400",
			);
			assert.ok(ibuprofen !== undefined);
			assert.equal(ibuprofen?.category, "nsaid");
			assert.ok(ibuprofen?.latinRp.includes("Ibuprofeni 400 mg"));
			const ibuLimits = DENTAL_DRUG_DOSAGE_LIMITS.ibuprofen_400;
			assert.ok(ibuLimits !== undefined);
			assert.equal(ibuLimits?.maxSingleDoseMg, 800);
			assert.equal(ibuLimits?.maxDailyDoseMg, 2400);

			// 3. Chlorhexidine 0.05% (Antiseptic)
			const chlorhexidine = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "chlorhexidine_005",
			);
			assert.ok(chlorhexidine !== undefined);
			assert.equal(chlorhexidine?.category, "antiseptic");
			assert.ok(chlorhexidine?.signaRu.includes("Ротовые ванночки"));

			// 4. Nimesil 100mg (NSAID)
			const nimesil = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "nimesulide_100",
			);
			assert.ok(nimesil !== undefined);
			assert.equal(nimesil?.category, "nsaid");
			const nimLimits = DENTAL_DRUG_DOSAGE_LIMITS.nimesulide_100;
			assert.ok(nimLimits !== undefined);
			assert.equal(nimLimits?.maxSingleDoseMg, 100);
			assert.equal(nimLimits?.maxDailyDoseMg, 200);

			// 5. Cholisal Gel (Antiseptic)
			const cholisal = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "cholisal_gel",
			);
			assert.ok(cholisal !== undefined);
			assert.equal(cholisal?.category, "antiseptic");
		});

		it("should verify 1-click fast prescription sets and their drug mapping", () => {
			assert.ok(DENTAL_FAST_PRESCRIPTION_SETS.length >= 6);
			for (const set of DENTAL_FAST_PRESCRIPTION_SETS) {
				assert.ok(set.drugIds.length > 0 && set.drugIds.length <= 3);
				for (const drugId of set.drugIds) {
					const drugExists = DENTAL_PRESCRIPTION_DRUG_CATALOG.some(
						(d) => d.id === drugId,
					);
					assert.ok(
						drugExists,
						`Drug preset ${drugId} in set ${set.id} must exist in DENTAL_PRESCRIPTION_DRUG_CATALOG`,
					);
				}
			}
		});

		it("should validate and render Form 107-1/u prescription payload correctly", () => {
			const amoxiclav = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "amoxiclav_875_125",
			)!;
			const nimesil = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
				(d) => d.id === "nimesulide_100",
			)!;

			const drugItems: PrescriptionDrugItem[] = [
				{
					id: "drug-1",
					latinName: amoxiclav.latinRp,
					tradeName: amoxiclav.tradeNameRu,
					form: amoxiclav.formRu,
					dosage: amoxiclav.dosageRu,
					quantity: amoxiclav.quantityLabel,
					dispenseLatin: amoxiclav.dispenseLatin,
					signaRussian: amoxiclav.signaRu,
					category: amoxiclav.category,
				},
				{
					id: "drug-2",
					latinName: nimesil.latinRp,
					tradeName: nimesil.tradeNameRu,
					form: nimesil.formRu,
					dosage: nimesil.dosageRu,
					quantity: nimesil.quantityLabel,
					dispenseLatin: nimesil.dispenseLatin,
					signaRussian: nimesil.signaRu,
					category: nimesil.category,
				},
			];

			const audit = verifyPrescriptionStatutoryValidity({
				formType: "107-1u",
				prescriptionDate: "2026-08-23",
				validityDays: "60",
				items: drugItems,
			});
			assert.equal(audit.isValid, true);
			assert.equal(audit.errors.length, 0);

			const payload: Form107_1uPayload = {
				formNumber: "107-1/у",
				clinicLegalName: "ООО «Денте Стоматология»",
				prescriptionSeriesNumber: "РЕЦ-2026-1044",
				prescriptionDate: "2026-08-23",
				patientFullName: "Иванов Иван Иванович",
				patientBirthDate: "1988-05-14",
				medicalCardNumber: "043/у-2026/891",
				doctorFullName: "Д-р Смирнова Анна Сергеевна",
				doctorSpecialty: "Врач-стоматолог терапевт",
				validityDays: "60",
				isChronicSpecialCare: false,
				items: drugItems,
				diagnosisIcd10Code: "K04.5",
			};

			const html = renderForm107_1uHtml(payload);
			assert.ok(html.includes("Форма бланка № 107-1/у"));
			assert.ok(html.includes("ООО «Денте Стоматология»"));
			assert.ok(html.includes("Иванов Иван Иванович"));
			assert.ok(html.includes("Amoxicillini 875 mg"));
			assert.ok(html.includes("Nimesulidi 100 mg"));
		});
	});

	describe("Financial Estimator Auto-Reconciliation & Synchronous Bill Items", () => {
		const mockCatalog: PlanPriceCatalogItem[] = [
			{
				id: "srv_caries",
				title: "Лечение кариеса с пломбированием светоотверждаемым композитом",
				category: "therapy",
				basePriceRub: 4500,
				active: true,
			},
			{
				id: "srv_pulpitis",
				title: "Эндодонтическое лечение пульпита (1 канал)",
				category: "therapy",
				basePriceRub: 6500,
				active: true,
			},
			{
				id: "srv_crown",
				title: "Коронка из диоксида циркония",
				category: "prosthetics",
				basePriceRub: 25000,
				active: true,
			},
			{
				id: "srv_implant",
				title: "Установка дентального имплантата Osstem",
				category: "surgery",
				basePriceRub: 38000,
				active: true,
			},
			{
				id: "srv_guide",
				title: "Навигационный хирургический шаблон",
				category: "surgery",
				basePriceRub: 12000,
				active: true,
			},
		];

		it("should auto-reconcile tooth pathologies into price-matched service items with correct phases", () => {
			const teethInput: EstimatorToothInput[] = [
				{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
				{ toothNumber: 26, state: "Pulpitis" },
				{ toothNumber: 36, state: "Crown" },
				{ toothNumber: 46, state: "Planned_Implant" },
			];

			const { items, changed } = reconcileAutoSuggestions(
				[],
				teethInput,
				mockCatalog,
			);

			assert.equal(changed, true);
			assert.equal(items.length, 5); // Caries + Pulpitis + Crown + Implant + Surgical Guide

			// Therapy (Phase 1)
			const cariesItem = items.find((i) => i.toothNumber === 16);
			assert.ok(cariesItem !== undefined);
			assert.equal(cariesItem?.priceId, "srv_caries");
			assert.equal(cariesItem?.price, 4500);
			assert.equal(cariesItem?.phase, 1);
			assert.ok(cariesItem?.name.includes("Поверхности: O"));

			const pulpitisItem = items.find((i) => i.toothNumber === 26);
			assert.ok(pulpitisItem !== undefined);
			assert.equal(pulpitisItem?.priceId, "srv_pulpitis");
			assert.equal(pulpitisItem?.price, 6500);
			assert.equal(pulpitisItem?.phase, 1);

			// Orthopedics (Phase 3)
			const crownItem = items.find((i) => i.toothNumber === 36);
			assert.ok(crownItem !== undefined);
			assert.equal(crownItem?.priceId, "srv_crown");
			assert.equal(crownItem?.price, 25000);
			assert.equal(crownItem?.phase, 3);

			// Surgery (Phase 2)
			const implantItems = items.filter((i) => i.toothNumber === 46);
			assert.equal(implantItems.length, 2);
			const implant = implantItems.find((i) => i.priceId === "srv_implant");
			const guide = implantItems.find((i) => i.priceId === "srv_guide");
			assert.ok(implant !== undefined);
			assert.ok(guide !== undefined);
			assert.equal(implant?.price, 38000);
			assert.equal(implant?.phase, 2);
			assert.equal(guide?.price, 12000);
			assert.equal(guide?.phase, 2);

			// Exact Total
			const totalRub = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
			assert.equal(totalRub, 86000);
		});

		it("should respect dismissal keys and not resurrect dismissed items", () => {
			const teethInput: EstimatorToothInput[] = [
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 36, state: "Crown" },
			];

			const initial = reconcileAutoSuggestions([], teethInput, mockCatalog);
			assert.equal(initial.items.length, 2);

			const crownItem = initial.items.find((i) => i.toothNumber === 36)!;
			const dismissalKeys = new Set(estimatorDismissalKeys(crownItem));

			const secondRun = reconcileAutoSuggestions(
				initial.items.filter((i) => i.toothNumber !== 36),
				teethInput,
				mockCatalog,
				dismissalKeys,
			);

			assert.equal(secondRun.items.length, 1);
			assert.equal(secondRun.items[0]?.toothNumber, 16);
		});
	});

	describe("1-Click Clinical Visit Completion & Automated Estimate Engine", () => {
		it("extracts anesthesia, cofferdam and composite restoration from caries diary", () => {
			const diary: Partial<DiaryState> = {
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "16",
				statusLocalis: "Глубокая кариозная полость 16 зуба (MO). Зондирование болезненно по дну полости.",
				treatmentDescription:
					"Инфильтрационная анестезия Sol. Ultracaini D-S 1:200000 1.7 мл. Изоляция коффердам. Препарирование кариозной полости, адгезивный протокол, пломбирование Estelite Asteria A3B/A3E. Шлифовка, полировка.",
			};

			const items = extractProceduresFromDiary(diary);

			assert.ok(items.length >= 3);
			const hasAnes = items.some((i) => i.category === "anesthesia" && i.priceRub === 800);
			const hasCoff = items.some((i) => i.category === "isolation" && i.priceRub === 600);
			const hasTherapy = items.some((i) => i.category === "therapy" && i.priceRub === 4500);

			assert.equal(hasAnes, true);
			assert.equal(hasCoff, true);
			assert.equal(hasTherapy, true);
		});

		it("extracts anesthesia, cofferdam, endodontics and radiovisiography from pulpitis diary", () => {
			const diary: Partial<DiaryState> = {
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "36",
				statusLocalis: "Полость зуба 36 вскрыта, зондирование устьев каналов резко болезненно, кровоточивость.",
				treatmentDescription:
					"Проводниковая анестезия Ультракаин Д-С Форте 1.7 мл. Наложен коффердам. Экстирпация пульпы, эндодонтическая обработка корневых каналов ProTaper Gold, ирригация 3% NaOCl + 17% EDTA. Обтурация гуттаперчей с AH Plus. Контрольная радиовизиография визиографом.",
			};

			const items = extractProceduresFromDiary(diary);

			const hasAnes = items.some((i) => i.category === "anesthesia");
			const hasCoff = items.some((i) => i.category === "isolation");
			const hasEndo = items.some((i) => i.category === "endodontics" && i.priceRub === 6500);
			const hasRadio = items.some((i) => i.category === "diagnostics" && i.priceRub === 500);

			assert.equal(hasAnes, true);
			assert.equal(hasCoff, true);
			assert.equal(hasEndo, true);
			assert.equal(hasRadio, true);
		});

		it("completes clinical visit, calculates exact estimate, discount and generates SBP QR checkout payload", () => {
			const result = completeClinicalVisitAndAssembleEstimate({
				visitId: "VIS-9988",
				patientId: "pat-101",
				patientName: "Алексеев Дмитрий Игоревич",
				patientPhone: "+7 (999) 111-22-33",
				doctorName: "Д-р Смирнова Анна Сергеевна",
				doctorSpecialty: "Врач-стоматолог терапевт",
				diary: {
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "46",
					treatmentDescription: "Анестезия Ультракаин 1.7 мл. Изоляция коффердам. Пломбирование Estelite 46.",
				},
				discountPercent: 10,
			});

			assert.equal(result.visitId, "VIS-9988");
			assert.equal(result.patientName, "Алексеев Дмитрий Игоревич");
			assert.equal(result.form043uSaved, true);
			assert.equal(result.status, "ready_for_payment");

			// Gross: 800 (Anes) + 600 (Coff) + 4500 (Caries) = 5900 ₽
			assert.equal(result.totalGrossRub, 5900);
			// 10% Discount = 590 ₽
			assert.equal(result.totalDiscountRub, 590);
			// Net: 5310 ₽
			assert.equal(result.totalNetRub, 5310);
			assert.equal(result.totalNetKop, 531000);

			// Status Banner
			assert.ok(result.statusBannerText.replace(/[\s  ]/g, "").includes("5310₽"));
			assert.ok(result.statusBannerText.includes("Чек передан на кассу / готов к оплате"));

			// SBP QR Payload
			assert.ok(result.sbpQrUrl.startsWith("https://qr.nspk.ru/"));
			assert.ok(result.sbpQrUrl.includes("sum=531000"));
			assert.ok(result.sbpQrUrl.includes("cur=RUB"));
		});
	});
});
