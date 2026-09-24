import assert from "node:assert/strict";
import test from "node:test";
import { readBlankPermissions } from "../EgiszBlankPermissionsWidget";

test("EgiszBlankPermissionsWidget — readBlankPermissions parses items, required role, and opt-out respect", () => {
	assert.deepEqual(readBlankPermissions("invalid"), { kind: "unreadable" });
	assert.deepEqual(readBlankPermissions(null), { kind: "unreadable" });
	assert.deepEqual(readBlankPermissions([]), { kind: "ok", data: [] });
	assert.deepEqual(readBlankPermissions([{ broken: true }]), { kind: "unreadable" });

	const payload = [
		{
			id: "perm-1",
			formCode: "043/у",
			fieldName: "Анамнез жизни и соматический статус",
			isExportAllowed: true,
			patientOptOutRespect: true,
			requiredStaffRole: "Врач-стоматолог",
		},
		{
			id: "perm-2",
			formCode: "СЭМД-108",
			fieldName: "Протокол консультации и зубная формула",
			isExportAllowed: false,
			patientOptOutRespect: false,
		},
	];

	const outcome = readBlankPermissions(payload);
	assert.equal(outcome.kind, "ok");
	if (outcome.kind === "ok") {
		assert.equal(outcome.data.length, 2);
		assert.equal(outcome.data[0]?.formCode, "043/у");
		assert.equal(outcome.data[0]?.isExportAllowed, true);
		assert.equal(outcome.data[0]?.patientOptOutRespect, true);
		assert.equal(outcome.data[0]?.requiredStaffRole, "Врач-стоматолог");

		assert.equal(outcome.data[1]?.formCode, "СЭМД-108");
		assert.equal(outcome.data[1]?.isExportAllowed, false);
		assert.equal(outcome.data[1]?.patientOptOutRespect, false);
		assert.equal(outcome.data[1]?.requiredStaffRole, "Врач-стоматолог / Главный врач");
	}
});
