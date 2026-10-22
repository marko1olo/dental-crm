import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	calculateDaysUntilExpiration,
	calculateFefoStatus,
	sortAuditItemsByFefo,
} from "../warehouseInventoryEngine.js";

describe("Warehouse Inventory Engine & Preset Catalogs", () => {
	it("Эталонный набор инвентаризации содержит ключевые категории", () => {
		assert.ok(DEFAULT_INVENTORY_ITEMS_PRESET.length >= 8);
		const categories = new Set(DEFAULT_INVENTORY_ITEMS_PRESET.map((i) => i.category));
		assert.ok(categories.has("Анестетики"));
		assert.ok(categories.has("Композиты и адгезивы"));
		assert.ok(categories.has("Имплантология"));
		assert.ok(categories.has("Хирургия и шовный материал"));

		for (const item of DEFAULT_INVENTORY_ITEMS_PRESET) {
			assert.ok(item.itemId.length > 0);
			assert.ok(item.sku.length > 0);
			assert.ok(item.nameRu.length > 0);
			assert.ok(item.batchNumber.length > 0);
			assert.ok(item.expiryDate.length === 10);
			assert.ok(item.unitCostKopecks > 0);
		}
	});

	it("Эталонная инвентаризационная комиссия содержит 4 роли", () => {
		assert.equal(DEFAULT_COMMISSION_MEMBERS.length, 4);
		const roles = DEFAULT_COMMISSION_MEMBERS.map((c) => c.role);
		assert.ok(roles.includes("chairman"));
		assert.ok(roles.includes("mol"));
		assert.ok(roles.includes("member"));
		assert.ok(roles.includes("accountant"));

		for (const member of DEFAULT_COMMISSION_MEMBERS) {
			assert.ok(member.fullName.length > 0);
			assert.ok(member.position.length > 0);
		}
	});
});

describe("FEFO Expiration Tracking & Days Calculation", () => {
	const refDate = "2026-08-28";

	it("Рассчитывает точную разницу в днях между датами", () => {
		assert.equal(calculateDaysUntilExpiration("2026-08-28", refDate), 0);
		assert.equal(calculateDaysUntilExpiration("2026-08-29", refDate), 1);
		assert.equal(calculateDaysUntilExpiration("2026-09-27", refDate), 30);
		assert.equal(calculateDaysUntilExpiration("2026-08-20", refDate), -8);
	});

	it("Определяет статус 'expired' для партий с истекшим сроком", () => {
		const res1 = calculateFefoStatus("2026-08-15", refDate);
		assert.equal(res1.fefoStatus, "expired");
		assert.equal(res1.badgeLabelRu, "Просрочен");
		assert.equal(res1.hexColor, "#ef4444");

		const resToday = calculateFefoStatus("2026-08-28", refDate);
		assert.equal(resToday.fefoStatus, "expired");
	});

	it("Определяет статус 'warning_30' (< 30 дней)", () => {
		const res = calculateFefoStatus("2026-09-15", refDate);
		assert.equal(res.fefoStatus, "warning_30");
		assert.ok(res.badgeLabelRu.includes("< 30 дней"));
		assert.equal(res.hexColor, "#f97316");
	});

	it("Определяет статус 'warning_60' (< 60 дней)", () => {
		const res = calculateFefoStatus("2026-10-15", refDate);
		assert.equal(res.fefoStatus, "warning_60");
		assert.ok(res.badgeLabelRu.includes("< 60 дней"));
		assert.equal(res.hexColor, "#eab308");
	});

	it("Определяет статус 'fresh' (> 60 дней)", () => {
		const res = calculateFefoStatus("2027-12-31", refDate);
		assert.equal(res.fefoStatus, "fresh");
		assert.ok(res.badgeLabelRu.includes("Свежий"));
		assert.equal(res.hexColor, "#10b981");
	});

	it("Сортирует список ТМЦ по FEFO", () => {
		const sorted = sortAuditItemsByFefo(DEFAULT_INVENTORY_ITEMS_PRESET);
		for (let i = 0; i < sorted.length - 1; i++) {
			const curr = sorted[i];
			const next = sorted[i + 1];
			if (curr && next) {
				assert.ok(curr.daysUntilExpiration <= next.daysUntilExpiration);
			}
		}
	});
});
