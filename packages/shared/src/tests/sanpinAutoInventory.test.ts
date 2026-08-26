/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION ROUTING & DENTAL CONSUMABLES DEDUCTION SUITE
 * 
 * Модульное тестирование:
 * 1. 1-клик и 2D DataMatrix сканирование крафт-пакетов автоклава
 *    (интегратор 5 класса, дата, цикл, медсестра ЦСО, срок годности).
 * 2. Бесшовная фиксация в форме 043/у без дублирования.
 * 3. Технологические карты автоматического списания расходников по 804н:
 *    - Пломбирование светоотверждаемым композитом (коффердам, карпула анестетика,
 *      бонд, композит, полировочная головка, СИЗ);
 *    - Эндодонтическое лечение (гуттаперчевые штифты, бумажные пины по числу
 *      каналов, силер AH Plus, Ni-Ti файлы, ирригация NaOCl/EDTA);
 *    - Хирургическое удаление (анестетик, гемостатическая губка, шовный материал
 *      PTFE, лезвие скальпеля 15C, аспиратор);
 *    - Профессиональная гигиена (Air-Flow глицин 25г, паста, щетка, OptraGate, фторлак).
 * 4. Копеечно-точный расчет себестоимости и кастомные материалы со склада.
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	attachKraftPackageTo043Diary,
	calculateProcedureAutoDeduction,
	format043SterilizationRecord,
	parseAndValidateKraftBarcode,
	type ParsedKraftBarcode,
	type ProcedureDeductionRequest,
	type ProcedureDeductionResult,
} from "../sanpin/kraftPackageProtocolLink.js";
import {
	KRAFT_PACKAGE_MATERIALS,
	getKraftMaterialDefinition,
} from "../sanpin/kraftPackageTypes.js";
import {
	formatKopecksRu,
	multiplyKopecks,
	multiplyKopecksFractional,
	parseKopecks,
	sumKopecks,
} from "../utils/money.js";

