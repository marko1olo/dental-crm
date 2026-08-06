import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../../db/client.js";

/**
 * ВЗАИМНОЕ ИСКЛЮЧЕНИЕ ДЛЯ ТЕСТОВ, КОТОРЫЕ ПИШУТ ДОЛГОВРЕМЕННЫЕ ЗАПИСИ ДИКТОВКИ
 * (`ai_jobs`, kind = voice_transcription, input_storage_path
 * `speech-recording://…`) В ЖИВУЮ БАЗУ.
 *
 * ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ ИЗОЛЯЦИИ ПО КЛИНИКЕ И ПОЧЕМУ ОДНОЙ ЕЁ НЕ ХВАТАЕТ.
 * Своя клиника на каждый файл (`tests/support/fixtureOrganizations.ts`) закрывает
 * РАНГ ВНУТРИ КЛИНИКИ: восстановление в `speech/storage.ts` считает
 * `row_number() OVER (PARTITION BY organization_id ORDER BY updated_at DESC)` и
 * берёт первые `DENTAL_SPEECH_CACHED_RECORDINGS` записей КАЖДОЙ организации.
 * Пока в клинику пишет ровно один файл, ранг его записей предсказуем, и «моя
 * запись — самая свежая в моей клинике» становится утверждением о собственных
 * данных, а не о том, кто из параллельных процессов успел записать позже.
 *
 * Но НАД этим рангом стоит второй предел — `DENTAL_SPEECH_RESTORED_RECORDINGS_TOTAL`,
 * общий на весь процесс, и он накладывается на ВСЮ базу порядком
 * `(recording_rank ASC, updated_at DESC)`. То есть в общий предел первыми
 * попадают самые свежие записи ранга 1 ЛЮБЫХ клиник, включая чужие.
 * `speech/tests/storageRestoreCeiling.test.ts` ставит этот предел равным двум и
 * требует, чтобы под ним оказались записи ДВУХ ЕГО клиник: только так видно, что
 * общий потолок работает и при этом не отдан целиком одной клинике. Любая строка
 * `speech-recording://`, записанная параллельным файлом в СВОЮ клинику между
 * засевом и восстановлением, свежее засеянных — и забирает общий предел себе.
 * Отдельной клиникой это не лечится в принципе: проверяемый ресурс глобален по
 * определению, он и есть потолок на весь процесс поверх всей базы.
 *
 * Поэтому файлы, пишущие такие строки, проходят по одному. Список на сегодня:
 * `speech/tests/storage.test.ts`, `speech/tests/storageRestoreCeiling.test.ts`,
 * `speech/tests/storageIdentity.test.ts`, `tests/routes/speechTranscribeChunkAccess.test.ts`.
 * Найти их можно поиском по `speech-recording://` и `recordSpeechTranscriptionChunk`
 * среди `*.test.ts`. `speech/tests/storageRestoreRetry.test.ts` в этом списке НЕ
 * участвует намеренно: он закрывает пул в `before`, после чего ни один его запрос
 * до базы не доходит, ни одной строки он не пишет — и держать блокировку он всё
 * равно не смог бы, потому что закрытие соединения снимает её.
 *
 * ПОЧЕМУ КОНСУЛЬТАЦИОННАЯ БЛОКИРОВКА, А НЕ СТРОКА-СЕМАФОР В ТАБЛИЦЕ.
 * `pg_advisory_lock` живёт в СЕССИИ: как только соединение обрывается — прогон
 * убит Ctrl+C, процесс упал, закрылась труба вида `| head` — PostgreSQL снимает
 * блокировку сам. Семафор в таблице после такого обрыва остался бы занятым
 * навсегда, и следующий прогон встал бы насмерть, то есть лечение было бы хуже
 * болезни.
 *
 * ПОЧЕМУ ВЫДЕЛЕННОЕ СОЕДИНЕНИЕ, А НЕ `db.execute`. Блокировка принадлежит
 * соединению. Пул отдаёт под каждый запрос произвольное соединение, поэтому
 * `db.execute(sql`SELECT pg_advisory_lock(…)`)` взял бы её на случайном клиенте и
 * вернул его в пул вместе с блокировкой; снять её потом удалось бы только
 * случайно — если бы тот же клиент снова подвернулся. Здесь клиент берётся из
 * пула явно и держится до `release()`.
 *
 * ОЖИДАНИЕ ОГРАНИЧЕНО. `lock_timeout` не даёт прогону висеть молча, если
 * блокировку держит второй одновременно запущенный набор тестов: вместо тишины
 * файл падает с внятной причиной. Значение с запасом — файлы держат блокировку
 * секунды, а не минуты.
 */

