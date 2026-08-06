import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, mock, test } from "node:test";
import { uiPreferencesInputSchema } from "@dental/shared";

/**
 * Слияние записей снимка состояния.
 *
 * ЧТО БЫЛО НЕ ТАК. persistMutableState() из 31 места в sampleData.ts звал
 * savePersistentState() синхронно, в обработчике запроса. Одна запись — это
 * два полных JSON.stringify всего состояния, копия предыдущего файла в
 * резервный каталог, чтение каталога и запись файла. Замер повтором алгоритма
 * persistentState.ts:242 (медиана из 10 прогонов): 4,61 мс и 236 648 Б на
 * текущей базе из трёх пациентов, 49,54 мс и 5 803 929 Б на клинике из 10 000
 * пациентов. Тридцать мелких действий администратора давали тридцать таких
 * записей, и каждая блокировала цикл событий до ответа клиенту.
 *
 * ЧТО ПРОВЕРЯЕТСЯ ЗДЕСЬ. Не «код запускается», а количество и объём реальных
 * записей файла: N действий обязаны дать одну запись, ноль записей до ответа
 * клиенту, и последнее значение обязано дойти до файла целиком.
 *
 * Изоляция: DENTAL_STATE_FILE и DENTAL_STATE_BACKUP_DIR уводятся в каталог
 * os.tmpdir() ДО импорта sampleData.ts (модуль читает файл состояния на
 * загрузке), поэтому рабочий apps/api/.data/dental-crm-state.json тест не
 * трогает ни на чтение, ни на запись.
 */

const temporaryRoot = fs.mkdtempSync(
	path.join(os.tmpdir(), "dente-state-flush-"),
);
const stateFilePath = path.join(temporaryRoot, "dental-crm-state.json");
const stateTempFilePath = `${stateFilePath}.tmp`;
const environmentSnapshot = { ...process.env };

process.env.DENTAL_STATE_PERSISTENCE = "on";
process.env.DENTAL_STATE_FILE = stateFilePath;
process.env.DENTAL_STATE_BACKUP_DIR = path.join(temporaryRoot, "backups");

const {
	flushPersistentStateNow,
	saveUiPreferences,
	getUiPreferences,
	recordAuditEvent,
} = await import("../sampleData.js");

const originalWriteFileSync = fs.writeFileSync;
let stateWriteCount = 0;
let stateWriteBytes = 0;

/**
 * savePersistentState() пишет во временный файл и переименовывает его. Считаем
 * именно эти записи — по точному пути, чтобы посторонние обращения к диску в
 * счёт не попадали.
 */
function countStateWrites(): void {
	mock.method(fs, "writeFileSync", ((
		...parameters: Parameters<typeof fs.writeFileSync>
	) => {
		const [file, data] = parameters;
		if (file === stateTempFilePath) {
			stateWriteCount += 1;
			stateWriteBytes +=
				typeof data === "string" ? Buffer.byteLength(data, "utf8") : 0;
		}
		return (
			originalWriteFileSync as (
				...args: Parameters<typeof fs.writeFileSync>
			) => void
		)(...parameters);
	}) as typeof fs.writeFileSync);
}

function resetWriteCounters(): void {
	stateWriteCount = 0;
	stateWriteBytes = 0;
}

