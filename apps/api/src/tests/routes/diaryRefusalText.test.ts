import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import registerDiaryRoutes from "../../routes/diary.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ДНЕВНИК ПРИЁМА ОТКАЗЫВАЛ КОДОМ ОТВЕТА, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО, замерено запросом в процессе (`app.inject`; дев-сервер на 4100 отдаёт
 * старую сборку и доказательством не считался):
 *
 *   GET  /api/diaries/visit/<приём>       → 403 {"error":"OrgRequired"}
 *   GET  /api/diaries/<номер>/revisions   → 403 {"error":"OrgRequired"}
 *   POST /api/diaries                     → 403 {"error":"OrgRequired"}
 *   POST /api/diaries/<номер>/revise      → 403 {"error":"OrgRequired"}
 *
 * Ни одного поля `message`. Пятая ветка того же состояния, в подписании
 * (`/lock`), текст имела, но СВОЙ — третьей копией той же фразы в дереве.
 * Плюс два голых `{"error":"NotFound"}` на истории правок и исправлении.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Живой клиент подписания
 * (`apps/web/src/components/useVisitDiaryLogic.ts:530-540`) печатает поле
 * `message` тостом ДОСЛОВНО, а без него строит подсказку по коду ответа. Для 403
 * это «войдите в смену заново или попросите администратора открыть доступ» —
 * ложное указание: смена тут не при чём, не определён кабинет клиники. Для 404 —
 * «программа клиники обновлена не полностью, сообщите администратору», тоже
 * ложное: маршрут существует и работает. Дневник приёма — юридический документ, и
 * врач, не понявший отказ, либо теряет набранный текст, либо переписывает его во
 * второй записи.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. Ни один отказ дневника не уходит без `message` — включая ветку подписания.
 *  2. У текста есть СЛЕДУЮЩИЙ ШАГ, а не только факт отказа.
 *  3. В тексте нет латиницы: фильтр клиента (`AppHelpers.tsx`,
 *     `operatorReadableErrorDetail`) отбрасывает фразу без русских букв и фразу с
 *     латинским словом из шести и более букв ЦЕЛИКОМ.
 *  4. Машинные коды сохранены в поле `error`: интерфейс по ним ветвится.
 *  5. Там, где врач уже что-то напечатал, текст обещает, что набранное не
 *     потеряно. Без этого врач бросает заполненный дневник.
 *  6. Сканер против следующей копии: ни одна ветвь `diary.ts` не отвечает
 *     `error` без `message`.
 *
 * Проверки ищут ПРИЗНАКИ причины и действия, а не дословную строку: тест на
 * точное совпадение краснел бы на любой правке формулировки.
 *
 * БАЗА ТОЛЬКО НА ЧТЕНИЕ. Отказы «кабинет не определён» происходят до первого
 * обращения к базе. Две ветки «дневника нет» выполняют один SELECT по номеру,
 * которого в базе нет, — ни одной вставки, ни одного обновления, убирать нечего.
 */

const ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const VISIT = "8356141b-7cfa-4221-95f7-70f47e7344b1";
/** Номер дневника, которого в базе нет: SELECT вернёт пусто, записи не будет. */
const MISSING_DIARY = "0c9a1e77-1f4f-4a55-9f1d-6a2f0c3b7e11";
const LATIN = /[A-Za-z]/;
const NEXT_STEP = /Войдите|войдите|Откройте|откройте|Позовите|позовите|Обратитесь/;

type Probe = {
	name: string;
	method: "GET" | "POST";
	url: string;
	payload?: unknown;
	/** Токен сотрудника: нужен там, где до отказа стоит проверка роли. */
	staffRole?: "doctor" | "admin";
	/** Токен кабинета: нужен там, где отказ наступает уже ВНУТРИ клиники. */
	withClinicToken?: boolean;
	expectedStatus: number;
	expectedError: string;
};

/**
 * Токен сотрудника БЕЗ организации. Так роль в смене известна (проверки
 * `role !== "doctor"` проходят), а клиника запроса остаётся неопределённой —
 * ровно то состояние, которое отвечало голым `OrgRequired`.
 */
