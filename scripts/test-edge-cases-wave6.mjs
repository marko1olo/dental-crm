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
	console.log("=== Wave 6 Edge-Case & Smoke Suite ===\n");

	// #17 ProDoctorov sync
	console.log("[1/5] prodoctorov-sync");
	await check("200 valid org",       `${BASE}/api/integrations/prodoctorov-sync`, VALID_ORG, 200);
	await check("400 empty orgId",     `${BASE}/api/integrations/prodoctorov-sync`, "",         400);

	// #19 Custom examination form catalogs
	console.log("[2/5] custom-examination-form-catalogs");
	await check("200 valid org",       `${BASE}/api/clinical/custom-examination-form-catalogs`, VALID_ORG, 200);
	await check("400 empty orgId",     `${BASE}/api/clinical/custom-examination-form-catalogs`, "",         400);

	// #22 Treatment plan print odontogram
	console.log("[3/5] treatment-plan-print-odontogram");
	await check("200 valid org",       `${BASE}/api/documents/treatment-plan-print-odontogram`, VALID_ORG, 200);
	await check("400 empty orgId",     `${BASE}/api/documents/treatment-plan-print-odontogram`, "",         400);

	// #30 EGISZ multiple diagnoses
	console.log("[4/5] egisz/multiple-diagnoses");
	await check("200 valid org",       `${BASE}/api/egisz/multiple-diagnoses`, VALID_ORG, 200);
	await check("400 empty orgId",     `${BASE}/api/egisz/multiple-diagnoses`, "",         400);

	// #32 MKB-10 auto directories
	console.log("[5/5] mkb10-auto-directories");
	await check("200 valid org",       `${BASE}/api/integrations/mkb10-auto-directories`, VALID_ORG, 200);
	await check("400 empty orgId",     `${BASE}/api/integrations/mkb10-auto-directories`, "",         400);

	console.log("\n✅ WAVE 6 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 6 SUITE FAILED:", err.message);
	process.exit(1);
});
