import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { and, eq, like } from "drizzle-orm";
import { db, pool } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { aiJobs, organizations, patients, visits } from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";
import {
	acquireSpeechDurableTestLock,
	type SpeechDurableTestLock,
} from "../../tests/support/speechDurableTestLock.js";
import {
	listSpeechTranscriptionChunks,
	recordSpeechTranscriptionChunk,
	resetSpeechTranscriptionCacheForRestart,
	SpeechChunkIdentityConflictError,
} from "../storage.js";

/**
 * Личность записи диктовки на настоящей PostgreSQL.
 *
 * Воспроизводится PROBE 2 ревьюера пакета R1: два приема одной клиники, горячий
 * кэш записи пуст, второй фрагмент несёт ЧУЖОЙ прием и ЧУЖОГО пациента.
 * Ревьюер получил одну строку ai_jobs с текстом обоих приемов под пациентом
 * первого:
 *   result_text: "VISIT-A DICTATION: patient A complaint.\nVISIT-B DICTATION: patient B complaint."
 *   envelope chunk visitIds: ["…400", "…401"]   patient_id: …101
 * Проверка личности жила только в горячем кэше, поэтому после вытеснения записи
 * из памяти она молча перестала работать, а слияние с сохранённым конвертом
 * личность не перепроверяло.
 *
 * ПОЧЕМУ КЛИНИКА ЗДЕСЬ СВОЯ, А НЕ «ПЕРВЫЕ ПРИЕМЫ ИЗ БАЗЫ».
 *
 * Прежде файл выбирал два приема разных пациентов одной клиники запросом к базе.
 * То же самое делали `storage.test.ts` и `storageRestoreCeiling.test.ts`, поэтому
 * все три писали долговременные записи диктовки в ОДНУ клинику, а `node --test`
 * гоняет файлы параллельными процессами против одной живой базы. Соседи ставят
 * предел восстановления в одну-две записи на клинику и требуют, чтобы этими
 * записями были ИХ собственные; каждая строка, записанная здесь, свежее и
 * вытесняла их из ранга. Набор упавших тестов из-за этого плавал от прогона к
 * прогону, причём падали соседи, а не этот файл.
 *
 * Своя клиника выводится из ИМЕНИ ФАЙЛА (`fixtureUuid`, разбор — в
 * `tests/support/fixtureOrganizations.ts`): выдать один блок двум файлам нельзя,
 * для этого им пришлось бы совпасть именем. Плюс консультационная блокировка
 * PostgreSQL (`acquireSpeechDurableTestLock`) — над рангом по клинике стоит общий
 * на всю базу предел восстановления, и он глобален по определению, поэтому файлы,
 * пишущие такие строки, проходят по одному. Разбор — в
 * `tests/support/speechDurableTestLock.ts`.
 *
 * Блокировка защищает и аудит всей таблицы ниже: пока он идёт, ни один соседний
 * файл не может дописать в `ai_jobs` строку диктовки.
 *
 * Утверждения тестов не ослаблены: тот же сценарий PROBE 2, тот же аудит по всей
 * таблице без сужения по клинике, тот же разбор уже смешанной строки.
 */

const durableRecordingPathPrefix = "speech-recording://";
const visitAText = "Прием А: жалобы на боль в зубе 26 при накусывании.";
const visitASecondText =
	"Прием А: диагноз K04.0, план эндодонтического лечения.";
const visitBText = "Прием Б: жалобы на скол пломбы в зубе 37.";

type SpeechChunkInput = Omit<
	SpeechTranscriptionChunk,
	"id" | "organizationId" | "createdAt"
>;

const FIXTURE = "speechStorageIdentity";
const ORG = fixtureUuid(FIXTURE, 1);
const PATIENT_A = fixtureUuid(FIXTURE, 2);
const PATIENT_B = fixtureUuid(FIXTURE, 3);
const VISIT_A = fixtureUuid(FIXTURE, 4);
const VISIT_B = fixtureUuid(FIXTURE, 5);

/**
 * Два приема РАЗНЫХ пациентов в ОДНОЙ клинике: только так воспроизводится
 * слияние двух медицинских записей в одну строку. Разные клиники сюда не годятся —
 * фрагмент чужой клиники отсекается раньше, на определении организации.
 */
const clinicalPair = {
	organizationId: ORG,
	visitA: VISIT_A,
	patientA: PATIENT_A,
	visitB: VISIT_B,
	patientB: PATIENT_B,
};

let durableLock: SpeechDurableTestLock | null = null;

/**
 * Лимиты кэша читаются из окружения на каждом вызове, поэтому границу вытеснения
 * проходим без ожидания 80 записей. Значения возвращаются обратно.
 */
