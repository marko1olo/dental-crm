/**
 * implantologySSOTSuite.test.tsx — Канонический тестовый сьют SSOT имплантологии (DENTE CRM).
 * Валидирует 6 систем имплантации РФ, диапазоны торка 35–45 Н·см, ISQ 65–85,
 * формулу FDI 11–48, остеоденситометрию Misch D1–D4, целочисленные копейки и гарантийный паспорт.
 * Выполнен на чистом node:test и node:assert/strict (Мандаты 8e, 8n, 8am, 8b).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CANONICAL_IMPLANT_SYSTEMS,
	SURGICAL_QUICK_TEMPLATES,
	FDI_SURGICAL_PRESETS,
	resolveImplantSystem,
	getMischBoneDensityByToothFdi,
	getRecommendedTorqueZone,
	formatKopecksToRubles,
	generateWarrantyPassportRecord,
	buildSoapSurgeryDiaryText,
	type CanonicalImplantSystemId,
} from "../implantologyCatalogData";

describe("🏛️ Canonical Implantology & Surgical SSOT Suite (DENTE CRM)", () => {
	it("1. Verifies 6 key implant systems widely used in the Russian Federation", () => {
		const requiredSystems: CanonicalImplantSystemId[] = [
			"osstem",
			"straumann",
			"dentium",
			"nobel_biocare",
			"astra_tech",
			"anyridge",
		];

		for (const sysId of requiredSystems) {
			const sys = CANONICAL_IMPLANT_SYSTEMS[sysId];
			assert.ok(sys, `System ${sysId} must exist in canonical registry`);
			assert.ok(sys.brandName.length > 0, `System ${sysId} must have brandName`);
			assert.ok(sys.countryRu.length > 0, `System ${sysId} must have country`);
			assert.ok(sys.manufacturer.length > 0, `System ${sysId} must have manufacturer`);
			assert.equal(sys.connectionType, "conical", "Modern systems in RF must have conical connection");
			assert.ok(sys.screwdriverType.length > 0, "Must specify screwdriver type");

			// Типоразмеры: диаметр 3.0–5.5 мм, длина 7.0–14.0 мм
			for (const d of sys.diametersMm) {
				assert.ok(d >= 3.0 && d <= 5.5, `Diameter ${d} mm must be in clinical range`);
			}
			for (const l of sys.lengthsMm) {
				assert.ok(l >= 7.0 && l <= 14.0, `Length ${l} mm must be in clinical range`);
			}

			// Проверка торка и стабильности
			assert.ok(sys.defaultTorqueNcm >= 30 && sys.defaultTorqueNcm <= 45, "Default torque must be 30..45 N·cm");
			assert.ok(sys.maxSafeTorqueNcm >= 40 && sys.maxSafeTorqueNcm <= 50, "Max safe torque must be 40..50 N·cm");
			assert.ok(sys.recommendedIsqRange[0] >= 65 && sys.recommendedIsqRange[1] <= 85, "ISQ range must be within 65..85");

			// Финансы: себестоимость и цена в копейках
			assert.ok(typeof sys.implantCostKopecks === "bigint", "Cost must be BigInt");
			assert.ok(typeof sys.patientPriceKopecks === "bigint", "Price must be BigInt");
			assert.ok(sys.patientPriceKopecks > sys.implantCostKopecks, "Patient price must exceed cost");
		}
	});

	it("2. Verifies torque green zone (35–45 N·cm) and ISQ primary stability", () => {
		// Ниже нормы (<35 Н·см)
		const under = getRecommendedTorqueZone(25);
		assert.equal(under.status, "under_torque");
		assert.ok(under.labelRu.includes("<35"), "Should warn about low torque");

		// Зеленая зона оптимума (35–45 Н·см)
		const opt35 = getRecommendedTorqueZone(35);
		assert.equal(opt35.status, "optimal_green");
		assert.ok(opt35.labelRu.includes("35–45"), "Should indicate optimal green zone");

		const opt40 = getRecommendedTorqueZone(40);
		assert.equal(opt40.status, "optimal_green");

		const opt45 = getRecommendedTorqueZone(45);
		assert.equal(opt45.status, "optimal_green");

		// Превышение (>45 Н·см)
		const over = getRecommendedTorqueZone(50);
		assert.equal(over.status, "over_torque");
		assert.ok(over.labelRu.includes(">45"), "Should warn about over-torque");
	});

	it("3. Verifies anatomical Misch bone density mapping across FDI dental arch (11–48)", () => {
		// D1: Фронтальный отдел нижней челюсти
		assert.equal(getMischBoneDensityByToothFdi(41), "D1");
		assert.equal(getMischBoneDensityByToothFdi(32), "D1");
		assert.equal(getMischBoneDensityByToothFdi(43), "D1");

		// D2: Боковой отдел нижней челюсти
		assert.equal(getMischBoneDensityByToothFdi(46), "D2");
		assert.equal(getMischBoneDensityByToothFdi(35), "D2");

		// D3: Верхняя челюсть
		assert.equal(getMischBoneDensityByToothFdi(11), "D3");
		assert.equal(getMischBoneDensityByToothFdi(16), "D3");
		assert.equal(getMischBoneDensityByToothFdi(24), "D3");

		// D4: Бугры верхней челюсти
		assert.equal(getMischBoneDensityByToothFdi(17), "D4");
		assert.equal(getMischBoneDensityByToothFdi(28), "D4");
	});

	it("4. Verifies 1-click clinical surgical templates", () => {
		assert.equal(SURGICAL_QUICK_TEMPLATES.length, 4, "Must offer 4 standard surgical templates");

		// 1. Немедленная имплантация
		const imm = SURGICAL_QUICK_TEMPLATES.find((t) => t.id === "immediate_extraction");
		assert.ok(imm, "Immediate template must exist");
		assert.equal(imm.stage, "one_stage_healing_abutment");
		assert.equal(imm.defaultTorqueNcm, 40);
		assert.equal(imm.isImmediateLoading, true);
		assert.equal(imm.boneGraftRequired, true);

		// 2. Классическая двухэтапная
		const classic = SURGICAL_QUICK_TEMPLATES.find((t) => t.id === "classic_two_stage");
		assert.ok(classic, "Classic template must exist");
		assert.equal(classic.stage, "two_stage_plug");
		assert.equal(classic.defaultTorqueNcm, 35);
		assert.equal(classic.boneGraftRequired, false);

		// 3. Закрытый синус-лифтинг
		const sinus = SURGICAL_QUICK_TEMPLATES.find((t) => t.id === "closed_sinus_lift");
		assert.ok(sinus, "Sinus lift template must exist");
		assert.equal(sinus.boneGraftRequired, true);

		// 4. Формирователь десны
		const fdm = SURGICAL_QUICK_TEMPLATES.find((t) => t.id === "healing_abutment_placement");
		assert.ok(fdm, "FDM template must exist");
		assert.equal(fdm.stage, "one_stage_healing_abutment");
		assert.equal(fdm.defaultTorqueNcm, 15);
	});

	it("5. Verifies warranty passport generation with serial, lot and QR-payload", () => {
		const passport = generateWarrantyPassportRecord({
			toothFdi: 46,
			systemId: "osstem",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isq: 74,
			stage: "one_stage_healing_abutment",
			patientName: "Смирнов Алексей Петрович",
			doctorName: "Д-р Воронов А. В.",
		});

		assert.ok(passport.passportId.startsWith("PASS-IMP-46-"), "Passport ID must follow format");
		assert.equal(passport.brandName, "Osstem");
		assert.equal(passport.diameterMm, 4.0);
		assert.equal(passport.lengthMm, 10.0);
		assert.equal(passport.insertionTorqueNcm, 35);
		assert.equal(passport.isqValue, 74);
		assert.ok(passport.lotNumber.length > 5, "Must generate valid lot number");
		assert.ok(passport.serialNumber.length > 5, "Must generate valid serial number");
		assert.ok(passport.expectedOsteointegrationDateIso.length === 10, "Osteointegration date must be ISO date");

		// Валидация QR-пейлоада
		const qrData = JSON.parse(passport.verificationQrPayload);
		assert.equal(qrData.brand, "Osstem");
		assert.equal(qrData.toothFdi, 46);
		assert.equal(qrData.lot, passport.lotNumber);
		assert.equal(qrData.sn, passport.serialNumber);
	});

	it("6. Verifies currency formatting in integer kopecks without float errors", () => {
		const formattedCost = formatKopecksToRubles(1250000n);
		assert.ok(formattedCost.includes("12") && formattedCost.includes("500"), "Cost 1250000 kopecks must format as 12 500 ₽");

		const formattedPrice = formatKopecksToRubles(6500000n);
		assert.ok(formattedPrice.includes("65") && formattedPrice.includes("000"), "Price 6500000 kopecks must format as 65 000 ₽");
	});

	it("7. Verifies automatic SOAP diary synthesis for electronic health record (EHR)", () => {
		const diary = buildSoapSurgeryDiaryText({
			toothFdi: 46,
			boneDensity: "D2",
			brandName: "Osstem",
			lineName: "TS III SA",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isqValue: 74,
			screwdriverAliasRu: "Шестигранник 1.2 мм",
			stage: "one_stage_healing_abutment",
			isGbrPerformed: false,
		});

		assert.ok(diary.includes("ДНЕВНИК ХИРУРГИЧЕСКОГО ПРИЁМА"), "Header must be present");
		assert.ok(diary.includes("зуб 46"), "Tooth FDI must be specified");
		assert.ok(diary.includes("Misch: D2"), "Bone density must be in diary");
		assert.ok(diary.includes("Osstem TS III SA"), "Implant system line must be recorded");
		assert.ok(diary.includes("35 Н·см"), "Torque must be recorded");
		assert.ok(diary.includes("ISQ: 74"), "ISQ must be recorded");
		assert.ok(diary.includes("формирователя десны"), "Stage must be documented");
		assert.ok(diary.includes("Гемостаз полный"), "Hemostasis must be noted");
	});

	it("8. Verifies brand resolution fallback", () => {
		assert.equal(resolveImplantSystem("straumann blx").id, "straumann");
		assert.equal(resolveImplantSystem("nobel active cc").id, "nobel_biocare");
		assert.equal(resolveImplantSystem("dentium superline").id, "dentium");
		assert.equal(resolveImplantSystem("astra tech ev").id, "astra_tech");
		assert.equal(resolveImplantSystem("megagen anyridge").id, "anyridge");
		assert.equal(resolveImplantSystem("unknown").id, "osstem");
	});
});