/**
 * Имя, из которого выводится ключ блокировки. Как и `fixtureUuid`, ключ
 * ВЫВОДИТСЯ ИЗ ИМЕНИ, а не выдаётся вручную: ручной реестр числовых ключей
 * `pg_advisory_lock` — это ровно тот реестр блоков UUID, который уже был выдан
 * трём файлам сразу.
 */
const SPEECH_DURABLE_LOCK_NAMESPACE = "dente:speech:durable-recordings";

/**
 * Сколько ждать освобождения. Три минуты — это не время работы одного файла
 * (секунды), а запас на случай, когда очередь из всех участников выстроилась в
 * одном окне параллельности `node --test`.
 */
const LOCK_WAIT_TIMEOUT_MS = 180_000;

/**
 * `pg_advisory_lock(bigint)` принимает ЗНАКОВОЕ 64-битное число, поэтому старший
 * бит хеша сбрасывается: иначе PostgreSQL отверг бы значение как выходящее за
 * диапазон `bigint`. Ключ передаётся десятичной строкой с явным приведением —
 * `BigInt` через параметр запроса драйвер не сериализует.
 */
function advisoryLockKey(namespace: string): string {
	const digest = createHash("sha256").update(namespace).digest();
	return (digest.readBigUInt64BE(0) & 0x7fff_ffff_ffff_ffffn).toString();
}

const speechDurableLockKey = advisoryLockKey(SPEECH_DURABLE_LOCK_NAMESPACE);

export type SpeechDurableTestLock = {
	/**
	 * Снять блокировку и вернуть соединение в пул. Вызывать ОБЯЗАТЕЛЬНО в `after`
	 * и ДО `pool.end()`: `pool.end()` ждёт возврата всех выданных клиентов и на
	 * удержанном клиенте не завершится.
	 *
	 * ВЫЗОВ ОБЯЗАН СТОЯТЬ В `finally`, А НЕ ПРОСТО ПОСЛЕ УБОРКИ. Это правило
	 * написано по факту поломки, а не из осторожности. `after`-хуки четырёх файлов
	 * диктовки снимали блокировку последней строкой, после
	 * `purgeFixtureOrganizations`. Когда миграция `0161_audit_append_only.sql`
	 * отобрала у роли приложения право DELETE на таблицы журнала аудита, уборка
	 * стала бросать исключение — и уносила с собой весь остаток хука. Дальше
	 * работала арифметика самой блокировки, а не тестов:
	 *
	 *   • `pg_advisory_lock` — СЕССИОННАЯ. Она не подчиняется транзакционной
	 *     семантике: ни ROLLBACK, ни исключение в JS её не снимают. Живёт до
	 *     явного `pg_advisory_unlock` или до конца сессии;
	 *   • сессия не кончалась, потому что `pool.end()` стоял ещё ниже и тоже не
	 *     выполнялся, а удержанный клиент не давал процессу завершиться;
	 *   • остальные участники очереди ждали освобождения по `lock_timeout` в три
	 *     минуты каждый, и `npm run test` переставал возвращать управление вовсе.
	 *
	 * Замерено на живой базе: держатель в `pg_stat_activity` в состоянии `idle` с
	 * запросом `SELECT pg_advisory_lock($1::bigint)`, одна строка `locktype =
	 * 'advisory'` в `pg_locks`, прогон одного файла — EXIT=124 по внешнему
	 * таймауту.
	 *
	 * `pg_advisory_xact_lock` здесь не подходит и не является альтернативой: он
	 * снимается на границе транзакции, а взаимное исключение обязано накрывать
	 * весь файл целиком — десятки отдельных транзакций от `before` до `after`.
	 * Раз лечения на стороне базы нет, надёжность обязан обеспечить вызывающий:
	 * `try { … } finally { await lock.release(); }`.
	 */
	release: () => Promise<void>;
};

export async function acquireSpeechDurableTestLock(): Promise<SpeechDurableTestLock> {
	const client: PoolClient = await pool.connect();
	try {
		await client.query("SELECT set_config('lock_timeout', $1, false)", [
			String(LOCK_WAIT_TIMEOUT_MS),
		]);
		await client.query("SELECT pg_advisory_lock($1::bigint)", [
			speechDurableLockKey,
		]);
	} catch (error) {
		client.release();
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(
			`acquireSpeechDurableTestLock: не удалось взять блокировку ${SPEECH_DURABLE_LOCK_NAMESPACE} за ${LOCK_WAIT_TIMEOUT_MS} мс. ` +
				"Скорее всего параллельно запущен второй набор тестов: тесты общего потолка восстановления расшифровок идут строго по одному. " +
				`Причина базы: ${reason}`,
		);
	}

	let released = false;
	return {
		async release() {
			if (released) return;
			released = true;
			try {
				await client.query("SELECT pg_advisory_unlock($1::bigint)", [
					speechDurableLockKey,
				]);
			} finally {
				client.release();
			}
		},
	};
}
