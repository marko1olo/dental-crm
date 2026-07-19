import { describe, it } from "node:test";
import assert from "node:assert";
import { smartBookingParser } from "../src/lib/smartBookingParser";
import { parseVisitDictationLocal } from "../src/lib/smartVisitParser";

const mockDashboard = {
	patients: [
		{ id: "p1", fullName: "Иванов Иван Иванович", status: "active" },
		{ id: "p2", fullName: "Петров Петр", status: "active" },
	],
	clinicSettings: {
		staff: [
			{ id: "s1", fullName: "Смирнов Врач", role: "doctor", active: true },
		],
		chairs: [{ id: "c1", name: "Кресло 1", active: true }],
	},
	appointments: [],
};

describe("smartBookingParser", () => {
	it("parses Ivanov appointment", () => {
		const result = smartBookingParser("Иванов кариес завтра в 15:30", mockDashboard as any);
		assert.strictEqual(result.patientId, "p1");
		assert.strictEqual(result.action, "create");
		assert.strictEqual(result.reason, "Кариес");
		assert.ok(result.startsAt);
		assert.ok(result.endsAt);
	});

	it("parses Petrov appointment", () => {
		const result = smartBookingParser(
			"Петров на чистку в понедельник в 10:00 к Смирнову",
			mockDashboard as any,
		);
		assert.strictEqual(result.patientId, "p2");
		assert.strictEqual(result.action, "create");
		assert.strictEqual(result.reason, "Профгигиена");
		assert.strictEqual(result.doctorUserId, "s1");
		assert.ok(result.startsAt);
		assert.ok(result.endsAt);
	});
});

describe("smartVisitParser", () => {
	it("parses complaints and teeth updates", () => {
		const result = parseVisitDictationLocal(
			"жалобы на боли при накусывании. 45 зуб периодонтит, сделали рентген.",
		);
		assert.deepStrictEqual(result, {
			toothUpdates: [{ code: "45", state: "planned" }],
			emkUpdates: {
				complaint: "Боли при накусывании. 45 зуб периодонтит, сделали рентген.",
			},
		});
	});

	it("parses complaints with fell out filling", () => {
		const result = parseVisitDictationLocal(
			"Иванов пришел, жалуется на выпавшую пломбу. 11 зуб кариес, поставил коффердам и сделал.",
		);
		assert.deepStrictEqual(result, {
			toothUpdates: [{ code: "11", state: "treatment" }],
			emkUpdates: {
				diagnosis: "Кариес, поставил коффердам и сделал.",
			},
		});
	});

	it("parses extraction", () => {
		const result = parseVisitDictationLocal(
			"удалил 38 зуб. экстракция прошла успешно. анестезия",
		);
		assert.deepStrictEqual(result, {
			toothUpdates: [{ code: "38", state: "missing" }],
			emkUpdates: {},
		});
	});

	it("parses implant request", () => {
		const result = parseVisitDictationLocal(
			"пациент хочет имплант на место 24. хирург",
		);
		assert.deepStrictEqual(result, {
			toothUpdates: [{ code: "24", state: "implant" }],
			emkUpdates: {},
		});
	});

	it("parses bleeding gums and airflow", () => {
		const result = parseVisitDictationLocal(
			"жалобы: кровоточит десна. гигиена airflow",
		);
		assert.deepStrictEqual(result, {
			toothUpdates: [],
			emkUpdates: {
				complaint: "Кровоточит десна. гигиена airflow.",
			},
		});
	});
});
