import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FRANKL_SCALE_DEFINITIONS,
	calculatePediatricFissureSealingProtocol,
	calculatePediatricPulpotomyProtocol,
	calculatePediatricSilveringProtocol,
	fissureSealantMaterialSchema,
	fissureSealingMethodSchema,
	franklRatingSchema,
	generatePediatricCariogramDiaryText,
	generatePediatricParentRecommendations,
	getFranklDefinition,
	pulpotomyRestorationSchema,
	pulpotomySubBaseMaterialSchema,
	silveringDrugSchema,
	type FranklRating,
} from "../index.js";

describe("Pediatric Frankl Behavior Scale & Adaptive Clinical Protocols (packages/shared)", () => {
	it("1. Frankl Scale Ratings (1..4) Schema and Definitions Validation", () => {
		const ratings: FranklRating[] = [1, 2, 3, 4];

		for (const r of ratings) {
			assert.equal(franklRatingSchema.safeParse(r).success, true);
			const def = FRANKL_SCALE_DEFINITIONS[r];
			assert.ok(def, `Definition for rating ${r} must exist`);
			assert.equal(def.rating, r);
			assert.ok(def.nameRu.length > 0);
			assert.ok(def.labelRu.length > 0);
			assert.ok(def.descriptionRu.length > 0);
			assert.ok(def.clinicalSignsRu.length > 0);
			assert.ok(def.managementStrategiesRu.length >= 4);
			assert.ok(def.emoji.length > 0);
			assert.ok(def.badgeColor.startsWith("#"));
		}

		// Invalid ratings
		assert.equal(franklRatingSchema.safeParse(0).success, false);
		assert.equal(franklRatingSchema.safeParse(5).success, false);
		assert.equal(franklRatingSchema.safeParse(-1).success, false);
		assert.equal(franklRatingSchema.safeParse("positive").success, false);
	});

	it("2. Frankl Scale Symbol and Behavior Differentiation (--, -, +, ++)", () => {
		const def1 = getFranklDefinition(1);
		assert.equal(def1.symbol, "--");
		assert.ok(def1.descriptionRu.includes("Отказ от лечения"));
		assert.ok(def1.managementStrategiesRu.some((s) => s.includes("Tell-Show-Do")));
		assert.ok(def1.managementStrategiesRu.some((s) => s.includes("N2O-O2") || s.includes("седация")));

		const def2 = getFranklDefinition(2);
		assert.equal(def2.symbol, "-");
		assert.ok(def2.descriptionRu.includes("Неохотное принятие"));
		assert.ok(def2.managementStrategiesRu.some((s) => s.includes("Позитивное подкрепление")));

		const def3 = getFranklDefinition(3);
		assert.equal(def3.symbol, "+");
		assert.ok(def3.descriptionRu.includes("Принятие лечения"));
		assert.ok(def3.managementStrategiesRu.some((s) => s.includes("похвала")));

		const def4 = getFranklDefinition(4);
		assert.equal(def4.symbol, "++");
		assert.ok(def4.descriptionRu.includes("Отличный раппорт"));
		assert.ok(def4.managementStrategiesRu.some((s) => s.includes("диплом") || s.includes("партнерство")));
	});

	it("3. Silver Diamine Fluoride (SDF) Silvering Clinical Protocol", () => {
		// Schema tests
		assert.equal(silveringDrugSchema.safeParse("Аргенат 30%").success, true);
		assert.equal(silveringDrugSchema.safeParse("Saforide 38%").success, true);
		assert.equal(silveringDrugSchema.safeParse("Riva Star SDF").success, true);
		assert.equal(silveringDrugSchema.safeParse("InvalidDrug").success, false);

		const silvering = calculatePediatricSilveringProtocol({
			teethNumbers: [51, 52, 61, 62],
			drug: "Saforide 38%",
			applicationsCount: 2,
		});

		assert.equal(silvering.drug, "Saforide 38%");
		assert.deepEqual(silvering.teethNumbers, [51, 52, 61, 62]);
		assert.equal(silvering.applicationsCount, 2);
		assert.ok(silvering.protocolDescriptionRu.includes("микробраша"));
		assert.ok(silvering.parentWarningRu.includes("стойкое темное (черное) окрашивание"));
		assert.ok(silvering.parentRecommendationsRu.some((r) => r.includes("60 минут")));
		assert.ok(silvering.formattedDiaryEntryRu.includes("2-я аппликация"));
	});

	it("4. Fissure Sealing Clinical Protocol (Non-invasive & Invasive)", () => {
		// Schema tests
		assert.equal(fissureSealingMethodSchema.safeParse("non_invasive").success, true);
		assert.equal(fissureSealingMethodSchema.safeParse("invasive").success, true);
		assert.equal(fissureSealantMaterialSchema.safeParse("Clinpro Sealant (3M)").success, true);
		assert.equal(fissureSealantMaterialSchema.safeParse("Fissurit FX (VOCO)").success, true);

		// Non-invasive
		const nonInvasive = calculatePediatricFissureSealingProtocol({
			teethNumbers: [16, 26, 36, 46],
			method: "non_invasive",
			material: "Clinpro Sealant (3M)",
		});
		assert.equal(nonInvasive.method, "non_invasive");
		assert.ok(nonInvasive.methodNameRu.includes("Неинвазивная"));
		assert.ok(nonInvasive.protocolDescriptionRu.includes("37% ортофосфорной кислотой"));
		assert.ok(nonInvasive.protocolDescriptionRu.includes("Фотополимеризация 20 секунд"));
		assert.ok(nonInvasive.parentRecommendationsRu.some((r) => r.includes("2 часов")));

		// Invasive
		const invasive = calculatePediatricFissureSealingProtocol({
			teethNumbers: [16, 46],
			method: "invasive",
			material: "Fissurit FX (VOCO)",
		});
		assert.equal(invasive.method, "invasive");
		assert.ok(invasive.methodNameRu.includes("Инвазивная"));
		assert.ok(invasive.protocolDescriptionRu.includes("Микропрепарирование"));
	});

	it("5. Pediatric Vital Pulpotomy / Amputation Protocol & Lip Biting Safety", () => {
		// Schema tests
		assert.equal(pulpotomySubBaseMaterialSchema.safeParse("Pulpotec").success, true);
		assert.equal(pulpotomySubBaseMaterialSchema.safeParse("Biodentine").success, true);
		assert.equal(pulpotomySubBaseMaterialSchema.safeParse("MTA ProRoot").success, true);
		assert.equal(pulpotomyRestorationSchema.safeParse("glass_ionomer").success, true);
		assert.equal(pulpotomyRestorationSchema.safeParse("stainless_steel_crown_ssc").success, true);

		const pulpotomy = calculatePediatricPulpotomyProtocol({
			toothNumber: 54,
			subBaseMaterial: "Pulpotec",
			restoration: "stainless_steel_crown_ssc",
			patientWeightKg: 20,
			patientAgeYears: 6,
		});

		assert.equal(pulpotomy.toothNumber, 54);
		assert.equal(pulpotomy.subBaseMaterial, "Pulpotec");
		assert.equal(pulpotomy.restoration, "stainless_steel_crown_ssc");
		assert.ok(pulpotomy.restorationNameRu.includes("металлическая коронка"));
		assert.ok(pulpotomy.protocolDescriptionRu.includes("15.5% сульфатом железа"));
		assert.ok(pulpotomy.anesthesiaSafetyWarningRu.includes("прикусить онемевшую губу"));
		assert.ok(pulpotomy.painManagementRu.includes("Ибупрофен") && pulpotomy.painManagementRu.includes("10 мг/кг"));
		assert.ok(pulpotomy.formattedDiaryEntryRu.includes("K04.0"));
	});

	it("6. Master Parent Post-Visit Recommendations Generator", () => {
		const memo = generatePediatricParentRecommendations({
			patientName: "Артём Смирнов",
			patientAgeYears: 6,
			doctorName: "Д-р Иванова Е.В.",
			clinicName: "Клиника DENTE Kids",
			franklRating: 3,
			pulpotomy: { toothNumber: 85, subBaseMaterial: "Biodentine" },
			fissureSealing: { teethNumbers: [36, 46] },
			silvering: { teethNumbers: [51, 52] },
			customNotes: "Контрольный осмотр через 3 месяца.",
		});

		assert.ok(memo.includes("ПАМЯТКА ДЛЯ РОДИТЕЛЕЙ ПОСЛЕ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЕМА"));
		assert.ok(memo.includes("Артём Смирнов, 6 лет"));
		assert.ok(memo.includes("Д-р Иванова Е.В."));
		assert.ok(memo.includes("Шкала Франкла"));
		assert.ok(memo.includes("ЛЕЧЕНИЕ ПУЛЬПИТА МОЛОЧНОГО ЗУБА #85"));
		assert.ok(memo.includes("ГЕРМЕТИЗАЦИЯ ФИССУР (ЗУБЫ 36, 46)"));
		assert.ok(memo.includes("СЕРЕБРЕНИЕ ВРЕМЕННЫХ ЗУБОВ (51, 52)"));
		assert.ok(memo.includes("ОБЩИЕ ПРАВИЛА ДОМАШНЕЙ ГИГИЕНЫ"));
		assert.ok(memo.includes("Контрольный осмотр через 3 месяца"));
	});

	it("7. Enhanced Form 043/u Pediatric Clinical Diary with Frankl Rating and Procedures", () => {
		const diary = generatePediatricCariogramDiaryText({
			patientAgeYears: 7,
			franklRating: 2,
			resorptionStages: {
				71: 75,
				81: 75,
			},
			pulpotomy: { toothNumber: 74 },
			fissureSealing: { teethNumbers: [16, 26] },
			customNotes: "Психологическая адаптация проведена успешно.",
		});

		assert.ok(diary.includes("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)"));
		assert.ok(diary.includes("Психоэмоциональный статус (Шкала Франкла)"));
		assert.ok(diary.includes("Рейтинг 2 (-)"));
		assert.ok(diary.includes("Зуб #71: резорбция 75%"));
		assert.ok(diary.includes("Кариограмме"));
		assert.ok(diary.includes("Выполненные клинические манипуляции"));
		assert.ok(diary.includes("Пульпотомия зуба 74"));
		assert.ok(diary.includes("Герметизация фиссур (16, 26)"));
		assert.ok(diary.includes("Психологическая адаптация проведена"));
	});
});
