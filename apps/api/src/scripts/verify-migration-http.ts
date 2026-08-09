/**
 * Сквозная проверка HTTP-конвейера переноса на настоящем сервере и настоящей БД.
 *
 * Поднимает приложение Fastify на свободном порту, льёт файл DBF на 10 000
 * записей потоком, проходит фазы сопоставления и выполнения, дожидается
 * фонового воркера опросом статуса и забирает акт сверки.
 *
 * Проверяется ровно то, что нельзя проверить модульным тестом:
 *   — заливка не собирает файл в памяти;
 *   — запрос выполнения возвращает 202 сразу, а не висит минуту;
 *   — воркер доводит работу до конца и обновляет прогресс;
 *   — расход памяти не растёт пропорционально размеру файла;
 *   — прогон, брошенный «упавшим» процессом, подбирается и доводится до конца.
 */
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import {
	migrationEntityLinks,
	migrationQuarantineRecords,
	migrationReconciliations,
	migrationRuns,
	migrationStagingRecords,
	organizations,
	patients,
} from "../db/schema.js";
import { buildDbfFile } from "../migration/tests/fixtures.js";
import { drainMigrationQueue } from "../migration/worker.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../security/identity.js";
import { createDenteApiApp } from "../server.js";
import { signToken } from "../utils/cryptoHelper.js";

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = ""): void {
	if (condition) {
		pass += 1;
		console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
	} else {
		fail += 1;
		console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
	}
}

function same(label: string, actual: unknown, expected: unknown): void {
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	check(label, a === e, a === e ? String(a) : `получено ${a}, ожидалось ${e}`);
}

/** Пик потребления памяти процессом, МБ. */
function heapUsedMb(): number {
	return Math.round((process.memoryUsage().heapUsed / (1024 * 1024)) * 10) / 10;
}

function rssMb(): number {
	return Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;
}

const ROWS = 10_000;

/** Настоящие русские фамилии, имена и отчества для правдоподобной выгрузки. */
const SURNAMES = [
	"Иванов",
	"Петров",
	"Сидоров",
	"Кузнецов",
	"Смирнов",
	"Попов",
	"Волков",
	"Морозов",
	"Новиков",
	"Фёдоров",
	"Егоров",
	"Павлов",
	"Козлов",
	"Степанов",
	"Николаев",
	"Орлов",
	"Андреев",
	"Макаров",
	"Никитин",
	"Захаров",
];
const GIVEN_NAMES = [
	"Александр",
	"Мария",
	"Дмитрий",
	"Анна",
	"Сергей",
	"Ольга",
	"Андрей",
	"Елена",
	"Алексей",
	"Наталья",
	"Михаил",
	"Ирина",
	"Николай",
	"Татьяна",
	"Владимир",
	"Светлана",
];
const PATRONYMICS = [
	"Иванович",
	"Сергеевна",
	"Петрович",
	"Андреевна",
	"Николаевич",
	"Дмитриевна",
	"Алексеевич",
	"Владимировна",
];

console.log(
	`\n=== HTTP-конвейер переноса: ${ROWS} записей DBF через живой API ===\n`,
);

const [org] = await db
	.insert(organizations)
	.values({ name: `E2E-http-${Date.now()}` })
	.returning();
if (!org) throw new Error("Failed to create test organization");
const ORG = org.id;

const app = await createDenteApiApp({
	startTelegramWorker: false,
	startCommunicationWorker: false,
	// Воркер гоняем вручную из скрипта: так проверка детерминирована и не зависит
	// от того, успел ли фоновый таймер сработать между опросами.
	startMigrationWorker: false,
});
await app.listen({ host: "127.0.0.1", port: 0 });
const address = app.server.address();
const baseUrl =
	typeof address === "object" && address !== null
		? `http://127.0.0.1:${address.port}`
		: "";
console.log(`Сервер поднят: ${baseUrl}`);
console.log(`Организация: ${ORG}\n`);

/**
 * Токены подписываются тем же секретом, что проверяет сервер: проверка обязана
 * идти через настоящий контур авторизации, иначе она не докажет, что маршруты
 * доступны сотруднику клиники и изолированы по организации.
 */
const secret = authTokenSecret();
const authHeaders: Record<string, string> = {
	[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG }, secret, 3600),
	[STAFF_TOKEN_HEADER]: signToken(
		{ userId: null, role: "admin", organizationId: ORG },
		secret,
		3600,
	),
};

