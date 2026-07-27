/**
 * Кто может читать и править зубную формулу.
 *
 * scratch/verify-odontogram-e2e.mjs получает 403 «Доктора не могут
 * выполнять это действие» при сохранении состояния зуба. В стоматологии
 * формулу заполняет именно врач, поэтому нужно точно понять, кому что
 * разрешено, прежде чем что-то менять.
 *
 * Скрипт логинится каждой ролью из демо-данных и печатает коды ответов на
 * чтение и запись формулы.
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";

const clinic = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());

const dash = await fetch(`${API}/api/dashboard`, {
	headers: { "x-dente-clinic-token": clinic.clinicToken },
}).then((r) => r.json());

const staff = dash?.clinicSettings?.staff || [];
const patient = dash?.patients?.[0];
if (!patient) {
	console.error("нет пациентов");
	process.exit(1);
}
console.log(`пациент ${patient.fullName}\n`);
console.log(`сотрудники в демо-данных: ${staff.map((s) => `${s.fullName} (${s.role})`).join(", ")}\n`);

async function tryAs(member) {
	// PIN у ролей в демо-данных разный, поэтому пробуем оба штатных.
	let unlockBody = {};
	let unlockStatus = 0;
	for (const pinCode of ["0000", "1234"]) {
		const attempt = await fetch(`${API}/api/auth/staff/unlock`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinic.clinicToken },
			body: JSON.stringify({ userId: member.id, pinCode }),
		});
		unlockStatus = attempt.status;
		unlockBody = await attempt.json().catch(() => ({}));
		if (attempt.ok && unlockBody.staffToken) break;
	}
	if (!unlockBody.staffToken) {
		return { unlock: `HTTP ${unlockStatus}`, read: "-", write: "-", writeMessage: String(unlockBody?.message || unlockBody?.error || "").slice(0, 60) };
	}
	const H = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": clinic.clinicToken,
		"x-dente-staff-token": unlockBody.staffToken,
	};
	const read = await fetch(`${API}/api/patients/${patient.id}/tooth-states`, { headers: H });
	const readBody = await read.json().catch(() => ({}));
	const write = await fetch(`${API}/api/patients/${patient.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: [18], state: "Healthy" }),
	});
	const writeBody = await write.json().catch(() => ({}));
	// Ещё один маршрут для сравнения: список пациентов доктору нужен тоже.
	const patients = await fetch(`${API}/api/patients`, { headers: H });
	return {
		unlock: "ок",
		read: `HTTP ${read.status}`,
		readMessage: read.ok ? "" : String(readBody?.message || readBody?.error || "").slice(0, 70),
		write: `HTTP ${write.status}`,
		writeMessage: write.ok ? "" : String(writeBody?.message || writeBody?.error || "").slice(0, 70),
		patients: `HTTP ${patients.status}`,
	};
}

for (const member of staff) {
	const r = await tryAs(member);
	console.log(`${member.role.padEnd(10)} ${member.fullName}`);
	console.log(`   вход: ${r.unlock}   чтение формулы: ${r.read}   запись формулы: ${r.write}   список пациентов: ${r.patients ?? "-"}`);
	if (r.readMessage) console.log(`   ответ на чтение: ${r.readMessage}`);
	if (r.writeMessage) console.log(`   ответ на запись: ${r.writeMessage}`);
}
