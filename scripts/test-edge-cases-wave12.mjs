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
	console.log("=== Wave 12 Edge-Case & Smoke Suite ===\n");

	// #6 Lost patients filters
	console.log("[1/5] analytics/lost-patients-filters");
	await check("200 valid org",   `${BASE}/api/analytics/lost-patients-filters`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/analytics/lost-patients-filters`, "",         400);

	// #9 Quick appointment confirmations
	console.log("[2/5] communications/quick-appointment-confirmations");
	await check("200 valid org",   `${BASE}/api/communications/quick-appointment-confirmations`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/quick-appointment-confirmations`, "",         400);

	// #21 Urgent schedule requests
	console.log("[3/5] schedule/urgent-schedule-requests");
	await check("200 valid org",   `${BASE}/api/schedule/urgent-schedule-requests`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/schedule/urgent-schedule-requests`, "",         400);

	// #23 Confirmation performance reports
	console.log("[4/5] analytics/confirmation-performance-reports");
	await check("200 valid org",   `${BASE}/api/analytics/confirmation-performance-reports`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/analytics/confirmation-performance-reports`, "",         400);

	// #43 Alternative treatment plans
	console.log("[5/5] documents/alternative-treatment-plans");
	await check("200 valid org",   `${BASE}/api/documents/alternative-treatment-plans`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/documents/alternative-treatment-plans`, "",         400);

	console.log("\n✅ WAVE 12 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 12 SUITE FAILED:", err.message);
	process.exit(1);
});