async function withEnv(
	values: Record<string, string>,
	run: () => Promise<void>,
): Promise<void> {
	const previous = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(values)) {
		previous.set(key, process.env[key]);
		process.env[key] = value;
	}
	try {
		await run();
	} finally {
		for (const [key, value] of previous) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

function durableRowFilter(recordingId: string, organizationId: string) {
	return and(
		eq(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}${recordingId}`),
		eq(aiJobs.organizationId, organizationId),
	);
}

function buildChunkInput(
	overrides: Partial<SpeechChunkInput> & {
		recordingId: string;
		visitId: string;
		patientId: string;
		transcript: string;
	},
): SpeechChunkInput {
	return {
		chunkIndex: 0,
		source: "visit",
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

/**
 * Чтение долговременной строки записи — под тенант-контекстом её клиники: под
 * принудительным RLS запрос без `app.current_tenant` возвращает ноль строк и
 * ошибки не даёт, то есть «строка не найдена» стало бы утверждением о чтении, а
 * не о том, что записал разбор диктовки.
 */
async function readDurableRow(recordingId: string, organizationId: string) {
	const [row] = await withFixtureTenant(organizationId, async () =>
		db
			.select({
				visitId: aiJobs.visitId,
				patientId: aiJobs.patientId,
				resultText: aiJobs.resultText,
				inputText: aiJobs.inputText,
			})
			.from(aiJobs)
			.where(durableRowFilter(recordingId, organizationId))
			.limit(1),
	);
	return row;
}

function envelopeIdentities(inputText: string | null): {
	visitIds: string[];
	patientIds: string[];
} {
	const parsed = JSON.parse(inputText ?? "{}") as {
		chunks?: Array<{ visitId?: string | null; patientId?: string | null }>;
	};
	const chunks = parsed.chunks ?? [];
	return {
		visitIds: [
			...new Set(chunks.map((chunk) => chunk.visitId ?? "null")),
		].sort(),
		patientIds: [
			...new Set(chunks.map((chunk) => chunk.patientId ?? "null")),
		].sort(),
	};
}

before(async () => {
	// Блокировка берётся ПЕРВОЙ, до любой записи в базу: свежие строки этого файла
	// видны общему пределу восстановления, который измеряет соседний файл, и аудиту
	// всей таблицы ниже.
	durableLock = await acquireSpeechDurableTestLock();

	// Уборка НА ВХОДЕ: прогон, убитый снаружи (Ctrl+C, закрытая труба), до after не
	// доходит. Здесь это особенно важно — последний тест умышленно создаёт строку со
	// смешанным конвертом, и остаться она не должна: аудит всей таблицы принял бы её
	// за незакрытый дефект.
	await purgeFixtureOrganizations([ORG]);
	// Сев под тенант-контекстом клиники: `WITH CHECK` тенант-таблиц сверяет
	// `organization_id` (у `organizations` — `id`) с `app.current_tenant` и
	// дизъюнкта обхода не имеет, поэтому вставка без контекста отвергается кодом
	// 42501 и клиника не заводится вовсе.
	await withFixtureTenant(ORG, async () => {
		await db
			.insert(organizations)
			.values({ id: ORG, name: "Клиника личности записи диктовки" });
		// Без onConflictDoNothing: он молча оставил бы чужую строку с тем же первичным
		// ключом, и тест пошёл бы по данным соседнего файла.
		await db.insert(patients).values([
			{
				id: PATIENT_A,
				organizationId: ORG,
				fullName: "Ковалёва Мария Сергеевна",
				birthDate: "1983-07-24",
			},
			{
				id: PATIENT_B,
				organizationId: ORG,
				fullName: "Мельник Павел Олегович",
				birthDate: "1976-02-15",
			},
		]);
		await db.insert(visits).values([
			{
				id: VISIT_A,
				organizationId: ORG,
				patientId: PATIENT_A,
				status: "draft",
			},
			{
				id: VISIT_B,
				organizationId: ORG,
				patientId: PATIENT_B,
				status: "draft",
			},
		]);
	});
});

after(async () => {
	// Уборка — в try, освобождение ресурсов — в finally. Разбор, почему иначе
	// прогон переставал завершаться вовсе, лежит у `release()` в
	// `tests/support/speechDurableTestLock.ts`: сессионная блокировка не снимается
	// ни исключением, ни откатом, поэтому её снятие не имеет права зависеть от
	// того, чем кончилась уборка.
	try {
		// Каталожная уборка снимает записи диктовки вместе с клиникой и делает это
		// ВНУТРИ блокировки: оставленные строки достались бы следующему файлу как свежие
		// чужие записи и забрали бы общий предел восстановления.
		await purgeFixtureOrganizations([ORG]);
		resetSpeechTranscriptionCacheForRestart();
	} finally {
		// Сначала блокировка, потом пул: pool.end() ждёт возврата всех выданных
		// клиентов и на удержанном соединении блокировки не завершился бы. Вложенный
		// finally по той же причине: сорвавшееся снятие блокировки не должно оставить
		// пул открытым — процесс с живым сокетом до базы не выходит.
		try {
			await durableLock?.release();
		} finally {
			await pool.end();
		}
	}
});

describe("личность записи диктовки", () => {
	it("после вытеснения из кэша фрагмент чужого приема отклоняется, а не сливается в одну запись", async () => {
		const pair = clinicalPair;
		const recordingId = `test-identity-${randomUUID()}`;
		const decoyRecordingId = `test-identity-decoy-${randomUUID()}`;

		await withEnv({ DENTAL_SPEECH_CACHED_RECORDINGS: "1" }, async () => {
			resetSpeechTranscriptionCacheForRestart();
			await recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId,
					chunkIndex: 0,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: visitAText,
				}),
			);

			/**
			 * Вытеснение, а НЕ сброс кэша. Бюджет клиники — одна запись, поэтому
			 * фрагменты первой записи выбрасываются из памяти: они уже в базе.
			 * Сброс кэша тут не годится — после него восстановление вернуло бы конверт
			 * в память, сработала бы старая проверка по кэшу и сценарий ревьюера не
			 * воспроизвёлся бы.
			 */
			await recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId: decoyRecordingId,
					chunkIndex: 0,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: "Другая запись той же клиники, занимающая бюджет кэша.",
				}),
			);
			assert.strictEqual(
				listSpeechTranscriptionChunks(recordingId).length,
				0,
				"запись не вытеснена из памяти: сценарий проверки личности по базе не воспроизводится",
			);

			let rejection: unknown = null;
			try {
				await recordSpeechTranscriptionChunk(
					buildChunkInput({
						recordingId,
						chunkIndex: 1,
						visitId: pair.visitB,
						patientId: pair.patientB,
						transcript: visitBText,
					}),
				);
			} catch (error) {
				rejection = error;
			}

			// Сначала состояние строки: при провале видно ровно то, что получил ревьюер.
			const row = await readDurableRow(recordingId, pair.organizationId);
			assert.ok(row, "строка расшифровки не найдена в ai_jobs");
			assert.strictEqual(
				row.resultText,
				visitAText,
				"в одной строке ai_jobs собран текст двух приемов: это чужая медицинская запись",
			);
			assert.strictEqual(
				row.visitId,
				pair.visitA,
				"строка перестала принадлежать своему приему",
			);
			assert.strictEqual(
				row.patientId,
				pair.patientA,
				"строка перестала принадлежать своему пациенту",
			);
			assert.deepStrictEqual(
				envelopeIdentities(row.inputText),
				{ visitIds: [pair.visitA], patientIds: [pair.patientA] },
				"в конверте записи оказались фрагменты двух приемов",
			);

			// Затем отказ: он обязан быть явным, с кодом 409, а не тихим приёмом текста.
			assert.ok(
				rejection instanceof SpeechChunkIdentityConflictError,
				`фрагмент чужого приема принят без отказа: ${String(rejection)}`,
			);
			assert.strictEqual(rejection.statusCode, 409);

			// Отклонённый фрагмент не остаётся в памяти: иначе вытеснение выбросит его
			// молча по общему ключу recordingId#chunkIndex.
			assert.deepStrictEqual(
				listSpeechTranscriptionChunks(recordingId).map(
					(chunk) => chunk.visitId,
				),
				[],
				"отклонённый фрагмент остался в горячем кэше",
			);

			// Своя диктовка после отказа продолжает сохраняться: запрет не должен
			// ломать долговременное хранение для законного приема.
			await recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId,
					chunkIndex: 1,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: visitASecondText,
				}),
			);
			const ownRow = await readDurableRow(recordingId, pair.organizationId);
			assert.ok(ownRow);
			assert.strictEqual(
				ownRow.resultText,
				`${visitAText}\n${visitASecondText}`,
				"после отказа чужому фрагменту перестала сохраняться своя диктовка",
			);
		});
	});

	/**
	 * Второй путь к той же строке: два одновременных фрагмента разных приемов с
	 * одной recordingId. Горячий кэш здесь ни при чём — на момент проверки в нём
	 * ещё нет ни одного фрагмента записи, поэтому проверка по памяти пропускает
	 * оба, а очередь записи по recordingId сливает их в одну строку.
	 */
	it("одновременные фрагменты двух приемов не собираются в одну строку", async () => {
		const pair = clinicalPair;
		const recordingId = `test-identity-race-${randomUUID()}`;

		const results = await Promise.allSettled([
			recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId,
					chunkIndex: 0,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: visitAText,
				}),
			),
			recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId,
					chunkIndex: 1,
					visitId: pair.visitB,
					patientId: pair.patientB,
					transcript: visitBText,
				}),
			),
		]);

		const row = await readDurableRow(recordingId, pair.organizationId);
		assert.ok(row, "строка расшифровки не найдена в ai_jobs");
		const holdsVisitA = (row.resultText ?? "").includes(visitAText);
		const holdsVisitB = (row.resultText ?? "").includes(visitBText);
		assert.ok(
			holdsVisitA !== holdsVisitB,
			`в одной строке ai_jobs текст двух приемов: ${JSON.stringify(row.resultText)}`,
		);
		const identities = envelopeIdentities(row.inputText);
		assert.strictEqual(
			identities.visitIds.length,
			1,
			`конверт держит два приема: ${JSON.stringify(identities)}`,
		);
		assert.strictEqual(
			identities.patientIds.length,
			1,
			`конверт держит двух пациентов: ${JSON.stringify(identities)}`,
		);

		const rejections = results.filter(
			(result): result is PromiseRejectedResult => result.status === "rejected",
		);
		assert.strictEqual(
			rejections.length,
			1,
			"фрагмент чужого приема принят без отказа",
		);
		assert.ok(
			rejections[0]?.reason instanceof SpeechChunkIdentityConflictError,
			`отказ пришёл не как конфликт личности записи: ${String(rejections[0]?.reason)}`,
		);
	});

	/**
	 * Аудит всей таблицы: ни одна строка диктовки не держит текст двух приемов или
	 * двух пациентов. Запрос умышленно не сужен по клинике — смысл аудита в том,
	 * чтобы увидеть такие строки везде, где они есть.
	 */
	it("в базе нет строки диктовки с фрагментами двух приемов или двух пациентов", async () => {
		/*
		 * Обход RLS здесь — на ЧТЕНИЕ и только на него. Аудит по построению смотрит
		 * ВСЮ таблицу, а роль приложения под FORCE RLS видит строки только своего
		 * арендатора: под тенант-контекстом этот запрос перестал бы быть аудитом и
		 * молча отчитывался бы «чисто» о клиниках, которых не видел. Тот же приём
		 * применяет `assertNoFixtureOrganizationSurvived` в
		 * `tests/support/fixtureOrganizations.ts` и по той же причине.
		 */
		const rows = await withSuperuserBypass(async (tx) =>
			tx
				.select({
					id: aiJobs.id,
					organizationId: aiJobs.organizationId,
					inputText: aiJobs.inputText,
				})
				.from(aiJobs)
				.where(
					and(
						eq(aiJobs.kind, "voice_transcription"),
						like(aiJobs.inputStoragePath, `${durableRecordingPathPrefix}%`),
					),
				),
		);

		const mixed = rows
			.map((row) => ({
				id: row.id,
				organizationId: row.organizationId,
				...envelopeIdentities(row.inputText),
			}))
			.filter((row) => row.visitIds.length > 1 || row.patientIds.length > 1);

		console.log(`SPEECH ROWS SCANNED: ${rows.length}`);
		assert.deepStrictEqual(
			mixed,
			[],
			"в базе есть строки диктовки с текстом двух приемов",
		);
	});

	/**
	 * Строка, УЖЕ смешанная прежним дефектом. Такие конверты существуют: ревьюер
	 * получил их прогоном. Правка обязана вести себя с ними так:
	 *   1. не уничтожать чужой текст (разделить два приема автоматически нельзя —
	 *      это угадывание в медицинской документации);
	 *   2. сказать об этом в предупреждениях строки, чтобы разбор сделал человек;
	 *   3. не принимать в неё НОВЫЕ чужие фрагменты.
	 * Конверт портится здесь тем же способом, каким его портил дефект: в него
	 * дописывается полный фрагмент другого приема и другого пациента.
	 * Тест идёт последним и удаляет свою строку сам, иначе он сломал бы аудит выше.
	 */
	it("уже смешанная строка не теряет текст и объявляет о ручном разборе", async () => {
		const pair = clinicalPair;
		const recordingId = `test-identity-legacy-${randomUUID()}`;
		const decoyRecordingId = `test-identity-legacy-decoy-${randomUUID()}`;

		await withEnv({ DENTAL_SPEECH_CACHED_RECORDINGS: "1" }, async () => {
			resetSpeechTranscriptionCacheForRestart();
			await recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId,
					chunkIndex: 0,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: visitAText,
				}),
			);

			const before = await readDurableRow(recordingId, pair.organizationId);
			assert.ok(before, "строка расшифровки не найдена в ai_jobs");
			const envelope = JSON.parse(before.inputText ?? "{}") as {
				chunks: unknown[];
			};
			envelope.chunks.push({
				...buildChunkInput({
					recordingId,
					chunkIndex: 1,
					visitId: pair.visitB,
					patientId: pair.patientB,
					transcript: visitBText,
				}),
				id: randomUUID(),
				organizationId: pair.organizationId,
				recordingId,
				createdAt: new Date().toISOString(),
			});
			// Порча конверта — обычный `UPDATE` по тенант-таблице: без контекста он
			// тронул бы ноль строк и промолчал, а сценарий «уже смешанная строка» просто
			// не воспроизвёлся бы.
			await withFixtureTenant(pair.organizationId, async () => {
				await db
					.update(aiJobs)
					.set({
						inputText: JSON.stringify(envelope),
						resultText: `${visitAText}\n${visitBText}`,
					})
					.where(durableRowFilter(recordingId, pair.organizationId));
			});

			// Кэш записи опустошается вытеснением: иначе чужой фрагмент поднялся бы в
			// память при восстановлении и быстрый отказ по кэшу сработал бы раньше.
			resetSpeechTranscriptionCacheForRestart();
			await recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId: decoyRecordingId,
					chunkIndex: 0,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: "Другая запись той же клиники, занимающая бюджет кэша.",
				}),
			);
			assert.strictEqual(
				listSpeechTranscriptionChunks(recordingId).length,
				0,
				"смешанная запись осталась в памяти: проверка по сохранённому конверту не воспроизводится",
			);

			await recordSpeechTranscriptionChunk(
				buildChunkInput({
					recordingId,
					chunkIndex: 2,
					visitId: pair.visitA,
					patientId: pair.patientA,
					transcript: visitASecondText,
				}),
			);

			const [row] = await withFixtureTenant(pair.organizationId, async () =>
				db
					.select({
						visitId: aiJobs.visitId,
						patientId: aiJobs.patientId,
						resultText: aiJobs.resultText,
						inputText: aiJobs.inputText,
						warnings: aiJobs.warnings,
					})
					.from(aiJobs)
					.where(durableRowFilter(recordingId, pair.organizationId))
					.limit(1),
			);
			assert.ok(row, "строка расшифровки исчезла");
			assert.ok(
				(row.resultText ?? "").includes(visitBText),
				"текст чужого приема удалён из строки: это уничтожение медицинского текста",
			);
			assert.ok(
				(row.resultText ?? "").includes(visitASecondText),
				"своя новая диктовка не попала в строку",
			);
			assert.strictEqual(
				row.visitId,
				pair.visitA,
				"подпись строки ушла к другому приему",
			);
			assert.strictEqual(
				row.patientId,
				pair.patientA,
				"подпись строки ушла к другому пациенту",
			);
			assert.strictEqual(
				JSON.parse(row.inputText ?? "{}").chunks.length,
				3,
				"конверт потерял фрагменты",
			);
			assert.ok(
				(row.warnings ?? []).some((warning) =>
					warning.includes("разобрать вручную"),
				),
				`строка не объявляет о смешанном тексте: ${JSON.stringify(row.warnings)}`,
			);

			// Новый чужой фрагмент в такую строку всё равно не принимается.
			await assert.rejects(
				() =>
					recordSpeechTranscriptionChunk(
						buildChunkInput({
							recordingId,
							chunkIndex: 3,
							visitId: pair.visitB,
							patientId: pair.patientB,
							transcript: "Прием Б: продолжение осмотра.",
						}),
					),
				(error: unknown) => {
					assert.ok(error instanceof SpeechChunkIdentityConflictError);
					return true;
				},
			);

			// Смешанная строка удаляется здесь же: она умышленно создана этим тестом.
			// Под контекстом своей клиники, а не под обходом: у `DELETE` нет
			// `WITH CHECK`, он смотрит только в `USING`, где дизъюнкт обхода истинен для
			// КАЖДОЙ строки, — ошибка в предикате снесла бы чужие записи.
			await withFixtureTenant(pair.organizationId, async () => {
				await db
					.delete(aiJobs)
					.where(durableRowFilter(recordingId, pair.organizationId));
			});
		});
	});
});
