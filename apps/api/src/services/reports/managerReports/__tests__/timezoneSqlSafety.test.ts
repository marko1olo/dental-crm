import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { appointments } from "../../../../db/schema.js";
import { inClinicZone, postgresKnowsTimeZone } from "../timezone.js";

const dialect = new PgDialect();

describe("Manager Reports Timezone SQL Safety (No Raw Interpolation)", () => {
	test("inClinicZone emits AT TIME ZONE literal for allowlisted IANA zones with zero extra bind params", () => {
		for (const zone of ["Asia/Kamchatka", "Europe/Samara", "Europe/Moscow", "UTC"]) {
			const expr = inClinicZone(appointments.startsAt, zone);
			const compiled = dialect.sqlToQuery(expr);
			assert.ok(
				compiled.sql.includes(`AT TIME ZONE '${zone}'`),
				`Expected AT TIME ZONE '${zone}' in SQL: ${compiled.sql}`,
			);
			assert.equal(compiled.params.length, 0);
		}
	});

	test("inClinicZone blocks SQL injection payloads and unknown timezones by falling back to raw column", () => {
		const maliciousInputs = [
			"Europe/Moscow'); DROP TABLE patients; --",
			"UTC' OR '1'='1",
			"Europe/Nowhereland",
			"",
			null,
		];

		for (const badZone of maliciousInputs) {
			const expr = inClinicZone(appointments.startsAt, badZone);
			const compiled = dialect.sqlToQuery(expr);
			assert.equal(
				compiled.sql.includes("AT TIME ZONE"),
				false,
				`Untrusted zone ${String(badZone)} must never reach AT TIME ZONE: ${compiled.sql}`,
			);
			assert.equal(compiled.sql.includes("DROP TABLE"), false);
			assert.equal(compiled.params.length, 0);
		}
	});

	test("postgresKnowsTimeZone rejects non-allowlisted or injection inputs immediately", async () => {
		assert.equal(await postgresKnowsTimeZone(null), null);
		assert.equal(await postgresKnowsTimeZone(undefined), null);
		assert.equal(await postgresKnowsTimeZone("Europe/Moscow'; DROP TABLE patients; --"), null);
		assert.equal(await postgresKnowsTimeZone("Europe/Nowhereland"), null);
	});
});