describe("SANPIN 3.3686-21 STERILIZATION ROUTING & CONSUMABLES DEDUCTION (ROUND 47)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// БЛОК 1: СТЕРИЛИЗАЦИЯ И СВЯЗКА КРАФТ-ПАКЕТОВ С ФОРМОЙ 043/У
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. SanPiN 3.3686-21 Kraft Package Barcode Parsing & Expiration Gates", () => {
		it("успешно парсит 2D DataMatrix крафт-пакета автоклава со всеми нормативными атрибутами", () => {
			const refDate = "2026-08-25";
			// Формат: BATCH#SERIAL|AUTOCLAVE|CYC|PACK_DATE|EXP_DATE|OPERATOR|TOOL_SET
			const qrCode = "KB-20260825-01#3|АК-01 (Melag 23B+)|CYC4|2026-08-25|2026-10-14|NURSE-01|set_therapeutic_tray";

			const parsed = parseAndValidateKraftBarcode(qrCode, {
				referenceDate: refDate,
				defaultOperatorName: "Медсестра ЦСО Смирнова А.В.",
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.isExpired, false);
			assert.equal(parsed.isExpiringSoon, false);
			assert.equal(parsed.barcodeType, "datamatrix_2d");
			assert.equal(parsed.batchId, "KB-20260825-01");
			assert.equal(parsed.serialNumber, 3);
			assert.equal(parsed.autoclaveId, "АК-01 (Melag 23B+)");
			assert.equal(parsed.cycleNumber, 4);
			assert.equal(parsed.packDateIso, "2026-08-25");
			assert.equal(parsed.expDateIso, "2026-10-14");
			assert.equal(parsed.operatorName, "Медсестра ЦСО Смирнова А.В.");
			assert.equal(parsed.indicatorPassed, true);
			assert.ok(parsed.daysRemaining > 0, "Срок годности должен быть больше 0 дней");
			assert.ok(parsed.indicatorClassRu.includes("5 класса"), "Должен быть индикатор 5 класса");
		});

		it("блокирует просроченный крафт-пакет и формирует запись об ошибке по СанПиН 3.3686-21", () => {
			const refDate = "2026-08-25";
			// Пакет простерилизован в мае 2026 и годен до июля 2026
			const expiredBarcode = "KB-20260501-01#1|АК-01|CYC2|2026-05-01|2026-06-20|NURSE-01|set_therapeutic_tray";

			const parsed = parseAndValidateKraftBarcode(expiredBarcode, {
				referenceDate: refDate,
			});

			assert.equal(parsed.isValid, false, "Просроченный пакет не может быть валидным");
			assert.equal(parsed.isExpired, true);
			assert.equal(parsed.indicatorPassed, false);
			assert.ok(parsed.daysRemaining < 0, "Остаток дней отрицательный");
			assert.ok(parsed.errorMessage?.includes("ИСТЁК"), "Сообщение должно указывать на истечение срока");
			assert.ok(parsed.errorMessage?.includes("СанПиН 3.3686-21"), "Сообщение должно ссылаться на СанПиН 3.3686-21");
			assert.ok(parsed.formattedProtocolRecord043.includes("[ОШИБКА САНПИН: ПАКЕТ ПРОСРОЧЕН]"));
		});

		it("выставляет предупреждение isExpiringSoon для пакетов с остатком <= 7 дней", () => {
			const refDate = "2026-08-25";
			const expiringBarcode = "KB-20260810-01#2|АК-01|CYC1|2026-08-10|2026-08-29|NURSE-01|set_therapeutic_tray";

			const parsed = parseAndValidateKraftBarcode(expiringBarcode, {
				referenceDate: refDate,
			});

			assert.equal(parsed.isValid, true);
			assert.equal(parsed.isExpired, false);
			assert.equal(parsed.isExpiringSoon, true);
			assert.equal(parsed.daysRemaining, 4);
		});

		it("распознает 1D Code128 штрихкоды и специализированные наборы лотков (ENDO, SURG, PERIO, ORTH)", () => {
			const endo = parseAndValidateKraftBarcode("TRAY-ENDO-042");
			assert.equal(endo.toolSetId, "set_endodontic_burs");
			assert.ok(endo.toolSetNameRu.includes("Эндодонтический"));

			const surg = parseAndValidateKraftBarcode("TRAY-SURG-019");
			assert.equal(surg.toolSetId, "set_surgical_extraction");
			assert.ok(surg.toolSetNameRu.includes("Хирургический"));

			const perio = parseAndValidateKraftBarcode("TRAY-PERIO-003");
			assert.equal(perio.toolSetId, "set_periodontal_gracey");
			assert.ok(perio.toolSetNameRu.includes("пародонтологический"));

			const orth = parseAndValidateKraftBarcode("TRAY-ORTH-111");
			assert.equal(orth.toolSetId, "set_orthopedic_prep");
			assert.ok(orth.toolSetNameRu.includes("Ортопедический"));
		});

		it("корректно обрабатывает пустые или пробельные строки без падения", () => {
			const emptyRes = parseAndValidateKraftBarcode("");
			assert.equal(emptyRes.isValid, false);
			assert.equal(emptyRes.isExpired, true);

			const spaceRes = parseAndValidateKraftBarcode("   \n\t  ");
			assert.equal(spaceRes.isValid, false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// БЛОК 2: ПРИВЯЗКА К МЕДКАРТЕ 043/У И ИДЕМПОТЕНТНОСТЬ
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Form 043/u Electronic Diary Link & Idempotency", () => {
		it("генерирует нормативную запись стерилизации по ГОСТ Р ИСО 11607 и СанПиН 3.3686-21", () => {
			const record = format043SterilizationRecord({
				autoclaveId: "АК-01 (Melag 23B+)",
				cycleNumber: 5,
				packDateIso: "2026-08-25",
				expDateIso: "2026-10-14",
				barcode: "KB-20260825-01#5",
				operatorName: "Медсестра ЦСО Смирнова А.В.",
				indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / норма)",
				toolSetNameRu: "Терапевтический лоток",
			});

			assert.ok(record.includes("СанПиН 3.3686-21"));
			assert.ok(record.includes("Автоклав АК-01 (Melag 23B+)"));
			assert.ok(record.includes("цикл №5 от 2026-08-25"));
			assert.ok(record.includes("интегратор 5 класса"));
			assert.ok(record.includes("крафт-пакет KB-20260825-01#5"));
			assert.ok(record.includes("годен до 2026-10-14"));
			assert.ok(record.includes("Медсестра ЦСО Смирнова А.В."));
			assert.ok(record.includes("Целостность упаковки сохранена"));
		});

		it("бесшовно добавляет стерилизационную запись в дневник приема 043/у без дублирования при повторном сканировании", () => {
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
				statusLocalis: "Зуб 4.6: кариозная полость I класс по Блэку.",
				appliedMaterials: "Filtek Z250 0.4г, бонд Single Bond Universal 0.1мл.",
			};

			// Первое прикрепление
			const updated = attachKraftPackageTo043Diary(initialDiary, parsed);
			assert.ok(updated.appliedMaterials.includes("Filtek Z250"));
			assert.ok(updated.appliedMaterials.includes("Стерилизация СанПиН 3.3686-21: Автоклав АК-01"));

			// Повторное прикрепление того же пакета — текст не должен дублироваться
			const reUpdated = attachKraftPackageTo043Diary(updated, parsed);
			const count = (reUpdated.appliedMaterials.match(/Стерилизация СанПиН/g) || []).length;
			assert.equal(count, 1, "Запись стерилизации должна присутствовать строго в 1 экземпляре");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// БЛОК 3: ТЕХКАРТЫ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ ПО 804Н
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Dental Consumables Auto-Deduction Engine (Order 804n)", () => {
		// 1. Пломбирование светоотверждаемым композитом
		it("рассчитывает списание при пломбировании композитом (коффердам, анестетик, бонд, композит, полировка, СИЗ)", () => {
			const req: ProcedureDeductionRequest = {
				procedureKind: "filling_composite",
				toothNumber: 16,
				anesthesiaCarpules: 1,
				includePpe: true,
			};

			const result: ProcedureDeductionResult = calculateProcedureAutoDeduction(req);

			assert.equal(result.procedureKind, "filling_composite");
			assert.equal(result.toothNumber, 16);
			assert.ok(result.items.length >= 8, "Должно быть списано не менее 8 позиций");

			// Проверка обязательных позиций техкарты
			const cofferdam = result.items.find((i) => i.id === "caries-cofferdam");
			assert.ok(cofferdam, "Коффердам обязателен");
			assert.equal(cofferdam.quantity, 1);
			assert.equal(cofferdam.unit, "шт.");

			const anesth = result.items.find((i) => i.id === "anes-cartridge");
			assert.ok(anesth, "Карпула анестетика обязательна");
			assert.equal(anesth.quantity, 1);
			assert.equal(anesth.unit, "карп.");

			const bond = result.items.find((i) => i.id === "caries-bond");
			assert.ok(bond, "Адгезивный бонд обязателен");
			assert.equal(bond.quantity, 0.1);
			assert.equal(bond.unit, "мл");

			const composite = result.items.find((i) => i.id === "caries-composite");
			assert.ok(composite, "Композит обязателен");
			assert.equal(composite.quantity, 0.4);
			assert.equal(composite.unit, "г");

			const polishing = result.items.find((i) => i.id === "caries-polishing");
			assert.ok(polishing, "Полировочная головка обязательна");
			assert.equal(polishing.quantity, 1);
			assert.equal(polishing.unit, "шт.");

			const gloves = result.items.find((i) => i.id === "ppe-gloves");
			assert.ok(gloves, "Перчатки СИЗ обязательны");
			assert.equal(gloves.quantity, 2);

			const mask = result.items.find((i) => i.id === "ppe-mask");
			assert.ok(mask, "Маска СИЗ обязательна");
			assert.equal(mask.quantity, 2);

			const saliva = result.items.find((i) => i.id === "ppe-saliva-ejector");
			assert.ok(saliva, "Слюноотсос обязателен");
			assert.equal(saliva.quantity, 1);

			// Проверка копеечной суммы
			assert.ok(result.totalCostKopecks > 0);
			assert.ok(result.totalCostFormatted.includes("₽"));
		});

		// 2. Эндодонтическое лечение с масштабированием по числу каналов
		it("рассчитывает эндодонтическое списание строго по числу каналов (пины x3, гуттаперча x1, силер, файлы)", () => {
			// 1 канал (резец 1.1)
			const single = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 11,
				rootCanalsCount: 1,
			});
			const p1 = single.items.find((i) => i.id === "endo-paper-points");
			const g1 = single.items.find((i) => i.id === "endo-gutta-percha");
			const s1 = single.items.find((i) => i.id === "endo-sealer");
			const f1 = single.items.find((i) => i.id === "endo-niti-files");

			assert.equal(p1?.quantity, 3, "1 канал -> 3 бумажных пина (1 × 3)");
			assert.equal(g1?.quantity, 1, "1 канал -> 1 гуттаперчевый штифт");
			assert.equal(s1?.quantity, 0.1, "1 канал -> 0.1 г силера AH Plus");
			assert.equal(f1?.quantity, 1, "1 канал -> 1 Ni-Ti файл");

			// 2 канала (премоляр 1.4)
			const double = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 14,
				rootCanalsCount: 2,
			});
			const p2 = double.items.find((i) => i.id === "endo-paper-points");
			const g2 = double.items.find((i) => i.id === "endo-gutta-percha");
			const s2 = double.items.find((i) => i.id === "endo-sealer");
			assert.equal(p2?.quantity, 6, "2 канала -> 6 бумажных пинов (2 × 3)");
			assert.equal(g2?.quantity, 2, "2 канала -> 2 гуттаперчевых штифта (2 × 1)");
			assert.equal(s2?.quantity, 0.2, "2 канала -> 0.2 г силера");

			// 3 канала (моляр 1.6)
			const triple = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 16,
				rootCanalsCount: 3,
			});
			const p3 = triple.items.find((i) => i.id === "endo-paper-points");
			const g3 = triple.items.find((i) => i.id === "endo-gutta-percha");
			const s3 = triple.items.find((i) => i.id === "endo-sealer");
			const f3 = triple.items.find((i) => i.id === "endo-niti-files");
			assert.equal(p3?.quantity, 9, "3 канала -> 9 бумажных пинов (3 × 3)");
			assert.equal(g3?.quantity, 3, "3 канала -> 3 гуттаперчевых штифта (3 × 1)");
			assert.equal(s3?.quantity, 0.3, "3 канала -> 0.3 г силера");
			assert.equal(f3?.quantity, 2, "3 канала -> 2 Ni-Ti файла");

			// 4 канала (моляр 2.6 с MB2)
			const quad = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				toothNumber: 26,
				rootCanalsCount: 4,
			});
			const p4 = quad.items.find((i) => i.id === "endo-paper-points");
			const g4 = quad.items.find((i) => i.id === "endo-gutta-percha");
			const s4 = quad.items.find((i) => i.id === "endo-sealer");
			assert.equal(p4?.quantity, 12, "4 канала -> 12 бумажных пинов (4 × 3)");
			assert.equal(g4?.quantity, 4, "4 канала -> 4 гуттаперчевых штифта (4 × 1)");
			assert.equal(s4?.quantity, 0.4, "4 канала -> 0.4 г силера");

			// Проверка монотонности роста себестоимости по каналам
			assert.ok(
				quad.totalCostKopecks > triple.totalCostKopecks &&
				triple.totalCostKopecks > double.totalCostKopecks &&
				double.totalCostKopecks > single.totalCostKopecks,
				"Себестоимость эндодонтии должна строго расти с ростом числа каналов"
			);
		});

		// 3. Хирургическое удаление зуба
		it("рассчитывает списание при удалении зуба (анестетик, гемостатическая губка, шовный материал PTFE, лезвие 15C)", () => {
			const surg = calculateProcedureAutoDeduction({
				procedureKind: "tooth_extraction",
				toothNumber: 38,
				anesthesiaCarpules: 2,
			});

			assert.equal(surg.procedureKind, "tooth_extraction");
			assert.equal(surg.toothNumber, 38);

			const anesth = surg.items.find((i) => i.id === "surg-anes-cartridge");
			assert.ok(anesth);
			assert.equal(anesth.quantity, 2, "2 карпулы на сложное удаление");

			const sponge = surg.items.find((i) => i.id === "surg-sponge");
			assert.ok(sponge, "Гемостатическая губка Альвостаз/Parasorb");
			assert.equal(sponge.quantity, 1);

			const suture = surg.items.find((i) => i.id === "surg-suture");
			assert.ok(suture, "Шовный материал PTFE / Пролен");
			assert.equal(suture.quantity, 1);

			const blade = surg.items.find((i) => i.id === "surg-blade");
			assert.ok(blade, "Микрохирургическое лезвие 15C");
			assert.equal(blade.quantity, 1);

			const aspirator = surg.items.find((i) => i.id === "surg-aspirator");
			assert.ok(aspirator);
			assert.equal(aspirator.quantity, 1);
		});

		// 4. Профессиональная гигиена (Air-Flow + УЗ)
		it("рассчитывает списание для профессиональной гигиены полости рта (Air-Flow глицин 25г, паста, OptraGate, фторлак)", () => {
			const hyg = calculateProcedureAutoDeduction({
				procedureKind: "hygiene_airflow",
			});

			const powder = hyg.items.find((i) => i.id === "hyg-powder");
			assert.ok(powder);
			assert.equal(powder.quantity, 25, "25 г порошка Air-Flow");
			assert.equal(powder.unit, "г");

			const paste = hyg.items.find((i) => i.id === "hyg-paste");
			assert.ok(paste);
			assert.equal(paste.quantity, 3, "3 г пасты");

			const optragate = hyg.items.find((i) => i.id === "hyg-optragate");
			assert.ok(optragate);
			assert.equal(optragate.quantity, 1, "1 ретрактор OptraGate");

			const varnish = hyg.items.find((i) => i.id === "hyg-varnish");
			assert.ok(varnish);
			assert.equal(varnish.quantity, 0.5, "0.5 мл фторлака");
		});

		// 5. Кастомные добавления материалов и копеечная арифметика
		it("поддерживает добавление произвольных складских материалов с точным расчетом копеек", () => {
			const price1 = parseKopecks("420.50"); // 42050 коп.
			const price2 = parseKopecks("1150.00"); // 115000 коп.

			const res = calculateProcedureAutoDeduction({
				procedureKind: "filling_composite",
				includePpe: false, // отключим СИЗ для чистоты теста
				customAdditions: [
					{
						name: "Нить ретракционная Ultrapack #00",
						quantity: 2,
						unitCostKopecks: price1,
						unit: "шт.",
					},
					{
						name: "Краситель для фиссур Kolor + Plus",
						quantity: 1,
						unitCostKopecks: price2,
						unit: "капля",
					},
				],
			});

			const custom1 = res.items.find((i) => i.name.includes("Ultrapack"));
			assert.ok(custom1);
			assert.equal(custom1.quantity, 2);
			assert.equal(custom1.totalCostKopecks, multiplyKopecks(price1, 2));

			const custom2 = res.items.find((i) => i.name.includes("Kolor"));
			assert.ok(custom2);
			assert.equal(custom2.quantity, 1);
			assert.equal(custom2.totalCostKopecks, price2);

			// Сумма всех элементов должна точно совпадать с суммой kopecks
			const calculatedSum = sumKopecks(res.items.map((i) => i.totalCostKopecks));
			assert.equal(res.totalCostKopecks, calculatedSum);
		});

		// 6. Граничные сценарии
		it("корректно ограничивает экстремальные значения каналов (от 1 до 5)", () => {
			const minCanal = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				rootCanalsCount: 0, // меньше 1 -> должно быть 1
			});
			assert.equal(minCanal.rootCanalsCount, 1);

			const maxCanal = calculateProcedureAutoDeduction({
				procedureKind: "endodontics",
				rootCanalsCount: 99, // больше 5 -> должно быть 5
			});
			assert.equal(maxCanal.rootCanalsCount, 5);
		});

		// 7. Технологические карты Приказа № 804н и дробное списание
		it("проверяет корректность расчета дробных списаний по нормам 804н (композит 0.35г, силер 0.1г, фторлак 0.5мл)", () => {
			const compositeGrams = 0.35;
			const singleGramKopecks = parseKopecks("2125.00"); // 212500 коп
			const totalCost = multiplyKopecksFractional(singleGramKopecks, compositeGrams);

			// 212500 * 0.35 = 74375 коп (743.75 руб)
			assert.equal(totalCost, parseKopecks("743.75"));

			const endoIrrigationMl = 15; // 15 мл NaOCl на канал
			const naoclPricePerMlKopecks = parseKopecks("3.50"); // 350 коп
			const irrigationCost = multiplyKopecks(naoclPricePerMlKopecks, endoIrrigationMl);
			assert.equal(irrigationCost, parseKopecks("52.50")); // 52.50 руб
		});
	});
});
