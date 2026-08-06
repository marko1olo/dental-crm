import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { eq } from "drizzle-orm";
import { db, pool } from "../../db/client.js";
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
	assembleSpeechRecording,
	ensureSpeechTranscriptionChunksRestored,
	listSpeechTranscriptionChunks,
	recordSpeechTranscriptionChunk,
	resetSpeechTranscriptionCacheForRestart,
	speechDurableRestoreState,
} from "../storage.js";

/**
 * Потолок памяти восстановления расшифровок, на настоящей PostgreSQL.
 *
 * ЧТО ЗДЕСЬ ЗАКРЫВАЕТСЯ. Восстановление ранжирует записи
 * row_number() OVER (PARTITION BY organization_id) и берёт первые
 * DENTAL_SPEECH_CACHED_RECORDINGS в КАЖДОЙ организации. Внешнего LIMIT у запроса
 * не было, поэтому число поднятых в память записей равнялось
 * (предел клиники) x (число клиник) — то есть занятая при старте память росла с
 * каждым новым арендатором, и ни одного измеримого предела у неё не было.
 * Ни один тест этого не ловил: все проверки границы перезапуска работали с
 * одной-двумя записями, где разница между общим и поклиничным пределом не видна.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ ИМЕННО ТАК. Сначала измеряется прежнее поведение — с
 * заведомо огромным общим пределом восстановление поднимает ВСЕ четыре записи
 * двух клиник. Потом тот же набор данных восстанавливается с общим пределом в
 * две записи. Без первого замера утверждение «предел работает» было бы
 * непроверяемым: две записи могли бы означать, что в базе их всего две.
 *
 * ПОЧЕМУ ЗДЕСЬ ДВА СЛОЯ ИЗОЛЯЦИИ, А НЕ ОДИН.
 *
 * Прежде этот файл брал клинику запросом «первый прием из базы»
 * (`.from(visits).limit(1)`) и вторую — «пациент любой другой организации». То же
 * самое делали `storage.test.ts` и `storageIdentity.test.ts`, то есть все три
 * получали ОДНУ И ТУ ЖЕ пару клиник, а `node --test` гоняет файлы параллельными
 * процессами против одной живой базы. Дальше сталкивались два требования:
 * `storage.test.ts` ставил предел одной записи на клинику и требовал, чтобы этой
 * одной была его собственная, а здешний первый замер ставит две и требует своих
 * двух. Кто засеял свежее — тот и вытеснил соседа из ранга по клинике, поэтому
 * набор упавших тестов плавал от прогона к прогону, а причина выглядела как
 * дефект восстановления, которого нет.
 *
 * СЛОЙ 1 — своя пара клиник, выведенная из имени файла (`fixtureUuid`, см.
 * `tests/support/fixtureOrganizations.ts`). Он закрывает ранг ВНУТРИ клиники:
 * `row_number() OVER (PARTITION BY organization_id)` считается по строкам одной
 * организации, и пока в неё пишет только этот файл, «моя запись самая свежая в
 * моей клинике» — утверждение о собственных данных.
 *
 * СЛОЙ 2 — консультационная блокировка PostgreSQL (`acquireSpeechDurableTestLock`).
 * Она нужна ровно из-за второй половины первого теста: общий предел
 * `DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL` действует на ВСЮ базу, порядок отбора
 * `(recording_rank ASC, updated_at DESC)` пускает под него самые свежие записи
 * ранга 1 ЛЮБЫХ клиник, поэтому чужая свежая строка в чужой клинике забирает
 * предел целиком, а `organizations.size === 2` получает ноль вместо двух.
 * Своей клиникой это не лечится: проверяемый ресурс глобален по определению.
 * Разбор механизма — в `tests/support/speechDurableTestLock.ts`.
 *
 * Утверждения тестов при этом не ослаблены ни одним символом: измеряется тот же
 * общий потолок на всю базу, та же справедливость между клиниками и тот же
 * замер прежнего поведения. Изменилось только то, ЧЬИ строки лежат в базе в
 * момент замера.
 */

const durableRecordingPathPrefix = "speech-recording://";
const budgetWarningMarker = "общего предела памяти сервера";

type SpeechChunkInput = Omit<
	SpeechTranscriptionChunk,
	"id" | "organizationId" | "createdAt"
>;

