import assert from "node:assert";

const BASE = "http://127.0.0.1:4100";
const VALID_ORG = "00000000-0000-0000-0000-000000000001";

async function check(label, url, orgId, expectedStatus) {
	const headers = { "x-dente-admin-secret": "dev-secret" };
	if (orgId !== undefined) headers["x-organization-id"] = orgId;
	const res = await fetch(url, { headers });
	if (res.status !== expectedStatus) {
		throw new Error(`${label}: expected ${expectedStatus} got ${res.status}`);
	}
	console.log(`  ✅ ${label} -> ${res.status}`);
}

async function run() {
	console.log("=== Wave 7 Edge-Case & Smoke Suite ===\n");

	// #31 Non-dental examination forms
	console.log("[1/5] non-dental-examination-forms");
	await check("200 valid org",   `${BASE}/api/clinical/non-dental-examination-forms`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/clinical/non-dental-examination-forms`, "",         400);

	// #34 Treatment plan stages
	console.log("[2/5] treatment-plan-stages");
	await check("200 valid org",   `${BASE}/api/documents/treatment-plan-stages`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/documents/treatment-plan-stages`, "",         400);

	// #37 Schedule time reservations
	console.log("[3/5] schedule/time-reservations");
	await check("200 valid org",   `${BASE}/api/schedule/time-reservations`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/schedule/time-reservations`, "",         400);

	// #39 Diagnocat AI findings
	console.log("[4/5] diagnocat-findings");
	await check("200 valid org",   `${BASE}/api/integrations/diagnocat-findings`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/integrations/diagnocat-findings`, "",         400);

	// #40 Extended odontogram states
	console.log("[5/5] extended-odontogram-states");
	await check("200 valid org",   `${BASE}/api/clinical/extended-odontogram-states`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/clinical/extended-odontogram-states`, "",         400);

	console.log("\n✅ WAVE 7 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 7 SUITE FAILED:", err.message);
	process.exit(1);
});
