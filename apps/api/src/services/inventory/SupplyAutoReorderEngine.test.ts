import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { SupplyAutoReorderEngine } from "./SupplyAutoReorderEngine.js";

describe("SupplyAutoReorderEngine", () => {
    test("1. ROP calculation formula", () => {
        const rop = SupplyAutoReorderEngine.calculateROP(2, 5, 10);
        // (2 * 5) + 10 = 20
        assert.equal(rop, 20);
    });

    test("2. Recommendation when stock is below ROP", () => {
        const stats = {
            id: "1",
            name: "Composite A1",
            currentStock: 5,
            minQty: 10,
            avgDailyUsage: 2,
            leadTimeDays: 5
        };
        // ROP = (2 * 5) + 10 = 20
        // Need = 20 - 5 = 15
        const rec = SupplyAutoReorderEngine.analyzeItem(stats);
        assert.equal(rec.rop, 20);
        assert.equal(rec.orderQuantity, 15);
        assert.equal(rec.isCritical, true);
    });

    test("3. No recommendation when stock is above ROP", () => {
        const stats = {
            id: "2",
            name: "Gloves",
            currentStock: 50,
            minQty: 10,
            avgDailyUsage: 1,
            leadTimeDays: 5
        };
        // ROP = (1 * 5) + 10 = 15
        const rec = SupplyAutoReorderEngine.analyzeItem(stats);
        assert.equal(rec.orderQuantity, 0);
        assert.equal(rec.isCritical, false);
    });
});
