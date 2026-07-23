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
	console.log("=== Wave 13 Edge-Case & Smoke Suite ===\n");

	// #15 Appointment channel inheritances
	console.log("[1/5] communications/appointment-channel-inheritances");
	await check("200 valid org",   `${BASE}/api/communications/appointment-channel-inheritances`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/appointment-channel-inheritances`, "",         400);

	// #18 External schedule action logs
	console.log("[2/5] schedule/external-schedule-action-logs");
	await check("200 valid org",   `${BASE}/api/schedule/external-schedule-action-logs`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/schedule/external-schedule-action-logs`, "",         400);

	// #36 Patient duplicate merge queues
	console.log("[3/5] crm/patient-duplicate-merge-queues");
	await check("200 valid org",   `${BASE}/api/crm/patient-duplicate-merge-queues`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/crm/patient-duplicate-merge-queues`, "",         400);

	// #42 Yandex calendar syncs
	console.log("[4/5] integrations/yandex-calendar-syncs");
	await check("200 valid org",   `${BASE}/api/integrations/yandex-calendar-syncs`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/integrations/yandex-calendar-syncs`, "",         400);

	// #44 System RAM watchdogs
	console.log("[5/5] system/ram-watchdogs");
	await check("200 valid org",   `${BASE}/api/system/ram-watchdogs`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/system/ram-watchdogs`, "",         400);

	console.log("\n✅ WAVE 13 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 13 SUITE FAILED:", err.message);
	process.exit(1);
});
