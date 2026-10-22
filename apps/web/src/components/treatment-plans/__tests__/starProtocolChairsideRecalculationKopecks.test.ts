/**
 * starProtocolChairsideRecalculationKopecks.test.ts — расчет скидок и сумм в кресле врача с точностью до копейки.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseKopecks } from "@dental/shared";

describe("starProtocolValidationEngine — Пересчет сумм в кресле врача", () => {
	test("Пересчет количества и цен в кресле врача сохраняет копеечную точность без float drift", () => {
		const unitPriceRub = 3333.33;
		const discountPercent = 10;
		const qty = 3;

		const unitKop = parseKopecks(unitPriceRub);
		assert.equal(unitKop, 333333);

		const unitDiscountKop = Math.round((unitKop * discountPercent) / 100);
		assert.equal(unitDiscountKop, 33333);

		const finalUnitKop = unitKop - unitDiscountKop;
		assert.equal(finalUnitKop, 300000);

		const totalLineKop = finalUnitKop * qty;
		assert.equal(totalLineKop, 900000);

		const totalDiscountKop = unitDiscountKop * qty;
		assert.equal(totalDiscountKop, 99999);

		const lineItemPriceRub = totalLineKop / 100;
		const lineItemDiscountRub = totalDiscountKop / 100;

		assert.equal(lineItemPriceRub, 9000);
		assert.equal(lineItemDiscountRub, 999.99);

		const stageTotalKopecks = Math.round(lineItemPriceRub * 100);
		assert.equal(stageTotalKopecks, 900000);
		assert.equal(stageTotalKopecks / 100, 9000);
	});
});
