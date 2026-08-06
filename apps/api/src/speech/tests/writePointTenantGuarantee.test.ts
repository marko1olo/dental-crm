import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { aiJobs, organizations, patients, visits } from "../../db/schema.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerSpeechRoutes } from "../../routes/speech.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";
import {
	acquireSpeechDurableTestLock,
	type SpeechDurableTestLock,
} from "../../tests/support/speechDurableTestLock.js";
import { createTenantTestApp } from "../../tests/support/tenantTestApp.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	listSpeechTranscriptionChunks,
	recordSpeechTranscriptionChunk,
	resetSpeechTranscriptionCacheForRestart,
} from "../storage.js";

/**
 * ГАРАНТИЯ ЗАПИСИ ДИКТОВКИ ЖИВЁТ В ТОЧКЕ ЗАПИСИ, А НЕ У ВЫЗЫВАЮЩЕГО.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Долговременная запись расшифровки
 * (`speech/storage.ts`, `persistSpeechRecording`) выполнялась внутри области
 * `withSuperuserBypass`. Обход записи не даёт НИЧЕГО: в `WITH CHECK` политики
 * `ai_jobs` дизъюнкта обхода нет, поэтому строку пропускает РОВНО совпадение
 * `organization_id` с `app.current_tenant`. Замерено на живой базе (роль
 * `dental`, rolsuper=false, rolbypassrls=false; все транзакции откачены):
 *
 *   обход есть, арендатор НЕ задан ......... 42501
 *   арендатор задан И обход ................ INSERT прошёл
 *   арендатор ЧУЖОЙ, обход ................. 42501
 *   арендатор задан, обхода нет ............ INSERT прошёл
 *
 * Работало это по НАСЛЕДСТВУ: маршрут `POST /api/speech/transcribe-chunk` не
 * помечен `tenantTxSelfManaged`, авто-обёртка `server.ts` открывает
 * `withTenantCtx`, а `withSuperuserBypass` при живой транзакции переиспользует
 * её и арендатора не трогает. То есть в бою вторая строка таблицы, а в любом
 * вызове вне запроса — первая.
 *
 * ЧЕГО НЕ ЛОВИЛ НИ ОДИН СУЩЕСТВУЮЩИЙ ТЕСТ. `tests/routes/speechTranscribeChunkAccess.test.ts`
 * ходит настоящим HTTP и проверяет коды доступа и тело ответа, но НЕ смотрит в
 * `ai_jobs`. Отказ базы на записи диктовки не роняет запрос: он глотается в
 * предупреждение фрагмента, и маршрут по-прежнему отвечает 201. Значит отказ
 * RLS ровно в точке записи прошёл бы мимо зелёного прогона.
 *
 * ЧТО ПРОВЕРЯЕТСЯ ЗДЕСЬ:
 *   1. запись проходит, когда вызывающий тенант-контекста НЕ дал, а дал ровно
 *      обход — то есть гарантия взята из точки записи;
 *   2. продуктивный путь через маршрут по-прежнему кладёт строку в `ai_jobs`
 *      (защита от того, чтобы починка первого сломала второе);
 *   3. диктовки двух клиник ложатся каждая своей и чужой не видны.
 *
 * ПОЧЕМУ ЗДЕСЬ КОНСУЛЬТАЦИОННАЯ БЛОКИРОВКА. Файл пишет строки
 * `speech-recording://…` в `ai_jobs`, а такие строки конкурируют за общий на
 * весь процесс предел восстановления, который измеряет
 * `storageRestoreCeiling.test.ts`. Разбор — в
 * `tests/support/speechDurableTestLock.ts`; список файлов в его шапке этим
 * файлом дополняется.
 */

const durableRecordingPathPrefix = "speech-recording://";
const durableWriteFailureWarningPrefix = "Фрагмент не сохранен в базу";

const FIXTURE = "speechWritePointTenantGuarantee";
const ORG_A = fixtureUuid(FIXTURE, 1);
const ORG_B = fixtureUuid(FIXTURE, 2);
const PATIENT_A = fixtureUuid(FIXTURE, 3);
const VISIT_A = fixtureUuid(FIXTURE, 4);
const PATIENT_B = fixtureUuid(FIXTURE, 5);
const VISIT_B = fixtureUuid(FIXTURE, 6);

