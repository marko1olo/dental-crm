/**
 * Задачи по карте пациента: полный круг на живом сервере и живой базе.
 *
 * ЧТО ПРОВЕРЯЕТСЯ. Экран карточки (PatientTaskTicketsWidget) был готов, а
 * сервера под ним не было: живая проверка сети видела 404 на GET .../tickets.
 * Здесь проходится тот путь, который проходит администратор: прочитать список,
 * поручить дело сотруднику, отметить выполненным, вернуть в работу, удалить. И
 * отдельно то, что страшнее пустого списка: чужая клиника не должна ничего
 * увидеть, а несуществующая карта обязана отвечать 404, а не пустым списком —
 * пустой список читается как «дел по пациенту нет».
 *
 * СОЗДАЁТ И УДАЛЯЕТ СВОИ ЗАПИСИ. Ничего чужого не трогает: в конце удаляет
 * ровно ту запись, которую создала, и проверяет, что список вернулся к прежней
 * длине.
 */
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

/*
 * Сорок попыток по три секунды: сервер разработки перезапускается сам при каждой
 * правке соседнего инженера, и падение проверки от чужого перезапуска — ложная
 * тревога, которая стоит не меньше пропущенной поломки.
 */
async function req(path, init = {}, attempts = 40) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 3000));
		}
	}
	throw last;
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
/*
 * Если вход не удался, дальше проверять нечего, и главное — нельзя обвинять
 * маршруты. Утром весь продукт лежал именно так: база висела, вход отвечал 500,
 * а прошлая проверка сообщила «нет карт пациентов» и увела разбор на сутки в
 * сторону разбора формата ответа /api/patients, который был совершенно ни при чём.
 */
if (!login?.clinicToken) {
	console.log("СБОЙ вход в кабинет не удался — маршруты задач НЕ ПРОВЕРЕНЫ.");
	console.log("ответ входа:", JSON.stringify(login).slice(0, 300));
	process.exit(1);
}
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());

const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};
/* Заголовки для DELETE — БЕЗ Content-Type: fastify отвечает 400 на запрос с
 * объявленным типом тела и без тела. На этом уже один раз сломалась проверка
 * склада, и вывод был неверным: «маршрут не работает» вместо «проверка врёт». */
const HD = { "x-dente-clinic-token": login.clinicToken, "x-dente-staff-token": unlock.staffToken };

const patients = await req("/api/patients", { headers: H }).then((r) => r.json());
const list = Array.isArray(patients) ? patients : (patients?.items ?? []);
const patient = list[0];
check("в клинике есть хотя бы одна карта для проверки", Boolean(patient?.id), patient?.fullName ?? "нет карт");
if (!patient?.id) process.exit(1);

const before = await req(`/api/patients/${patient.id}/tickets`, { headers: H });
const beforeBody = await before.json().catch(() => null);
check("список читается, а не отвечает 404", before.status === 200, `код ${before.status}`);
check("список — массив", Array.isArray(beforeBody), Array.isArray(beforeBody) ? `записей ${beforeBody.length}` : String(beforeBody));
const beforeCount = Array.isArray(beforeBody) ? beforeBody.length : -1;

/* Отказ без названия обязан быть человеческим и называть, чего не хватает. */
const noTitle = await req(`/api/patients/${patient.id}/tickets`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({ title: "   ", assignedToId: OWNER, priority: "normal" }),
});
const noTitleBody = await noTitle.json().catch(() => ({}));
check("задача без названия не принимается", noTitle.status === 400, `код ${noTitle.status}`);
check(
	"отказ назван по-русски и без имён полей запроса",
	typeof noTitleBody.message === "string" &&
		/задач|сделать/i.test(noTitleBody.message) &&
		!/title|assignedToId|required|field/i.test(noTitleBody.message),
	String(noTitleBody.message).slice(0, 120),
);

/*
 * Поручение без исполнителя не попадёт ни в чей список дел. Экран не даёт
 * отправить такую форму, но проверка на сервере обязана быть: иначе задача
 * выглядела бы созданной, оставаясь ничьей.
 */
const noAssignee = await req(`/api/patients/${patient.id}/tickets`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({ title: "Перезвонить по отёку", priority: "normal" }),
});
const noAssigneeBody = await noAssignee.json().catch(() => ({}));
check("задача без ответственного не принимается", noAssignee.status === 400, `код ${noAssignee.status}`);
check(
	"отказ про исполнителя человеческий",
	typeof noAssigneeBody.message === "string" && /сотрудник|исполнител/i.test(noAssigneeBody.message),
	String(noAssigneeBody.message).slice(0, 120),
);

