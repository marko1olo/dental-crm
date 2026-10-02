import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateWasteNetWeight,
	calculateWasteWeights,
	calculateWasteWeightsFromGrams,
	generateWasteSealNumber,
	generateWasteBarcode,
	validateStorageDuration,
	generateMedicalWasteTransferAct,
	generateWasteTransferActHtml,
	type MedicalWasteJournalRecord,
} from "../waste/medicalWasteEngine.js";
import {
	getMedicalWasteClass,
	getMedicalWastePackaging,
	getWasteStorageLocation,
	SANPIN_MEDICAL_WASTE_CLASSES,
	SANPIN_WASTE_PACKAGING_TYPES,
	SANPIN_STORAGE_LOCATIONS,
} from "../waste/medicalWastePresets.js";
import {
	calculateDisinfectantForRoom,
	calculateDisinfectantForToolImmersion,
	calculateNextGeneralCleaningDate,
	validateGeneralCleaningSchedule,
	generateGeneralCleaningPrintHtml,
	STATUTORY_DISINFECTANTS_CATALOG,
	type DisinfectionJournalRecord,
} from "../disinfection/disinfectionLogsEngine.js";

describe("ZERO-MOCK SANPIN 2.1.3684-21 MEDICAL WASTE & DISINFECTION INQUISITOR TESTS", () => {
	describe("1. Medical Waste Class B (SanPiN 2.1.3684-21) Weight Accounting", () => {
		it("calculates waste weights from grams with exact precision without synthetic rounding", () => {
			// Взвешивание желтого пакета с валиками, перчатками и карпулами
			// Брутто по весам: 2450 г, тара пакета 80 г -> нетто 2370 г (2.37 кг)
			const res = calculateWasteWeightsFromGrams(2450, "yellow_bag");
			assert.equal(res.grossGrams, 2450);
			assert.equal(res.tareGrams, 80);
			assert.equal(res.netGrams, 2370);
			assert.equal(res.grossKg, 2.45);
			assert.equal(res.tareKg, 0.08);
			assert.equal(res.netKg, 2.37);
		});

		it("calculates sharps box container weights with needle remover", () => {
			// Емкость-контейнер для острого инструментария (иглы, файлы, лезвия)
			// Брутто: 980 г, тара контейнера с иглосъемником 180 г -> нетто 800 г (0.80 кг)
			const res = calculateWasteWeightsFromGrams(980, "yellow_sharps_box_needle_remover");
			assert.equal(res.grossGrams, 980);
			assert.equal(res.tareGrams, 180);
			assert.equal(res.netGrams, 800);
			assert.equal(res.grossKg, 0.98);
			assert.equal(res.tareKg, 0.18);
			assert.equal(res.netKg, 0.8);
		});

		it("prevents negative net weight if tare exceeds gross", () => {
			const res = calculateWasteNetWeight(0.05, 0.1);
			assert.equal(res, 0);
		});

		it("verifies Class B mandatory dental specific items per SanPiN 2.1.3684-21", () => {
			const classB = getMedicalWasteClass("class_B");
			assert.equal(classB.letterCode, "Б");
			assert.ok(
				classB.dentalSpecificItemsRu.some((item) =>
					item.includes("Карпулы от анестетиков с кровью")
				),
			);
			assert.ok(
				classB.dentalSpecificItemsRu.some((item) =>
					item.includes("ватные валики") && item.includes("кровью")
				),
			);
			assert.ok(
				classB.dentalSpecificItemsRu.some((item) =>
					item.includes("перчатки")
				),
			);
			assert.ok(
				classB.dentalSpecificItemsRu.some((item) =>
					item.includes("Удаленные зубы")
				),
			);
			assert.ok(
				classB.dentalSpecificItemsRu.some((item) =>
					item.includes("иглы") && item.includes("скальпелей")
				),
			);
		});

		it("verifies puncture-proof sharps container requirements", () => {
			const needleBox = getMedicalWastePackaging("yellow_sharps_box_needle_remover");
			assert.equal(needleBox.wasteClass, "class_B");
			assert.equal(needleBox.isPunctureProof, true);
			assert.equal(needleBox.isHermeticSealed, true);

			const punctureBox = getMedicalWastePackaging("yellow_puncture_proof_container");
			assert.equal(punctureBox.isPunctureProof, true);
		});
	});

	describe("2. SanPiN 2.1.3684-21 Storage Duration Control", () => {
		it("enforces maximum 24 hours at room temperature (+18...+25°C)", () => {
			const loc = getWasteStorageLocation("cabinet_room_temp");
			assert.equal(loc.maxAllowedStorageHours, 24);
			assert.equal(loc.maxAllowedStorageDays, 1);

			// Тест: 10 часов накопления при комнатной температуре -> норма
			const start = "2026-10-01T08:00:00Z";
			const checkOk = "2026-10-01T18:00:00Z";
			const resOk = validateStorageDuration(start, "cabinet_room_temp", checkOk);
			assert.equal(resOk.isExpired, false);
			assert.equal(resOk.hoursElapsed, 10);
			assert.equal(resOk.hoursRemaining, 14);
			assert.equal(resOk.status, "optimal");

			// Тест: 25 часов накопления -> превышение (просрочено)
			const checkExpired = "2026-10-02T09:00:00Z";
			const resExpired = validateStorageDuration(start, "cabinet_room_temp", checkExpired);
			assert.equal(resExpired.isExpired, true);
			assert.equal(resExpired.hoursElapsed, 25);
			assert.equal(resExpired.status, "expired");
			assert.ok(resExpired.statusMessageRu.includes("Превышен нормативный срок накопления"));
		});

		it("enforces maximum 72 hours (3 days) in specialized refrigerator at <= +5°C", () => {
			const loc = getWasteStorageLocation("waste_refrigerator_2_8");
			assert.equal(loc.maxAllowedStorageHours, 72);
			assert.equal(loc.maxAllowedStorageDays, 3);
			assert.ok(loc.temperatureRangeRu.includes("не выше +5°C"));

			// 48 часов в холодильнике -> норма (осталось 24 ч)
			const start = "2026-10-01T08:00:00Z";
			const check48h = "2026-10-03T08:00:00Z";
			const res48 = validateStorageDuration(start, "waste_refrigerator_2_8", check48h);
			assert.equal(res48.isExpired, false);
			assert.equal(res48.hoursElapsed, 48);
			assert.equal(res48.hoursRemaining, 24);

			// 74 часа в холодильнике -> просрочено per СанПиН 2.1.3684-21 п. 174
			const check74h = "2026-10-04T10:00:00Z";
			const res74 = validateStorageDuration(start, "waste_refrigerator_2_8", check74h);
			assert.equal(res74.isExpired, true);
			assert.equal(res74.hoursElapsed, 74);
			assert.equal(res74.status, "expired");
		});

		it("enforces maximum 30 days (720 hours) in freezer at -18°C", () => {
			const loc = getWasteStorageLocation("waste_freezer_minus_18");
			assert.equal(loc.maxAllowedStorageHours, 720);
			assert.equal(loc.maxAllowedStorageDays, 30);
		});
	});

	describe("3. A4 Transfer Act & Pure Print Form (No Gray Backgrounds)", () => {
		it("generates transfer act with complete clinic and disposal contractor details", () => {
			const records: MedicalWasteJournalRecord[] = [
				{
					id: "w-rec-1",
					timestamp: "2026-10-02T10:00",
					wasteClass: "class_B",
					departmentNameRu: "Хирургический кабинет",
					packageType: "yellow_bag",
					packageCount: 2,
					grossWeightKg: 4.9,
					tareWeightKg: 0.16,
					netWeightKg: 4.74,
					sealNumber: "ПЛ-Б-2026-00042",
					barcode: "WASTE-CLASS_B-SURG-20261002-1",
					decontaminationMethod: "chemical_soaking_disinfectant",
					storageLocation: "waste_refrigerator_2_8",
					operatorStaffFullName: "Иванова М.И.",
					operatorStaffPosition: "Медсестра",
					status: "accumulating",
				},
				{
					id: "w-rec-2",
					timestamp: "2026-10-02T10:30",
					wasteClass: "class_B",
					departmentNameRu: "Хирургический кабинет",
					packageType: "yellow_sharps_box_needle_remover",
					packageCount: 1,
					grossWeightKg: 0.98,
					tareWeightKg: 0.18,
					netWeightKg: 0.8,
					sealNumber: "ПЛ-Б-2026-00043",
					barcode: "WASTE-CLASS_B-SURG-20261002-2",
					decontaminationMethod: "physical_autoclave_134",
					storageLocation: "waste_refrigerator_2_8",
					operatorStaffFullName: "Иванова М.И.",
					operatorStaffPosition: "Медсестра",
					status: "accumulating",
				},
			];

			const act = generateMedicalWasteTransferAct({
				actNumber: "АКТ-ВЫВОЗ-2026/102",
				records,
				clinicInfo: {
					name: "ООО «Стоматологическая клиника ДЕНТЕ»",
					inn: "7701234567",
					ogrn: "1157746000000",
					address: "г. Москва, ул. Клиническая, д. 12",
					responsiblePerson: "Смирнова Е.В.",
					responsiblePosition: "Главная медицинская сестра",
				},
				disposalCompanyInfo: {
					name: "ООО «ЭкоМедСервис»",
					inn: "7709876543",
					licenseNumber: "Л020-00113-77/00123456",
					contractNumber: "ДОГ-УТИЛ-2026/04",
					contractDate: "15.01.2026",
					driverFullName: "Ковалев А.С.",
					vehiclePlateNumber: "В 342 ТТ 799",
				},
			});

			assert.equal(act.actNumber, "АКТ-ВЫВОЗ-2026/102");
			assert.equal(act.totalPackagesCount, 3);
			assert.equal(act.totalNetWeightKg, 5.54);
			assert.equal(act.totalsByClass.class_B.count, 3);
			assert.equal(act.totalsByClass.class_B.totalNetWeightKg, 5.54);

			const html = generateWasteTransferActHtml(act);

			// ИНКВИЗИЦИЯ СЕРЫХ ПЯТЕН: Проверяем полное отсутствие серых заливок #f0f0f0 и #f8f8f8
			assert.ok(!html.includes("#f0f0f0"), "HTML print form must NOT contain #f0f0f0 gray backgrounds");
			assert.ok(!html.includes("#f8f8f8"), "HTML print form must NOT contain #f8f8f8 gray backgrounds");
			assert.ok(html.includes("@media print"), "HTML print form must declare explicit @media print styles");
			assert.ok(html.includes("Л020-00113-77/00123456"), "Must contain contractor license number");
			assert.ok(html.includes("Ковалев А.С."), "Must contain driver name");
			assert.ok(html.includes("В 342 ТТ 799"), "Must contain vehicle plate");
		});
	});

	describe("4. Disinfection & General Cleaning Calculation (SanPiN 3.3686-21)", () => {
		it("calculates exact disinfectant solution and concentrate for surgical room (wiping 100 ml/m2)", () => {
			// Хирургический кабинет / операционная: 32.5 м2
			// Способ: двукратное протирание ветошью (100 мл/м2)
			// Препарат: Аламинол 5.0% (вирулицидный режим per СанПиН 3.3686-21)
			const calc = calculateDisinfectantForRoom({
				treatedAreaM2: 32.5,
				applicationMethod: "wiping",
				concentrationPercent: 5.0,
				exposureMinutes: 60,
			});

			assert.equal(calc.treatedAreaM2, 32.5);
			assert.equal(calc.rateMlPerM2, 100);
			// 32.5 * 100 = 3250 мл = 3.25 л
			assert.equal(calc.totalSolutionVolumeLiters, 3.25);
			// Концентрат 5%: 3250 * 0.05 = 162.5 мл
			assert.equal(calc.requiredConcentrateVolumeMl, 162.5);
			// Вода: (3250 - 162.5) / 1000 = 3.09 л
			assert.equal(calc.requiredWaterVolumeLiters, 3.09);
			assert.equal(calc.exposureMinutes, 60);
		});

		it("calculates exact disinfectant solution for spraying method (200 ml/m2)", () => {
			// Терапевтический кабинет 25.0 м2, орошение гидропультом (200 мл/м2), Септолит 2.0%
			const calc = calculateDisinfectantForRoom({
				treatedAreaM2: 25.0,
				applicationMethod: "spraying",
				concentrationPercent: 2.0,
				exposureMinutes: 30,
			});

			assert.equal(calc.treatedAreaM2, 25.0);
			assert.equal(calc.rateMlPerM2, 200);
			// 25.0 * 200 = 5000 мл = 5.00 л
			assert.equal(calc.totalSolutionVolumeLiters, 5.0);
			// Концентрат 2%: 5000 * 0.02 = 100 мл
			assert.equal(calc.requiredConcentrateVolumeMl, 100.0);
			// Вода: 4.90 л
			assert.equal(calc.requiredWaterVolumeLiters, 4.9);
			assert.equal(calc.exposureMinutes, 30);
		});

		it("calculates disinfectant solution for tool immersion (2.0 L per instrument set)", () => {
			// Замачивание 4 наборов стоматологических инструментов в Бриллиант Классик 2%
			// 4 * 2.0 л = 8.0 л
			const calc = calculateDisinfectantForToolImmersion({
				instrumentSetsCount: 4,
				concentrationPercent: 2.0,
				exposureMinutes: 60,
			});

			assert.equal(calc.instrumentSetsCount, 4);
			assert.equal(calc.totalSolutionVolumeLiters, 8.0);
			// Концентрат 2%: 8000 * 0.02 = 160 мл
			assert.equal(calc.requiredConcentrateVolumeMl, 160.0);
			// Вода: (8000 - 160) / 1000 = 7.84 л
			assert.equal(calc.requiredWaterVolumeLiters, 7.84);
			assert.equal(calc.exposureMinutes, 60);
		});
	});

	describe("5. General Cleaning Schedule 7-Day Cycle & Overdue Detection", () => {
		it("calculates next cleaning date exactly +7 days", () => {
			const nextDate = calculateNextGeneralCleaningDate("2026-10-01");
			assert.equal(nextDate, "2026-10-08");
		});

		it("detects optimal schedule when elapsed <= 5 days", () => {
			const status = validateGeneralCleaningSchedule("2026-10-01", "Хирургия", "surgical", "2026-10-04");
			assert.equal(status.daysElapsed, 3);
			assert.equal(status.daysRemaining, 4);
			assert.equal(status.isOverdue, false);
			assert.equal(status.status, "optimal");
		});

		it("detects approaching schedule limit when remaining <= 1 day", () => {
			const status = validateGeneralCleaningSchedule("2026-10-01", "Хирургия", "surgical", "2026-10-07");
			assert.equal(status.daysElapsed, 6);
			assert.equal(status.daysRemaining, 1);
			assert.equal(status.isOverdue, false);
			assert.equal(status.status, "approaching_limit");
		});

		it("detects overdue general cleaning when elapsed > 7 days per SanPiN 3.3686-21", () => {
			const status = validateGeneralCleaningSchedule("2026-10-01", "Хирургия", "surgical", "2026-10-10");
			assert.equal(status.daysElapsed, 9);
			assert.equal(status.isOverdue, true);
			assert.equal(status.status, "overdue");
			assert.ok(status.statusMessageRu.includes("Просрочена генеральная уборка на 2 дн."));
		});

		it("generates pure A4 general cleaning print HTML without gray backgrounds", () => {
			const records: DisinfectionJournalRecord[] = [
				{
					id: "cln-1",
					logDate: "2026-10-02",
					roomName: "Хирургический кабинет № 1",
					roomType: "surgical",
					cleaningType: "general",
					treatedAreaM2: 32.5,
					applicationMethod: "wiping",
					disinfectantName: "Аламинол",
					activeIngredient: "ЧАС + Глутаровый альдегид",
					concentrationPercent: 5.0,
					solutionVolumeLiters: 3.25,
					concentrateVolumeMl: 162.5,
					waterVolumeLiters: 3.09,
					exposureMinutes: 60,
					uvIrradiationMinutes: 120,
					ventilationMinutes: 15,
					operatorStaffFullName: "Медсестра Соколова А.П.",
					operatorStaffPosition: "Медсестра",
					isInspectorVerified: true,
				},
			];

			const html = generateGeneralCleaningPrintHtml({
				records,
				clinicName: "ООО «ДЕНТЕ»",
				chiefDoctor: "Кузнецов Д.В.",
				headNurse: "Соколова А.П.",
			});

			assert.ok(!html.includes("#f0f0f0"), "HTML must not have #f0f0f0 gray backgrounds");
			assert.ok(!html.includes("#f8f8f8"), "HTML must not have #f8f8f8 gray backgrounds");
			assert.ok(html.includes("Аламинол (5%)"));
			assert.ok(html.includes("120 мин"));
			assert.ok(html.includes("Кузнецов Д.В."));
		});
	});
});
