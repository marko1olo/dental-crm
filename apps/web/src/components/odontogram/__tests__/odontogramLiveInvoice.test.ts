import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ORDER_804N_PROCEDURES,
	calculateLiveInvoiceItems,
	getAnatomicalRootCanalCount,
	getEndoObturationProcedure,
	getEndoPreparationProcedure,
	type LiveInvoiceCashierExport,
	type LiveInvoiceItem,
} from "../OdontogramLiveInvoice";
import type { ToothData } from "../ToothChart";
import { isDeciduousTooth } from "../../treatment-plans/treatmentPlanStagesEngine";

describe("OdontogramLiveInvoice — Order 804n Nomenclature & Endodontic Anatomical Math", () => {
	test("Все клинические диагнозы одонтограммы строго сопоставлены с кодами услуг Приказа 804н", () => {
		const expectedCodes: Record<string, string> = {
			Caries: "A16.07.002.001",
			Crown: "A16.07.004.001",
			EndoPrep1Canal: "A16.07.030.001",
			EndoPrep2Canals: "A16.07.030.002",
			EndoPrep3Canals: "A16.07.030.003",
			EndoPrep4Canals: "A16.07.030.004",
			EndoObturation1Canal: "A16.07.008.001",
			EndoObturation2Canals: "A16.07.008.002",
			EndoObturation3Canals: "A16.07.008.003",
			EndoObturation4Canals: "A16.07.008.004",
			EndoMedicationCaOH2: "A16.07.091",
			EndoUnsealing: "A16.07.082",
			Implant: "A16.07.054.001",
			Planned_Implant: "A16.07.054.001",
			Missing: "A16.07.001.001",
			BoneGrafting: "A16.07.041",
			ImplantProsthetics: "A16.07.006",
			PeriodontalScaling: "A16.07.051",
			PeriodontalHygiene: "A16.07.050",
			PeriodontalCurettage: "A16.07.039",
			PeriodontalSplinting: "A16.07.019",
			PediatricCaries: "A16.07.002.001",
			PediatricPulpitis: "A16.07.008.001",
			PediatricExtraction: "A16.07.001",
			PediatricCrown: "A16.07.004.003",
			PediatricFissureSeal: "A16.07.057",
		};

		for (const [key, expectedCode] of Object.entries(expectedCodes)) {
			const proc = ORDER_804N_PROCEDURES[key];
			assert.ok(proc, `Процедура для ${key} должна быть определена в ORDER_804N_PROCEDURES`);
			assert.equal(proc.code, expectedCode, `Код для ${key} должен быть ${expectedCode}`);
			assert.ok(proc.title.length > 0, `Название процедуры для ${key} не должно быть пустым`);
			assert.ok(proc.price > 0, `Цена для ${key} должна быть больше 0`);
			assert.ok(proc.category.length > 0, `Категория для ${key} должна быть указана`);
		}
	});

	test("Определение анатомического количества корневых каналов (ISO 3950 / FDI)", () => {
		// Резцы и клыки верхней челюсти (11..13, 21..23): 1 канал
		for (const tooth of [11, 12, 13, 21, 22, 23]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} должен иметь 1 канал`);
		}

		// Резцы и клыки нижней челюсти (31..33, 41..43): 1 канал
		for (const tooth of [31, 32, 33, 41, 42, 43]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} должен иметь 1 канал`);
		}

		// Верхние первые премоляры (14, 24): 2 канала
		assert.equal(getAnatomicalRootCanalCount(14), 2, "Зуб 14 должен иметь 2 канала");
		assert.equal(getAnatomicalRootCanalCount(24), 2, "Зуб 24 должен иметь 2 канала");

		// Верхние вторые премоляры (15, 25): 1 канал
		assert.equal(getAnatomicalRootCanalCount(15), 1, "Зуб 15 должен иметь 1 канал");
		assert.equal(getAnatomicalRootCanalCount(25), 1, "Зуб 25 должен иметь 1 канал");

		// Нижние премоляры (34, 35, 44, 45): 1 канал
		for (const tooth of [34, 35, 44, 45]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 1, `Зуб ${tooth} должен иметь 1 канал`);
		}

		// Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal)
		for (const tooth of [36, 37, 46, 47, 38, 48]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 3, `Зуб ${tooth} должен иметь 3 канала`);
		}

		// Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала по умолчанию (MB1, MB2, DB, Palatal)
		for (const tooth of [16, 17, 26, 27, 18, 28]) {
			assert.equal(getAnatomicalRootCanalCount(tooth), 4, `Зуб ${tooth} должен иметь 4 канала`);
		}

		// Клиническое переопределение (custom clinicalCanalCount)
		assert.equal(getAnatomicalRootCanalCount(36, 4), 4, "Нижний моляр с 4 каналами по КЛКТ");
		assert.equal(getAnatomicalRootCanalCount(16, 3), 3, "Верхний моляр с 3 каналами по КЛКТ");
		assert.equal(getAnatomicalRootCanalCount(11, 2), 2, "Редкая анатомия резца с 2 каналами");
	});

	test("Эндодонтическая смета пульпита (Pulpitis) с детализацией Order 804n по каналам", () => {
		// 1. Резец (11): 1 канал -> A16.07.030.001 (3500) + A16.07.008.001 (3000) = 6500 ₽
		const incisorItems = calculateLiveInvoiceItems([{ toothNumber: 11, state: "Pulpitis" }]);
		assert.equal(incisorItems.length, 2);
		assert.equal(incisorItems[0]?.code, "A16.07.030.001");
		assert.equal(incisorItems[0]?.price, 3500);
		assert.equal(incisorItems[1]?.code, "A16.07.008.001");
		assert.equal(incisorItems[1]?.price, 3000);
		const incisorTotal = incisorItems.reduce((acc, it) => acc + it.price, 0);
		assert.equal(incisorTotal, 6500);

		// 2. Верхний премоляр (24): 2 канала -> A16.07.030.002 (5500) + A16.07.008.002 (5000) = 10500 ₽
		const premolarItems = calculateLiveInvoiceItems([{ toothNumber: 24, state: "Pulpitis" }]);
		assert.equal(premolarItems.length, 2);
		assert.equal(premolarItems[0]?.code, "A16.07.030.002");
		assert.equal(premolarItems[0]?.price, 5500);
		assert.equal(premolarItems[1]?.code, "A16.07.008.002");
		assert.equal(premolarItems[1]?.price, 5000);
		const premolarTotal = premolarItems.reduce((acc, it) => acc + it.price, 0);
		assert.equal(premolarTotal, 10500);

		// 3. Нижний моляр (46): 3 канала -> A16.07.030.003 (7500) + A16.07.008.003 (7000) = 14500 ₽
		const lowerMolarItems = calculateLiveInvoiceItems([{ toothNumber: 46, state: "Pulpitis" }]);
		assert.equal(lowerMolarItems.length, 2);
		assert.equal(lowerMolarItems[0]?.code, "A16.07.030.003");
		assert.equal(lowerMolarItems[0]?.price, 7500);
		assert.equal(lowerMolarItems[1]?.code, "A16.07.008.003");
		assert.equal(lowerMolarItems[1]?.price, 7000);
		const lowerMolarTotal = lowerMolarItems.reduce((acc, it) => acc + it.price, 0);
		assert.equal(lowerMolarTotal, 14500);

		// 4. Верхний моляр (16): 4 канала по умолчанию -> A16.07.030.004 (9500) + A16.07.008.004 (9000) = 18500 ₽
		const upperMolarItems = calculateLiveInvoiceItems([{ toothNumber: 16, state: "Pulpitis" }]);
		assert.equal(upperMolarItems.length, 2);
		assert.equal(upperMolarItems[0]?.code, "A16.07.030.004");
		assert.equal(upperMolarItems[0]?.price, 9500);
		assert.equal(upperMolarItems[1]?.code, "A16.07.008.004");
		assert.equal(upperMolarItems[1]?.price, 9000);
		const upperMolarTotal = upperMolarItems.reduce((acc, it) => acc + it.price, 0);
		assert.equal(upperMolarTotal, 18500);

		// 5. Верхний моляр (16) с клиническим 3-канальным переопределением через clinicalData -> A16.07.030.003 + A16.07.008.003 = 14500 ₽
		const threeCanalItems = calculateLiveInvoiceItems([
			{ toothNumber: 16, state: "Pulpitis", clinicalData: { canals: [1, 2, 3] } },
		]);
		assert.equal(threeCanalItems.length, 2);
		assert.equal(threeCanalItems[0]?.code, "A16.07.030.003");
		assert.equal(threeCanalItems[0]?.price, 7500);
		assert.equal(threeCanalItems[1]?.code, "A16.07.008.003");
		assert.equal(threeCanalItems[1]?.price, 7000);
		const threeCanalTotal = threeCanalItems.reduce((acc, it) => acc + it.price, 0);
		assert.equal(threeCanalTotal, 14500);
	});

	test("Эндодонтическая смета периодонтита (Periodontitis) с дезинфекцией Ca(OH)2 A16.07.091", () => {
		// Нижний моляр (36): 3 канала -> Обработка A16.07.030.003 (7500) + Ca(OH)2 A16.07.091 (2000) + Обтурация A16.07.008.003 (7000) = 16500 ₽
		const perioItems = calculateLiveInvoiceItems([{ toothNumber: 36, state: "Periodontitis" }]);
		assert.equal(perioItems.length, 3);
		assert.equal(perioItems[0]?.code, "A16.07.030.003");
		assert.equal(perioItems[0]?.price, 7500);
		assert.equal(perioItems[1]?.code, "A16.07.091");
		assert.equal(perioItems[1]?.price, 2000);
		assert.equal(perioItems[2]?.code, "A16.07.008.003");
		assert.equal(perioItems[2]?.price, 7000);

		const perioTotal = perioItems.reduce((acc, it) => acc + it.price, 0);
		assert.equal(perioTotal, 16500);
	});

	test("Клиническое переопределение числа каналов через clinicalData.canals", () => {
		const customTooth: ToothData = {
			toothNumber: 36, // Нижний моляр (по умолчанию 3 канала)
			state: "Pulpitis",
			clinicalData: {
				canals: [
					// 4 канала зафиксировано на КЛКТ
					{ id: "c1", canalName: "MB", referencePoint: "", workingLengthMm: 21, masterApicalFile: "", taper: "", obturationTechnique: "" },
					{ id: "c2", canalName: "ML", referencePoint: "", workingLengthMm: 21, masterApicalFile: "", taper: "", obturationTechnique: "" },
					{ id: "c3", canalName: "DB", referencePoint: "", workingLengthMm: 21, masterApicalFile: "", taper: "", obturationTechnique: "" },
					{ id: "c4", canalName: "DL", referencePoint: "", workingLengthMm: 21, masterApicalFile: "", taper: "", obturationTechnique: "" },
				],
			},
		};

		const items = calculateLiveInvoiceItems([customTooth]);
		assert.equal(items.length, 2);
		assert.equal(items[0]?.code, "A16.07.030.004", "Должен быть выбран код для 4-канальной обработки");
		assert.equal(items[1]?.code, "A16.07.008.004", "Должен быть выбран код для 4-канальной обтурации");
		assert.equal(items[0]?.price, 9500);
		assert.equal(items[1]?.price, 9000);
	});

	test("Автоматический расчет для детской стоматологии (молочные зубы 51..85)", () => {
		const pedTeeth: ToothData[] = [
			{ toothNumber: 54, state: "Caries" },
			{ toothNumber: 65, state: "Pulpitis" },
			{ toothNumber: 75, state: "Missing" },
		];

		const items = calculateLiveInvoiceItems(pedTeeth);
		assert.equal(items.length, 3);
		assert.equal(items[0]?.code, "A16.07.002.001");
		assert.equal(items[0]?.price, 3200);
		assert.equal(items[1]?.code, "A16.07.008.001", "Пульпотомия временного зуба");
		assert.equal(items[1]?.price, 5800);
		assert.equal(items[2]?.code, "A16.07.001", "Удаление временного зуба");
		assert.equal(items[2]?.price, 1800);
	});

	test("Поддержка исключения позиций (excludedKeys), количества (quantity) и скидок", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 11, state: "Caries" },
			{ toothNumber: 14, state: "Pulpitis" },
		];

		// Исключаем обтурацию каналов для 14 зуба, оставляем только инструментальную обработку
		const prepCode = "A16.07.030.002";
		const obtCode = "A16.07.008.002";
		const excludedKeys = new Set<string>([`14-${obtCode}`]);

		const quantities: Record<string, number> = {
			[`11-A16.07.002.001`]: 2, // 2 поверхности кариеса
		};

		const items = calculateLiveInvoiceItems(teeth, {
			excludedKeys,
			quantities,
			discountPercent: 10,
		});

		// Должно быть 2 позиции: Caries (qty: 2) и EndoPrep 14 (qty: 1, obturation excluded)
		assert.equal(items.length, 2);

		const cariesItem = items.find((i) => i.toothNumber === 11);
		assert.ok(cariesItem);
		assert.equal(cariesItem.quantity, 2);
		assert.equal(cariesItem.price, 4500);
		assert.equal(cariesItem.discountRub, 900); // 10% от 9000

		const endoItem = items.find((i) => i.toothNumber === 14);
		assert.ok(endoItem);
		assert.equal(endoItem.code, prepCode);
		assert.equal(endoItem.price, 5500);
		assert.equal(endoItem.discountRub, 550); // 10% от 5500
	});

	test("Интактные зубы (Healthy) и пломбированные (Filled) не генерируют смету", () => {
		const healthyTeeth: ToothData[] = [
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Filled" },
			{ toothNumber: 31, state: "Healthy" },
		];

		const items = calculateLiveInvoiceItems(healthyTeeth);
		assert.equal(items.length, 0, "Для интактных и санированных зубов смета пуста");
	});

	test("getEndoPreparationProcedure и getEndoObturationProcedure корректно зажимают (clamp) каналы в диапазон 1..4", () => {
		// Ниже 1 зажимается в 1
		const prep0 = getEndoPreparationProcedure(0);
		assert.equal(prep0.code, "A16.07.030.001");
		const obt0 = getEndoObturationProcedure(-2);
		assert.equal(obt0.code, "A16.07.008.001");

		// Выше 4 зажимается в 4
		const prep5 = getEndoPreparationProcedure(5);
		assert.equal(prep5.code, "A16.07.030.004");
		const obt6 = getEndoObturationProcedure(10);
		assert.equal(obt6.code, "A16.07.008.004");

		// Дробные значения округляются
		const prep2_8 = getEndoPreparationProcedure(2.8);
		assert.equal(prep2_8.code, "A16.07.030.003");
	});

	test("Формирование комплексной сметы с пародонтологией, костной пластикой и имплантацией", () => {
		const complexTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Missing", boneLossLevel: 2 }, // Удаление + Костная пластика A16.07.041 + Протезирование на имплантате A16.07.006
			{ toothNumber: 21, state: "Caries" }, // Кариес A16.07.002.001
			{ toothNumber: 31, state: "Healthy", boneLossLevel: 1, mobility: 2 }, // Пародонтология: SRP A16.07.051 + Шинирование A16.07.019
		];

		const items = calculateLiveInvoiceItems(complexTeeth);
		assert.ok(items.length >= 4);

		// Проверяем наличие костной пластики A16.07.041
		assert.ok(items.some((i) => i.toothNumber === 16 && i.code === "A16.07.041"));
		// Проверяем протезирование на имплантате A16.07.006
		assert.ok(items.some((i) => i.toothNumber === 16 && i.code === "A16.07.006"));
		// Проверяем кариес
		assert.ok(items.some((i) => i.toothNumber === 21 && i.code === "A16.07.002.001"));
		// Проверяем шинирование
		assert.ok(items.some((i) => i.toothNumber === 31 && i.code === "A16.07.019"));
	});
});

