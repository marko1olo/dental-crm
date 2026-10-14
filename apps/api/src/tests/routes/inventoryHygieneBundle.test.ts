/**
 * inventoryHygieneBundle.test.ts — Тест 1-клик списания расходников профгигиены (AirFlow + УЗ)
 * со склада с поддержкой мягкого овердрафта (Мандаты 8e, 8k, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quickWriteoffVisitBundle } from "../../services/treatmentConsumables/bundleWriteoffService.js";
import { withTenantCtx } from "../../db/rls.js";

describe("Inventory Hygiene Bundle Write-off with Soft Overdraft", () => {
	it("успешно списывает бандл профгигиены (порошок, паста Cleanic, щетка, фторлак) с soft overdraft", async () => {
		const testOrgId = "00000000-0000-0000-0000-000000000001";

		await withTenantCtx(testOrgId, async (tx) => {
			const result = await quickWriteoffVisitBundle(tx, {
				organizationId: testOrgId,
				visitType: "hygiene",
				notes: "Тестовая комплексная профгигиена",
			});

			assert.ok(result.success, "Списание должно быть успешным");
			assert.ok(result.deductedItems.length >= 6, "Должно быть списано не менее 6 расходников");
			
			// Проверяем наличие ключевых позиций
			const names = result.deductedItems.map((i) => i.itemName.toLowerCase());
			assert.ok(
				names.some((n) => n.includes("порошок") || n.includes("air-flow") || n.includes("глицин")),
				"Порошок Air-Flow должен быть списан",
			);
			assert.ok(
				names.some((n) => n.includes("cleanic") || n.includes("паста")),
				"Полировочная паста Cleanic должна быть списана",
			);
			assert.ok(
				names.some((n) => n.includes("щетка") || n.includes("циркулярн")),
				"Циркулярная щетка должна быть списана",
			);
			assert.ok(
				names.some((n) => n.includes("фтор") || n.includes("fluor")),
				"Фтор-лак Fluor Protector должен быть списан",
			);

			// Проверяем сообщение
			assert.match(
				result.message,
				/Профессиональная гигиена/,
				"Сообщение должно упоминать профессиональную гигиену",
			);
		});
	});
});
