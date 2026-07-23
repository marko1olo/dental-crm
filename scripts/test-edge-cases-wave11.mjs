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
	console.log("=== Wave 11 Edge-Case & Smoke Suite ===\n");

	// #59 UIS Omni Messenger Queues
	console.log("[1/1] communications/uis-omni-messenger-queues");
	await check("200 valid org",   `${BASE}/api/communications/uis-omni-messenger-queues`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/uis-omni-messenger-queues`, "",         400);

	console.log("\n✅ WAVE 11 EDGE-CASE SUITE: ALL CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 11 SUITE FAILED:", err.message);
	process.exit(1);
});
