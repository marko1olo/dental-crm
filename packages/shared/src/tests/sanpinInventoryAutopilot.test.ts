/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & INVENTORY AUTOPILOT TEST SUITE
 * Проверка 1-клик привязки крафт-пакетов к форме 043/у по штрихкоду
 * и автоматического списания расходников со склада по техкартам процедур.
 * ============================================================================
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	attachKraftPackageTo043Diary,
	calculateProcedureAutoDeduction,
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
	type ProcedureDeductionRequest,
} from "../sanpin/kraftPackageProtocolLink.js";
import { parseKopecks } from "../utils/money.js";

describe("SanPiN 3.3686-21 Sterilization & Inventory Autopilot Suite", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// ТЕСТ 1: 1-КЛИК ПАРСИНГ И ВАЛИДАЦИЯ 2D DATAMATRIX КРАФТ-ПАКЕТА
	// ─────────────────────────────────────────────────────────────────────────
	describe("1-Click Kraft Package 2D DataMatrix Parsing & Expiration Gate", () => {
		it("успешно парсит валидный 2D DataMatrix крафт-пакета и подтверждает срок годности", () => {
			const refDate = "2026-08-25";
			const barcode = "KB-20260825-01#1|АК-01 (Melag 23B+)|CYC3|2026-08-25|2026-10-14|NURSE-01|set_therapeutic_tray";

			const parsed = parseAndValidateKraftBarcode(barcode, {
				referenceDate: refDate,
				defaultOperatorName: "Медсестра ЦСО Смирнова А.В.",
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.isExpired, false);
			assert.equal(parsed.barcodeType, "datamatrix_2d");
			assert.equal(parsed.batchId, "KB-20260825-01");
			assert.equal(parsed.serialNumber, 1);
			assert.equal(parsed.autoclaveId, "АК-01 (Melag 23B+)");
			assert.equal(parsed.cycleNumber, 3);
			assert.equal(parsed.packDateIso, "2026-08-25");
			assert.equal(parsed.expDateIso, "2026-10-14");
			assert.equal(parsed.operatorName, "Медсестра ЦСО Смирнова А.В.");
			assert.equal(parsed.indicatorPassed, true);
			assert.ok(parsed.daysRemaining > 0, "Срок годности должен быть положительным");
			assert.ok(parsed.formattedProtocolRecord043.includes("Автоклав АК-01 (Melag 23B+)"));
			assert.ok(parsed.formattedProtocolRecord043.includes("цикл №3"));
			assert.ok(parsed.formattedProtocolRecord043.includes("интегратор 5 класса"));
		});

		it("блокирует просроченный крафт-пакет с диагностическим сообщением по СанПиН 3.3686-21", () => {
			const refDate = "2026-08-25";
			// Пакет простерилизован в январе 2026 со сроком до 20 февраля 2026
			const expiredBarcode = "KB-20260101-01#5|АК-01|CYC1|2026-01-01|2026-02-20|NURSE-02|set_surgical_extraction";

			const parsed = parseAndValidateKraftBarcode(expiredBarcode, {
				referenceDate: refDate,
			});

			assert.equal(parsed.isValid, false, "Просроченный пакет не должен быть валидным");
			assert.equal(parsed.isExpired, true, "isExpired флаг должен быть true");
			assert.equal(parsed.indicatorPassed, false);
			assert.ok(parsed.daysRemaining < 0, "Остаток дней должен быть отрицательным");
			assert.ok(parsed.errorMessage?.includes("ИСТЁК"), "Ошибка должна содержать слово ИСТЁК");
			assert.ok(parsed.errorMessage?.includes("СанПиН 3.3686-21"), "Ошибка должна ссылаться на СанПиН 3.3686-21");
			assert.ok(parsed.formattedProtocolRecord043.includes("[ОШИБКА САНПИН: ПАКЕТ ПРОСРОЧЕН]"));
		});

		it("корректно определяет предупреждение об истекающем сроке годности (<= 7 дней)", () => {
			const refDate = "2026-08-25";
			const expiringBarcode = "KB-20260801-01#2|АК-02|CYC2|2026-08-01|2026-08-28|NURSE-01|set_endodontic_burs";

			const parsed = parseAndValidateKraftBarcode(expiringBarcode, {
				referenceDate: refDate,
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.isExpired, false);
			assert.equal(parsed.isExpiringSoon, true, "Должен выставляться флаг isExpiringSoon");
			assert.equal(parsed.daysRemaining, 3);
		});

		it("обрабатывает пустые и некорректные штрихкоды без исключений", () => {
			const parsedEmpty = parseAndValidateKraftBarcode("");
			assert.equal(parsedEmpty.isValid, false);
			assert.equal(parsedEmpty.isExpired, true);
			assert.ok(parsedEmpty.errorMessage?.includes("не указан"));

			const parsedSpaces = parseAndValidateKraftBarcode("   ");
			assert.equal(parsedSpaces.isValid, false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// ТЕСТ 2: 1D ШТРИХКОДЫ CODE128 И НОМЕРА ЛОТКОВ
	// ─────────────────────────────────────────────────────────────────────────
	describe("1D Code128 Barcodes & Tray Serial Processing", () => {
		it("распознает 1D штрихкод KB2608250001 с извлечением даты и номера цикла", () => {
			const refDate = "2026-08-25";
			const barcode1D = "KB2608250001";

			const parsed = parseAndValidateKraftBarcode(barcode1D, {
				referenceDate: refDate,
				defaultOperatorName: "Медсестра Иванова Е.П.",
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.barcodeType, "code128_1d");
			assert.equal(parsed.packDateIso, "2026-08-25");
			assert.equal(parsed.serialNumber, 1);
			assert.equal(parsed.operatorName, "Медсестра Иванова Е.П.");
			assert.ok(parsed.formattedProtocolRecord043.includes("крафт-пакет KB2608250001"));
		});

		it("распознает специализированные лотки по префиксу (ENDO, SURG, PERIO, ORTH)", () => {
			const endoTray = parseAndValidateKraftBarcode("TRAY-ENDO-102");
			assert.equal(endoTray.toolSetId, "set_endodontic_burs");
			assert.ok(endoTray.toolSetNameRu.includes("Эндодонтический"));

			const surgTray = parseAndValidateKraftBarcode("TRAY-SURG-005");
			assert.equal(surgTray.toolSetId, "set_surgical_extraction");
			assert.ok(surgTray.toolSetNameRu.includes("Хирургический"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// ТЕСТ 3: АВТОМАТИЧЕСКАЯ ФИКСАЦИЯ В ФОРМЕ 043/У И ДНЕВНИКЕ ПРИЕМА
	// ─────────────────────────────────────────────────────────────────────────
	describe("Form 043/u Protocol Sterilization Record Attachment", () => {
		it("генерирует нормативную запись для формы 043/у со всеми атрибутами автоклава и индикатора 5 класса", () => {
			const record = format043SterilizationRecord({
				autoclaveId: "АК-01 (Melag Vacuklav 23B+)",
				cycleNumber: 4,
				packDateIso: "2026-08-25",
				expDateIso: "2026-10-14",
				barcode: "KB-20260825-01#4",
				operatorName: "Медсестра ЦСО Смирнова А.В.",
				indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / норма)",
				toolSetNameRu: "Терапевтический лоток смотровой",
			});

			assert.ok(record.includes("СанПиН 3.3686-21"));
			assert.ok(record.includes("Автоклав АК-01 (Melag Vacuklav 23B+)"));
			assert.ok(record.includes("цикл №4 от 2026-08-25"));
			assert.ok(record.includes("интегратор 5 класса"));
			assert.ok(record.includes("крафт-пакет KB-20260825-01#4"));
			assert.ok(record.includes("годен до 2026-10-14"));
			assert.ok(record.includes("Ответственная медсестра ЦСО: Медсестра ЦСО Смирнова А.В."));
			assert.ok(record.includes("Целостность упаковки сохранена"));
		});

		it("бесшовно внедряет запись стерилизации в дневник 043/у без дублирования", () => {
			const parsed: ParsedKraftBarcode = {
				rawInput: "KB-20260825-01#1|АК-01|CYC1|2026-08-25|2026-10-14|NURSE-01|TER",
				barcodeType: "datamatrix_2d",
				isValid: true,
				isExpired: false,
				isExpiringSoon: false,
				daysRemaining: 50,
				daysLifespan: 50,
				batchId: "KB-20260825-01",
				serialNumber: 1,
				autoclaveId: "АК-01",
				cycleNumber: 1,
				packDateIso: "2026-08-25",
				expDateIso: "2026-10-14",
				operatorId: "NURSE-01",
				operatorName: "Медсестра ЦСО Смирнова А.В.",
				toolSetId: "set_therapeutic_tray",
				toolSetNameRu: "Терапевтический лоток",
				packageMaterialId: "paper_self_seal_single",
				packageSizeId: "size_100x200",
				indicatorId: "vinar_intetest_5",
				indicatorClassRu: "Интегратор 5 класса",
				indicatorPassed: true,
				sanpinClauseRu: "СанПиН 3.3686-21",
				formattedProtocolRecord043: "Стерилизация СанПиН 3.3686-21: Автоклав АК-01 (цикл №1 от 2026-08-25), крафт-пакет KB-20260825-01#1.",
			};

			const initialDiary = {
				statusLocalis: "Зуб 1.6: кариозная полость на окклюзионной поверхности.",
				appliedMaterials: "Filtek Z250 A2 0.4г, бонд Single Bond Universal 0.1мл.",
			};

			const updated = attachKraftPackageTo043Diary(initialDiary, parsed);
			assert.ok(updated.appliedMaterials.includes("Filtek Z250"));
			assert.ok(updated.appliedMaterials.includes("Стерилизация СанПиН 3.3686-21: Автоклав АК-01"));

			// Повторное добавление того же пакета не должно дублировать текст
			const reUpdated = attachKraftPackageTo043Diary(updated, parsed);
			const count = (reUpdated.appliedMaterials.match(/Стерилизация СанПиН/g) || []).length;
			assert.equal(count, 1, "Запись не должна дублироваться при повторном сканировании");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// ТЕСТ 4: АВТОМАТИЧЕСКОЕ СПИСАНИЕ РАСХОДНИКОВ ПО ТЕХКАРТАМ ПРОЦЕДУР
	// ─────────────────────────────────────────────────────────────────────────
	describe("Automatic Procedure Warehouse Deduction Engine (Bill of Materials)", () => {
		// 1. Пломбирование
		it("рассчитывает списание при пломбировании: 1 карпула анестетика, коффердам, бонд, композит, полировка, СИЗ", () => {
			const req: ProcedureDeductionRequest = {
				procedureKind: "filling_composite",
				toothNumber: 16,
				anesthesiaCarpules: 1,
				includePpe: true,
			};

			const result = calculateProcedureAutoDeduction(req);

			assert.equal(result.procedureKind, "filling_composite");
			assert.equal(result.toothNumber, 16);
			assert.ok(result.items.length >= 8, "Должно быть не менее 8 позиций расходников");

			// Проверяем ключевые позиции ТЗ
			const anesth = result.items.find((i) => i.id === "anes-cartridge");
			assert.ok(anesth, "Должен быть анестетик");
			assert.equal(anesth.quantity, 1, "1 карпула анестетика");

			const cofferdam = result.items.find((i) => i.id === "caries-cofferdam");
			assert.ok(cofferdam, "Должен быть коффердам");
			assert.equal(cofferdam.quantity, 1, "1 платок коффердама");

			const bond = result.items.find((i) => i.id === "caries-bond");
			assert.ok(bond, "Должен быть адгезивный бонд");
			assert.equal(bond.quantity, 0.1, "0.1 мл бонда");

			const composite = result.items.find((i) => i.id === "caries-composite");
			assert.ok(composite, "Должен быть композит");
			assert.equal(composite.quantity, 0.4, "0.4 г композита");

			const polishing = result.items.find((i) => i.id === "caries-polishing");
			assert.ok(polishing, "Должна быть полировочная головка");
			assert.equal(polishing.quantity, 1, "1 полировочная головка");

			const gloves = result.items.find((i) => i.id === "ppe-gloves");
			assert.ok(gloves, "Должны быть перчатки");
			assert.equal(gloves.quantity, 2, "2 пары перчаток");

			const mask = result.items.find((i) => i.id === "ppe-mask");
			assert.ok(mask, "Должна быть маска");
			assert.equal(mask.quantity, 2, "2 защитные маски");

			const saliva = result.items.find((i) => i.id === "ppe-saliva-ejector");
			assert.ok(saliva, "Должен быть слюноотсос");
			assert.equal(saliva.quantity, 1, "1 слюноотсос");

			// Проверка копеечного итога
			assert.ok(result.totalCostKopecks > 0, "Сумма должна быть положительной");
			assert.ok(result.totalCostFormatted.includes("₽"), "Форматированная сумма должна содержать символ рубля");
		});

		// 2. Эндодонтия (динамический расчет по числу каналов)
		it("рассчитывает эндодонтическое списание строго по числу каналов (пины, гуттаперча, силер, файлы)", () => {
			// Одноканальный зуб (резцы / клыки)
			const singleCanal = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 11,
				rootCanalsCount: 1,
			});

			const singlePins = singleCanal.items.find((i) => i.id === "endo-paper-points");
			assert.equal(singlePins?.quantity, 3, "Для 1 канала: 3 бумажных пина (1 × 3)");

			const singleGutta = singleCanal.items.find((i) => i.id === "endo-gutta-percha");
			assert.equal(singleGutta?.quantity, 1, "Для 1 канала: 1 гуттаперчевый штифт");

			const singleSealer = singleCanal.items.find((i) => i.id === "endo-sealer");
			assert.equal(singleSealer?.quantity, 0.1, "Для 1 канала: 0.1 г силера AH Plus");

			// Трехканальный моляр (зуб 16)
			const tripleCanal = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 16,
				rootCanalsCount: 3,
			});

			const triplePins = tripleCanal.items.find((i) => i.id === "endo-paper-points");
			assert.equal(triplePins?.quantity, 9, "Для 3 каналов: ровно 9 бумажных пинов (3 × 3)");

			const tripleGutta = tripleCanal.items.find((i) => i.id === "endo-gutta-percha");
			assert.equal(tripleGutta?.quantity, 3, "Для 3 каналов: ровно 3 гуттаперчевых штифта (3 × 1)");

			const tripleSealer = tripleCanal.items.find((i) => i.id === "endo-sealer");
			assert.equal(tripleSealer?.quantity, 0.3, "Для 3 каналов: ровно 0.3 г силера");

			const tripleFiles = tripleCanal.items.find((i) => i.id === "endo-niti-files");
			assert.equal(tripleFiles?.quantity, 2, "Для 3 каналов: 2 машинных Ni-Ti файла");

			// Четырехканальный моляр (зуб 26 с MB2)
			const quadCanal = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 26,
				rootCanalsCount: 4,
			});

			const quadPins = quadCanal.items.find((i) => i.id === "endo-paper-points");
			assert.equal(quadPins?.quantity, 12, "Для 4 каналов: ровно 12 бумажных пинов (4 × 3)");

			const quadGutta = quadCanal.items.find((i) => i.id === "endo-gutta-percha");
			assert.equal(quadGutta?.quantity, 4, "Для 4 каналов: ровно 4 гуттаперчевых штифта (4 × 1)");

			assert.ok(quadCanal.totalCostKopecks > tripleCanal.totalCostKopecks, "Себестоимость 4 каналов выше 3 каналов");
		});

		// 3. Удаление зуба
		it("рассчитывает хирургическое списание при удалении: анестетик, гемостатическая губка, шовный материал PTFE, лезвие", () => {
			const surg = calculateProcedureAutoDeduction({
				procedureKind: "tooth_extraction",
				toothNumber: 38,
				anesthesiaCarpules: 2,
			});

			assert.equal(surg.procedureKind, "tooth_extraction");
			assert.equal(surg.toothNumber, 38);

			const anesth = surg.items.find((i) => i.id === "surg-anes-cartridge");
			assert.ok(anesth);
			assert.equal(anesth.quantity, 2, "2 карпулы анестетика на сложное удаление");

			const sponge = surg.items.find((i) => i.id === "surg-sponge");
			assert.ok(sponge, "Должна быть гемостатическая губка Альвостаз/Parasorb");
			assert.equal(sponge.quantity, 1, "1 гемостатическая губка");

			const suture = surg.items.find((i) => i.id === "surg-suture");
			assert.ok(suture, "Должен быть шовный материал PTFE");
			assert.equal(suture.quantity, 1, "1 стерильный шовный комплект");

			const blade = surg.items.find((i) => i.id === "surg-blade");
			assert.ok(blade, "Должно быть микрохирургическое лезвие №15C");
			assert.equal(blade.quantity, 1, "1 стерильное лезвие");

			const aspirator = surg.items.find((i) => i.id === "surg-aspirator");
			assert.ok(aspirator, "Должен быть хирургический аспиратор");
			assert.equal(aspirator.quantity, 1);
		});

		// 4. Профессиональная гигиена
		it("рассчитывает списание для профессиональной гигиены Air-Flow и УЗ", () => {
			const hyg = calculateProcedureAutoDeduction({
				procedureKind: "hygiene_airflow",
			});

			const powder = hyg.items.find((i) => i.id === "hyg-powder");
			assert.ok(powder);
			assert.equal(powder.quantity, 25, "25 г порошка Air-Flow");

			const paste = hyg.items.find((i) => i.id === "hyg-paste");
			assert.ok(paste);
			assert.equal(paste.quantity, 3, "3 г пасты");

			const optragate = hyg.items.find((i) => i.id === "hyg-optragate");
			assert.ok(optragate);
			assert.equal(optragate.quantity, 1, "1 OptraGate");

			const varnish = hyg.items.find((i) => i.id === "hyg-varnish");
			assert.ok(varnish);
			assert.equal(varnish.quantity, 0.5, "0.5 мл фторлака");
		});

		// 5. Кастомные добавления материалов
		it("поддерживает добавление произвольных позиций со склада с копеечным расчетом", () => {
			const customPrice = parseKopecks("350.00");
			const result = calculateProcedureAutoDeduction({
				procedureKind: "filling_composite",
				customAdditions: [
					{
						name: "Ретракционная нить Ultrapack #00",
						quantity: 1,
						unitCostKopecks: customPrice,
						unit: "шт.",
					},
				],
			});

			const customItem = result.items.find((i) => i.name.includes("Ultrapack"));
			assert.ok(customItem, "Кастомный материал должен присутствовать в списке");
			assert.equal(customItem.totalCostKopecks, customPrice);
		});
	});
});
