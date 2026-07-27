/**
 * Где именно доктор получает 403. Проверяем несколько маршрутов одним и
 * тем же токеном, чтобы отличить общий барьер от охраны конкретного
 * маршрута.
 *
 * Сервер разработки в этот момент постоянно перезапускается (правки другого
 * агента), поэтому каждый запрос делается с повторами.
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";

async function req(path, init = {}, attempts = 12) {
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

const clinic = await req("/api/auth/clinic/login", {
	method: "POST", headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const dash = await req("/api/dashboard", { headers: { "x-dente-clinic-token": clinic.clinicToken } }).then((r) => r.json());
const doctor = (dash?.clinicSettings?.staff || []).find((s) => s.role === "doctor");
let staffToken = null;
for (const pinCode of ["0000", "1234"]) {
	const r = await req("/api/auth/staff/unlock", {
		method: "POST", headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinic.clinicToken },
		body: JSON.stringify({ userId: doctor.id, pinCode }),
	});
	if (r.ok) { staffToken = (await r.json()).staffToken; break; }
}
console.log(`доктор ${doctor.fullName}, вход ${staffToken ? "успешен" : "не удался"}\n`);

const H = { "Content-Type": "application/json", "x-dente-clinic-token": clinic.clinicToken, "x-dente-staff-token": staffToken };
const patientId = dash.patients[0].id;
const ROUTES = ["/api/health", "/api/dashboard", "/api/patients", `/api/patients/${patientId}/tooth-states`, "/api/settings/clinic"];
console.log("--- с токеном доктора ---");
for (const path of ROUTES) {
	const res = await req(path, { headers: H });
	const body = await res.text();
	console.log(`  ${String(res.status).padEnd(4)} ${path}`);
	if (res.status >= 400) console.log(`       ${body.slice(0, 100).replace(/\s+/g, " ")}`);
}

console.log("\n--- те же маршруты БЕЗ токена сотрудника ---");
const H2 = { "Content-Type": "application/json", "x-dente-clinic-token": clinic.clinicToken };
for (const path of ["/api/patients", `/api/patients/${patientId}/tooth-states`]) {
	const res = await req(path, { headers: H2 });
	console.log(`  ${String(res.status).padEnd(4)} ${path}`);
}
