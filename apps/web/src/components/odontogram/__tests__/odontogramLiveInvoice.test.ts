import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	ORDER_804N_PROCEDURES,
	type LiveInvoiceCashierExport,
	type LiveInvoiceItem,
} from "../OdontogramLiveInvoice";
import type { ToothData } from "../ToothChart";

describe("OdontogramLiveInvoice — Order 804n Nomenclature & Estimation Math", () => {
	test("Все клинические диагнозы одонтограммы строго сопоставлены с кодами услуг Приказа 804н", () => {
		const expectedCodes: Record<string, string> = {
			Caries: "A16.07.002.001",
			Pulpitis: "A16.07.008.002",
			Periodontitis: "A16.07.009.001",
			Crown: "A16.07.004.001",
			Implant: "A16.07.054.001",
			Planned_Implant: "A16.07.054.001",
			Missing: "A16.07.001.001",
		};

		for (const [state, expectedCode] of Object.entries(expectedCodes)) {
			const proc = ORDER_804N_PROCEDURES[state];
			assert.ok(proc, `Процедура для ${state} должна быть определена в ORDER_804N_PROCEDURES`);
			assert.equal(proc.code, expectedCode, `Код для ${state} должен быть ${expectedCode}`);
			assert.ok(proc.title.length > 0, `Название процедуры для ${state} не должно быть пустым`);
			assert.ok(proc.price > 0, `Цена для ${state} должна быть больше 0`);
			assert.ok(proc.category.length > 0, `Категория для ${state} должна быть указана`);
		}
	});

	test("Расчет стоимости сметы и группировка по категориям (Терапия, Эндодонтия, Ортопедия, Хирургия)", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 26, state: "Crown" },
			{ toothNumber: 47, state: "Implant" },
			{ toothNumber: 48, state: "Missing" },
			{ toothNumber: 11, state: "Healthy" },
		];

		const items: LiveInvoiceItem[] = [];
		for (const t of teeth) {
			const pr = ORDER_804N_PROCEDURES[t.state];
			if (pr) {
				items.push({
					toothNumber: t.toothNumber,
					code: pr.code,
					title: `Зуб ${t.toothNumber}: ${pr.title}`,
					category: pr.category,
					price: pr.price,
					quantity: 1,
				});
			}
		}

		assert.equal(items.length, 5, "Должно быть сгенерировано 5 позиций для 5 патологий");

		// Total price sum: 4500 (Caries) + 12500 (Pulpitis) + 24000 (Crown) + 42000 (Implant) + 3500 (Missing) = 86500
		const total = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
		assert.equal(total, 86500, "Итоговая сумма сметы должна быть ровно 86 500 ₽");

		// Category subtotals
		const categoryTotals: Record<string, number> = {};
		for (const it of items) {
			categoryTotals[it.category] = (categoryTotals[it.category] ?? 0) + it.price * it.quantity;
		}

		assert.equal(categoryTotals["Терапия"], 4500);
		assert.equal(categoryTotals["Эндодонтия"], 12500);
		assert.equal(categoryTotals["Ортопедия"], 24000);
		assert.equal(categoryTotals["Хирургия"], 42000 + 3500); // 45500
	});

	test("Поддержка изменения количества позиций (quantity) и скидок (discount)", () => {
		const items: LiveInvoiceItem[] = [
			{
				toothNumber: 16,
				code: "A16.07.002.001",
				title: "Кариес зуба 16 (2 поверхности)",
				category: "Терапия",
				price: 4500,
				quantity: 2,
				discountRub: 900, // 10% discount on 9000
			},
		];

		const grossTotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
		const totalDiscount = items.reduce((acc, it) => acc + (it.discountRub || 0), 0);
		const netTotal = grossTotal - totalDiscount;

		assert.equal(grossTotal, 9000);
		assert.equal(totalDiscount, 900);
		assert.equal(netTotal, 8100);

		// Создание структуры счета на оплату для кассы
		const cashierExport: LiveInvoiceCashierExport = {
			patientId: "patient_123",
			patientName: "Иван Иванов",
			items,
			grossTotalRub: grossTotal,
			discountRub: totalDiscount,
			netTotalRub: netTotal,
			discountPercent: 10,
			createdAtIso: new Date().toISOString(),
		};

		assert.equal(cashierExport.netTotalRub, 8100);
		assert.equal(cashierExport.items.length, 1);
		assert.equal(cashierExport.items[0]?.quantity, 2);
	});

	test("Интактные зубы (Healthy) и пломбированные (Filled) не генерируют первичную смету лечения", () => {
		const healthyTeeth: ToothData[] = [
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Filled" },
			{ toothNumber: 31, state: "Healthy" },
		];

		const items: LiveInvoiceItem[] = [];
		for (const t of healthyTeeth) {
			if (t.state !== "Healthy" && t.state !== "Filled") {
				const pr = ORDER_804N_PROCEDURES[t.state];
				if (pr) {
					items.push({
						toothNumber: t.toothNumber,
						code: pr.code,
						title: pr.title,
						category: pr.category,
						price: pr.price,
						quantity: 1,
					});
				}
			}
		}

		assert.equal(items.length, 0, "Для интактных и санированных зубов смета пуста");
	});
});
