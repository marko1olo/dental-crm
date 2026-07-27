/** Есть ли активный приём и чей он — от этого зависит вся лента снимков. */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const login = await fetch(`${API}/api/auth/clinic/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }) }).then(r => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, { method: "POST", headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken }, body: JSON.stringify({ userId: OWNER, pinCode: "0000" }) }).then(r => r.json());
const H = { "x-dente-clinic-token": login.clinicToken, "x-dente-staff-token": unlock.staffToken };
const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then(r => r.json());
console.log("activeVisit есть:", !!dash.activeVisit);
console.log("activeVisit:", JSON.stringify(dash.activeVisit)?.slice(0, 200) ?? "null");
console.log("activeVisit.patientId:", dash.activeVisit?.patientId ?? "нет");
console.log("пациентов в дашборде:", (dash.patients || []).length, "| первый:", dash.patients?.[0]?.id, dash.patients?.[0]?.fullName);
console.log("снимков в дашборде:", (dash.imagingStudies || []).length);
for (const s of (dash.imagingStudies || []).slice(0,3)) console.log(`   ${s.title} | пациент ${s.patientId}`);
console.log("визитов:", (dash.visits || []).length);
for (const v of (dash.visits || []).slice(0,3)) console.log(`   визит ${v.id} | пациент ${v.patientId} | статус ${v.status}`);
