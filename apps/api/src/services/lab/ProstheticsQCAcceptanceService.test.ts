import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProstheticsQCAcceptanceService } from "./ProstheticsQCAcceptanceService.js";

describe("ProstheticsQCAcceptanceService", () => {
	it("should accept checklist when all items pass", () => {
		const checklist = {
			marginalFit: true,
			occlusalContacts: true,
			vitaColorMatch: true,
			seatingOnModel: true,
			noCeramicChipping: true,
		};
		const result = ProstheticsQCAcceptanceService.validateChecklist(checklist);
		assert.strictEqual(result.status, "accepted");
		assert.strictEqual(result.failedItems.length, 0);
	});

	it("should reject checklist when items fail", () => {
		const checklist = {
			marginalFit: false,
			occlusalContacts: true,
			vitaColorMatch: false,
			seatingOnModel: true,
			noCeramicChipping: true,
		};
		const result = ProstheticsQCAcceptanceService.validateChecklist(checklist);
		assert.strictEqual(result.status, "rejected_defect");
		assert.ok(result.failedItems.includes("Краевое прилегание"));
		assert.ok(result.failedItems.includes("Совпадение цвета VITA"));
	});

	it("should create reclamation act", () => {
		const act = ProstheticsQCAcceptanceService.createReclamationAct(
			"ORD-123",
			"shade_mismatch",
			"Цвет не соответствует шкале VITA A2",
			3,
		);
		assert.strictEqual(act.orderId, "ORD-123");
		assert.strictEqual(act.defectCategory, "shade_mismatch");
		assert.strictEqual(act.description, "Цвет не соответствует шкале VITA A2");
	});
});