const FIXTURE = "speechStorageRestoreCeiling";
const ORG_OWN = fixtureUuid(FIXTURE, 1);
const ORG_OTHER = fixtureUuid(FIXTURE, 2);
const PATIENT_OWN = fixtureUuid(FIXTURE, 3);
const VISIT_OWN = fixtureUuid(FIXTURE, 4);
/** У соседней клиники приема нет намеренно: клиника фрагмента определяется и по пациенту. */
const PATIENT_OTHER = fixtureUuid(FIXTURE, 5);

const ownScope = {
	visitId: VISIT_OWN,
	patientId: PATIENT_OWN,
	organizationId: ORG_OWN,
};
const otherScope = { patientId: PATIENT_OTHER, organizationId: ORG_OTHER };

let durableLock: SpeechDurableTestLock | null = null;

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

function buildChunkInput(
	overrides: Partial<SpeechChunkInput> & { recordingId: string },
): SpeechChunkInput {
	const transcript =
		overrides.transcript ?? "Осмотр: жалоб нет, слизистая без изменений.";
	return {
		chunkIndex: 0,
		source: "visit",
		patientId: ownScope.patientId,
		visitId: ownScope.visitId,
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
			wordCount: 6,
			charCount: transcript.length,
			durationMs: 4000,
			bytesPerSecond: 512,
			providerWarnings: [],
			signals: ["unit_test"],
			nextAction: "Проверьте текст перед подписанием приема.",
		},
		warnings: [],
		clientRecordedAt: new Date().toISOString(),
		...overrides,
		transcript,
	};
}

/** Одна запись диктовки в указанной клинике; возвращает её recordingId. */
async function seedRecording(
	label: string,
	scope: { patientId: string; visitId: string | null },
	transcripts: string[],
): Promise<string> {
	const recordingId = `test-ceiling-${label}-${randomUUID()}`;
	for (const [chunkIndex, transcript] of transcripts.entries()) {
		await recordSpeechTranscriptionChunk(
			buildChunkInput({
				recordingId,
				chunkIndex,
				transcript,
				patientId: scope.patientId,
				visitId: scope.visitId,
			}),
		);
	}
	return recordingId;
}

