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
	console.log("=== Wave 8 Edge-Case & Smoke Suite ===\n");

	// #48 Schedule clipboard items
	console.log("[1/5] schedule/clipboard-items");
	await check("200 valid org",   `${BASE}/api/schedule/clipboard-items`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/schedule/clipboard-items`, "",         400);

	// #54 Rebooking conversion rules
	console.log("[2/5] hr/rebooking-conversion-rules");
	await check("200 valid org",   `${BASE}/api/hr/rebooking-conversion-rules`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/hr/rebooking-conversion-rules`, "",         400);

	// #57 Single session enforcements
	console.log("[3/5] system/single-session-enforcements");
	await check("200 valid org",   `${BASE}/api/system/single-session-enforcements`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/system/single-session-enforcements`, "",         400);

	// #60 DaData addresses
	console.log("[4/5] integrations/dadata-addresses");
	await check("200 valid org",   `${BASE}/api/integrations/dadata-addresses`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/integrations/dadata-addresses`, "",         400);

	// #62 Pricelist payrolls
	console.log("[5/5] finance/pricelist-payrolls");
	await check("200 valid org",   `${BASE}/api/finance/pricelist-payrolls`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/finance/pricelist-payrolls`, "",         400);

	console.log("\n✅ WAVE 8 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 8 SUITE FAILED:", err.message);
	process.exit(1);
});
