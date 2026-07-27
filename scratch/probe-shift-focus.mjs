/**
 * Читает живой /api/dashboard и печатает всё, из чего строится экран «Смена»:
 * блок «Фокус», очереди ролей, активный визит и приёмы на сегодня.
 *
 * Нужен, чтобы не сочинять дефект по скриншоту: перед тем как называть
 * что-то ложью интерфейса, надо увидеть фактические данные.
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

const headers = {
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};
const dash = await req("/api/dashboard", { headers }).then((r) => r.json());

console.log("=== todayIso:", dash.todayIso);
console.log("=== appointments:", (dash.appointments ?? []).length);
for (const a of dash.appointments ?? []) {
	console.log("   ", a.id, a.startsAt, a.status, a.doctorUserId);
}
console.log("=== visits:", (dash.visits ?? []).length);
console.log("=== activeVisit:", JSON.stringify(dash.activeVisit ?? null, null, 1).slice(0, 700));
console.log("=== patients:", (dash.patients ?? []).length);
console.log("=== chairs:", (dash.chairs ?? []).length, "doctors:", (dash.doctors ?? []).length);

const si = dash.shiftIntelligence ?? {};
console.log("=== shiftIntelligence keys:", Object.keys(si).join(", "));
console.log("=== roleQueues:");
for (const q of si.roleQueues ?? []) {
	console.log(JSON.stringify(q, null, 1));
}
console.log("=== modeFit:", JSON.stringify(si.modeFit ?? null, null, 1));
console.log("=== rolePolicies:");
for (const p of si.rolePolicies ?? dash.rolePolicies ?? []) {
	console.log(JSON.stringify(p, null, 1));
}
console.log("=== staff:");
for (const s of dash.staff ?? []) console.log("   ", s.id, s.role, s.fullName);
