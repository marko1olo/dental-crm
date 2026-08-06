import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type AudienceCriteria, describeCriteria } from "./audience.js";

describe("describeCriteria", () => {
	it("returns an empty array for empty criteria", () => {
		assert.deepEqual(describeCriteria({}), []);
	});

	it("describes status", () => {
		assert.deepEqual(describeCriteria({ status: "active" }), [
			"активные пациенты",
		]);
		assert.deepEqual(describeCriteria({ status: "archived" }), [
			"архивные пациенты",
		]);
	});

	it("describes neverVisited", () => {
		assert.deepEqual(describeCriteria({ neverVisited: true }), [
			"ни разу не были на приёме",
		]);
	});

	it("describes lastVisitBefore and lastVisitAfter", () => {
		assert.deepEqual(
			describeCriteria({ lastVisitBefore: "2023-01-01T10:00:00Z" }),
			["последний приём раньше 2023-01-01"],
		);
		assert.deepEqual(
			describeCriteria({ lastVisitAfter: "2023-12-31T23:59:59Z" }),
			["последний приём позже 2023-12-31"],
		);
	});

	it("describes hasFutureAppointment", () => {
		assert.deepEqual(describeCriteria({ hasFutureAppointment: true }), [
			"есть будущая запись",
		]);
		assert.deepEqual(describeCriteria({ hasFutureAppointment: false }), [
			"нет будущей записи",
		]);
	});

	it("describes debtAtLeastRub", () => {
		assert.deepEqual(describeCriteria({ debtAtLeastRub: 500 }), [
			"долг не меньше 500 ₽",
		]);
		assert.deepEqual(describeCriteria({ debtAtLeastRub: 0 }), [
			"долг не меньше 0 ₽",
		]);
	});

	it("describes birthdayWithinDays", () => {
		assert.deepEqual(describeCriteria({ birthdayWithinDays: 7 }), [
			"день рождения в ближайшие 7 дн.",
		]);
		assert.deepEqual(describeCriteria({ birthdayWithinDays: 0 }), [
			"день рождения в ближайшие 0 дн.",
		]);
	});

	it("describes ageFrom and ageTo", () => {
		assert.deepEqual(describeCriteria({ ageFrom: 18 }), ["возраст от 18"]);
		assert.deepEqual(describeCriteria({ ageTo: 65 }), ["возраст до 65"]);
		assert.deepEqual(describeCriteria({ ageFrom: 18, ageTo: 65 }), [
			"возраст от 18",
			"возраст до 65",
		]);
	});

	it("describes patientIds", () => {
		assert.deepEqual(describeCriteria({ patientIds: ["id1", "id2", "id3"] }), [
			"список из 3 пациент(ов)",
		]);
	});

	it("describes multiple criteria combined", () => {
		const criteria: AudienceCriteria = {
			status: "active",
			ageFrom: 18,
			debtAtLeastRub: 1000,
		};
		assert.deepEqual(describeCriteria(criteria), [
			"активные пациенты",
			"долг не меньше 1000 ₽",
			"возраст от 18",
		]);
	});
});
