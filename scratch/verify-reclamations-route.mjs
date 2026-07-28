/**
 * Рекламации по карте пациента: полный круг на живом сервере и живой базе.
 *
 * ЧТО ПРОВЕРЯЕТСЯ. Экран карточки был готов (PatientReclamationsWidget, 588
 * строк), а сервера под ним не было: живая проверка сети видела 404. Здесь
 * проходится тот же путь, что руками проходит врач: прочитать журнал, записать
 * жалобу, урегулировать, вернуть в работу, удалить. И отдельно — то, что
 * страшнее пустого журнала: чужая клиника не должна ничего увидеть.
 *
 * СОЗДАЁТ И УДАЛЯЕТ СВОИ ЗАПИСИ. Ничего чужого не трогает: в конце удаляет
 * ровно ту запись, которую создала, и проверяет, что журнал вернулся к прежней
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

const before = await req(`/api/patients/${patient.id}/reclamations`, { headers: H });
const beforeBody = await before.json().catch(() => null);
check("журнал читается, а не отвечает 404", before.status === 200, `код ${before.status}`);
check("журнал — список", Array.isArray(beforeBody), Array.isArray(beforeBody) ? `записей ${beforeBody.length}` : String(beforeBody));
const beforeCount = Array.isArray(beforeBody) ? beforeBody.length : -1;

/* Отказ без сути жалобы обязан быть человеческим и называть, чего не хватает. */
const empty = await req(`/api/patients/${patient.id}/reclamations`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({ complicationDetails: "   ", doctorId: OWNER }),
});
const emptyBody = await empty.json().catch(() => ({}));
check("пустая жалоба не принимается", empty.status === 400, `код ${empty.status}`);
check(
	"отказ назван по-русски и без имён полей запроса",
	typeof emptyBody.message === "string" &&
		/жалоб|осложнен/i.test(emptyBody.message) &&
		!/complicationDetails|required|field/i.test(emptyBody.message),
	String(emptyBody.message).slice(0, 120),
);

const МЕТКА = "ПРОВЕРКА ВЕДУЩЕГО: скол винира через неделю после установки";
const created = await req(`/api/patients/${patient.id}/reclamations`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({
		complicationDetails: МЕТКА,
		proposedAction: "Переделка по гарантии за счёт клиники",
		doctorId: OWNER,
	}),
});
const rec = await created.json().catch(() => ({}));
check("жалоба фиксируется", created.status === 201, `код ${created.status} ${JSON.stringify(rec).slice(0, 140)}`);
check("вернулся идентификатор записи", typeof rec.id === "string" && rec.id.length > 10, String(rec.id));
check("новая запись под рассмотрением", rec.status === "under_review", String(rec.status));
check("дата урегулирования пуста у новой записи", rec.resolvedAt === null, String(rec.resolvedAt));
check("предложенное решение сохранено", rec.proposedAction === "Переделка по гарантии за счёт клиники", String(rec.proposedAction));
check("врач сохранён", rec.doctorId === OWNER, String(rec.doctorId));

const afterAdd = await req(`/api/patients/${patient.id}/reclamations`, { headers: H }).then((r) => r.json());
check(
	"запись видна в журнале",
	Array.isArray(afterAdd) && afterAdd.some((r) => r.id === rec.id),
	`записей ${Array.isArray(afterAdd) ? afterAdd.length : "?"}`,
);
check(
	"свежая запись стоит первой",
	Array.isArray(afterAdd) && afterAdd[0]?.id === rec.id,
	Array.isArray(afterAdd) ? String(afterAdd[0]?.complicationDetails).slice(0, 60) : "-",
);

const resolved = await req(`/api/patients/${patient.id}/reclamations/${rec.id}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "resolved" }),
}).then((r) => r.json());
check("инцидент урегулирован", resolved.status === "resolved", String(resolved.status));
check("дата урегулирования поставлена", typeof resolved.resolvedAt === "string", String(resolved.resolvedAt));

const back = await req(`/api/patients/${patient.id}/reclamations/${rec.id}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "under_review" }),
}).then((r) => r.json());
check("инцидент возвращён в работу", back.status === "under_review", String(back.status));
/*
 * Дата урегулирования обязана сниматься вместе со статусом. Оставшаяся дата у
 * открытого инцидента — готовый повод для спора о сроках гарантии.
 */
check("дата урегулирования снята при возврате в работу", back.resolvedAt === null, String(back.resolvedAt));

const ghost = await req(`/api/patients/${patient.id}/reclamations/${OWNER}`, {
	method: "PUT",
	headers: H,
	body: JSON.stringify({ status: "resolved" }),
});
check("несуществующая запись не «обновляется успешно»", ghost.status === 404, `код ${ghost.status}`);

const removed = await req(`/api/patients/${patient.id}/reclamations/${rec.id}`, { method: "DELETE", headers: HD });
check("запись удаляется", removed.status === 200, `код ${removed.status}`);
const twice = await req(`/api/patients/${patient.id}/reclamations/${rec.id}`, { method: "DELETE", headers: HD });
check("повторное удаление честно отвечает 404", twice.status === 404, `код ${twice.status}`);

const after = await req(`/api/patients/${patient.id}/reclamations`, { headers: H }).then((r) => r.json());
check(
	"журнал вернулся к прежней длине, чужого не тронуто",
	Array.isArray(after) && after.length === beforeCount,
	`было ${beforeCount}, стало ${Array.isArray(after) ? after.length : "?"}`,
);

/*
 * Изоляция клиники. Читаем ту же карту БЕЗ токена кабинета: ответ обязан быть
 * 401, а не журналом. Рекламация — врачебная тайна и основание денежного спора.
 */
const noToken = await req(`/api/patients/${patient.id}/reclamations`, {
	headers: { "x-dente-staff-token": unlock.staffToken },
});
check("без токена кабинета журнал не отдаётся", noToken.status === 401, `код ${noToken.status}`);

/* Выдуманная карта — 404, а не пустой журнал: пустой врач читает как «жалоб не было». */
const alien = await req(`/api/patients/11111111-2222-3333-4444-555555555555/reclamations`, { headers: H });
check("чужая или несуществующая карта отвечает 404", alien.status === 404, `код ${alien.status}`);

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