const textA = "Клиника А: жалобы на боль в зубе 26 при накусывании.";
const textB = "Клиника Б: скол пломбы в зубе 37, повторный осмотр.";
const textRoute = "Диктовка маршрута: осмотр полости рта без особенностей.";

type SpeechChunkInput = Omit<
	SpeechTranscriptionChunk,
	"id" | "organizationId" | "createdAt"
>;

function buildChunkInput(
	overrides: Partial<SpeechChunkInput> & {
		recordingId: string;
		transcript: string;
	},
): SpeechChunkInput {
	return {
		chunkIndex: 0,
		source: "visit",
		patientId: PATIENT_A,
		visitId: VISIT_A,
		providerId: "none",
		providerLabel: "Локальный текст браузера",
		mimeType: "audio/webm",
		byteLength: 2048,
		durationMs: 4000,
		language: "ru",
		confidence: 0.9,
		status: "transcribed",
		quality: {
			level: "clear",
			confidence: 0.9,
			wordCount: 8,
			charCount: overrides.transcript.length,
			durationMs: 4000,
			bytesPerSecond: 512,
			providerWarnings: [],
			signals: ["unit_test"],
			nextAction: "Проверьте текст перед подписанием приема.",
		},
		warnings: [],
		clientRecordedAt: new Date().toISOString(),
		...overrides,
	};
}

