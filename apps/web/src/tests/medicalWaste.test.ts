import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateWasteNetWeight,
	calculateWasteWeights,
	exportWasteJournalToCsv,
	generateMedicalWasteTransferAct,
	generateWasteBarcode,
	generateWasteSealNumber,
	generateWasteTransferActHtml,
	type MedicalWasteJournalRecord,
	parseWasteBarcode,
	validateStorageDuration,
} from "../components/sanpin/waste/medicalWasteEngine.js";
import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
	getWasteStorageLocation,
	SANPIN_DECONTAMINATION_METHODS,
	SANPIN_MEDICAL_WASTE_CLASSES,
	SANPIN_PACKAGING_TYPES,
	SANPIN_STORAGE_LOCATIONS,
} from "../components/sanpin/waste/medicalWastePresets.js";
import { MedicalWasteJournalModal } from "../components/sanpin/waste/MedicalWasteJournalModal.js";

test("Medical Waste Presets: statutory SanPiN 2.1.3684-21 waste classes integrity", () => {
	assert.equal(SANPIN_MEDICAL_WASTE_CLASSES.length, 3, "Must define Class A, B, and G");

	const classA = getMedicalWasteClass("class_A");
	assert.equal(classA.letterCode, "А");
	assert.equal(classA.colorTheme.bagColorRu, "Белый");
	assert.ok(classA.mandatoryPackaging.includes("white_bag"));

	const classB = getMedicalWasteClass("class_B");
	assert.equal(classB.letterCode, "Б");
	assert.equal(classB.colorTheme.bagColorRu, "Желтый");
	assert.ok(classB.dentalSpecificItemsRu.some((item) => item.includes("ватные валики") || item.includes("иглы")));
	assert.ok(classB.mandatoryPackaging.includes("yellow_sharps_box_needle_remover"));
	assert.ok(classB.allowedDecontamination.includes("physical_autoclave_134"));

	const classG = getMedicalWasteClass("class_G");
	assert.equal(classG.letterCode, "Г");
	assert.equal(classG.colorTheme.bagColorRu, "Черный");
	assert.ok(classG.dentalSpecificItemsRu.some((item) => item.includes("амальгам") || item.includes("лампы")));
});

test("Medical Waste Packaging: puncture-proof flags, colors, and tare weights", () => {
	assert.ok(SANPIN_PACKAGING_TYPES.length >= 6);

	const sharpsBox = getMedicalWastePackaging("yellow_sharps_box_needle_remover");
	assert.equal(sharpsBox.wasteClass, "class_B");
	assert.equal(sharpsBox.isPunctureProof, true);
	assert.equal(sharpsBox.isHermeticSealed, true);
	assert.ok(sharpsBox.defaultTareWeightKg > 0);

	const yellowBag = getMedicalWastePackaging("yellow_bag");
	assert.equal(yellowBag.isPunctureProof, false);
	assert.equal(yellowBag.colorRu, "Желтый");

	const mercuryContainer = getMedicalWastePackaging("black_container_mercury");
	assert.equal(mercuryContainer.wasteClass, "class_G");
	assert.equal(mercuryContainer.isPunctureProof, true);
});

test("Medical Waste Weight Engine: gross, tare, and net precision calculations", () => {
	// 1. Базовый расчет нетто
	assert.equal(calculateWasteNetWeight(3.45, 0.25), 3.2);
	assert.equal(calculateWasteNetWeight(0.5, 0.08), 0.42);
	assert.equal(calculateWasteNetWeight(0.05, 0.1), 0); // отрицательный результат клампится в 0

	// 2. Расчет весовой структуры по таре по умолчанию
	const weights = calculateWasteWeights(4.5, "yellow_bag");
	assert.equal(weights.grossKg, 4.5);
	assert.equal(weights.tareKg, 0.08);
	assert.equal(weights.netKg, 4.42);

	// 3. Расчет с пользовательским весом тары
	const customWeights = calculateWasteWeights(5.0, "yellow_puncture_proof_container", 0.3);
	assert.equal(customWeights.grossKg, 5.0);
	assert.equal(customWeights.tareKg, 0.3);
	assert.equal(customWeights.netKg, 4.7);
});

test("Medical Waste Seal & Barcode Generator and Parser", () => {
	const sealB = generateWasteSealNumber("class_B", 412, 2026);
	assert.equal(sealB, "ПЛ-Б-2026-00412");

	const sealA = generateWasteSealNumber("class_A", 9, 2026);
	assert.equal(sealA, "ПЛ-А-2026-00009");

	const barcode = generateWasteBarcode("class_B", "SURG", "2026-08-22", 8419);
	assert.equal(barcode, "WASTE-CLASS_B-SURG-20260822-8419");

	const parsed = parseWasteBarcode(barcode);
	assert.equal(parsed.isValid, true);
	assert.equal(parsed.wasteClass, "class_B");
	assert.equal(parsed.departmentCode, "SURG");
	assert.equal(parsed.dateStr, "2026-08-22");
	assert.equal(parsed.sequenceId, "8419");

	const invalidParsed = parseWasteBarcode("INVALID-BARCODE-123");
	assert.equal(invalidParsed.isValid, false);
});

