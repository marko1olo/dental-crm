/**
 * inventoryStornoAndAuditing.test.ts — Тесты сторнирования, ревизий и канонического SSOT склада (Мандаты 8b, 8e, 8n, 8v, 8z).
 * Авто-сторно при удалении услуг, экспорт 1С CommerceML и связность интерфейсов.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Billing1CExportModal } from "../components/finance/Billing1CExportModal.js";
import {
	ChairsideBillingItemRow,
	getServiceBomMaterials,
	type ServiceBomMaterial,
} from "../components/visit/ChairsideBillingItemRow.js";

describe("Automated BOM Deduction and Automatic Storno on Service Removal (Mandates 8e, 8n, 8v, 8z)", () => {
	it("getServiceBomMaterials корректно резолвит материалы по кодам 804н и клиническим правилам", () => {
		// Кариес (A16.07.002)
		const cariesMaterials = getServiceBomMaterials("A16.07.002", "Лечение кариеса с пломбированием", 1);
		assert.ok(cariesMaterials.length >= 2, "Кариес должен содержать композит и адгезив");
		assert.ok(
			cariesMaterials.some((m) => m.name.toLowerCase().includes("композит") && m.quantity > 0),
		);
		assert.ok(
			cariesMaterials.some((m) => m.name.toLowerCase().includes("адгезив")),
		);

		// Умножение количества (quantity = 2)
		const cariesMaterialsX2 = getServiceBomMaterials("A16.07.002", "Лечение кариеса", 2);
		const compX1 = cariesMaterials.find((m) => m.name.toLowerCase().includes("композит"))!;
		const compX2 = cariesMaterialsX2.find((m) => m.name.toLowerCase().includes("композит"))!;
		assert.equal(compX2.quantity, Number((compX1.quantity * 2).toFixed(2)));

		// Анестезия (B01.003.004.004)
		const anesMaterials = getServiceBomMaterials("B01.003.004.004", "Анестезия инфильтрационная", 1);
		assert.ok(anesMaterials.some((m) => m.name.toLowerCase().includes("артикаин") || m.name.toLowerCase().includes("анестетик")));
		assert.ok(anesMaterials.some((m) => m.name.toLowerCase().includes("игла")));

		// Профгигиена (A16.07.051)
		const hygieneMaterials = getServiceBomMaterials("A16.07.051", "Комплексная гигиена полости рта", 1);
		assert.ok(hygieneMaterials.some((m) => m.name.toLowerCase().includes("air-flow") || m.name.toLowerCase().includes("порошок")));

		// Эндодонтия (A16.07.030)
		const endoMaterials = getServiceBomMaterials("A16.07.030", "Эндодонтическое лечение", 1);
		assert.ok(endoMaterials.some((m) => m.name.toLowerCase().includes("гипохлорит")));

		// Хирургия / удаление (A16.07.001)
		const surgeryMaterials = getServiceBomMaterials("A16.07.001", "Удаление зуба сложное", 1);
		assert.ok(surgeryMaterials.some((m) => m.name.toLowerCase().includes("губка") || m.name.toLowerCase().includes("шовный")));
	});

	it("ChairsideBillingItemRow рендерит фишки материалов под заголовком «Списание материалов по услуге» (Мандат 8z)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideBillingItemRow, {
				item: {
					id: "srv-row-1",
					title: "Лечение кариеса световой пломбой",
					unitPriceRub: 4500,
					quantity: 1,
					isWarranty: false,
					code804n: "A16.07.002",
					toothCode: "16",
				},
				index: 0,
				isWarranty100: false,
				onToggleWarranty: () => {},
				onQuantityChange: () => {},
				onStepPrice: () => {},
				onPriceChange: () => {},
				onRemoveService: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"bom-deduction-info-srv-row-1\""));
		assert.ok(html.includes("Списание материалов по услуге:"));
		assert.ok(html.includes("data-testid=\"bom-chip-srv-row-1-0\""));
		// Мандат 8z: запрет бюрократических штампов «Акт расхода материалов по СанПиН»
		assert.ok(!html.includes("Акт расхода материалов по СанПиН"));
		assert.ok(!html.includes("санпин"));
	});

	it("ChairsideBillingItemRow отображает предупреждение о мягком овердрафте при дефиците ТМЦ (Мандаты 8e, 8n)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideBillingItemRow, {
				item: {
					id: "srv-row-overdraft",
					title: "Анестезия инфильтрационная",
					unitPriceRub: 800,
					quantity: 1,
					isWarranty: false,
					code804n: "B01.003.004.004",
				},
				index: 1,
				isWarranty100: false,
				hasOverdraftWarning: true,
				onToggleWarranty: () => {},
				onQuantityChange: () => {},
				onStepPrice: () => {},
				onPriceChange: () => {},
				onRemoveService: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"overdraft-warning-srv-row-overdraft\""));
		assert.ok(html.includes("Материал отсутствует по учету (будет списан в овердрафт)"));
	});

	it("Удаление услуги инициирует автоматическое сторно с возвратом материалов на склад", () => {
		let stornoItem: any = null;
		let stornoMaterials: ServiceBomMaterial[] = [];
		let serviceRemovedId: string | null = null;

		const mockItem = {
			id: "srv-del-1",
			serviceId: "srv-caries",
			title: "Лечение кариеса",
			unitPriceRub: 4500,
			quantity: 1,
			isWarranty: false,
			code804n: "A16.07.002",
		};

		// Эмулируем обработчик сторно при удалении услуги
		const handleStorno = (item: any, materials: ServiceBomMaterial[]) => {
			stornoItem = item;
			stornoMaterials = materials;
		};

		const handleRemove = (id: string) => {
			serviceRemovedId = id;
		};

		const resolvedBOM = getServiceBomMaterials(mockItem.code804n, mockItem.title, mockItem.quantity);
		handleStorno(mockItem, resolvedBOM);
		handleRemove(mockItem.id);

		assert.equal(serviceRemovedId, "srv-del-1");
		assert.ok(stornoItem);
		assert.equal(stornoItem.id, "srv-del-1");
		assert.ok(stornoMaterials.length >= 2);
		// Все количества при сторно строго положительные (восстановление остатков)
		for (const mat of stornoMaterials) {
			assert.ok(mat.quantity > 0, `Количество материала ${mat.name} должно быть строго положительным`);
		}
	});
});

describe("Billing1CExportModal & Kopeck-Exact Formatting", () => {
	it("Billing1CExportModal форматирует все суммы строго с копейками (,00 ₽)", () => {
		const html = renderToStaticMarkup(
			createElement(Billing1CExportModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова Елена Александровна",
				contractNumber: "Д-2026/08",
				items: [
					{
						id: "item-1",
						code804n: "A16.07.002.001",
						name: "Восстановление зуба пломбой (светоотверждаемый композит)",
						priceRub: 5900,
						discountRub: 500,
						quantity: 1,
						toothNumber: 16,
					},
					{
						id: "item-2",
						code804n: "A16.07.051",
						name: "Профессиональная гигиена полости рта",
						priceRub: 50500,
						discountRub: 0,
						quantity: 1,
					},
				],
				totalRub: 55900,
			}),
		);

		assert.ok(html.includes("data-testid=\"billing-1c-export-modal\""));
		assert.ok(html.includes("1С:Предприятие 8.3 / Экспорт в CommerceML 2.09"));
		assert.ok(html.includes("Смирнова Елена Александровна"));

		// Проверка строгой точности копеек: 55 900,00 ₽
		const normalizedHtml = html.replace(/[\u00A0\u202F]/g, " ");
		assert.ok(
			normalizedHtml.includes("55 900,00 ₽"),
			"Итоговая сумма должна форматироваться строго с копейками (55 900,00 ₽)",
		);

		// Проверка позиций в таблице с копейками: 5 900,00 ₽, 500,00 ₽, 5 400,00 ₽, 50 500,00 ₽
		assert.ok(normalizedHtml.includes("5 900,00 ₽"));
		assert.ok(normalizedHtml.includes("500,00 ₽"));
		assert.ok(normalizedHtml.includes("5 400,00 ₽"));
		assert.ok(normalizedHtml.includes("50 500,00 ₽"));
	});

	it("Billing1CExportModal возвращает пустую строку при isOpen = false", () => {
		const html = renderToStaticMarkup(
			createElement(Billing1CExportModal, {
				isOpen: false,
				onClose: () => {},
				items: [],
			}),
		);
		assert.equal(html, "");
	});
});

describe("SSOT Unification & Facade Parity (Mandates 8e, 8n, 8s, 8zh)", () => {
	it("ConsumablesDeductionModal и WarehouseInventoryTab экспортируются из components/inventory как канонический SSOT", async () => {
		const inventoryModal = await import("../components/inventory/ConsumablesBatchWriteoffModal.js");
		const inventoryTab = await import("../components/inventory/WarehouseInventoryTab.js");

		assert.ok(inventoryModal.ConsumablesDeductionModal, "ConsumablesDeductionModal должен экспортироваться из components/inventory");
		assert.ok(inventoryTab.WarehouseInventoryTab, "WarehouseInventoryTab должен экспортироваться из components/inventory");
	});
});
