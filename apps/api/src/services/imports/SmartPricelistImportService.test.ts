import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SmartPricelistImportService } from "./SmartPricelistImportService.js";

describe("SmartPricelistImportService", () => {
    it("should correctly normalize prices", () => {
        assert.strictEqual(SmartPricelistImportService.normalizePrice("100,50"), 100.5);
        assert.strictEqual(SmartPricelistImportService.normalizePrice(200), 200);
    });

    it("should create price item with correct calculation", () => {
        const item = SmartPricelistImportService.createPriceItem({
            code: "P001",
            name: "Test Procedure",
            price: "150,00",
            sourceSystem: "generic",
        });
        assert.strictEqual(item.priceKopecks, 15000);
        assert.strictEqual(item.priceRub, 150);
        assert.strictEqual(item.code, "P001");
    });
});