test("Medical Waste Storage Duration Validator: room temp, refrigerator, freezer limits", () => {
	const now = new Date("2026-08-22T12:00:00Z");

	// 1. Комнатная температура (макс 24 ч) — 10 часов накопления (норма)
	const tenHoursAgo = new Date(now.getTime() - 10 * 3600 * 1000).toISOString();
	const check1 = validateStorageDuration(tenHoursAgo, "cabinet_room_temp", now.toISOString());
	assert.equal(check1.isExpired, false);
	assert.equal(check1.status, "optimal");
	assert.equal(check1.hoursElapsed, 10);
	assert.equal(check1.hoursRemaining, 14);

	// 2. Комнатная температура — 22 часа накопления (предупреждение: осталось <= 4 ч)
	const twentyTwoHoursAgo = new Date(now.getTime() - 22 * 3600 * 1000).toISOString();
	const check2 = validateStorageDuration(twentyTwoHoursAgo, "cabinet_room_temp", now.toISOString());
	assert.equal(check2.isExpired, false);
	assert.equal(check2.status, "warning_approaching_limit");
	assert.equal(check2.hoursRemaining, 2);

	// 3. Комнатная температура — 28 часов накопления (просрочено)
	const twentyEightHoursAgo = new Date(now.getTime() - 28 * 3600 * 1000).toISOString();
	const check3 = validateStorageDuration(twentyEightHoursAgo, "cabinet_room_temp", now.toISOString());
	assert.equal(check3.isExpired, true);
	assert.equal(check3.status, "expired");

	// 4. Холодильник (+2...+8°C, макс 7 суток = 168 ч) — 4 дня накопления (96 ч)
	const fourDaysAgo = new Date(now.getTime() - 96 * 3600 * 1000).toISOString();
	const check4 = validateStorageDuration(fourDaysAgo, "waste_refrigerator_2_8", now.toISOString());
	assert.equal(check4.isExpired, false);
	assert.equal(check4.status, "optimal");
	assert.equal(check4.maxHoursAllowed, 168);
	assert.equal(check4.hoursRemaining, 72);

	// 5. Морозильник (-18°C, макс 30 суток = 720 ч)
	const freezerLocation = getWasteStorageLocation("waste_freezer_minus_18");
	assert.equal(freezerLocation.maxAllowedStorageHours, 720);
	assert.equal(freezerLocation.maxAllowedStorageDays, 30);
});

test("Medical Waste Technological Journal & Transfer Act generation", () => {
	const records: MedicalWasteJournalRecord[] = [
		{
			id: "rec-1",
			timestamp: "2026-08-22T09:00",
			wasteClass: "class_B",
			departmentNameRu: "Терапия 1",
			packageType: "yellow_bag",
			packageCount: 2,
			grossWeightKg: 3.2,
			tareWeightKg: 0.16,
			netWeightKg: 3.04,
			sealNumber: "ПЛ-Б-2026-001",
			barcode: "WASTE-CLASS_B-TER-20260822-001",
			decontaminationMethod: "chemical_soaking_disinfectant",
			storageLocation: "cabinet_room_temp",
			operatorStaffFullName: "Иванова А.А.",
			operatorStaffPosition: "Медсестра",
			status: "accumulating",
		},
		{
			id: "rec-2",
			timestamp: "2026-08-22T10:00",
			wasteClass: "class_A",
			departmentNameRu: "Ресепшн",
			packageType: "white_bag",
			packageCount: 1,
			grossWeightKg: 2.5,
			tareWeightKg: 0.05,
			netWeightKg: 2.45,
			sealNumber: "ПЛ-А-2026-001",
			barcode: "WASTE-CLASS_A-ADM-20260822-002",
			decontaminationMethod: "none_class_a",
			storageLocation: "central_accumulation_site",
			operatorStaffFullName: "Петрова Б.Б.",
			operatorStaffPosition: "Санитарка",
			status: "accumulating",
		},
	];

	// Генерация акта передачи
	const act = generateMedicalWasteTransferAct({
		actNumber: "АКТ-ВЫВОЗ-101",
		records,
		disposalCompanyInfo: {
			name: "ООО «ЭкоСервис»",
			driverFullName: "Кузнецов М.С.",
			vehiclePlateNumber: "А 777 АА 77",
		},
	});

	assert.equal(act.actNumber, "АКТ-ВЫВОЗ-101");
	assert.equal(act.totalPackagesCount, 3);
	assert.equal(act.totalNetWeightKg, 5.49);
	assert.equal(act.totalsByClass.class_B.count, 2);
	assert.equal(act.totalsByClass.class_B.totalNetWeightKg, 3.04);
	assert.equal(act.totalsByClass.class_A.count, 1);
	assert.equal(act.totalsByClass.class_A.totalNetWeightKg, 2.45);

	// Экспорт CSV
	const csv = exportWasteJournalToCsv(records);
	assert.ok(csv.startsWith("\uFEFF"), "CSV must include UTF-8 BOM");
	assert.ok(csv.includes("№ п/п;Дата и время накопления;Класс отходов"));
	assert.ok(csv.includes("Класс Б — Эпидемиологически опасные"));
	assert.ok(csv.includes("ИТОГО ПО ЖУРНАЛУ"));

	// Экспорт HTML акта
	const html = generateWasteTransferActHtml(act);
	assert.ok(html.includes("АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ № АКТ-ВЫВОЗ-101"));
	assert.ok(html.includes("СанПиН 2.1.3684-21"));
	assert.ok(html.includes("ООО «ЭкоСервис»"));
	assert.ok(html.includes("А 777 АА 77"));
});

test("MedicalWasteJournalModal: component export and contract verification", () => {
	assert.equal(typeof MedicalWasteJournalModal, "function");
	assert.equal(typeof calculateWasteNetWeight, "function");
	assert.equal(typeof generateWasteSealNumber, "function");
	assert.equal(typeof generateWasteBarcode, "function");
});
