/**
 * ============================================================================
 * SANPIN 2.1.3684-21 MEDICAL WASTE & AUTOCLAVE DISPOSAL TEST SUITE
 * Validates:
 * 1. Weight Accounting Engine (Gross, Tare, Net to 0.01 kg accuracy)
 * 2. SanPiN Waste Classification (Class A, Class B, Class V, Class G)
 * 3. Decontamination Protocols (Autoclaving 134°C, Chemical Soaking, Incineration)
 * 4. Storage Duration & Expiration Guards (Room Temp 24h, Refrigerator 7d, Freezer 30d)
 * 5. Barcode & Security Seal Number Generation & Parsing (Class A, B, V, G)
 * 6. Transfer Act Generation & Totals Aggregation
 * 7. 58x40 mm Thermal Label Printing HTML Engine
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateWasteNetWeight,
	calculateWasteWeights,
	exportWasteJournalToCsv,
	generateMedicalWasteTransferAct,
	generateWasteBarcode,
	generateWasteSealNumber,
	generateWasteThermalStickerHtml,
	generateWasteTransferActHtml,
	parseWasteBarcode,
	type MedicalWasteJournalRecord,
	validateStorageDuration,
} from "../components/sanpin/waste/medicalWasteEngine";
import {
	getDecontaminationMethod,
	getMedicalWasteClass,
	getMedicalWastePackaging,
	getWasteStorageLocation,
	SANPIN_DECONTAMINATION_METHODS,
	SANPIN_MEDICAL_WASTE_CLASSES,
	SANPIN_WASTE_PACKAGING_TYPES,
	SANPIN_STORAGE_LOCATIONS,
	type MedicalWasteClassId,
} from "../components/sanpin/waste/medicalWastePresets";

describe("SANPIN 2.1.3684-21 MEDICAL WASTE & AUTOCLAVE JOURNAL", () => {
	// ========================================================================
	// 1. WEIGHT ACCOUNTING ENGINE
	// ========================================================================
	describe("1. Весовой учет медицинских отходов (Брутто, Тара, Нетто)", () => {
		it("Рассчитывает массу нетто с точностью до 0.01 кг", () => {
			assert.equal(calculateWasteNetWeight(3.456, 0.08), 3.38);
			assert.equal(calculateWasteNetWeight(1.0, 0.18), 0.82);
			assert.equal(calculateWasteNetWeight(0.05, 0.1), 0); // net cannot be negative
			assert.equal(calculateWasteNetWeight(0, 0), 0);
		});

		it("Корректно рассчитывает веса по типу стандартной тары СанПиН", () => {
			// Yellow bag: default tare 0.08 kg
			const yellowBagWeight = calculateWasteWeights(2.5, "yellow_bag");
			assert.equal(yellowBagWeight.grossKg, 2.5);
			assert.equal(yellowBagWeight.tareKg, 0.08);
			assert.equal(yellowBagWeight.netKg, 2.42);

			// Red sharps container: default tare 0.22 kg
			const redContainerWeight = calculateWasteWeights(1.85, "red_puncture_proof_container");
			assert.equal(redContainerWeight.grossKg, 1.85);
			assert.equal(redContainerWeight.tareKg, 0.22);
			assert.equal(redContainerWeight.netKg, 1.63);
		});

		it("Поддерживает ручное переопределение веса тары", () => {
			const customWeight = calculateWasteWeights(4.0, "white_bin", 1.5);
			assert.equal(customWeight.grossKg, 4.0);
			assert.equal(customWeight.tareKg, 1.5);
			assert.equal(customWeight.netKg, 2.5);
		});
	});

	// ========================================================================
	// 2. SANPIN WASTE CLASSIFICATION (CLASSES A, B, V, G)
	// ========================================================================
	describe("2. Классификатор классов опасности медицинских отходов", () => {
		it("Содержит все 4 нормативных класса отходов (А, Б, В, Г)", () => {
			assert.equal(SANPIN_MEDICAL_WASTE_CLASSES.length, 4);

			const classA = getMedicalWasteClass("class_A");
			assert.equal(classA.letterCode, "А");
			assert.equal(classA.colorTheme.bagColorRu, "Белый");

			const classB = getMedicalWasteClass("class_B");
			assert.equal(classB.letterCode, "Б");
			assert.equal(classB.colorTheme.bagColorRu, "Желтый");
			assert.ok(classB.allowedDecontamination.includes("physical_autoclave_134"));

			const classV = getMedicalWasteClass("class_V");
			assert.equal(classV.letterCode, "В");
			assert.equal(classV.colorTheme.bagColorRu, "Красный");
			assert.ok(classV.mandatoryPackaging.includes("red_bag"));

			const classG = getMedicalWasteClass("class_G");
			assert.equal(classG.letterCode, "Г");
			assert.equal(classG.colorTheme.bagColorRu, "Черный");
		});

		it("Содержит регламентированную тару для каждого класса", () => {
			const yellowBag = getMedicalWastePackaging("yellow_bag");
			assert.equal(yellowBag.wasteClass, "class_B");
			assert.equal(yellowBag.isHermeticSealed, true);

			const redSharps = getMedicalWastePackaging("red_puncture_proof_container");
			assert.equal(redSharps.wasteClass, "class_V");
			assert.equal(redSharps.isPunctureProof, true);

			const blackMercury = getMedicalWastePackaging("black_container_mercury");
			assert.equal(blackMercury.wasteClass, "class_G");
			assert.equal(blackMercury.isPunctureProof, true);
		});
	});

	// ========================================================================
	// 3. DECONTAMINATION PROTOCOLS
	// ========================================================================
	describe("3. Методы обеззараживания и обезвреживания (СанПиН 2.1.3684-21)", () => {
		it("Включает аппаратное автоклавирование 134°C 2.1 бар", () => {
			const autoclaveMethod = getDecontaminationMethod("physical_autoclave_134");
			assert.equal(autoclaveMethod.category, "physical");
			assert.ok(autoclaveMethod.standardParametersRu.includes("134°C"));
			assert.ok(autoclaveMethod.standardParametersRu.includes("2.1 bar"));
			assert.equal(autoclaveMethod.validationRequired, true);
		});

		it("Включает химическое замачивание в дезрастворе", () => {
			const chemMethod = getDecontaminationMethod("chemical_soaking_disinfectant");
			assert.equal(chemMethod.category, "chemical");
			assert.equal(chemMethod.validationRequired, true);
		});
	});

	// ========================================================================
	// 4. STORAGE DURATION & EXPIRATION GUARDS
	// ========================================================================
	describe("4. Контроль сроков временного накопления отходов", () => {
		it("Ограничивает хранение при комнатной температуре 24 часами", () => {
			const location = getWasteStorageLocation("cabinet_room_temp");
			assert.equal(location.maxAllowedStorageHours, 24);

			const now = new Date();
			const startTimestamp = new Date(now.getTime() - 10 * 3600 * 1000).toISOString(); // 10h ago
			const check = validateStorageDuration(startTimestamp, "cabinet_room_temp", now.toISOString());

			assert.equal(check.isExpired, false);
			assert.equal(check.hoursElapsed, 10);
			assert.equal(check.hoursRemaining, 14);
			assert.equal(check.status, "optimal");
		});

		it("Определяет просроченное хранение свыше 24 часов в кабинете", () => {
			const now = new Date();
			const startTimestamp = new Date(now.getTime() - 30 * 3600 * 1000).toISOString(); // 30h ago
			const check = validateStorageDuration(startTimestamp, "cabinet_room_temp", now.toISOString());

			assert.equal(check.isExpired, true);
			assert.equal(check.status, "expired");
			assert.ok(check.statusMessageRu.toLowerCase().includes("превышен"));
		});

		it("Предупреждает при приближении к пределу срока хранения (осталось < 4ч)", () => {
			const now = new Date();
			const startTimestamp = new Date(now.getTime() - 21 * 3600 * 1000).toISOString(); // 21h ago
			const check = validateStorageDuration(startTimestamp, "cabinet_room_temp", now.toISOString());

			assert.equal(check.isExpired, false);
			assert.equal(check.status, "warning_approaching_limit");
		});

		it("Позволяет хранение в холодильнике до 7 суток (168 часов)", () => {
			const location = getWasteStorageLocation("waste_refrigerator_2_8");
			assert.equal(location.maxAllowedStorageHours, 168);
			assert.equal(location.maxAllowedStorageDays, 7);
		});

		it("Позволяет хранение в морозильнике до 30 суток (720 часов)", () => {
			const location = getWasteStorageLocation("waste_freezer_minus_18");
			assert.equal(location.maxAllowedStorageHours, 720);
			assert.equal(location.maxAllowedStorageDays, 30);
		});
	});

	// ========================================================================
	// 5. BARCODE & SEAL GENERATION AND PARSING
	// ========================================================================
	describe("5. Генерация и парсинг штрихкодов и номеров пломб", () => {
		it("Генерирует и валидирует штрихкод для Класса Б (Желтый)", () => {
			const barcode = generateWasteBarcode("class_B", "TER", "2026-08-26", 1234);
			assert.equal(barcode, "WASTE-CLASS_B-TER-20260826-1234");

			const parsed = parseWasteBarcode(barcode);
			assert.equal(parsed.isValid, true);
			assert.equal(parsed.wasteClass, "class_B");
			assert.equal(parsed.departmentCode, "TER");
			assert.equal(parsed.dateStr, "2026-08-26");
			assert.equal(parsed.sequenceId, "1234");
		});

		it("Генерирует и валидирует штрихкод для Класса В (Красный)", () => {
			const barcode = generateWasteBarcode("class_V", "SURG", "2026-08-26", 5678);
			assert.equal(barcode, "WASTE-CLASS_V-SURG-20260826-5678");

			const parsed = parseWasteBarcode(barcode);
			assert.equal(parsed.isValid, true);
			assert.equal(parsed.wasteClass, "class_V");
			assert.equal(parsed.departmentCode, "SURG");
		});

		it("Генерирует номер пломбы-стяжки с кодом класса и годом", () => {
			const sealA = generateWasteSealNumber("class_A", 101, 2026);
			assert.equal(sealA, "ПЛ-А-2026-00101");

			const sealB = generateWasteSealNumber("class_B", 382, 2026);
			assert.equal(sealB, "ПЛ-Б-2026-00382");

			const sealV = generateWasteSealNumber("class_V", 99, 2026);
			assert.equal(sealV, "ПЛ-В-2026-00099");

			const sealG = generateWasteSealNumber("class_G", 5, 2026);
			assert.equal(sealG, "ПЛ-Г-2026-00005");
		});
	});

	// ========================================================================
	// 6. TRANSFER ACT GENERATION & TOTALS AGGREGATION
	// ========================================================================
	describe("6. Формирование Акта передачи отходов спецоператору", () => {
		const sampleRecords: MedicalWasteJournalRecord[] = [
			{
				id: "r1",
				timestamp: "2026-08-26T10:00",
				wasteClass: "class_B",
				departmentNameRu: "Терапия 1",
				packageType: "yellow_bag",
				packageCount: 2,
				grossWeightKg: 3.2,
				tareWeightKg: 0.16,
				netWeightKg: 3.04,
				sealNumber: "ПЛ-Б-2026-00001",
				barcode: "WASTE-CLASS_B-TER-20260826-1001",
				decontaminationMethod: "physical_autoclave_134",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: "Смирнова А.В.",
				operatorStaffPosition: "Медсестра",
				status: "accumulating",
			},
			{
				id: "r2",
				timestamp: "2026-08-26T11:30",
				wasteClass: "class_V",
				departmentNameRu: "Хирургия",
				packageType: "red_bag",
				packageCount: 1,
				grossWeightKg: 1.5,
				tareWeightKg: 0.08,
				netWeightKg: 1.42,
				sealNumber: "ПЛ-В-2026-00002",
				barcode: "WASTE-CLASS_V-SURG-20260826-1002",
				decontaminationMethod: "physical_autoclave_134",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: "Иванова Е.К.",
				operatorStaffPosition: "Старшая медсестра",
				status: "accumulating",
			},
			{
				id: "r3",
				timestamp: "2026-08-26T12:00",
				wasteClass: "class_A",
				departmentNameRu: "Ресепшн",
				packageType: "white_bag",
				packageCount: 3,
				grossWeightKg: 5.0,
				tareWeightKg: 0.15,
				netWeightKg: 4.85,
				barcode: "WASTE-CLASS_A-ADM-20260826-1003",
				decontaminationMethod: "none_class_a",
				storageLocation: "central_accumulation_site",
				operatorStaffFullName: "Петрова Н.С.",
				operatorStaffPosition: "Санитарка",
				status: "accumulating",
			},
		];

		it("Агрегирует суммарные массы и количество мест по классам", () => {
			const act = generateMedicalWasteTransferAct({
				actNumber: "АКТ-ВЫВОЗ-2026/10",
				records: sampleRecords,
			});

			assert.equal(act.actNumber, "АКТ-ВЫВОЗ-2026/10");
			assert.equal(act.totalPackagesCount, 6); // 2 + 1 + 3
			assert.equal(act.totalNetWeightKg, 9.31); // 3.04 + 1.42 + 4.85

			assert.equal(act.totalsByClass.class_B.count, 2);
			assert.equal(act.totalsByClass.class_B.totalNetWeightKg, 3.04);

			assert.equal(act.totalsByClass.class_V.count, 1);
			assert.equal(act.totalsByClass.class_V.totalNetWeightKg, 1.42);

			assert.equal(act.totalsByClass.class_A.count, 3);
			assert.equal(act.totalsByClass.class_A.totalNetWeightKg, 4.85);
		});

		it("Генерирует официальный печатный HTML Акта приема-передачи А4", () => {
			const act = generateMedicalWasteTransferAct({
				actNumber: "АКТ-ВЫВОЗ-2026/10",
				records: sampleRecords,
			});
			const html = generateWasteTransferActHtml(act);

			assert.ok(html.includes("АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ № АКТ-ВЫВОЗ-2026/10"));
			assert.ok(html.includes("СанПиН 2.1.3684-21"));
			assert.ok(html.includes("Класс Б"));
			assert.ok(html.includes("Класс В"));
			assert.ok(html.includes("9.31"));
		});

		it("Экспортирует записи технологического журнала в CSV с UTF-8 BOM", () => {
			const csv = exportWasteJournalToCsv(sampleRecords);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("Дата и время накопления"));
			assert.ok(csv.includes("WASTE-CLASS_B-TER-20260826-1001"));
			assert.ok(csv.includes("ИТОГО ПО ЖУРНАЛУ"));
		});
	});

	// ========================================================================
	// 7. 58x40 MM THERMAL STICKER ENGINE
	// ========================================================================
	describe("7. Генератор термоэтикеток 58x40 мм со штрихкодом", () => {
		it("Формирует разметку 58x40 мм с классом отходов, весом, датой и штрихкодом", () => {
			const record: MedicalWasteJournalRecord = {
				id: "rec-test-sticker",
				timestamp: "2026-08-26T14:20",
				wasteClass: "class_B",
				departmentNameRu: "Терапевтический кабинет № 1",
				packageType: "yellow_bag",
				packageCount: 1,
				grossWeightKg: 2.45,
				tareWeightKg: 0.08,
				netWeightKg: 2.37,
				sealNumber: "ПЛ-Б-2026-00441",
				barcode: "WASTE-CLASS_B-CAB1-20260826-9042",
				decontaminationMethod: "physical_autoclave_134",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: "Смирнова А.В.",
				operatorStaffPosition: "Старшая медсестра",
				status: "accumulating",
			};

			const stickerHtml = generateWasteThermalStickerHtml(record, {
				clinicName: "ООО «ДЕНТЕ КЛИНИК»",
				disposalContractNo: "ДОГ-МЕД-2026/04",
			});

			assert.ok(stickerHtml.includes("58mm 40mm"));
			assert.ok(stickerHtml.includes("ОТХОДЫ КЛАСС Б (ЖЕЛТЫЙ ПАКЕТ / БАК)"));
			assert.ok(stickerHtml.includes("2.37 кг"));
			assert.ok(stickerHtml.includes("2026-08-26 14:20"));
			assert.ok(stickerHtml.includes("ПЛ-Б-2026-00441"));
			assert.ok(stickerHtml.includes("WASTE-CLASS_B-CAB1-20260826-9042"));
			assert.ok(stickerHtml.includes("Смирнова А.В."));
			assert.ok(stickerHtml.includes("ДОГ-МЕД-2026/04"));
		});

		it("Формирует корректную этикетку для чрезвычайно опасных отходов Класса В (Красный)", () => {
			const record: MedicalWasteJournalRecord = {
				id: "rec-test-red",
				timestamp: "2026-08-26T15:00",
				wasteClass: "class_V",
				departmentNameRu: "Хирургический кабинет",
				packageType: "red_puncture_proof_container",
				packageCount: 1,
				grossWeightKg: 1.8,
				tareWeightKg: 0.22,
				netWeightKg: 1.58,
				sealNumber: "ПЛ-В-2026-00015",
				barcode: "WASTE-CLASS_V-SURG-20260826-3310",
				decontaminationMethod: "physical_autoclave_134",
				storageLocation: "cabinet_room_temp",
				operatorStaffFullName: "Иванова Е.К.",
				operatorStaffPosition: "Старшая медсестра",
				status: "accumulating",
			};

			const stickerHtml = generateWasteThermalStickerHtml(record);
			assert.ok(stickerHtml.includes("ОТХОДЫ КЛАСС В (КРАСНЫЙ ПАКЕТ / БАК)"));
			assert.ok(stickerHtml.includes("1.58 кг"));
			assert.ok(stickerHtml.includes("WASTE-CLASS_V-SURG-20260826-3310"));
		});
	});
});
