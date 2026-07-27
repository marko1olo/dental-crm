/**
 * Проверяет на ЖИВОМ сервере, что все восемь состояний зуба из меню
 * действительно сохраняются и читаются обратно. «Компилируется» не
 * означает «работает»: до правки два состояния из восьми нельзя было
 * выставить из интерфейса, хотя сервер их принимал.
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const STATES = [
  "Caries",
  "Pulpitis",
  "Filled",
  "Crown",
  "Implant",
  "Planned_Implant",
  "Missing",
  "Healthy",
];

async function j(path, init) {
  const r = await fetch(`${API}${path}`, init);
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: r.status, ok: r.ok, body };
}

const login = await j("/api/auth/clinic/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
if (!login.ok) { console.error("вход клиники не выполнен:", login.status, login.body); process.exit(1); }
const clinicToken = login.body.clinicToken;

const unlock = await j("/api/auth/staff/unlock", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinicToken },
  body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
});
if (!unlock.ok) { console.error("вход сотрудника не выполнен:", unlock.status, unlock.body); process.exit(1); }

const H = {
  "Content-Type": "application/json",
  "x-dente-clinic-token": clinicToken,
  "x-dente-staff-token": unlock.body.staffToken,
};

const patients = await j("/api/patients", { headers: H });
const list = Array.isArray(patients.body) ? patients.body : patients.body?.patients || [];
if (!list.length) { console.error("пациентов нет, проверять нечего:", patients.status, JSON.stringify(patients.body).slice(0, 200)); process.exit(1); }
const patientId = list[0].id;
console.log(`пациент: ${list[0].fullName} (${patientId})`);

const TOOTH = 46;
let pass = 0;
let fail = 0;

for (const state of STATES) {
  const put = await j(`/api/patients/${patientId}/tooth-states/batch`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ toothNumbers: [TOOTH], state }),
  });
  const get = await j(`/api/patients/${patientId}/tooth-states`, { headers: H });
  const teeth = get.body?.states || get.body?.teeth || get.body || [];
  const found = Array.isArray(teeth) ? teeth.find((t) => t.toothNumber === TOOTH) : null;
  const ok = put.ok && found?.state === state;
  if (ok) pass += 1; else fail += 1;
  console.log(
    `  ${state.padEnd(16)} PUT ${put.status}  прочитано: ${found?.state ?? "нет"}  ${ok ? "OK" : "СБОЙ " + JSON.stringify(put.body).slice(0, 120)}`,
  );
}

console.log(`\nсохранилось и прочиталось: ${pass} из ${STATES.length}, сбоев ${fail}`);
process.exit(fail ? 1 : 0);
