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
	console.log("=== Wave 15 Edge-Case & Smoke Suite ===\n");

	// #4 Patient communication timelines
	console.log("[1/5] crm/patient-communication-timelines");
	await check("200 valid org",   `${BASE}/api/crm/patient-communication-timelines`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/crm/patient-communication-timelines`, "",         400);

	// #8 EGISZ blank permissions
	console.log("[2/5] integrations/egisz-blank-permissions");
	await check("200 valid org",   `${BASE}/api/integrations/egisz-blank-permissions`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/integrations/egisz-blank-permissions`, "",         400);

	// #10 Previous chat dialog histories
	console.log("[3/5] communications/previous-chat-dialog-histories");
	await check("200 valid org",   `${BASE}/api/communications/previous-chat-dialog-histories`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/previous-chat-dialog-histories`, "",         400);

	// #12 Collaborative chat processing states
	console.log("[4/5] communications/collaborative-chat-processing-states");
	await check("200 valid org",   `${BASE}/api/communications/collaborative-chat-processing-states`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/collaborative-chat-processing-states`, "",         400);

	// #14 Chat message dispatch statuses
	console.log("[5/5] communications/chat-message-dispatch-statuses");
	await check("200 valid org",   `${BASE}/api/communications/chat-message-dispatch-statuses`, VALID_ORG, 200);
	await check("400 empty orgId", `${BASE}/api/communications/chat-message-dispatch-statuses`, "",         400);

	console.log("\n✅ WAVE 15 EDGE-CASE SUITE: ALL 10 CHECKS PASSED\n");
}

run().catch((err) => {
	console.error("\n❌ WAVE 15 SUITE FAILED:", err.message);
	process.exit(1);
});
