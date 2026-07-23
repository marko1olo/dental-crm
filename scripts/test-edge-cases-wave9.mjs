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
	console.log("=== Wave 9 Edge-Case & Smoke Suite ===\n");

	// #46 Recent patient history
	console.log("[1/5] hr/recent-patients");
	await check("200 valid org",   `${BASE}/api/hr/recent-patients`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/hr/recent-patients`, "",         400);

	// #47 Custom CRM task types
	console.log("[2/5] crm/custom-task-types");
	await check("200 valid org",   `${BASE}/api/crm/custom-task-types`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/crm/custom-task-types`, "",         400);

	// #50 CRM email dispatch logs
	console.log("[3/5] communications/email-dispatch-logs");
	await check("200 valid org",   `${BASE}/api/communications/email-dispatch-logs`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/email-dispatch-logs`, "",         400);

	// #56 Two-level cancellation reasons
	console.log("[4/5] schedule/cancellation-reasons-two-level");
	await check("200 valid org",   `${BASE}/api/schedule/cancellation-reasons-two-level`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/schedule/cancellation-reasons-two-level`, "",         400);

	// #58 Advance deposit taggings
	console.log("[5/5] finance/advance-deposit-taggings");
	await check("200 valid org",   `${BASE}/api/finance/advance-deposit-taggings`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/finance/advance-deposit-taggings`, "",         400);

	console.log("\n✅ WAVE 9 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 9 SUITE FAILED:", err.message);
	process.exit(1);
});
