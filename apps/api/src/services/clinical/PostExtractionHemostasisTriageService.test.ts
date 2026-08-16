import { PostExtractionHemostasisTriageService } from "./PostExtractionHemostasisTriageService.js";
import { describe, it } from "node:test";
import assert from "node:assert";

describe("PostExtractionHemostasisTriageService", () => {
    it("should return stable for capillary_oozing", () => {
        const result = PostExtractionHemostasisTriageService.triage("capillary_oozing");
        assert.strictEqual(result.status, "stable");
        assert.ok(result.recommendation.includes("тампонада"));
    });

    it("should return urgent_compression for liver_clot", () => {
        const result = PostExtractionHemostasisTriageService.triage("liver_clot");
        assert.strictEqual(result.status, "urgent_compression");
        assert.ok(result.recommendation.includes("Удаление"));
    });

    it("should return emergency_clinic_visit for pulsating_arterial", () => {
        const result = PostExtractionHemostasisTriageService.triage("pulsating_arterial");
        assert.strictEqual(result.status, "emergency_clinic_visit");
        assert.ok(result.recommendation.includes("Экстренный статус"));
    });
});
