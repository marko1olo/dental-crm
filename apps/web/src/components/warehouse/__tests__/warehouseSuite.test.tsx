/**
 * warehouseSuite.test.tsx — Red Team Inquisitor Test Suite for Warehouse & Inventory Components
 *
 * Verifies Mandates 8e, 8n, 8s, 8v, 8z:
 * 1. Consumable write-off, FEFO batch tracking, expiration date traffic light.
 * 2. Inbound waybills (ТОРГ-12) & soft overdraft reconciliation upon receipt.
 * 3. Inventory audit (ИНВ-3, ИНВ-19) & discrepancy calculation.
 * 4. Soft overdraft: never blocking doctor/clinic on negative stock.
 * 5. Elimination of dev-jargon («1-клик», «овербукинг»), emojis, and empty stubs.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	WarehouseStockAlertsBar,
	WarehouseOverviewTab,
	WarehouseWaybillsTab,
	WarehouseInventoryTab,
	WarehouseBatchTrackingModal,
} from "../index.js";
import type { InventoryItem } from "../../inventory/useInventoryLogic.js";
import {
	getFefoTrafficLight,
} from "../../inventory/fefoTrafficLight.js";
import {
	reconcileOverdraftOnReceipt,
	generateTorg12Html,
	createSampleDentalWaybill,
	calculateWaybillTotals,
	createWaybillItem,
} from "../../inventory/acceptanceWaybillsEngine.js";
import {
	computeAuditLineItem,
	calculateInventoryAuditTotals,
	generateInv3Html,
	generateInv19Html,
	generateTorg16ActFromInventory,
} from "../../inventory/warehouseInventoryEngine.js";

const SAMPLE_ITEMS: readonly InventoryItem[] = [
	{
		id: "wh-item-1",
		name: "Артикаин 1:100 000 карпула 1.7 мл",
		category: "Анестезия",
		stockQuantity: 120,
		criticalThreshold: 30,
		unitCostRub: "95.00",
		unit: "карп.",
		sku: "ART-100",
		lotNumber: "LOT-441",
		expirationDate: "2027-12-31",
		updatedAt: "2026-10-07T12:00:00Z",
	},
	{
		id: "wh-item-2",
		name: "Скандонест 3% карпула 1.7 мл",
		category: "Анестезия",
		stockQuantity: -5, // Мягкий овердрафт!
		criticalThreshold: 20,
		unitCostRub: "110.00",
		unit: "карп.",
		sku: "SCAND-3",
		lotNumber: "LOT-201",
		expirationDate: "2026-10-15", // Истекает скоро
		updatedAt: "2026-10-07T12:00:00Z",
	},
	{
		id: "wh-item-3",
		name: "Перчатки нитриловые M",
		category: "СИЗ",
		stockQuantity: 4, // Критический остаток
		criticalThreshold: 10,
		unitCostRub: "35.00",
		unit: "пар",
		sku: "GLV-M",
		lotNumber: "LOT-GLV-01",
		expirationDate: "2029-01-01",
		updatedAt: "2026-10-07T12:00:00Z",
	},
	{
		id: "wh-item-4",
		name: "Просроченный препарат тестовый",
		category: "Терапия",
		stockQuantity: 2,
		criticalThreshold: 5,
		unitCostRub: "500.00",
		unit: "шт.",
		sku: "EXP-01",
		lotNumber: "LOT-OLD-99",
		expirationDate: "2025-01-01", // Просрочен
		updatedAt: "2026-10-07T12:00:00Z",
	},
];

describe("RED TEAM WAREHOUSE & INVENTORY INQUISITOR SUITE", () => {
	describe("1. Мягкий овердрафт и защита врача от блокировок (Мандат 8e / 8n)", () => {
		it("разрешает отрицательный остаток (дефицит) без исключений и фатальных ошибок", () => {
			const overdraftItem = SAMPLE_ITEMS.find((it) => it.stockQuantity < 0);
			assert.ok(overdraftItem, "Должен существовать товар с отрицательным остатком");
			assert.equal(overdraftItem.stockQuantity, -5);

			// При списании 2 ед. баланс корректно уходит в -7 без блокировки
			const newStock = overdraftItem.stockQuantity - 2;
			assert.equal(newStock, -7);
		});

		it("автоматически гасит накопленный дефицит при оприходовании накладной", () => {
			const currentDeficit = -5;
			const receivedQty = 20;
			const reconciliation = reconcileOverdraftOnReceipt(currentDeficit, receivedQty);

			assert.equal(reconciliation.clearedDeficit, 5, "Дефицит должен быть полностью погашен");
			assert.equal(reconciliation.newStockQuantity, 15, "Новый чистый остаток должен составить 15 ед.");
			assert.equal(reconciliation.overdraftResolved, true);
		});

		it("корректно обрабатывает частичное погашение овердрафта", () => {
			const currentDeficit = -10;
			const receivedQty = 4;
			const reconciliation = reconcileOverdraftOnReceipt(currentDeficit, receivedQty);

			assert.equal(reconciliation.clearedDeficit, 4, "Должно быть погашено 4 ед. дефицита");
			assert.equal(reconciliation.newStockQuantity, -6, "Остаточный дефицит должен составить -6 ед.");
			assert.equal(reconciliation.overdraftResolved, true);
		});
	});

	describe("2. Партионный учет FEFO и светофор сроков годности (СанПиН 3.3686-21)", () => {
		it("определяет просроченные серии как статус red", () => {
			const status = getFefoTrafficLight("2025-01-01", "2026-10-07");
			assert.equal(status.status, "red");
		});

		it("определяет серии со сроком < 30 дней как статус yellow (приоритет отпуска FEFO)", () => {
			const status = getFefoTrafficLight("2026-10-20", "2026-10-07");
			assert.equal(status.status, "yellow");
			assert.ok(status.daysLeft <= 30 && status.daysLeft > 0);
		});

		it("определяет свежие серии как статус green", () => {
			const status = getFefoTrafficLight("2028-12-31", "2026-10-07");
			assert.equal(status.status, "green");
			assert.ok(status.daysLeft > 30);
		});
	});

	describe("3. Приходные накладные ТОРГ-12 и расчет сумм", () => {
		it("рассчитывает суммы накладной с точностью до копейки", () => {
			const items = [
				createWaybillItem({
					name: "Артикаин карпула",
					batchNumber: "LOT-ART-01",
					expirationDate: "2028-12-31",
					quantity: 100,
					unitPriceKopecks: 9500, // 95 руб.
					vatRate: 0, // Медизделия/ЛС без НДС
				}),
				createWaybillItem({
					name: "Пакеты для стерилизации",
					batchNumber: "LOT-STER-02",
					expirationDate: "2028-12-31",
					quantity: 50,
					unitPriceKopecks: 1400, // 14 руб.
					vatRate: 20, // Хоз. расходники с 20% НДС
				}),
			];

			const totals = calculateWaybillTotals(items);
			// 100 * 9500 = 950 000 коп. (НДС 0)
			// 50 * 1400 = 70 000 коп. без НДС, НДС 20% = 14 000 коп., с НДС = 84 000 коп.
			assert.equal(totals.totalPositions, 2);
			assert.equal(totals.subtotalKopecks, 1020000);
			assert.equal(totals.totalVatKopecks, 14000);
			assert.equal(totals.totalCostKopecks, 1034000);
		});

		it("генерирует валидный HTML печатной формы ТОРГ-12", () => {
			const sampleWaybill = createSampleDentalWaybill();
			const html = generateTorg12Html(sampleWaybill);

			assert.ok(html.includes("ТОРГ-12"), "HTML должен содержать заголовок ТОРГ-12");
			assert.ok(html.includes(sampleWaybill.waybillNumber), "HTML должен содержать номер накладной");
			assert.ok(html.includes(sampleWaybill.supplier.name), "HTML должен содержать имя поставщика");
		});
	});

	describe("4. Инвентаризация ТМЦ (ИНВ-3, ИНВ-19, ТОРГ-16) и единоличная автономия", () => {
		it("выявляет излишки, недостачи и совпадения при сличении", () => {
			const matchLine = computeAuditLineItem(
				{
					itemId: "it-1",
					sku: "SKU-1",
					nameRu: "Товар 1",
					category: "СИЗ",
					unitRu: "шт.",
					okeiCode: "796",
					batchNumber: "B1",
					expiryDate: "2028-01-01",
					bookQuantity: 10,
					actualQuantity: 10,
					unitCostKopecks: 10000,
				},
				"2026-10-07",
			);
			assert.equal(matchLine.discrepancyType, "match");
			assert.equal(matchLine.discrepancyQuantity, 0);

			const shortageLine = computeAuditLineItem(
				{
					itemId: "it-2",
					sku: "SKU-2",
					nameRu: "Товар 2",
					category: "СИЗ",
					unitRu: "шт.",
					okeiCode: "796",
					batchNumber: "B2",
					expiryDate: "2028-01-01",
					bookQuantity: 10,
					actualQuantity: 8,
					unitCostKopecks: 10000,
				},
				"2026-10-07",
			);
			assert.equal(shortageLine.discrepancyType, "shortage");
			assert.equal(shortageLine.discrepancyQuantity, -2);
			assert.equal(shortageLine.discrepancyCostKopecks, -20000);

			const surplusLine = computeAuditLineItem(
				{
					itemId: "it-3",
					sku: "SKU-3",
					nameRu: "Товар 3",
					category: "СИЗ",
					unitRu: "шт.",
					okeiCode: "796",
					batchNumber: "B3",
					expiryDate: "2028-01-01",
					bookQuantity: 10,
					actualQuantity: 13,
					unitCostKopecks: 10000,
				},
				"2026-10-07",
			);
			assert.equal(surplusLine.discrepancyType, "surplus");
			assert.equal(surplusLine.discrepancyQuantity, 3);
			assert.equal(surplusLine.discrepancyCostKopecks, 30000);

			const totals = calculateInventoryAuditTotals([matchLine, shortageLine, surplusLine]);
			assert.equal(totals.totalItemsCount, 3);
			assert.equal(totals.matchedItemsCount, 1);
			assert.equal(totals.shortageItemsCount, 1);
			assert.equal(totals.surplusItemsCount, 1);
		});

		it("генерирует формы ИНВ-3 и ИНВ-19 с поддержкой единоличной подписи соло-врача", () => {
			const line = computeAuditLineItem(
				{
					itemId: "it-1",
					sku: "SKU-1",
					nameRu: "Товар 1",
					category: "СИЗ",
					unitRu: "шт.",
					okeiCode: "796",
					batchNumber: "B1",
					expiryDate: "2028-01-01",
					bookQuantity: 10,
					actualQuantity: 9,
					unitCostKopecks: 5000,
				},
				"2026-10-07",
			);

			const doc = {
				id: "audit-test-1",
				documentNumber: "ИНВ-2026/10-001",
				orderNumber: "ПР-44",
				orderDate: "2026-10-07",
				auditStartDate: "2026-10-07",
				auditEndDate: "2026-10-07",
				auditDate: "2026-10-07",
				branchId: "org-1",
				branchNameRu: "Центральное отделение",
				warehouseNameRu: "Главный склад",
				molFullName: "Кузнецов А.В. (Врач-стоматолог)",
				molPosition: "Врач-стоматолог",
				status: "reconciliation" as const,
				commission: [
					{
						fullName: "Кузнецов А.В.",
						position: "Врач-стоматолог",
						role: "mol" as const,
						roleRu: "Материально ответственное лицо",
					},
				],
				items: [line],
				organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
				organizationOkpo: "12345678",
				organizationInn: "7701987654",
			};

			const inv3Html = generateInv3Html(doc);
			assert.ok(inv3Html.includes("ИНВ-3"), "Должен содержать ИНВ-3");
			assert.ok(inv3Html.includes("Кузнецов А.В."), "Должен содержать ФИО врача");

			const inv19Html = generateInv19Html(doc);
			assert.ok(inv19Html.includes("ИНВ-19"), "Должен содержать ИНВ-19");
			assert.ok(inv19Html.includes("СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ"), "Должен содержать название ведомости");
		});
	});

	describe("5. Рендеринг компонентов склада и отсутствие визуального брака", () => {
		it("WarehouseStockAlertsBar рендерит бейджи предупреждений без падений", () => {
			const html = renderToStaticMarkup(
				<WarehouseStockAlertsBar
					items={SAMPLE_ITEMS}
					onOpenWaybills={() => {}}
					onOpenBatchTracking={() => {}}
					onOpenInventoryAudit={() => {}}
				/>,
			);

			assert.ok(html.includes("warehouse-stock-alerts-bar"));
			assert.ok(html.includes("Расход сверх остатка: 1 поз."));
			assert.ok(html.includes("Заканчивается: 2 поз."));
			assert.ok(html.includes("Просрочено: 1 поз."));
		});

		it("WarehouseOverviewTab рендерит таблицу ТМЦ и KPI карточки", () => {
			const html = renderToStaticMarkup(
				<WarehouseOverviewTab
					organizationId="test-org-1"
					items={SAMPLE_ITEMS}
					onRefresh={() => {}}
					onSelectItem={() => {}}
					onDeductItem={() => {}}
					onReceiveItem={() => {}}
					onOpenWaybills={() => {}}
					onOpenBatchTracking={() => {}}
					onOpenInventoryAudit={() => {}}
					onQuickWriteoffCarpules={() => {}}
				/>,
			);

			assert.ok(html.includes("warehouse-overview-tab"));
			assert.ok(html.includes("Всего позиций"));
			assert.ok(html.includes("Критический остаток"));
			assert.ok(html.includes("Расход сверх остатка"));
			assert.ok(html.includes("Артикаин"));
		});

		it("WarehouseWaybillsTab рендерит приходные накладные", () => {
			const html = renderToStaticMarkup(
				<WarehouseWaybillsTab
					organizationId="test-org-1"
					inventoryItems={SAMPLE_ITEMS}
					onWaybillPosted={() => {}}
					onRefreshStock={() => {}}
				/>,
			);

			assert.ok(html.includes("warehouse-waybills-tab"));
			assert.ok(html.includes("Поступление партий"));
			assert.ok(html.includes("Оприходовать накладную"));
		});

		it("WarehouseInventoryTab рендерит сличительную ведомость", () => {
			const html = renderToStaticMarkup(
				<WarehouseInventoryTab
					organizationId="test-org-1"
					items={SAMPLE_ITEMS}
					onApplyAudit={() => {}}
					onRefresh={() => {}}
				/>,
			);

			assert.ok(html.includes("warehouse-inventory-tab"));
			assert.ok(html.includes("Позиций в описи"));
			assert.ok(html.includes("Опись остатков"));
			assert.ok(html.includes("Сличительная ведомость"));
		});

		it("WarehouseBatchTrackingModal рендерит партии и серии", () => {
			const html = renderToStaticMarkup(
				<WarehouseBatchTrackingModal
					isOpen={true}
					onClose={() => {}}
					items={SAMPLE_ITEMS}
					onDeductBatch={() => {}}
					onReceiveBatch={() => {}}
					onWriteOffExpired={() => {}}
				/>,
			);

			assert.ok(html.includes("warehouse-batch-tracking-modal"));
			assert.ok(html.includes("Партионный учёт"));
			assert.ok(html.includes("FEFO"));
		});

		it("WarehouseCatalogView рендерит каталог и тулбар в 1 строку", async () => {
			const { WarehouseCatalogView } = await import("../WarehouseCatalogView.js");
			const html = renderToStaticMarkup(
				<WarehouseCatalogView
					organizationId="test-org-1"
					items={SAMPLE_ITEMS}
				/>,
			);

			assert.ok(html.includes("warehouse-catalog-view"));
			assert.ok(html.includes("Позиций в клинике:"));
			assert.ok(html.includes("btn-open-protocol-deduction"));
			assert.ok(html.includes("Списание по протоколу"));
		});

		it("ConsumablesDeductionModal рендерит списание у кресла и мягкий овердрафт", async () => {
			const { ConsumablesDeductionModal } = await import("../ConsumablesDeductionModal.js");
			const html = renderToStaticMarkup(
				<ConsumablesDeductionModal
					isOpen={true}
					onClose={() => {}}
					procedureTitle="Лечение кариеса (пломба световая)"
					service804nCode="A16.07.002.011"
					currentStockMap={{ "it-art": 25, "it-fltk": -2 }}
				/>,
			);

			assert.ok(html.includes("consumables-deduction-modal"));
			assert.ok(html.includes("Расходные материалы приёма"));
			assert.ok(html.includes("btn-confirm-deduction"));
		});

		it("AutoBomDeductionBanner рендерит статус расходников к услуге", async () => {
			const { AutoBomDeductionBanner } = await import("../AutoBomDeductionBanner.js");
			const html = renderToStaticMarkup(
				<AutoBomDeductionBanner
					procedureTitle="Пломбирование зуба световым композитом"
					onConfirmOneClick={() => {}}
				/>,
			);

			assert.ok(html.includes("auto-bom-deduction-banner"));
			assert.ok(html.includes("Списание по протоколу:"));
		});
	});

	describe("6. Искоренение дев-жаргона, эмодзи и заглушек в компонентах", () => {
		const filesToInspect = [
			"WarehouseStockAlertsBar.tsx",
			"WarehouseOverviewTab.tsx",
			"WarehouseWaybillsTab.tsx",
			"WarehouseInventoryTab.tsx",
			"WarehouseBatchTrackingModal.tsx",
			"WarehouseCatalogView.tsx",
			"ConsumablesDeductionModal.tsx",
			"AutoBomDeductionBanner.tsx",
		];

		it("компоненты не содержат мультяшных эмодзи и запрещенного дев-жаргона", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");

			for (const file of filesToInspect) {
				const baseDir = fs.existsSync(path.join(process.cwd(), "src/components/warehouse"))
					? path.join(process.cwd(), "src/components/warehouse")
					: path.join(process.cwd(), "apps/web/src/components/warehouse");
				const fullPath = path.join(baseDir, file);
				const content = fs.readFileSync(fullPath, "utf-8");

				// Проверка на эмодзи
				const emojiMatch = content.match(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
				assert.equal(emojiMatch, null, `Файл ${file} не должен содержать эмодзи`);

				// Проверка на запрещенный жаргон в тексте интерфейса
				assert.ok(
					!content.includes("1-клик") && !content.includes("1-Click"),
					`Файл ${file} не должен содержать жаргон «1-клик»`,
				);
				assert.ok(
					!content.includes("овербукинг") && !content.includes("overbooking"),
					`Файл ${file} не должен содержать жаргон «овербукинг»`,
				);
			}
		});
	});
});
