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
	console.log("=== Wave 10 Edge-Case & Smoke Suite ===\n");

	// #52 Treatment plan lock tokens
	console.log("[1/5] documents/treatment-plan-lock-tokens");
	await check("200 valid org",   `${BASE}/api/documents/treatment-plan-lock-tokens`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/documents/treatment-plan-lock-tokens`, "",         400);

	// #53 Digital receipt dispatches
	console.log("[2/5] finance/digital-receipt-dispatches");
	await check("200 valid org",   `${BASE}/api/finance/digital-receipt-dispatches`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/finance/digital-receipt-dispatches`, "",         400);

	// #55 Patient service lineages
	console.log("[3/5] crm/patient-service-lineages");
	await check("200 valid org",   `${BASE}/api/crm/patient-service-lineages`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/crm/patient-service-lineages`, "",         400);

	// #61 Landing field mappings
	console.log("[4/5] integrations/landing-field-mappings");
	await check("200 valid org",   `${BASE}/api/integrations/landing-field-mappings`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/integrations/landing-field-mappings`, "",         400);

	// #63 KKM item quantity units
	console.log("[5/5] finance/kkm-item-quantity-units");
	await check("200 valid org",   `${BASE}/api/finance/kkm-item-quantity-units`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/finance/kkm-item-quantity-units`, "",         400);

	console.log("\n✅ WAVE 10 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 10 SUITE FAILED:", err.message);
	process.exit(1);
});
