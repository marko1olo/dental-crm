import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolvePatientFromPhone } from "../../../store/telephonyStore.js";
import { mockPatients } from "./telephonyTestFixtures.js";

describe("Telephony: Patient Phone Resolution", () => {
	test("resolves patient by primary phone across +7 and 8 formats", () => {
		const p1 = resolvePatientFromPhone(mockPatients, "89161234567");
		assert.ok(p1);
		assert.equal(p1?.fullName, "Иванов Иван Иванович");

		const p2 = resolvePatientFromPhone(mockPatients, "+7 (926) 987-65-43");
		assert.ok(p2);
		assert.equal(p2?.fullName, "Смирнова Елена Васильевна");
	});

	test("resolves patient by legal representative phone", () => {
		const p = resolvePatientFromPhone(mockPatients, "89169998877");
		assert.ok(p);
		assert.equal(p?.fullName, "Иванов Иван Иванович");
	});

	test("returns null when phone does not match any patient", () => {
		const p = resolvePatientFromPhone(mockPatients, "+7 (999) 000-00-00");
		assert.equal(p, null);
	});

	test("handles empty inputs safely", () => {
		assert.equal(resolvePatientFromPhone([], "+79161234567"), null);
		assert.equal(resolvePatientFromPhone(null, "+79161234567"), null);
		assert.equal(resolvePatientFromPhone(mockPatients, null), null);
		assert.equal(resolvePatientFromPhone(mockPatients, "123"), null);
	});
});
