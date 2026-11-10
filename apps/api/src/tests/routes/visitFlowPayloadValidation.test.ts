import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { visitFlowRequestSchema } from "@dental/shared";

describe("visitFlowRequestSchema Payload Validation Unit Tests", () => {
	test("1. Missing transcript — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({});
		assert.equal(result.success, false);
		if (!result.success) {
			const issue = result.error.issues.find((i) => i.path.includes("transcript"));
			assert.ok(issue, "Expected missing transcript issue");
		}
	});

	test("2. Non-string transcript — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({ transcript: 12345 });
		assert.equal(result.success, false);
	});

	test("3. Valid minimal payload — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Пациент обратился с жалобами на боль в зубе 1.6",
		});
		assert.equal(result.success, true);
	});

	test("4. patientId invalid UUID — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			patientId: "not-a-valid-uuid",
		});
		assert.equal(result.success, false);
	});

	test("5. patientId valid UUID — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			patientId: "11111111-1111-4111-8111-111111111111",
		});
		assert.equal(result.success, true);
	});

	test("6. patientId null — fails validation (optional, not nullable)", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			patientId: null,
		});
		assert.equal(result.success, false);
	});

	test("7. planPayload undefined — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			planPayload: undefined,
		});
		assert.equal(result.success, true);
	});

	test("8. planPayload null — passes validation (explicitly nullable)", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			planPayload: null,
		});
		assert.equal(result.success, true);
	});

	test("9. recommendationsPayload undefined — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			recommendationsPayload: undefined,
		});
		assert.equal(result.success, true);
	});

	test("10. recommendationsPayload null — passes validation (explicitly nullable)", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			recommendationsPayload: null,
		});
		assert.equal(result.success, true);
	});

	test("11. source property — passes validation when provided", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			source: "voice",
		});
		assert.equal(result.success, true);
	});

	test("12. completedServices negative priceRub — fails validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			completedServices: [
				{
					serviceId: "srv-1",
					title: "Лечение кариеса",
					quantity: 1,
					priceRub: -500,
				},
			],
		});
		assert.equal(result.success, false);
	});

	test("13. completedServices valid non-negative priceRub — passes validation", () => {
		const result = visitFlowRequestSchema.safeParse({
			transcript: "Тест",
			completedServices: [
				{
					serviceId: "srv-1",
					title: "Лечение кариеса",
					quantity: 1,
					priceRub: 3500.5,
				},
			],
		});
		assert.equal(result.success, true);
	});
});
