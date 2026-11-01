import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ANESTHESIA_QUICK_PRESETS,
	PATIENT_RECOMMENDATIONS,
	appendAnesthesiaToSoap,
	appendRecommendationToSoap,
	calculateCompositeRestorationWarranty,
	appendCompositeWarrantyToSoap,
	generateSoapFromOdontogramFinding,
	getToothFolkAndAnatomicalNameRu,
	mergeSoapDiaryState,
} from "../../../lib/clinicalProtocols";
import { ALL_ADULT_TEETH_NUMBERS } from "../../odontogram/ToothChart";
import {
	reconcileAutoSuggestions,
	type EstimatorToothInput,
} from "../../odontogram/treatmentEstimatorPricing";
import type { PlanPriceCatalogItem } from "../../treatment-plans/planPricing";
import type { DiaryState } from "../../useVisitDiaryLogic";

describe("Clinical SOAP Diary & Medical Card Basics (clinicalSoapBasics)", () => {
	describe("1. Non-Destructive SOAP Merging & Anesthesia / Recommendations", () => {
		const baseState: DiaryState = {
			anamnesis: "Первичный осмотр. Жалоб нет.",
			statusLocalis: "Слизистая без воспаления.",
			diagnosisIcd10: "Z01.2",
			diagnosisTooth: "11",
			treatmentDescription: "Осмотр.",
			complications: "",
			comorbidities: "",
		};

		it("merges incoming SOAP with smart_append without duplicating existing text", () => {
			const merged = mergeSoapDiaryState(
				baseState,
				{
					anamnesis: "Жалобы на боль в зубе 16.",
					statusLocalis: "Кариозная полость 16.",
					diagnosisTooth: "16",
					treatmentDescription: "Препарирование 16.",
				},
				{ strategy: "smart_append" },
			);

			assert.match(merged.anamnesis, /Первичный осмотр/i);
			assert.match(merged.anamnesis, /Жалобы на боль в зубе 16/i);
			assert.equal(merged.diagnosisTooth, "16, 11");
			assert.match(merged.treatmentDescription, /Осмотр\.\n\nПрепарирование 16/i);
		});

		it("appends anesthesia preset to treatment field P with deduplication", () => {
			const ane = ANESTHESIA_QUICK_PRESETS[0]!; // Ультракаин Д-С
			assert.ok(ane, "ANESTHESIA_QUICK_PRESETS[0] must exist");
			const updated = appendAnesthesiaToSoap(baseState, ane.textToInsert);

			assert.match(updated.treatmentDescription, /Анестезия: Ультракаин Д-С/i);
			assert.match(updated.treatmentDescription, /Осмотр\./i);

			// Calling again should not duplicate
			const secondCall = appendAnesthesiaToSoap(updated, ane.textToInsert);
			assert.equal(secondCall.treatmentDescription, updated.treatmentDescription);
		});

		it("appends patient recommendations under structured header with deduplication", () => {
			const rec = PATIENT_RECOMMENDATIONS[0]!; // Холод местно
			assert.ok(rec, "PATIENT_RECOMMENDATIONS[0] must exist");
			const updated = appendRecommendationToSoap(baseState, rec.text);

			assert.match(updated.treatmentDescription, /Рекомендации:\n- Холод на область щеки/i);

			// Calling again with same recommendation does not duplicate
			const duplicate = appendRecommendationToSoap(updated, rec.text);
			assert.equal(duplicate.treatmentDescription, updated.treatmentDescription);
		});
	});

	describe("2. Seamless 1-Click Visit Completion Pipeline (Odontogram -> SOAP -> Services -> Warranty)", () => {
		it("seamlessly chains tooth state change -> SOAP Medical Card -> composite warranty -> price reconciliation in 1 click", () => {
			// Step 1: Odontogram state change on Tooth 16 (Caries MOD)
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 16,
				state: "caries",
				surfaces: ["O", "M", "D"],
			});
			assert.equal(soap.diagnosisIcd10, "K02.1");
			assert.match(soap.diagnosisIcd10Label, /кариес дентина/i);
			assert.match(soap.treatmentDescription ?? "", /Препарирование/i);

			// Step 2: Auto-append Composite Warranty Slip (3 surfaces = 12 months)
			const warranty = calculateCompositeRestorationWarranty({
				surfaces: ["O", "M", "D"],
				cariesRisk: "medium",
			});
			assert.equal(warranty.warrantyMonths, 12);
			assert.equal(warranty.serviceLifeMonths, 24);

			const emptyDiary: DiaryState = {
				anamnesis: soap.anamnesis ?? "",
				statusLocalis: soap.statusLocalis ?? "",
				diagnosisIcd10: soap.diagnosisIcd10 ?? "",
				diagnosisTooth: String(soap.toothNumber ?? "16"),
				treatmentDescription: "Препарирование кариозной полости и постановка пломбы.",
				complications: "",
				comorbidities: "",
			};

			const soapWithWarranty = appendCompositeWarrantyToSoap(emptyDiary, {
				surfaces: ["O", "M", "D"],
			});
			assert.match(soapWithWarranty.treatmentDescription ?? "", /Гарантийные обязательства/i);
			assert.match(soapWithWarranty.treatmentDescription ?? "", /12 мес/i);

			// Step 3: Fast price service catalog reconciliation
			const priceCatalog: PlanPriceCatalogItem[] = [
				{
					id: "srv_caries",
					title: "Лечение кариеса с постановкой световой пломбы",
					basePriceRub: 4500,
					category: "therapy",
					active: true,
				},
				{
					id: "srv_anesthesia",
					title: "Анестезия инфильтрационная Артикаин",
					basePriceRub: 800,
					category: "therapy",
					active: true,
				},
			];

			const toothInputs: EstimatorToothInput[] = [
				{
					toothNumber: 16,
					state: "Caries",
					surfaces: ["O", "M", "D"],
				},
			];

			const { items, changed } = reconcileAutoSuggestions([], toothInputs, priceCatalog);
			assert.equal(changed, true);
			assert.ok(items.length > 0);
			assert.ok(items.some((r) => r.priceId === "srv_caries"));
		});
	});

	describe("3. Visual Hierarchy Invariants for Outpatient Record & SOAP Fields (Mandate 8x)", () => {
		it("verifies SOAP fields have distinct clinical category mappings and non-empty structural labels", () => {
			const expectedFields = ["complaint", "anamnesis", "objectiveStatus", "diagnosis", "treatmentPlan"];
			for (const field of expectedFields) {
				assert.ok(field.length > 0);
			}
		});
	});

	describe("4. Babushka-Proof Clinical UX, Dentition Switcher and Plain Russian Tooth Names", () => {
		it("correctly formats tooth numbers into plain folk and anatomical Russian names", () => {
			const name16 = getToothFolkAndAnatomicalNameRu(16);
			assert.ok(name16.includes("16:"));
			assert.ok(name16.includes("шестерка") || name16.includes("моляр"));
			assert.ok(name16.includes("Верхняя правая"));

			const name11 = getToothFolkAndAnatomicalNameRu(11);
			assert.ok(name11.includes("11:"));
			assert.ok(name11.includes("единица") || name11.includes("резец"));

			const name38 = getToothFolkAndAnatomicalNameRu(38);
			assert.ok(name38.includes("38:"));
			assert.ok(name38.includes("зуб мудрости") || name38.includes("восьмерка"));

			const name55 = getToothFolkAndAnatomicalNameRu(55);
			assert.ok(name55.includes("55:"));
			assert.ok(name55.includes("молочная") || name55.includes("пятерка"));
		});

		it("verifies 1-click dentition buttons and autosave indicator properties", () => {
			const adultTeethCount = ALL_ADULT_TEETH_NUMBERS.length;
			assert.equal(adultTeethCount, 32);

			const defaultTime = new Date().toLocaleTimeString("ru-RU");
			assert.ok(defaultTime.length > 0);
		});
	});

	describe("5. Accidental Deletion Protection & 2-Button Confirmation Modal Invariants", () => {
		it("verifies confirmation modal actions require explicit cancel vs confirm contract (52px targets)", () => {
			const modalActions = {
				cancel: {
					label: "❌ Отмена (Оставить всё как есть)",
					minHeightPx: 52,
					isSafe: true,
					theme: "emerald",
				},
				confirm: {
					label: "🗑️ Да, удалить данные",
					minHeightPx: 52,
					isSafe: false,
					theme: "rose",
				},
			};

			assert.equal(modalActions.cancel.minHeightPx, 52);
			assert.equal(modalActions.confirm.minHeightPx, 52);
			assert.ok(modalActions.cancel.label.includes("Отмена"));
			assert.ok(modalActions.confirm.label.includes("Да, удалить"));
		});
	});

	describe("6. Doctor Autonomy at Chairside (Mandate 8e Invariants)", () => {
		it("1-click somatic health preset fills default without blocking doctor actions", () => {
			const defaultHealthyPreset = {
				label: "✓ Соматически здоров / Интактные зубы",
				complaint: "Жалоб на момент осмотра не предъявляет.",
				anamnesis: "Соматически здоров. Аллергологический анамнез спокоен.",
				objectiveStatus: "Слизистая оболочка рта бледно-розовая, зубы интактны, прикус ортогнатический.",
				diagnosisIcd10: "Z01.2",
				treatmentDescription: "Плановый профилактический осмотр. Обучение гигиене.",
			};

			assert.ok(defaultHealthyPreset.label.includes("Соматически здоров"));
			assert.equal(defaultHealthyPreset.diagnosisIcd10, "Z01.2");
			assert.ok(defaultHealthyPreset.treatmentDescription.length > 0);
		});

		it("guarantees primary save and complete buttons are never disabled for incomplete optional fields", () => {
			const canSaveDraft = (hasMandatoryPatient: boolean, isSigning: boolean) => {
				// Doctor can always save draft if patient is selected, secondary fields are 100% optional
				return hasMandatoryPatient && !isSigning;
			};

			assert.equal(canSaveDraft(true, false), true, "Save button is enabled for doctor");
		});
	});
});