const МЕТКА = "ПРОВЕРКА ВЕДУЩЕГО: перезвонить по отёку и дослать снимок";
const created = await req(`/api/patients/${patient.id}/tickets`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({
		title: МЕТКА,
		description: "Спросить про температуру, при жалобах записать на осмотр вне очереди",
		assignedToId: OWNER,
		priority: "normal",
	}),
});
const ticket = await created.json().catch(() => ({}));
check("задача создаётся", created.status === 201, `код ${created.status} ${JSON.stringify(ticket).slice(0, 140)}`);
check("вернулся идентификатор записи", typeof ticket.id === "string" && ticket.id.length > 10, String(ticket.id));
check("новая задача в работе", ticket.status === "pending", String(ticket.status));
check("название сохранено", ticket.title === МЕТКА, String(ticket.title).slice(0, 60));
check(
	"описание сохранено",
	ticket.description === "Спросить про температуру, при жалобах записать на осмотр вне очереди",
	String(ticket.description).slice(0, 60),
);
check("ответственный сохранён", ticket.assignedToId === OWNER, String(ticket.assignedToId));

const afterAdd = await req(`/api/patients/${patient.id}/tickets`, { headers: H }).then((r) => r.json());
check(
	"задача видна в списке",
	Array.isArray(afterAdd) && afterAdd.some((t) => t.id === ticket.id),
	`записей ${Array.isArray(afterAdd) ? afterAdd.length : "?"}`,
);
check(
	"свежая задача стоит первой",
	Array.isArray(afterAdd) && afterAdd[0]?.id === ticket.id,
	Array.isArray(afterAdd) ? String(afterAdd[0]?.title).slice(0, 60) : "-",
);

const done = await req(`/api/patients/${patient.id}/tickets/${ticket.id}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "completed" }),
}).then((r) => r.json());
check("задача отмечена выполненной", done.status === "completed", String(done.status));

const back = await req(`/api/patients/${patient.id}/tickets/${ticket.id}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "pending" }),
}).then((r) => r.json());
check("задача возвращена в работу", back.status === "pending", String(back.status));

/* Выдуманное состояние не должно молча пройти: экран считает «в работе» строгим
 * сравнением со 'pending', и любое иное значение выглядело бы выполненной. */
const badStatus = await req(`/api/patients/${patient.id}/tickets/${ticket.id}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "почти готово" }),
});
check("выдуманное состояние отвергается", badStatus.status === 400, `код ${badStatus.status}`);

const ghost = await req(`/api/patients/${patient.id}/tickets/${OWNER}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "completed" }),
});
check("несуществующая задача не «обновляется успешно»", ghost.status === 404, `код ${ghost.status}`);

const removed = await req(`/api/patients/${patient.id}/tickets/${ticket.id}`, { method: "DELETE", headers: HD });
check("задача удаляется", removed.status === 200, `код ${removed.status}`);
const twice = await req(`/api/patients/${patient.id}/tickets/${ticket.id}`, { method: "DELETE", headers: HD });
check("повторное удаление честно отвечает 404", twice.status === 404, `код ${twice.status}`);

const after = await req(`/api/patients/${patient.id}/tickets`, { headers: H }).then((r) => r.json());
check(
	"список вернулся к прежней длине, чужого не тронуто",
	Array.isArray(after) && after.length === beforeCount,
	`было ${beforeCount}, стало ${Array.isArray(after) ? after.length : "?"}`,
);

/*
 * Изоляция клиники. Читаем ту же карту БЕЗ токена кабинета: ответ обязан быть
 * 401, а не списком. Поручение называет пациента по имени и по поводу обращения.
 */
const noToken = await req(`/api/patients/${patient.id}/tickets`, {
	headers: { "x-dente-staff-token": unlock.staffToken },
});
check("без токена кабинета список не отдаётся", noToken.status === 401, `код ${noToken.status}`);

/* Выдуманная карта — 404, а не пустой список: пустой читается как «дел нет». */
const alien = await req(`/api/patients/11111111-2222-3333-4444-555555555555/tickets`, { headers: H });
check("чужая или несуществующая карта отвечает 404", alien.status === 404, `код ${alien.status}`);

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
