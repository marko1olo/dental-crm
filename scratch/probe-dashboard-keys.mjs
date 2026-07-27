/**
 * Печатает верхнеуровневые ключи /api/dashboard, состав персонала, режим
 * клиники и ролевые политики. Нужен, чтобы строить экран на существующих
 * полях, а не на выдуманных.
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

async function req(path, init = {}, attempts = 14) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 2500));
		}
	}
	throw last;
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const dash = await req("/api/dashboard", {
	headers: {
		"x-dente-clinic-token": login.clinicToken,
		"x-dente-staff-token": unlock.staffToken,
	},
}).then((r) => r.json());

console.log("=== top-level keys ===");
for (const key of Object.keys(dash).sort()) {
	const value = dash[key];
	const kind = Array.isArray(value) ? `array[${value.length}]` : value === null ? "null" : typeof value;
	console.log(`  ${key}: ${kind}`);
}
console.log("=== staffMembers ===");
for (const s of dash.staffMembers ?? []) console.log("  ", s.id, s.role, s.fullName, "active:", s.active);
console.log("=== clinicProfile ===", JSON.stringify(dash.clinicProfile ?? null).slice(0, 400));
console.log("=== clinicSettings keys ===", Object.keys(dash.clinicSettings ?? {}).join(", "));
console.log("=== roleAccessPolicies ===");
for (const p of dash.clinicSettings?.roleAccessPolicies ?? []) console.log(" ", JSON.stringify(p));
console.log("=== recommendedActions ===");
for (const a of dash.recommendedActions ?? []) console.log(" ", JSON.stringify(a).slice(0, 300));
console.log("=== scheduleWarnings ===");
for (const w of dash.shiftIntelligence?.scheduleWarnings ?? []) console.log(" ", JSON.stringify(w).slice(0, 300));
console.log("=== imagingStudies ===", (dash.imagingStudies ?? []).length,
	JSON.stringify((dash.imagingStudies ?? []).map((s) => s.status)));
console.log("=== documents ===", (dash.documents ?? []).length,
	JSON.stringify((dash.documents ?? []).map((d) => d.status)));
console.log("=== importBatches ===", (dash.importBatches ?? []).length,
	JSON.stringify((dash.importBatches ?? []).map((b) => b.status)));
