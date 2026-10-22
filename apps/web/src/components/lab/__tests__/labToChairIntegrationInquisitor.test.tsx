import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatLabReadinessIndicator } from "@dental/shared";

describe("labToChairIntegrationInquisitor — Smoke Facade", () => {
	it("readiness indicator formats correctly", () => {
		const text = formatLabReadinessIndicator({ workType: "Коронка", toothFdi: "16" });
		assert.ok(text.includes("доставлена"));
	});
});