before(async () => {
	// Блокировка берётся ПЕРВОЙ, до любой записи в базу: измеряется общий на всю
	// базу потолок, и окно замера обязано начинаться раньше собственного засева.
	durableLock = await acquireSpeechDurableTestLock();

	// Уборка НА ВХОДЕ: прогон, убитый снаружи (Ctrl+C, закрытая труба), до after не
	// доходит и оставляет свои клиники в живой базе. Наследовать их нельзя —
	// старые записи диктовки исказили бы и ранг по клинике, и общий потолок.
	await purgeFixtureOrganizations([ORG_OWN, ORG_OTHER]);
	// Сев идёт под тенант-контекстом, и на каждую клинику он свой:
	// `app.current_tenant` хранит РОВНО одного арендатора, а `WITH CHECK`
	// тенант-таблиц сверяет с ним `organization_id` и дизъюнкта обхода не имеет —
	// одним списком `values([...])` две клиники не завести, вторая строка получает
	// 42501.
	await withFixtureTenant(ORG_OWN, async () => {
		await db
			.insert(organizations)
			.values({ id: ORG_OWN, name: "Клиника потолка восстановления" });
		// Без onConflictDoNothing: он молча оставил бы чужую строку с тем же первичным
		// ключом, и тест пошёл бы по данным соседнего файла.
		await db.insert(patients).values({
			id: PATIENT_OWN,
			organizationId: ORG_OWN,
			fullName: "Ефимова Ольга Дмитриевна",
			birthDate: "1981-04-09",
		});
		await db.insert(visits).values({
			id: VISIT_OWN,
			organizationId: ORG_OWN,
			patientId: PATIENT_OWN,
			status: "draft",
		});
	});
	await withFixtureTenant(ORG_OTHER, async () => {
		await db.insert(organizations).values({
			id: ORG_OTHER,
			name: "Соседняя клиника потолка восстановления",
		});
		await db.insert(patients).values({
			id: PATIENT_OTHER,
			organizationId: ORG_OTHER,
			fullName: "Носов Кирилл Андреевич",
			birthDate: "1990-09-21",
		});
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
		// ВНУТРИ блокировки: оставленные строки достались бы следующему файлу как
		// свежие чужие записи ранга 1 и снова забрали бы общий предел.
		await purgeFixtureOrganizations([ORG_OWN, ORG_OTHER]);
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

describe("потолок памяти восстановления расшифровок", () => {
	it("общее число поднятых записей не растёт с числом клиник", async () => {
		const own = ownScope;
		const other = otherScope;

		resetSpeechTranscriptionCacheForRestart();
		const ownFirst = await seedRecording(
			"own-1",
			{ patientId: own.patientId, visitId: own.visitId },
			["Первая запись своей клиники."],
		);
		const otherFirst = await seedRecording(
			"other-1",
			{ patientId: other.patientId, visitId: null },
			["Первая запись соседней клиники."],
		);
		const ownSecond = await seedRecording(
			"own-2",
			{ patientId: own.patientId, visitId: own.visitId },
			["Вторая запись своей клиники."],
		);
		const otherSecond = await seedRecording(
			"other-2",
			{ patientId: other.patientId, visitId: null },
			["Вторая запись соседней клиники."],
		);
		const seeded = [ownFirst, otherFirst, ownSecond, otherSecond];

		// Прежнее поведение: предел на клинику x две клиники = четыре записи, и
		// никакого общего предела над этим произведением.
		await withEnv(
			{
				DENTAL_SPEECH_CACHED_RECORDINGS: "2",
				DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "1000",
				DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "1000",
				DENTAL_SPEECH_RESTORED_CHARS_TOTAL: "1000000",
			},
			async () => {
				resetSpeechTranscriptionCacheForRestart();
				await ensureSpeechTranscriptionChunksRestored();
				for (const recordingId of seeded) {
					assert.strictEqual(
						listSpeechTranscriptionChunks(recordingId).length,
						1,
						`без общего предела должны подниматься все записи обеих клиник, не поднялась ${recordingId}`,
					);
				}
				assert.ok(
					speechDurableRestoreState().loadedRecordings >= 4,
					"замер прежнего поведения не состоялся: четыре записи двух клиник не поднялись",
				);
			},
		);

		// Тот же набор данных с общим пределом в две записи.
		await withEnv(
			{
				DENTAL_SPEECH_CACHED_RECORDINGS: "2",
				DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "2",
				DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "1000",
				DENTAL_SPEECH_RESTORED_CHARS_TOTAL: "1000000",
			},
			async () => {
				resetSpeechTranscriptionCacheForRestart();
				await ensureSpeechTranscriptionChunksRestored();
				const state = speechDurableRestoreState();
				assert.strictEqual(
					state.loadedRecordings,
					2,
					"общий предел восстановления не применён: поднято не две записи",
				);

				const liveSeeded = seeded.filter(
					(recordingId) =>
						listSpeechTranscriptionChunks(recordingId).length > 0,
				);
				assert.ok(
					liveSeeded.length <= 2,
					`общий предел пробит: в памяти ${liveSeeded.length} из четырёх засеянных записей`,
				);

				// Справедливость сохранена: под общим пределом первыми идут самые свежие
				// записи КАЖДОЙ клиники, а не две записи одной. Иначе общий предел вернул
				// бы ту несправедливость, ради которой появилось ранжирование по клинике.
				const organizations = new Set(
					seeded
						.flatMap((recordingId) =>
							listSpeechTranscriptionChunks(recordingId),
						)
						.map((chunk) => chunk.organizationId),
				);
				assert.strictEqual(
					organizations.size,
					2,
					"общий предел забрала одна клиника: под потолком должны быть записи обеих",
				);
			},
		);
	});

	it("запись, не влезающая в бюджет фрагментов, не поднимается половиной и не теряет текст", async () => {
		const own = ownScope;

		resetSpeechTranscriptionCacheForRestart();
		const lines = [
			"Жалобы: боль зуб 36.",
			"Диагноз K04.0 пульпит.",
			"План: эндодонтическое лечение.",
		];
		const recordingId = await seedRecording(
			"chunk-budget",
			{ patientId: own.patientId, visitId: own.visitId },
			lines,
		);

		await withEnv(
			{
				DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "1000",
				DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "2",
				DENTAL_SPEECH_RESTORED_CHARS_TOTAL: "1000000",
			},
			async () => {
				resetSpeechTranscriptionCacheForRestart();
				await ensureSpeechTranscriptionChunksRestored();

				assert.strictEqual(
					listSpeechTranscriptionChunks(recordingId).length,
					0,
					"запись поднята частично: половина записи выглядит как запись с дырами в нумерации",
				);
				assert.ok(
					speechDurableRestoreState().skippedRecordings >= 1,
					"пропуск записи не посчитан: потолок стал бы неизмеримым",
				);
				assert.ok(
					assembleSpeechRecording(recordingId).warnings.some((warning) =>
						warning.includes(budgetWarningMarker),
					),
					"пропуск по бюджету не объявлен в предупреждениях сборки записи",
				);

				// Пропуск не теряет текст: строка в базе цела, и очередной фрагмент той
				// же записи сливается с сохранённым конвертом, а не с пустым кэшем.
				// Чтение — под тенант-контекстом своей клиники: без него оно вернуло бы
				// ноль строк и «строка расшифровки исчезла» было бы неправдой.
				const [rowBefore] = await withFixtureTenant(
					own.organizationId,
					async () =>
						db
							.select({ resultText: aiJobs.resultText })
							.from(aiJobs)
							.where(
								eq(
									aiJobs.inputStoragePath,
									`${durableRecordingPathPrefix}${recordingId}`,
								),
							)
							.limit(1),
				);
				assert.ok(rowBefore, "строка расшифровки исчезла из ai_jobs");
				assert.strictEqual(
					rowBefore.resultText,
					lines.join("\n"),
					"текст пропущенной записи изменился в базе",
				);

				const fourthLine = "Контроль через семь дней.";
				await recordSpeechTranscriptionChunk(
					buildChunkInput({
						recordingId,
						chunkIndex: lines.length,
						transcript: fourthLine,
						patientId: own.patientId,
						visitId: own.visitId,
					}),
				);

				const [rowAfter] = await withFixtureTenant(
					own.organizationId,
					async () =>
						db
							.select({ resultText: aiJobs.resultText })
							.from(aiJobs)
							.where(
								eq(
									aiJobs.inputStoragePath,
									`${durableRecordingPathPrefix}${recordingId}`,
								),
							)
							.limit(1),
				);
				assert.ok(
					rowAfter,
					"строка расшифровки исчезла из ai_jobs после дозаписи",
				);
				assert.strictEqual(
					rowAfter.resultText,
					[...lines, fourthLine].join("\n"),
					"не поднятый в память текст затёрт следующим фрагментом: усечение восстановления потеряло текст",
				);
			},
		);
	});

	it("символьный бюджет отказывает длинной записи и оставляет её в базе целой", async () => {
		const own = ownScope;

		resetSpeechTranscriptionCacheForRestart();
		const longTranscript = "Развернутый протокол осмотра и лечения. ".repeat(
			120,
		);
		const recordingId = await seedRecording(
			"char-budget",
			{ patientId: own.patientId, visitId: own.visitId },
			[longTranscript],
		);

		await withEnv(
			{
				DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL: "1000",
				DENTAL_SPEECH_RESTORED_CHUNKS_TOTAL: "1000",
				DENTAL_SPEECH_RESTORED_CHARS_TOTAL: String(longTranscript.length - 1),
			},
			async () => {
				resetSpeechTranscriptionCacheForRestart();
				await ensureSpeechTranscriptionChunksRestored();

				assert.strictEqual(
					listSpeechTranscriptionChunks(recordingId).length,
					0,
					"запись длиннее символьного бюджета всё равно поднята в память",
				);
				const state = speechDurableRestoreState();
				assert.ok(
					state.skippedRecordings >= 1,
					"отказ по символьному бюджету не посчитан",
				);
				assert.ok(
					state.cachedChars <= longTranscript.length - 1,
					`символьный бюджет пробит: в памяти ${state.cachedChars} символов при пределе ${longTranscript.length - 1}`,
				);

				const [row] = await withFixtureTenant(own.organizationId, async () =>
					db
						.select({ resultText: aiJobs.resultText })
						.from(aiJobs)
						.where(
							eq(
								aiJobs.inputStoragePath,
								`${durableRecordingPathPrefix}${recordingId}`,
							),
						)
						.limit(1),
				);
				assert.ok(row, "строка длинной расшифровки исчезла из ai_jobs");
				// result_text собирается через chunk.transcript.trim(), поэтому в базе
				// лежит текст без хвостового пробела; в конверте и в бюджете участвует
				// исходная длина фрагмента.
				assert.strictEqual(
					row.resultText,
					longTranscript.trim(),
					"текст длинной записи изменился в базе",
				);
			},
		);
	});
});
