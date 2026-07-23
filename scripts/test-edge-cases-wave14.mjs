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
	console.log("=== Wave 14 Edge-Case & Smoke Suite ===\n");

	// #1 UIS SMS chat quotas
	console.log("[1/5] communications/uis-sms-chat-quotas");
	await check("200 valid org",   `${BASE}/api/communications/uis-sms-chat-quotas`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/uis-sms-chat-quotas`, "",         400);

	// #2 UIS mass appointment confirmations
	console.log("[2/5] communications/uis-mass-appointment-confirmations");
	await check("200 valid org",   `${BASE}/api/communications/uis-mass-appointment-confirmations`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/uis-mass-appointment-confirmations`, "",         400);

	// #3 Message template catalogs
	console.log("[3/5] communications/message-template-catalogs");
	await check("200 valid org",   `${BASE}/api/communications/message-template-catalogs`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/message-template-catalogs`, "",         400);

	// #5 NDFL tax calculators
	console.log("[4/5] documents/ndfl-tax-calculators");
	await check("200 valid org",   `${BASE}/api/documents/ndfl-tax-calculators`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/documents/ndfl-tax-calculators`, "",         400);

	// #11 Messenger file attachments
	console.log("[5/5] communications/messenger-file-attachments");
	await check("200 valid org",   `${BASE}/api/communications/messenger-file-attachments`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/messenger-file-attachments`, "",         400);

	console.log("\n✅ WAVE 14 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 14 SUITE FAILED:", err.message);
	process.exit(1);
});