function staffTokenWithoutOrg(role: string): string {
	return signToken({ userId: VISIT, role }, authTokenSecret());
}

const PROBES: Probe[] = [
	{
		name: "врач открывает дневник приёма, кабинет не определён",
		method: "GET",
		url: `/api/diaries/visit/${VISIT}`,
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "история правок дневника, кабинет не определён",
		method: "GET",
		url: `/api/diaries/${MISSING_DIARY}/revisions`,
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "сохранение дневника приёма, кабинет не определён",
		method: "POST",
		url: "/api/diaries",
		payload: { visitId: VISIT, patientId: ORG },
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	/*
	 * ВЕТОК «БЕЗ КАБИНЕТА» У ПОДПИСАНИЯ (`/lock`) И ИСПРАВЛЕНИЯ (`/revise`) ЗДЕСЬ
	 * НЕТ, И ЭТО НАХОДКА, А НЕ ПРОПУСК. Обе НЕДОСТИЖИМЫ, доказано этим же тестом
	 * при первых двух прогонах: `security/identity.ts` наполняет `request.user`
	 * только когда организация определена (`if (identity.organizationId)`).
	 * Значит без кабинета роль смены ВСЕГДА читается как «assistant», а в обоих
	 * маршрутах проверка права стоит РАНЬШЕ проверки клиники — выполнение
	 * останавливается на `OnlyDoctorsCanLock` и `OnlyAdminsCanRevise` и до
	 * `OrgRequired` не доходит никогда. Роль без клиники в этом продукте
	 * невозможна, поэтому ветка мертва по построению, а не по случайности.
	 *
	 * Текст в обеих ветках всё равно поставлен: порядок проверок могут поменять, и
	 * тогда ветка оживёт с готовым объяснением, а не с голым кодом. Обе покрыты
	 * статическим сторожем в конце файла.
	 */
	{
		name: "исправление подписанного дневника не тому, кто вправе",
		method: "POST",
		url: `/api/diaries/${MISSING_DIARY}/revise`,
		expectedStatus: 403,
		expectedError: "OnlyAdminsCanRevise",
	},
	{
		name: "история правок: дневника с таким номером в клинике нет",
		method: "GET",
		url: `/api/diaries/${MISSING_DIARY}/revisions`,
		withClinicToken: true,
		expectedStatus: 404,
		expectedError: "NotFound",
	},
	{
		name: "исправление: дневника с таким номером в клинике нет",
		method: "POST",
		url: `/api/diaries/${MISSING_DIARY}/revise`,
		withClinicToken: true,
		staffRole: "admin",
		expectedStatus: 404,
		expectedError: "NotFound",
	},
];

describe("отказ дневника приёма объяснён врачу", () => {
	let app: FastifyInstance;

	before(async () => {
		// Секрет периметра задаётся здесь, а не читается из окружения: гейт
		// clinicalAdminSecret() читает переменную на каждом вызове, поэтому тест не
		// зависит от настроек машины и не трогает настоящий секрет установки.
		process.env.DENTE_CLINICAL_ADMIN_SECRET = "секрет-сторожа-текста-дневника";
		app = Fastify({ logger: false });
		// Тот же хук, что в apps/api/src/server.ts: именно он наполняет
		// request.user, из которого diary.ts берёт роль смены.
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerDiaryRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
	});

	async function refusal(
		probe: Probe,
	): Promise<{ statusCode: number; error: string; message: string }> {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			"x-dente-admin-secret": process.env
				.DENTE_CLINICAL_ADMIN_SECRET as string,
		};
		if (probe.withClinicToken) {
			headers["x-dente-clinic-token"] = signToken(
				{ organizationId: ORG },
				authTokenSecret(),
			);
		}
		if (probe.staffRole) {
			headers["x-dente-staff-token"] = probe.withClinicToken
				? signToken(
						{ userId: VISIT, role: probe.staffRole, organizationId: ORG },
						authTokenSecret(),
					)
				: staffTokenWithoutOrg(probe.staffRole);
		}
		const response = await app.inject({
			method: probe.method,
			url: probe.url,
			headers,
			payload: probe.payload ?? {},
		});
		const body = response.json() as { error?: unknown; message?: unknown };
		return {
			statusCode: response.statusCode,
			error: typeof body.error === "string" ? body.error : "",
			message: typeof body.message === "string" ? body.message : "",
		};
	}

	test("каждый отказ дневника называет причину и следующий шаг", async () => {
		for (const probe of PROBES) {
			const { statusCode, error, message } = await refusal(probe);
			assert.equal(
				statusCode,
				probe.expectedStatus,
				`${probe.name}: код ${statusCode}, тело ${message}`,
			);
			assert.equal(
				error,
				probe.expectedError,
				`${probe.name}: машинный код потерян, интерфейс по нему ветвится`,
			);
			assert.ok(
				message.length > 0,
				`${probe.name}: отказ ушёл без message — экран построит подсказку по коду ${statusCode} и посоветует не то`,
			);
			assert.ok(
				!LATIN.test(message),
				`${probe.name}: в отказе латиница, фильтр клиента погасит фразу целиком: ${message}`,
			);
			assert.match(
				message,
				NEXT_STEP,
				`${probe.name}: в отказе нет следующего шага: ${message}`,
			);
		}
	});

	test("там, где врач уже печатал, отказ обещает сохранность набранного", async () => {
		/*
		 * Дневник приёма — юридический документ. Первое, что человек обязан
		 * услышать при отказе сохранения или подписания, — что набранный текст не
		 * потерян: иначе он закрывает приём и набирает всё заново во второй записи.
		 */
		for (const probe of PROBES.filter(
			(candidate) => candidate.url === "/api/diaries",
		)) {
			const { message } = await refusal(probe);
			assert.match(
				message,
				/текст (остаётся|остается|останется)|не закрывайте/i,
				`${probe.name}: отказ не говорит, что набранный текст на месте: ${message}`,
			);
		}
	});

	test("отказ по праву подписи не советует войти заново", async () => {
		/*
		 * Ассистенту повторный вход права подписывать дневник не добавит НИКОГДА, и
		 * ровно это советует клиент по коду 403, если текста нет. Отказ обязан
		 * назвать того, кто вправе, а не отправлять человека в цикл входов.
		 */
		const { message } = await refusal({
			name: "исправление не тому, кто вправе",
			method: "POST",
			url: `/api/diaries/${MISSING_DIARY}/revise`,
			expectedStatus: 403,
			expectedError: "OnlyAdminsCanRevise",
		});
		assert.match(
			message,
			/администратор/i,
			`отказ не называет, кто вправе исправить дневник: ${message}`,
		);
		assert.doesNotMatch(
			message,
			/войдите (в кабинет|в смену) заново/i,
			`отказ по праву советует войти заново — повторный вход права не добавит: ${message}`,
		);
	});

	test("ни одна ветвь дневника не отвечает кодом без текста", async () => {
		/*
		 * СТОРОЖ ПРОТИВ СЛЕДУЮЩЕЙ КОПИИ ДЕФЕКТА. Восемь проверок выше покрывают
		 * достижимые без записи в базу ветки. Остальные (замок занят, не хватило
		 * материала, сбой сохранения) требуют своих строк в общей базе, поэтому по
		 * ним стоит статическая проверка: отказ без поля message не должен
		 * появиться ни в одной ветви файла.
		 */
		const { readFileSync } = await import("node:fs");
		const raw = readFileSync(
			new URL("../../routes/diary.ts", import.meta.url),
			"utf8",
		);
		/*
		 * Комментарии вырезаются ДО поиска, и это не гигиена. При первом прогоне
		 * сторож покраснел на объяснении в комментарии, которое ЦИТИРУЕТ прежний
		 * голый отказ (`return reply.code(404).send({ error: "NotFound" })`). Сторож,
		 * который бьёт по разбору дефекта, а не по дефекту, заставил бы удалить
		 * именно разбор.
		 */
		const source = raw
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
		const bare = [...source.matchAll(/\.send\(\{[^;]*?\}\)/gs)]
			.map((match) => match[0])
			.filter((block) => /\berror:/.test(block) && !/\bmessage:/.test(block));
		assert.deepEqual(
			bare,
			[],
			`в diary.ts снова появился отказ без текста для человека:\n${bare.join("\n---\n")}`,
		);
	});
});