function durableRowFilter(recordingId: string, organizationId: string) {
	return and(
		eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`),
		eq(aiJobs.organizationId, organizationId),
	);
}

/**
 * Чтение долговременной строки под тенант-контекстом НАЗВАННОЙ клиники.
 *
 * Под обход это чтение не уводится намеренно: обход вернул бы строку любой
 * клиники, и «строка нашлась» перестало бы означать «строка легла своей». Под
 * FORCE RLS отсутствие контекста даёт ноль строк без ошибки, поэтому контекст
 * задаётся явно и является частью проверяемого утверждения.
 */
async function readDurableRow(recordingId: string, organizationId: string) {
	const [row] = await withFixtureTenant(organizationId, async () =>
		db
			.select({
				organizationId: aiJobs.organizationId,
				visitId: aiJobs.visitId,
				patientId: aiJobs.patientId,
				resultText: aiJobs.resultText,
			})
			.from(aiJobs)
			.where(durableRowFilter(recordingId, organizationId))
			.limit(1),
	);
	return row;
}

/**
 * Сколько строк этой записи видно КЛИНИКЕ `viewerOrganizationId`.
 *
 * Фильтр по `organization_id` в предикате намеренно НЕ ставится: проверяется
 * именно то, что чужую строку скрывает политика, а не условие запроса.
 */
async function countRowsVisibleTo(
	recordingId: string,
	viewerOrganizationId: string,
): Promise<number> {
	const rows = await withFixtureTenant(viewerOrganizationId, async () =>
		db
			.select({ id: aiJobs.id })
			.from(aiJobs)
			.where(
				eq(
					aiJobs.inputStoragePath,
					`${durableRecordingPathPrefix}${recordingId}`,
				),
			),
	);
	return rows.length;
}

/**
 * То же чтение, но с ограниченным ожиданием COMMIT.
 *
 * ЗАЧЕМ. Авто-обёртка `server.ts` держит транзакцию вокруг ВСЕГО обработчика, а
 * обработчик возвращает `reply`. `Reply` — thenable, поэтому `await` на нём
 * ждёт окончания ОТПРАВКИ тела, и COMMIT транзакции происходит уже после того,
 * как `app.inject()` отдал ответ. Немедленное чтение попадает в окно между
 * ответом и фиксацией и видит ноль строк — это свойство обёртки, а не отказ
 * записи.
 *
 * Ожидание ограничено и различает два исхода: «ещё не зафиксировано» проходит за
 * несколько десятков миллисекунд, «не записано вовсе» упирается в потолок и
 * падает. Бесконечного ожидания здесь нет намеренно — оно превратило бы
 * отсутствие строки в зависший прогон.
 */
async function waitForDurableRow(recordingId: string, organizationId: string) {
	const attempts = 40;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const row = await readDurableRow(recordingId, organizationId);
		if (row) return { row, attempt };
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	return { row: undefined, attempt: attempts };
}

let durableLock: SpeechDurableTestLock | null = null;
let app: FastifyInstance | null = null;
let tokenOrgA = "";
const originalEnv = { ...process.env };

before(async () => {
	process.env.NODE_ENV = "development";
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
	delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

	// Блокировка берётся ПЕРВОЙ, до любой записи в базу.
	durableLock = await acquireSpeechDurableTestLock();

	// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит и оставляет
	// свои клиники в живой базе.
	await purgeFixtureOrganizations([ORG_A, ORG_B]);

	// Клиник две, а `app.current_tenant` хранит ровно одного арендатора: общий
	// `values([А, Б])` отвергался бы кодом 42501 на второй строке.
	await withFixtureTenant(ORG_A, async () => {
		await db
			.insert(organizations)
			.values({ id: ORG_A, name: "Клиника точки записи А" });
		await db.insert(patients).values({
			id: PATIENT_A,
			organizationId: ORG_A,
			fullName: "Зотова Лидия Андреевна",
			birthDate: "1981-09-08",
		});
		await db.insert(visits).values({
			id: VISIT_A,
			organizationId: ORG_A,
			patientId: PATIENT_A,
			status: "draft",
		});
	});
	await withFixtureTenant(ORG_B, async () => {
		await db
			.insert(organizations)
			.values({ id: ORG_B, name: "Клиника точки записи Б" });
		await db.insert(patients).values({
			id: PATIENT_B,
			organizationId: ORG_B,
			fullName: "Ершов Никита Валерьевич",
			birthDate: "1990-01-22",
		});
		await db.insert(visits).values({
			id: VISIT_B,
			organizationId: ORG_B,
			patientId: PATIENT_B,
			status: "draft",
		});
	});

	app = createTenantTestApp();
	await registerSpeechRoutes(app);
	tokenOrgA = signToken({ organizationId: ORG_A }, TOKEN_SECRET());
});

after(async () => {
	// Уборка — в try, освобождение ресурсов — в finally: сессионная блокировка не
	// снимается ни исключением, ни откатом, поэтому её снятие не имеет права
	// зависеть от того, чем кончилась уборка.
	try {
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		resetSpeechTranscriptionCacheForRestart();
	} finally {
		try {
			await durableLock?.release();
		} finally {
			try {
				await app?.close();
			} finally {
				process.env = originalEnv;
				// Пул закрывается последним: он ждёт возврата всех выданных клиентов.
				await pool.end();
			}
		}
	}
});

describe("гарантия тенант-контекста в точке записи диктовки", () => {
	/**
	 * ГЛАВНАЯ ПРОВЕРКА. Вызывающий даёт обход и НЕ даёт тенант-контекста — ровно
	 * первая строка таблицы замеров. До правки запись отвергалась кодом 42501,
	 * ошибка глоталась в предупреждение фрагмента, строки в `ai_jobs` не
	 * появлялось, а вызывающий получал фрагмент как ни в чём не бывало.
	 */
	it("фрагмент сохраняется, когда вызывающий дал обход, но не дал тенант-контекста", async () => {
		const recordingId = `test-writepoint-bypass-${randomUUID()}`;
		resetSpeechTranscriptionCacheForRestart();

		const chunk = await withSuperuserBypass(async () =>
			recordSpeechTranscriptionChunk(
				buildChunkInput({ recordingId, transcript: textA }),
			),
		);

		assert.strictEqual(
			chunk.organizationId,
			ORG_A,
			"клиника фрагмента взята не из приема",
		);
		assert.deepStrictEqual(
			chunk.warnings.filter((warning) =>
				warning.startsWith(durableWriteFailureWarningPrefix),
			),
			[],
			"запись в базу отвергнута: гарантия по-прежнему берётся у вызывающего, а не из точки записи",
		);

		const row = await readDurableRow(recordingId, ORG_A);
		assert.ok(
			row,
			"строки диктовки нет в ai_jobs: под обходом без арендатора WITH CHECK отверг запись",
		);
		assert.strictEqual(row.organizationId, ORG_A);
		assert.strictEqual(row.visitId, VISIT_A);
		assert.strictEqual(row.resultText, textA);
	});

	/**
	 * Продуктивный путь целиком: настоящий маршрут под той же обёрткой
	 * `withTenantCtx`, которую вешает `server.ts`. Проверяется НЕ код ответа — он
	 * равен 201 и при отвергнутой записи тоже, — а появление строки в `ai_jobs`.
	 */
	it("POST /api/speech/transcribe-chunk кладёт строку диктовки в ai_jobs", async () => {
		assert.ok(app, "приложение не поднято");
		const recordingId = `test-writepoint-route-${randomUUID()}`;
		resetSpeechTranscriptionCacheForRestart();

		const response = await app.inject({
			method: "POST",
			url: "/api/speech/transcribe-chunk",
			headers: { "x-dente-clinic-token": tokenOrgA },
			payload: {
				recordingId,
				chunkIndex: 0,
				localTranscript: textRoute,
				language: "ru",
				source: "visit",
				patientId: PATIENT_A,
				visitId: VISIT_A,
			},
		});

		assert.strictEqual(
			response.statusCode,
			201,
			`маршрут не принял фрагмент: ${response.body}`,
		);
		const body = JSON.parse(response.body) as {
			chunk: SpeechTranscriptionChunk;
		};
		assert.strictEqual(body.chunk.organizationId, ORG_A);
		assert.deepStrictEqual(
			body.chunk.warnings.filter((warning) =>
				warning.startsWith(durableWriteFailureWarningPrefix),
			),
			[],
			"маршрут ответил 201, но текст в базу не лёг — именно это и не ловил ни один тест",
		);

		const { row, attempt } = await waitForDurableRow(recordingId, ORG_A);
		assert.ok(
			row,
			`маршрут ответил 201, а строки диктовки в ai_jobs нет после ${attempt} проверок`,
		);
		assert.strictEqual(row.organizationId, ORG_A);
		assert.strictEqual(row.patientId, PATIENT_A);
		assert.strictEqual(row.resultText, textRoute);
	});

	/**
	 * Изоляция двух арендаторов на записи диктовки: каждая строка ложится своей
	 * клинике и не видна соседней. Оба вызова идут БЕЗ тенант-контекста
	 * вызывающего — клиника берётся из приема фрагмента, то есть проверяется та
	 * же гарантия точки записи, но уже на двух арендаторах сразу.
	 */
	it("диктовки двух клиник ложатся каждая своей и чужой не видны", async () => {
		const recordingA = `test-writepoint-iso-a-${randomUUID()}`;
		const recordingB = `test-writepoint-iso-b-${randomUUID()}`;
		resetSpeechTranscriptionCacheForRestart();

		await recordSpeechTranscriptionChunk(
			buildChunkInput({ recordingId: recordingA, transcript: textA }),
		);
		await recordSpeechTranscriptionChunk(
			buildChunkInput({
				recordingId: recordingB,
				transcript: textB,
				patientId: PATIENT_B,
				visitId: VISIT_B,
			}),
		);

		const rowA = await readDurableRow(recordingA, ORG_A);
		const rowB = await readDurableRow(recordingB, ORG_B);
		assert.ok(rowA, "диктовка клиники А не сохранена");
		assert.ok(rowB, "диктовка клиники Б не сохранена");
		assert.strictEqual(rowA.organizationId, ORG_A);
		assert.strictEqual(rowB.organizationId, ORG_B);
		assert.strictEqual(rowA.resultText, textA);
		assert.strictEqual(rowB.resultText, textB);

		// Чужому арендатору строка не видна, и скрывает её политика, а не предикат.
		assert.strictEqual(
			await countRowsVisibleTo(recordingA, ORG_A),
			1,
			"своя строка не видна своей клинике",
		);
		assert.strictEqual(
			await countRowsVisibleTo(recordingA, ORG_B),
			0,
			"строка клиники А видна клинике Б",
		);
		assert.strictEqual(
			await countRowsVisibleTo(recordingB, ORG_B),
			1,
			"своя строка не видна своей клинике",
		);
		assert.strictEqual(
			await countRowsVisibleTo(recordingB, ORG_A),
			0,
			"строка клиники Б видна клинике А",
		);

		// Горячий кэш общий на процесс, поэтому выдача обязана сужаться по клинике.
		assert.strictEqual(
			listSpeechTranscriptionChunks(recordingA, { organizationId: ORG_A })
				.length,
			1,
		);
		assert.strictEqual(
			listSpeechTranscriptionChunks(recordingA, { organizationId: ORG_B })
				.length,
			0,
		);
		assert.strictEqual(
			listSpeechTranscriptionChunks(recordingB, { organizationId: ORG_A })
				.length,
			0,
		);
		assert.strictEqual(
			listSpeechTranscriptionChunks(recordingB, { organizationId: ORG_B })
				.length,
			1,
		);
	});
});
