import assert from "node:assert";
import { describe, test } from "node:test";
import { TreatmentPlanVersioningService } from "./TreatmentPlanVersioningService.js";

describe("TreatmentPlanVersioningService", () => {
    test("should calculate discounts correctly", () => {
        const basePrice = 1000;
        const params = { chiefPhysicianDiscountRub: 100, dmsCoPayPct: 10 };
        // (1000 * 0.9) - 100 = 800
        const result = TreatmentPlanVersioningService.calculateDiscount(basePrice, params);
        assert.strictEqual(result, 800);
    });

    test("should generate IDS text", () => {
        const result = TreatmentPlanVersioningService.generateIdsText(["Чистка"], "Иван");
        assert.ok(result.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
        assert.ok(result.includes("Иван"));
        assert.ok(result.includes("Чистка"));
    });
});
