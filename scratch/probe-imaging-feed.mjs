/** Откуда лента снимков берёт данные и виден ли в ней заведённый снимок. */
import { readFileSync } from "node:fs";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const login = await fetch(`${API}/api/auth/clinic/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }) }).then(r => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, { method: "POST", headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken }, body: JSON.stringify({ userId: OWNER, pinCode: "0000" }) }).then(r => r.json());
const H = { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken, "x-dente-staff-token": unlock.staffToken };
const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then(r => r.json());
console.log("ключи дашборда, связанные со снимками:", Object.keys(dash).filter(k => /imag/i.test(k)));
console.log("imagingStudies в дашборде:", (dash.imagingStudies || []).length);
for (const s of (dash.imagingStudies || []).slice(0, 5)) console.log(`   ${s.id} | ${s.title} | пациент ${s.patientId} | вид ${s.kind}`);
const list = await fetch(`${API}/api/imaging/studies`, { headers: H });
const body = await list.json().catch(() => ({}));
const arr = Array.isArray(body) ? body : body.studies || [];
console.log(`\nGET /api/imaging/studies: HTTP ${list.status}, записей ${arr.length}`);
for (const s of arr.slice(0, 5)) console.log(`   ${s.id} | ${s.title} | пациент ${s.patientId}`);
console.log(`\nпервый пациент дашборда: ${dash.patients?.[0]?.id} (${dash.patients?.[0]?.fullName})`);
