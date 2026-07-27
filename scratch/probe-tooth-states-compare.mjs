/**
 * Сравнивает состояния зубов двух пациентов прямо через API, без
 * браузера. Нужно, чтобы отличить «на карточке Б висят диагнозы А» от
 * «у Б действительно есть свои диагнозы».
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const login = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());
const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const raw = await fetch(`${API}/api/patients`, { headers: H }).then((r) => r.json());
const list = Array.isArray(raw) ? raw : raw?.patients || [];

for (const p of list.slice(0, 3)) {
	const res = await fetch(`${API}/api/patients/${p.id}/tooth-states`, { headers: H });
	const data = await res.json().catch(() => null);
	const states = Array.isArray(data?.states) ? data.states : [];
	const nonHealthy = states.filter((s) => s.state && !/healthy/i.test(String(s.state)));
	console.log(`\n${p.fullName}  (HTTP ${res.status}, success=${data?.success})`);
	console.log(`  записей всего: ${states.length}`);
	console.log(`  с диагнозом:   ${nonHealthy.length} -> ${nonHealthy.map((s) => `${s.toothNumber}:${s.state}`).join(", ") || "нет"}`);
	console.log(`  здоровых:      ${states.length - nonHealthy.length}`);
}
