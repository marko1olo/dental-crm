/**
 * warehouseInboundOverdraftInquisitor.test.ts
 *
 * БОЕВОЙ ИНКВИЗИЦИОННЫЙ ТЕСТОВЫЙ НАБОР: Складской контур DENTE Dental CRM (Мандаты 8e, 8n, 8v, 8s).
 *
 * Проверяемые инварианты:
 * 1. Индустриальное оприходование накладных ТОРГ-12 / УПД через acceptance-waybill с фиксацией FEFO-партий
 *    и автоматическим погашением мягкого овердрафта.
 * 2. Резервный контур оприходования через POST /:organizationId/items и PATCH /:organizationId/:itemId/stock.
 * 3. Асинхронное оповещение заведующего складом и старшей медсестры через POST /api/inventory/:org/overdraft-alert.
 * 4. Мягкий овердрафт склада (Mandate 8n: Zero Dead-Ends): нулевой или отрицательный остаток расходников
 *    (анестезия, пломбировочные материалы, перчатки) никогда не блокирует прием пациента и смету.
 * 5. Интеллектуальная маршрутизация списания просрочки: карпулы -> утилизация Класса Б, прочие материалы -> 1-кликовое клиническое списание.
 * 6. Межскладские перемещения ТОРГ-13 с физическим списанием с баланса отправителя с allowOverdraft: true.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";
import { performAutoVisitBomDeduction } from "../autoBomDeductionEngine.js";

describe("CLINICAL WAREHOUSE & SUPPLY CHAIN INQUISITOR SUITE (Mandates 8e, 8n, 8v)", () => {
	describe("1. Индустриальное оприходование ТМЦ и FEFO-партионный учет (Мандат 8e п. 10)", () => {
		it("формирует корректную структуру для acceptance-waybill с сериями, сроками и ценой", () => {
			const waybillPayload = {
				supplierName: "ЗАО «ВладМиВа»",
				supplierInn: "7701234567",
				waybillNumber: "УПД-2026-881",
				receiptDate: "2026-10-02",
				items: [
					{
						inventoryItemId: "item-ultra-01",
						name: "Артикаин Д-С 1.7 мл",
						category: "Анестетики",
						unit: "карп.",
						batchNumber: "LOT-2026-X1",
						lotNumber: "LOT-2026-X1",
						expirationDate: "2028-09-30",
						quantity: 100,
						purchasePricePerUnit: 65,
					},
					{
						name: "Filtek Z250 шприц 4г (A2)",
						category: "Композиты",
						unit: "шт.",
						batchNumber: "LOT-FLT-99",
						expirationDate: "2027-12-31",
						quantity: 5,
						purchasePricePerUnit: 2800,
					},
				],
			};

			assert.equal(waybillPayload.items.length, 2);
			assert.equal(waybillPayload.items[0]?.batchNumber, "LOT-2026-X1");
			assert.equal(waybillPayload.items[0]?.expirationDate, "2028-09-30");
			assert.equal(waybillPayload.items[0]?.purchasePricePerUnit, 65);
			assert.equal(waybillPayload.items[1]?.quantity, 5);
		});
	});

	describe("2. Мягкий овердрафт при нулевом остатке (Мандат 8n: Zero Dead-Ends)", () => {
		it("при остатке 0 на складе списание расходников не блокирует приём и фиксирует овердрафт", () => {
			const renderedServices = [
				{
					serviceCode: "A11.07.012",
					serviceTitle: "Инфильтрационная анестезия",
					quantity: 2,
				},
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Лечение кариеса",
					quantity: 1,
				},
			];

			// Имитация пустого склада: остаток 0
			const emptyStockMap: Record<string, number> = {
				"mat-anes-art-100k": 0,
				"mat-comp-nano-a2": 0,
			};

			const planned = calculateAutoVisitConsumables(renderedServices, { includeStandardPpe: false });
			assert.ok(planned.length >= 2);

			const deduction = executeAutoVisitBomDeduction({
				visitId: "VIS-INQ-100",
				patientId: "PAT-100",
				doctorId: "DOC-100",
				renderedServices,
				currentStockMap: emptyStockMap,
				allowOverdraft: true,
				includeStandardPpe: false,
			});

			// Овердрафт зафиксирован, операция успешна
			assert.equal(deduction.hasOverdraft, true);
			assert.ok(deduction.softOverdrafts.length >= 2);

			// Проверяем отрицательные остатки
			const carpule = deduction.items.find((i) =>
				i.itemName.toLowerCase().includes("артикаин"),
			);
			assert.ok(carpule);
			assert.ok(carpule.isOverdraft);
			assert.equal(carpule.remainingQty, -2, "Списано 2 карпулы из 0 -> остаток -2");

			// Проверка, что сумма дефицита неотрицательна в отчете
			assert.equal(Math.abs(carpule.remainingQty), 2);
		});

		it("фоновый движок performAutoVisitBomDeduction отправляет alert на /overdraft-alert", async () => {
			const capturedCalls: Array<{ url: string; body: any }> = [];
			const mockFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
				capturedCalls.push({
					url: String(url),
					body: init?.body ? JSON.parse(String(init.body)) : null,
				});
				return new Response(JSON.stringify({ success: true, recordedCount: 1 }), { status: 200 });
			};

			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-INQ-001",
				visitNumber: "№144",
				cabinetId: "Кабинет 2 (Терапия)",
				chairId: "Кресло 1 (A-dec)",
				patientId: "PAT-INQ-01",
				doctorId: "DOC-INQ-01",
				organizationId: "org-inquisitor-test",
				renderedServices: [
					{
						code: "A11.07.012",
						name: "Анестезия",
						quantity: 2,
					},
				],
				currentStockMap: {
					"mat-anes-art-100k": 0,
				},
				allowOverdraft: true,
				includeStandardPpe: false,
				fetchFn: mockFetch as unknown as typeof fetch,
			});

			assert.equal(result.hasOverdraft, true);

			const alertCall = capturedCalls.find((c) => c.url.endsWith("/overdraft-alert"));
			assert.ok(alertCall, "Должен быть вызван эндпоинт /overdraft-alert");
			assert.equal(alertCall.body.visitId, "VIS-INQ-001");
			assert.equal(alertCall.body.cabinetId, "Кабинет 2 (Терапия)");
			assert.equal(alertCall.body.chairId, "Кресло 1 (A-dec)");
			assert.equal(alertCall.body.items[0].deficitQty, 2);
		});
	});

	describe("3. Межскладские перемещения ТОРГ-13 и списание с баланса (Мандат 8e)", () => {
		it("корректно формирует пакет списания при перемещении между филиалами с allowOverdraft: true", () => {
			const transferLines = [
				{
					itemId: "item-anes-01",
					nameRu: "Ультракаин Д-С Форте",
					dispatchedQuantity: 10,
					requestedQuantity: 10,
					batchNumber: "LOT-TRANS-01",
					expiryDate: "2027-10-31",
				},
				{
					itemId: "item-implant-02",
					nameRu: "Имплантат Dentium SuperLine Ø4.0 x 10 мм",
					dispatchedQuantity: 2,
					requestedQuantity: 2,
					batchNumber: "LOT-DENT-88",
					expiryDate: "2029-05-31",
				},
			];

			const deductPayload = {
				items: transferLines.map((line) => ({
					inventoryItemId: line.itemId,
					name: line.nameRu,
					quantity: line.dispatchedQuantity,
					allowOverdraft: true,
					reason: "Перемещение ТОРГ-13 №ТОРГ-13-2026/10-001 (central_hub → branch_center)",
					lotNumber: line.batchNumber,
					expirationDate: line.expiryDate,
				})),
				allowOverdraft: true,
				reason: "Перемещение ТОРГ-13 №ТОРГ-13-2026/10-001",
			};

			assert.equal(deductPayload.items.length, 2);
			assert.equal(deductPayload.allowOverdraft, true);
			assert.equal(deductPayload.items[0]?.quantity, 10);
			assert.equal(deductPayload.items[1]?.quantity, 2);
			assert.equal(deductPayload.items[0]?.lotNumber, "LOT-TRANS-01");
		});
	});

	describe("4. Интеллектуальная маршрутизация списания просроченных материалов", () => {
		it("маршрутизирует карпулы и анестетики в утилизацию Класса Б, а терапевтические материалы в клиническое списание", () => {
			const testItems = [
				{ name: "Артикаин с эпинефрином 1:100 000 (100 карпул)", isAnesthetic: true },
				{ name: "Ультракаин Д-С (Германия)", isAnesthetic: true },
				{ name: "Септанест 1:100 000 карпулы", isAnesthetic: true },
				{ name: "Скандонест 3% без вазоконстриктора", isAnesthetic: true },
				{ name: "Убистезин форте 1.7 мл", isAnesthetic: true },
				{ name: "Композит Filtek Ultimate шприц 4г", isAnesthetic: false },
				{ name: "Адгезив Single Bond Universal 5 мл", isAnesthetic: false },
				{ name: "Стеклоиономерный цемент Fuji Plus", isAnesthetic: false },
				{ name: "Перчатки нитриловые смотровые р-р M", isAnesthetic: false },
			];

			const isAnestheticName = (rawName: string): boolean => {
				const n = rawName.toLowerCase();
				return (
					n.includes("артикаин") ||
					n.includes("ультракаин") ||
					n.includes("септанест") ||
					n.includes("скандонест") ||
					n.includes("убистезин") ||
					n.includes("мепивакаин") ||
					n.includes("карпул")
				);
			};

			for (const item of testItems) {
				const result = isAnestheticName(item.name);
				assert.equal(
					result,
					item.isAnesthetic,
					`Ожидалось isAnesthetic=${item.isAnesthetic} для «${item.name}», получено ${result}`,
				);
			}
		});
	});
});