/** Мелкое действие администратора: сменил фильтр даты в расписании. */
function smallUserAction(index: number): void {
	saveUiPreferences(
		uiPreferencesInputSchema.parse({
			scheduleDateFilter: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
		}),
	);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function persistedStateFile(): {
	savedAt: string;
	state: { uiPreferences: { scheduleDateFilter: string } };
} {
	return JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
}

describe("слияние записей снимка состояния", () => {
	before(() => {
		countStateWrites();
	});

	after(() => {
		// Сначала гасим отложенную запись, потом убираем каталог: иначе
		// обработчик exit воссоздал бы его пустым.
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "0";
		flushPersistentStateNow();
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		mock.restoreAll();
		for (const key of Object.keys(process.env)) {
			if (!(key in environmentSnapshot)) delete process.env[key];
		}
		for (const [key, value] of Object.entries(environmentSnapshot)) {
			if (value !== undefined) process.env[key] = value;
		}
		fs.rmSync(temporaryRoot, { recursive: true, force: true });
	});

	test("ДО: синхронный режим повторяет полную запись на каждое действие", () => {
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "0";
		resetWriteCounters();

		for (let index = 0; index < 20; index += 1) smallUserAction(index);

		assert.equal(
			stateWriteCount,
			20,
			"в синхронном режиме 20 действий обязаны дать 20 записей — иначе счётчик записей не работает и остальные утверждения ничего не стоят",
		);
		assert.ok(stateWriteBytes > 0, "записи должны иметь ненулевой объём");
		console.log(
			`  ДО (DENTAL_STATE_FLUSH_DELAY_MS=0): 20 действий -> ${stateWriteCount} записей, ${stateWriteBytes.toLocaleString("ru-RU")} Б`,
		);
	});

	test("ПОСЛЕ: 20 действий подряд дают ОДНУ запись, и ни одной до ответа клиенту", async () => {
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "60";
		resetWriteCounters();

		for (let index = 0; index < 20; index += 1) smallUserAction(index);

		assert.equal(
			stateWriteCount,
			0,
			"запись не должна происходить в том же такте, что и действие: она обязана уйти с пути запроса",
		);

		await sleep(200);

		assert.equal(
			stateWriteCount,
			1,
			"пачка из 20 действий обязана дать ровно одну запись",
		);
		console.log(
			`  ПОСЛЕ (окно 60 мс): 20 действий -> ${stateWriteCount} запись, ${stateWriteBytes.toLocaleString("ru-RU")} Б`,
		);
	});

	test("слияние не теряет последнее изменение", async () => {
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "60";
		resetWriteCounters();

		for (let index = 0; index < 10; index += 1) smallUserAction(index);
		saveUiPreferences(
			uiPreferencesInputSchema.parse({ scheduleDateFilter: "2026-12-31" }),
		);
		await sleep(200);

		assert.equal(stateWriteCount, 1);
		assert.equal(getUiPreferences()?.scheduleDateFilter, "2026-12-31");
		assert.equal(
			persistedStateFile().state.uiPreferences.scheduleDateFilter,
			"2026-12-31",
			"в файл обязано попасть состояние на момент записи, а не первое действие пачки",
		);
	});

	test("непрерывный поток изменений не откладывает запись бесконечно", async () => {
		const windowMs = 50;
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = String(windowMs);
		resetWriteCounters();

		const actionCount = 25;
		/*
		 * ОЖИДАНИЕ ВЫВОДИТСЯ ИЗ ФАКТИЧЕСКИ ПРОШЕДШЕГО ВРЕМЕНИ, А НЕ ИЗ ЖЕЛАЕМОГО.
		 *
		 * Здесь стояло `stateWriteCount * 2 < actionCount` — «записей кратно меньше
		 * числа действий». Оно верно, только если планировщик пунктуален: поток из
		 * 25 действий по 10 мс занимает 250 мс, в них влезает пять окон по 50 мс, и
		 * записей выходит около пяти. Но node --test гоняет файлы параллельно, и под
		 * нагрузкой от десятка процессов пауза в 10 мс растягивается в сотню. Тогда
		 * поток идёт не 250 мс, а секунды, окон проходит много больше пяти, и
		 * «кратно меньше» перестаёт быть правдой — не потому что слияние сломалось,
		 * а потому что машина занята. Тест падал примерно в трёх полных прогонах из
		 * девяти, и каждое падение выглядело новым дефектом чужой правки.
		 *
		 * Настоящая гарантия слияния формулируется иначе: записей не больше, чем
		 * влезло ОКОН за фактическое время потока, и не больше числа действий.
		 * Первое проверяет, что окно фиксированное и не продлевается при каждом
		 * изменении, — то есть именно то, что проверял прежний расчёт. Второе — что
		 * одно действие не рождает больше одной записи. Оба утверждения не зависят
		 * от загрузки машины.
		 */
		const startedAt = Date.now();
		for (let index = 0; index < actionCount; index += 1) {
			smallUserAction(index);
			await sleep(10);
		}
		await sleep(150);
		const elapsedMs = Date.now() - startedAt;
		const windowsElapsed = Math.ceil(elapsedMs / windowMs);

		// Окно фиксированное, а не продлеваемое: за поток обязано пройти несколько
		// записей. Продлеваемое окно (классический debounce) не записало бы файл ни
		// разу до конца потока.
		assert.ok(
			stateWriteCount >= 2,
			`поток изменений обязан записываться по ходу дела, а записей ${stateWriteCount} за ${elapsedMs} мс`,
		);
		// Запас в две записи: на окно, начатое до первого действия, и на окно,
		// закрывшееся после последнего.
		assert.ok(
			stateWriteCount <= windowsElapsed + 2,
			`записей ${stateWriteCount}, а за ${elapsedMs} мс прошло ${windowsElapsed} окон по ${windowMs} мс — ` +
				"значит запись идёт чаще окна, то есть слияние не работает",
		);
		assert.ok(
			stateWriteCount <= actionCount,
			`записей ${stateWriteCount} на ${actionCount} действий — одно действие не имеет права рождать больше одной записи`,
		);
		console.log(
			`  поток: ${actionCount} действий за ${elapsedMs} мс -> ${stateWriteCount} записей ` +
				`(окно ${windowMs} мс, влезло окон ${windowsElapsed})`,
		);
	});

	test("разные места вызова сливаются в одну запись, а не в запись на каждое", async () => {
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "60";
		resetWriteCounters();

		// Три РАЗНЫХ места вызова persistMutableState(): настройки интерфейса
		// (sampleData.ts saveUiPreferences) и журнал аудита (recordAuditEvent,
		// он же самая быстро растущая коллекция снимка — 76 401 Б на текущей
		// базе). Слияние обязано работать между местами вызова, а не только
		// между повторами одного.
		smallUserAction(1);
		const auditEvent = recordAuditEvent({
			entityType: "visit",
			entityId: "9f5b6f4e-4d51-4a2f-9d3e-1f2c3b4a5d6e",
			action: "state_flush_coalescing_probe",
			reason:
				"Проверка слияния записей снимка состояния между разными местами вызова.",
		});
		smallUserAction(2);

		assert.equal(
			stateWriteCount,
			0,
			"ни одно из трёх действий не должно писать файл на своём такте",
		);

		await sleep(200);

		assert.equal(
			stateWriteCount,
			1,
			"три действия из разных мест обязаны дать одну запись",
		);
		const persisted = JSON.parse(fs.readFileSync(stateFilePath, "utf8")) as {
			state: { auditEvents: Array<{ id: string }> };
		};
		assert.ok(
			persisted.state.auditEvents.some((event) => event.id === auditEvent.id),
			"единственная запись обязана содержать изменения ВСЕХ слитых действий",
		);
	});

	test("flushPersistentStateNow дописывает отложенное и не пишет повторно", () => {
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "5000";
		resetWriteCounters();

		smallUserAction(1);
		assert.equal(stateWriteCount, 0);

		flushPersistentStateNow();
		assert.equal(
			stateWriteCount,
			1,
			"принудительная запись обязана состояться сразу",
		);

		flushPersistentStateNow();
		assert.equal(
			stateWriteCount,
			1,
			"повторная принудительная запись без изменений не должна писать файл заново",
		);
	});

	test("мусор в DENTAL_STATE_FLUSH_DELAY_MS не превращается в синхронную запись", async () => {
		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "не число";
		resetWriteCounters();

		for (let index = 0; index < 5; index += 1) smallUserAction(index);
		assert.equal(
			stateWriteCount,
			0,
			"нечитаемое значение обязано давать окно по умолчанию, а не запись на каждое действие",
		);

		process.env.DENTAL_STATE_FLUSH_DELAY_MS = "0";
		flushPersistentStateNow();
		assert.equal(stateWriteCount, 1);
	});
});
