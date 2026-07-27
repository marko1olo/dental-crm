/**
 * Печатает состав персонала и режим клиники из живого /api/dashboard.
 * Нужен, чтобы правила видимости на «Смене» строились на реальных полях.
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

console.log("=== clinicSettings.profile ===");
console.log(JSON.stringify(dash.clinicSettings?.profile ?? null, null, 1).slice(0, 1200));
console.log("=== clinicSettings.staff ===", (dash.clinicSettings?.staff ?? []).length);
for (const s of dash.clinicSettings?.staff ?? []) {
	console.log(`  ${s.role.padEnd(14)} active:${String(s.active).padEnd(5)} ${s.fullName} | sign:${s.canSignMedicalRecords}`);
}
console.log("=== clinicSettings.chairs ===", (dash.clinicSettings?.chairs ?? []).length);
for (const c of dash.clinicSettings?.chairs ?? []) console.log("  ", c.id, c.name, "active:", c.active);
console.log("=== modeFit.mode ===", dash.shiftIntelligence?.modeFit?.mode);
console.log("=== workspaceProfiles ===");
for (const w of dash.clinicSettings?.workspaceProfiles ?? []) console.log(" ", JSON.stringify(w).slice(0, 240));