interface ApiResult {
	status: number;
	body: Record<string, unknown>;
}

async function api(
	method: string,
	path: string,
	body?: unknown,
	extraHeaders: Record<string, string> = {},
): Promise<ApiResult> {
	const response = await fetch(`${baseUrl}${path}`, {
		method,
		headers: {
			...authHeaders,
			...(body === undefined ? {} : { "content-type": "application/json" }),
			...extraHeaders,
		},
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	const text = await response.text();
	let parsed: Record<string, unknown> = {};
	try {
		parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
	} catch {
		parsed = { raw: text.slice(0, 400) };
	}
	return { status: response.status, body: parsed };
}

try {
	// =====================================================================
	console.log("--- 1. Готовим DBF на 10 000 записей в cp866");
	const memBeforeBuild = heapUsedMb();
	const dbf = buildDbfFile(
		[
			{ name: "NKART", type: "I", length: 4 },
			{ name: "FIO", type: "C", length: 44 },
			{ name: "TEL", type: "C", length: 20 },
			{ name: "DROJD", type: "D", length: 8 },
			{ name: "POL", type: "C", length: 1 },
			{ name: "PRIM", type: "C", length: 60 },
		],
		/**
		 * ФИО настоящего вида, а не «Пациент 1»: колонка обязана выглядеть как
		 * колонка имён, иначе проверка не докажет ничего о реальной выгрузке.
		 * Каждая двадцатая запись — в форме «Иванов И.И.», как её пишут системы,
		 * где под ФИО отведено тридцать символов.
		 */
		Array.from({ length: ROWS }, (_, index) => {
			const number = index + 1;
			/**
			 * Индексы фамилии, имени и отчества выводятся независимо, а не общим
			 * index % N. Иначе комбинаций получилось бы всего НОК(20,16,8) = 80 на
			 * десять тысяч пациентов, и выгрузка состояла бы из ста двадцати пяти
			 * полных тёзок каждая — данные, которых не бывает в живой клинике.
			 * Независимые индексы дают 2560 разных ФИО.
			 */
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const surname = SURNAMES[index % SURNAMES.length]!;
			const given =
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				GIVEN_NAMES[Math.floor(index / SURNAMES.length) % GIVEN_NAMES.length]!;
			const patronymic =
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				PATRONYMICS[
					Math.floor(index / (SURNAMES.length * GIVEN_NAMES.length)) %
						PATRONYMICS.length
				]!;
			const female = index % 2 === 1;
			const fullName =
				index % 20 === 0
					? `${surname}${female ? "а" : ""} ${given.charAt(0)}.${patronymic.charAt(0)}.`
					: `${surname}${female ? "а" : ""} ${given} ${patronymic}`;
			const day = String((index % 28) + 1).padStart(2, "0");
			const month = String((index % 12) + 1).padStart(2, "0");
			const year = 1940 + (index % 70);
			return [
				String(number),
				fullName,
				`+7900${String(1000000 + number).slice(-7)}`,
				`${year}${month}${day}`,
				female ? "Ж" : "М",
				`Перенос строки ${number}`,
			];
		}),
		{ languageDriver: 0x65, encoding: "ibm866" },
	);
	console.log(
		`       размер файла: ${(dbf.byteLength / (1024 * 1024)).toFixed(2)} МБ`,
	);
	console.log(
		`       память после сборки образца: heap ${heapUsedMb()} МБ (было ${memBeforeBuild}), rss ${rssMb()} МБ`,
	);

	// =====================================================================
	console.log("--- 2. POST /api/migration/upload — заливка потоком");
	const uploadStarted = Date.now();
	const uploadResponse = await fetch(`${baseUrl}/api/migration/upload`, {
		method: "POST",
		headers: {
			...authHeaders,
			"content-type": "application/octet-stream",
			"x-migration-file-name": "PACIENT.DBF",
			"x-migration-source-name": encodeURIComponent("Выгрузка IDENT 10k"),
		},
		body: dbf,
	});
	const uploadBody = (await uploadResponse.json()) as Record<string, unknown>;
	const uploadMs = Date.now() - uploadStarted;
	same("upload вернул 201", uploadResponse.status, 201);
	const runId = String(uploadBody.runId ?? "");
	check("получен runId", /^[0-9a-f-]{36}$/.test(runId), runId);
	const source = uploadBody.source as Record<string, unknown> | undefined;
	same("формат опознан как dbf", source?.kind, "dbf");
	same("кодировка из заголовка DBF", source?.detectedEncoding, "ibm866");
	same("источник читается потоком", source?.streamable, true);
	same(
		"колонки прочитаны",
		(source?.columns as string[] | undefined)?.length,
		6,
	);
	console.log(
		`       заливка заняла ${uploadMs} мс, память heap ${heapUsedMb()} МБ, rss ${rssMb()} МБ`,
	);

	// =====================================================================
	console.log("--- 3. POST /:runId/map — сопоставление колонок");
	const mapResult = await api("POST", `/api/migration/${runId}/map`, {
		allowLlm: false,
		entityKind: "patient",
	});
	same("map вернул 200", mapResult.status, 200);
	const mapping = mapResult.body.mapping as Record<string, unknown> | undefined;
	const mappedColumns = (mapping?.columns ?? []) as Array<{
		sourceColumn: string;
		targetField: string;
	}>;
	console.log(
		`       карта: ${mappedColumns.map((c) => `${c.sourceColumn}→${c.targetField}`).join(", ")}`,
	);
	same("сущность определена как пациенты", mapping?.entityKind, "patient");
	check(
		"ФИО сопоставлено",
		mappedColumns.some((c) => c.targetField === "patient.fullName"),
	);
	check(
		"телефон сопоставлен",
		mappedColumns.some((c) => c.targetField === "patient.phone"),
	);
	check(
		"дата рождения сопоставлена",
		mappedColumns.some((c) => c.targetField === "patient.birthDate"),
	);

	// =====================================================================
	console.log("--- 4. POST /:runId/execute — обязан вернуть 202 немедленно");
	const executeStarted = Date.now();
	const executeResult = await api("POST", `/api/migration/${runId}/execute`, {
		dryRun: false,
		sourceSystem: "ident10k",
	});
	const executeMs = Date.now() - executeStarted;
	same("execute вернул 202 Accepted", executeResult.status, 202);
	same("задача принята", executeResult.body.accepted, true);
	same("статус queued", executeResult.body.status, "queued");
	check(
		"ответ пришёл мгновенно, а не после загрузки",
		executeMs < 2000,
		`${executeMs} мс`,
	);
	console.log(
		`       ответ за ${executeMs} мс: ${String(executeResult.body.message)}`,
	);

	// Повторное нажатие не должно поставить в очередь второй раз.
	const doubleExecute = await api("POST", `/api/migration/${runId}/execute`, {
		dryRun: false,
	});
	same("повторный execute отклонён 409", doubleExecute.status, 409);
	const doubleError = doubleExecute.body.error as
		| Record<string, unknown>
		| undefined;
	same(
		"код ошибки повторной постановки",
		doubleError?.code,
		"RunAlreadyQueued",
	);
	check(
		"формат ошибки {error:{code,message,details}}",
		typeof doubleError?.code === "string" &&
			typeof doubleError?.message === "string" &&
			typeof doubleError?.details === "object",
		JSON.stringify(doubleExecute.body).slice(0, 160),
	);

	// =====================================================================
	console.log("--- 5. Фоновый воркер выполняет работу");
	const workStarted = Date.now();
	let peakHeap = heapUsedMb();
	let peakRss = rssMb();
	const memoryTimer = setInterval(() => {
		peakHeap = Math.max(peakHeap, heapUsedMb());
		peakRss = Math.max(peakRss, rssMb());
	}, 100);

	const drained = await drainMigrationQueue(5);
	clearInterval(memoryTimer);
	const workMs = Date.now() - workStarted;
	same("воркер выполнил один прогон", drained, 1);
	console.log(
		`       обработка ${ROWS} строк заняла ${(workMs / 1000).toFixed(1)} с`,
	);
	console.log(`       пик памяти: heap ${peakHeap} МБ, rss ${peakRss} МБ`);

	/**
	 * Порог памяти. Файл ~1,3 МБ, но дело не в нём: если бы стейджинг держал все
	 * 10 000 разобранных строк со всеми колонками и происхождением полей в памяти
	 * одновременно, heap вырос бы на сотни мегабайт. Партиями по 1000 рост
	 * ограничен и не масштабируется с числом строк.
	 */
	check("расход памяти не взлетел", peakHeap < 700, `пик heap ${peakHeap} МБ`);

	// =====================================================================
	console.log("--- 6. GET /:runId — состояние прогона");
	const statusResult = await api("GET", `/api/migration/${runId}`);
	same("status вернул 200", statusResult.status, 200);
	const run = statusResult.body.run as Record<string, unknown>;
	const counters = run.counters as Record<string, number>;
	const progress = run.progress as Record<string, number>;
	console.log(
		`       статус ${String(run.status)}, фаза «${String(run.phase)}»`,
	);
	console.log(
		`       счётчики: источник ${counters.sourceRows}, уложено ${counters.stagedRows}, создано ${counters.loadedRows}, ` +
			`дублей ${counters.duplicateRows}, карантин ${counters.quarantinedRows}`,
	);
	console.log(
		`       прогресс: ${progress.done}/${progress.total} (${progress.percent}%)`,
	);

	check(
		"прогон завершён",
		run.status === "completed" || run.status === "completed_with_quarantine",
		String(run.status),
	);
	same("прочитано 10 000 строк источника", counters.sourceRows, ROWS);
	same("уложено 10 000 строк", counters.stagedRows, ROWS);
	same("прогресс доведён до 100%", progress.percent, 100);
	same("владелец освобождён", (run.worker as Record<string, unknown>).id, null);

	// =====================================================================
	console.log("--- 7. Пациенты в боевой таблице");
	// Имя 5000-й строки считаем той же формулой, что и при сборке образца.
	const index5000 = 4999;
	const female5000 = index5000 % 2 === 1;
	const surname5000 = `${SURNAMES[index5000 % SURNAMES.length]}${female5000 ? "а" : ""}`;
	const given5000 =
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		GIVEN_NAMES[Math.floor(index5000 / SURNAMES.length) % GIVEN_NAMES.length]!;
	const patronymic5000 =
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		PATRONYMICS[
			Math.floor(index5000 / (SURNAMES.length * GIVEN_NAMES.length)) %
				PATRONYMICS.length
		]!;
	const expectedName5000 =
		index5000 % 20 === 0
			? `${surname5000} ${given5000.charAt(0)}.${patronymic5000.charAt(0)}.`
			: `${surname5000} ${given5000} ${patronymic5000}`;
	const [patientCount] = await db
		.select({ n: sql<string>`count(*)` })
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	same("создано 10 000 карточек", Number(patientCount?.n), ROWS);

	const [sampleRow] = await db
		.select({
			fullName: patients.fullName,
			phone: patients.phone,
			birthDate: patients.birthDate,
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, ORG),
				eq(patients.fullName, expectedName5000),
			),
		);
	check(
		"кириллица из cp866 цела на 5000-й строке",
		sampleRow !== undefined,
		sampleRow?.fullName ?? "не найдено",
	);
	check(
		"телефон нормализован",
		sampleRow?.phone?.startsWith("+79") === true,
		sampleRow?.phone ?? "нет",
	);
	check(
		"дата рождения разобрана",
		/^\d{4}-\d{2}-\d{2}$/.test(sampleRow?.birthDate ?? ""),
		sampleRow?.birthDate ?? "нет",
	);

	// =====================================================================
	console.log("--- 8. GET /:runId/reconciliation — акт сверки");
	const reconResult = await api(
		"GET",
		`/api/migration/${runId}/reconciliation`,
	);
	same("reconciliation вернул 200", reconResult.status, 200);
	const checks = reconResult.body.checks as Array<{
		title: string;
		expected: number;
		actual: number;
		passed: boolean;
	}>;
	for (const item of checks) {
		console.log(
			`       ${item.passed ? "[+]" : "[-]"} ${item.title}: ожидалось ${item.expected}, получено ${item.actual}`,
		);
	}
	check(
		"сверка сошлась",
		reconResult.body.balanced === true,
		checks
			.filter((c) => !c.passed)
			.map((c) => c.title)
			.join("; ") || "ок",
	);

	const csvResult = await fetch(
		`${baseUrl}/api/migration/${runId}/reconciliation.csv`,
		{ headers: authHeaders },
	);
	/**
	 * BOM проверяется по СЫРЫМ БАЙТАМ, а не по строке. Response.text() применяет
	 * UTF-8-декодер, который по спецификации удаляет ведущий BOM, — проверка по
	 * строке всегда показывала бы его отсутствие, даже когда он отправлен.
	 */
	const csvBytes = Buffer.from(await csvResult.arrayBuffer());
	const csvText = csvBytes.toString("utf8");
	same("CSV отдан", csvResult.status, 200);
	check(
		"CSV начинается с BOM для русского Excel",
		csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf,
		`первые байты ${csvBytes.subarray(0, 3).toString("hex")}`,
	);
	check(
		"CSV содержит итог сверки",
		csvText.includes("СОШЛОСЬ"),
		csvText.split("\r\n")[2] ?? "",
	);

	// =====================================================================
	console.log("--- 9. Идемпотентность через HTTP: тот же файл второй раз");
	const secondUpload = await fetch(`${baseUrl}/api/migration/upload`, {
		method: "POST",
		headers: {
			...authHeaders,
			"content-type": "application/octet-stream",
			"x-migration-file-name": "PACIENT.DBF",
			"x-migration-source-name": encodeURIComponent(
				"Выгрузка IDENT 10k (повтор)",
			),
		},
		body: dbf,
	});
	const secondBody = (await secondUpload.json()) as Record<string, unknown>;
	const secondRunId = String(secondBody.runId ?? "");
	check(
		"повторная заливка предупреждает о том же файле",
		secondBody.previousRunWithSameFile !== null,
		JSON.stringify(secondBody.previousRunWithSameFile),
	);

	await api("POST", `/api/migration/${secondRunId}/map`, {
		allowLlm: false,
		entityKind: "patient",
	});
	await api("POST", `/api/migration/${secondRunId}/execute`, {
		dryRun: false,
		sourceSystem: "ident10k",
	});
	await drainMigrationQueue(5);

	const [afterSecond] = await db
		.select({ n: sql<string>`count(*)` })
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	same(
		"повторный прогон не создал новых карточек",
		Number(afterSecond?.n),
		ROWS,
	);

	const secondStatus = await api("GET", `/api/migration/${secondRunId}`);
	const secondCounters = (secondStatus.body.run as Record<string, unknown>)
		.counters as Record<string, number>;
	console.log(
		`       второй прогон: создано ${secondCounters.loadedRows}, обновлено ${secondCounters.updatedRows}, дублей ${secondCounters.duplicateRows}`,
	);
	same("второй прогон ничего не создал", secondCounters.loadedRows, 0);
	const recognised =
		(secondCounters.updatedRows ?? 0) + (secondCounters.duplicateRows ?? 0);
	check(
		"второй прогон узнал уже перенесённых",
		recognised === ROWS,
		`обновлено+дублей = ${recognised}`,
	);

	// =====================================================================
	console.log("--- 10. Возобновление после падения процесса");
	/**
	 * Симулируем смерть владельца: третий прогон ставится в очередь, воркер
	 * берёт его и «умирает» на середине — мы вручную оставляем половину строк в
	 * состоянии ready и переводим прогон в loading с устаревшей отметкой жизни.
	 * Затем проверяем, что следующий воркер подберёт его и доведёт до конца.
	 */
	const thirdUpload = await fetch(`${baseUrl}/api/migration/upload`, {
		method: "POST",
		headers: {
			...authHeaders,
			"content-type": "application/octet-stream",
			"x-migration-file-name": "RESUME.DBF",
			"x-migration-source-name": encodeURIComponent("Проверка возобновления"),
		},
		body: buildDbfFile(
			[
				{ name: "NKART", type: "I", length: 4 },
				{ name: "FIO", type: "C", length: 44 },
				{ name: "TEL", type: "C", length: 20 },
			],
			Array.from({ length: 200 }, (_, index) => [
				String(500000 + index),
				`Возобновлённый Пациент ${index + 1}`,
				`+7911${String(2000000 + index).slice(-7)}`,
			]),
			{ languageDriver: 0xc9, encoding: "windows-1251" },
		),
	});
	const thirdRunId = String(
		((await thirdUpload.json()) as Record<string, unknown>).runId ?? "",
	);
	await api("POST", `/api/migration/${thirdRunId}/map`, {
		allowLlm: false,
		entityKind: "patient",
	});
	// Укладываем строки отдельной фазой, но НЕ выполняем.
	const stageResult = await api(
		"POST",
		`/api/migration/${thirdRunId}/stage`,
		{},
	);
	same("stage вернул 200", stageResult.status, 200);
	const stagingCounts = stageResult.body.staging as Record<string, number>;
	same("уложено 200 строк", stagingCounts.total, 200);

	// Изображаем умершего владельца: прогон в работе, отметка жизни в прошлом.
	await db
		.update(migrationRuns)
		.set({
			status: "loading",
			dryRun: false,
			workerId: "умерший-процесс#1",
			heartbeatAt: new Date(Date.now() - 10 * 60 * 1000),
			queuedAt: new Date(),
		})
		.where(eq(migrationRuns.id, thirdRunId));

	const resumed = await drainMigrationQueue(5);
	check(
		"осиротевший прогон подобран",
		resumed >= 1,
		`обработано прогонов: ${resumed}`,
	);

	const resumeStatus = await api("GET", `/api/migration/${thirdRunId}`);
	const resumeRun = resumeStatus.body.run as Record<string, unknown>;
	const resumeWorker = resumeRun.worker as Record<string, unknown>;
	const resumeCounters = resumeRun.counters as Record<string, number>;
	console.log(
		`       статус после возобновления: ${String(resumeRun.status)}, подборов ${String(resumeWorker.resumeCount)}`,
	);
	console.log(`       создано ${resumeCounters.loadedRows} из 200`);
	check(
		"прогон доведён до конца",
		resumeRun.status === "completed" ||
			resumeRun.status === "completed_with_quarantine",
		String(resumeRun.status),
	);
	check(
		"зафиксирован факт возобновления",
		Number(resumeWorker.resumeCount) >= 1,
		String(resumeWorker.resumeCount),
	);
	same("загружены все 200 строк", resumeCounters.loadedRows, 200);

	// =====================================================================
	console.log("--- 11. Формат ошибок на несуществующем прогоне");
	const missing = await api(
		"GET",
		"/api/migration/00000000-0000-4000-8000-000000000000",
	);
	same("несуществующий прогон — 404", missing.status, 404);
	const missingError = missing.body.error as
		| Record<string, unknown>
		| undefined;
	same("код ошибки", missingError?.code, "RunNotFound");
	check(
		"сообщение на русском",
		typeof missingError?.message === "string" &&
			/[А-Яа-я]/.test(String(missingError.message)),
	);
} catch (error) {
	/**
	 * Исключение в проверке — это провал проверки, а не повод выйти с нулём.
	 * Без этого блока любая ошибка пролетала бы мимо счётчиков, скрипт печатал бы
	 * «0 passed, 0 failed» и завершался успехом — то есть врал.
	 */
	fail += 1;
	console.error("\n!!! Проверка прервана исключением:");
	console.error(
		error instanceof Error ? (error.stack ?? error.message) : String(error),
	);
} finally {
	console.log("\n--- Уборка");
	await app.close().catch(() => undefined);

	await db
		.delete(patients)
		.where(eq(patients.organizationId, ORG))
		.catch(() => undefined);
	const runs = await db
		.select({ id: migrationRuns.id })
		.from(migrationRuns)
		.where(eq(migrationRuns.organizationId, ORG));
	for (const run of runs) {
		await db
			.delete(migrationQuarantineRecords)
			.where(eq(migrationQuarantineRecords.runId, run.id));
		await db
			.delete(migrationStagingRecords)
			.where(eq(migrationStagingRecords.runId, run.id));
		await db
			.delete(migrationReconciliations)
			.where(eq(migrationReconciliations.runId, run.id));
	}
	await db
		.delete(migrationEntityLinks)
		.where(eq(migrationEntityLinks.organizationId, ORG));
	await pool.query("delete from audit_events where organization_id = $1", [
		ORG,
	]);
	await db.delete(migrationRuns).where(eq(migrationRuns.organizationId, ORG));
	await db.delete(organizations).where(eq(organizations.id, ORG));
	console.log("Убрано.");

	console.log(`\n${pass} passed, ${fail} failed`);
	await pool.end();
	process.exit(fail ? 1 : 0);
}
