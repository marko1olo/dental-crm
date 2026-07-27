/**
 * Проверяет, что врач может работать в программе, а ограничение на
 * мессенджеры при этом сохраняется.
 *
 * Дефект: registerMaxRoutes и registerWhatsappRoutes вызывались напрямую с
 * корневым экземпляром Fastify, а внутри навешивают
 * app.addHook("preHandler", ...) с проверкой requireNonDoctorAccess. Хук
 * попадал в корневую область и срабатывал на каждом запросе всего API.
 * Врач, разблокировавший смену своим PIN, получал 403 на всё, включая
 * /api/health.
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

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

const clinic = await req("/api/auth/clinic/login", {
	method: "POST", headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const dash = await req("/api/dashboard", { headers: { "x-dente-clinic-token": clinic.clinicToken } }).then((r) => r.json());
const staff = dash?.clinicSettings?.staff || [];
const patientId = dash?.patients?.[0]?.id;

async function tokenFor(member) {
	for (const pinCode of ["0000", "1234"]) {
		const r = await req("/api/auth/staff/unlock", {
			method: "POST", headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinic.clinicToken },
			body: JSON.stringify({ userId: member.id, pinCode }),
		});
		if (r.ok) return (await r.json()).staffToken;
	}
	return null;
}

const doctor = staff.find((s) => s.role === "doctor");
const owner = staff.find((s) => s.role === "owner");
const doctorToken = await tokenFor(doctor);
const ownerToken = await tokenFor(owner);
console.log(`врач ${doctor.fullName}: вход ${doctorToken ? "успешен" : "не удался"}`);
console.log(`владелец ${owner.fullName}: вход ${ownerToken ? "успешен" : "не удался"}\n`);

const headersFor = (token) => ({
	"Content-Type": "application/json",
	"x-dente-clinic-token": clinic.clinicToken,
	"x-dente-staff-token": token,
});

console.log("1. Врач работает с клинической частью");
for (const path of ["/api/health", "/api/dashboard", "/api/patients", `/api/patients/${patientId}/tooth-states`]) {
	const res = await req(path, { headers: headersFor(doctorToken) });
	check(`врач: ${path}`, res.status === 200, `HTTP ${res.status}`);
}
const write = await req(`/api/patients/${patientId}/tooth-states/batch`, {
	method: "POST",
	headers: headersFor(doctorToken),
	body: JSON.stringify({ toothNumbers: [18], state: "Healthy" }),
});
check("врач может править зубную формулу", write.status === 200, `HTTP ${write.status}`);

console.log("\n2. Ограничение на мессенджеры для врача сохраняется");
for (const path of ["/api/max/settings", "/api/whatsapp/settings"]) {
	const res = await req(path, { headers: headersFor(doctorToken) });
	check(`врач не допущен к ${path}`, res.status === 403, `HTTP ${res.status}`);
}

console.log("\n3. Контроль: владелец не потерял доступ");
for (const path of ["/api/patients", "/api/max/settings"]) {
	const res = await req(path, { headers: headersFor(ownerToken) });
	/* Проверяем именно отсутствие блокировки по роли, а не двухсотый код.
	   /api/max/settings у владельца отвечает 404 «MAX-бот не настроен для
	   этой организации» — это ответ самого обработчика: в демо-данных бота
	   нет. Требовать здесь 200 было бы проверкой наличия настроек, а не
	   доступа. */
	check(`владелец не заблокирован по роли: ${path}`, res.status !== 403, `HTTP ${res.status}`);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
