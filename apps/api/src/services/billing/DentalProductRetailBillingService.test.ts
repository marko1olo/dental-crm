import { describe, it } from "node:test";
import assert from "node:assert";
import { DentalProductRetailBillingService } from "./DentalProductRetailBillingService.js";

describe("DentalProductRetailBillingService", () => {
  it("should correctly separate VAT for medical services and retail products", () => {
    const items = [
      { id: "1", name: "Consultation", price: 1000, quantity: 1, type: "service" as const },
      { id: "2", name: "Toothbrush", price: 600, quantity: 2, type: "product" as const },
    ];

    const result = DentalProductRetailBillingService.processReceipt(items);

    assert.strictEqual(result.items.length, 2);
    
    const firstItem = result.items[0]!;
    // Consultation: 1000 * 1 = 1000, 0% VAT
    assert.strictEqual(firstItem.vatRate, "0%");
    assert.strictEqual(firstItem.total, 1000);
    assert.strictEqual(firstItem.vatAmount, 0);

    const secondItem = result.items[1]!;
    // Toothbrush: 600 * 2 = 1200, 20% VAT (inclusive: 1200 * 20/120 = 200)
    assert.strictEqual(secondItem.vatRate, "20%");
    assert.strictEqual(secondItem.total, 1200);
    assert.strictEqual(secondItem.vatAmount, 200);

    // Totals
    assert.strictEqual(result.totalAmount, 2200);
    assert.strictEqual(result.totalVatAmount, 200);
  });
});
