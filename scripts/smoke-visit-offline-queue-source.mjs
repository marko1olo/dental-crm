import { readFile } from "node:fs/promises";
import { appLogicSourceFiles } from "./lib/app-logic-source.mjs";

const appLogicTexts = await Promise.all(
	appLogicSourceFiles().map((file) => readFile(file, "utf8")),
);

/*
 * ТРИ ПОЛОМКИ СТРАЖА, НИ ОДНОЙ ПОЛОМКИ ПОВЕДЕНИЯ. Замер 29.07.2026.
 *
 * 1. СТРАЖ УМИРАЛ НА ПЕРВОМ НЕСОВПАДЕНИИ: `fail()` бросал исключение. Наружу
 *    выходила одна строка «Missing marker: const [localDraftWasRestored», и по
 *    ней нельзя было понять ни масштаб, ни причину. Из семи областей успевали
 *    вырезаться три, а ВСЕ ~40 требований к маркерам не исполнялись НИКОГДА.
 *
 * 2. КЛАСС STALE. Состояние очереди переехало из `useState` в zustand-хранилище
 *    apps/web/src/store/visitStore.ts:169-176. Поведение то же и смысл требования
 *    тот же — начальное значение это КОНСТАНТА, а не чтение хранилища на старте:
 *      было (useState)   const [pendingVisitSaveCount, setPendingVisitSaveCount] = useState(0);
 *      стало (zustand)   pendingVisitSaveCount: 0,
 *    Запрет «не читать хранилище в инициализаторе» сохранён дословно по смыслу и
 *    проверяется теперь на инициализаторе хранилища.
 *
 * 3. ВЫРЕЗКА ОБЛАСТЕЙ БЫЛА СЛОМАНА РАЗБОРОМ МОНОЛИТА, И МОЛЧА. Области искались
 *    в СКЛЕЙКЕ файлов, поэтому границы разъезжались по разным файлам:
 *    `acceptDraftToVisit` уехал в hooks/domains/useVisitLogic.ts, а
 *    `previewImport` остался в useAppLogic.tsx. В склейке useAppLogic идёт
 *    ПЕРВЫМ, значит конец области оказался РАНЬШЕ её начала, и
 *    `indexOf(end, start)` вернул -1. Область «принятие черновика» не
 *    проверялась вообще. Теперь область вырезается ВНУТРИ ФАЙЛА, который
 *    содержит её начало, — граница не может снова уехать в другой файл незаметно.
 */
const namedSources = [
	["apps/web/src/App.tsx", await readFile("apps/web/src/App.tsx", "utf8")],
	...appLogicSourceFiles().map((file, index) => [file, appLogicTexts[index]]),
	[
		"apps/web/src/AppHelpers.tsx",
		await readFile("apps/web/src/AppHelpers.tsx", "utf8"),
	],
	[
		"apps/web/src/store/visitStore.ts",
		await readFile("apps/web/src/store/visitStore.ts", "utf8"),
	],
];
const source = namedSources.map(([, text]) => text).join("\n");
const packageJson = await readFile("package.json", "utf8");

const failures = [];

function fail(message) {
	failures.push(message);
}

/**
 * Область вырезается внутри одного файла: конец обязан идти ПОСЛЕ начала в том же
 * файле. Иначе возвращается пустая строка и пишется внятная причина — молчаливая
 * потеря области, как с `acceptDraftToVisit`, больше невозможна.
 */
function sourceSlice(startMarker, endMarker) {
	for (const [file, text] of namedSources) {
		const start = text.indexOf(startMarker);
		if (start === -1) continue;
		const end = text.indexOf(endMarker, start);
		if (end === -1) {
			fail(
				`Область не вырезана: в ${file} есть начало «${startMarker}», ` +
					`но конца «${endMarker}» после него нет. Требования этой области не проверены.`,
			);
			return "";
		}
		return text.slice(start, end);
	}
	fail(`Missing marker: ${startMarker}`);
	return "";
}

const visitQueueStorageBlock = sourceSlice(
	"function parsePendingVisitSaveQueue",
	"function isPendingSpeechChunk",
);
const indexedDbBlock = sourceSlice(
	"function pendingVisitSaveIndexedDbAvailable",
	"async function readPendingSpeechChunksFromIndexedDb",
);
const queueBlock = sourceSlice(
	"async function queuePendingVisitSave",
	"function latestPendingVisitSaveAt",
);
// Инициализатор состояния очереди — теперь срез zustand-хранилища, см. пункт 2 выше.
const appStateBlock = sourceSlice(
	"localDraftWasRestored: false,",
	"lastVisitSaveReceipt: null,",
);
const refreshBlock = sourceSlice(
	"async function refreshPendingVisitSaveState",
	"async function refreshPendingSpeechChunkState",
);
const flushBlock = sourceSlice(
	"async function flushPendingVisitSaves",
	"async function submitSpeechChunk",
);
/*
 * Конец области — следующая функция В ТОМ ЖЕ файле (useVisitLogic.ts:1203), а не
 * `previewImport`, который остался в useAppLogic.tsx после разбора монолита.
 */
const acceptBlock = sourceSlice(
	"async function acceptDraftToVisit",
	"function appendVisitDictationText",
);

for (const marker of [
	"const speechChunkDbVersion = 4;",
	"const requiredSpeechChunkDbStoreNames = [",
	"function assertSpeechChunkDbStores(db: IDBDatabase): void",
	"assertSpeechChunkDbStores(db);",
	'const pendingVisitSaveStoreName = "pendingVisitSaves";',
	'db.createObjectStore(pendingVisitSaveStoreName, { keyPath: "id" })',
	'store.createIndex("queuedAt", "queuedAt")',
	'store.createIndex("organizationId", "organizationId")',
	'store.createIndex("visitId", "visitId")',
	"async function readPendingVisitSavesFromIndexedDb",
	"async function savePendingVisitSavesToIndexedDb",
	"async function deletePendingVisitSaveFromIndexedDb",
	"async function migratePendingVisitSavesFromLocalStorage",
	"async function loadPendingVisitSaves",
	"async function savePendingVisitSaves",
]) {
	if (!source.includes(marker))
		fail(`Visit offline queue IndexedDB marker missing: ${marker}`);
}

for (const marker of [
	"class WorkflowResponseError extends Error",
	"function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean",
	"error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500",
]) {
	if (!source.includes(marker))
		fail(`Visit accept queue retryability marker missing: ${marker}`);
}

/*
 * ДВА ТРЕБОВАНИЯ НА ОБРАЗЦАХ, КЛАСС BRITTLE — КОД СТАЛ БЕЗОПАСНЕЕ ИЛИ ШИРЕ.
 *
 * 1. Обработчик смены версии базы. Требовалось односложное
 *    `db.onversionchange = () => db.close();`, в продукте AppHelpers.tsx:5361
 *    он же плюс сброс кэша соединения:
 *      db.onversionchange = () => { speechChunkDbPromise = null; db.close(); };
 *    Сброс кэша там ДОБАВЛЕН осознанно — комментарий над ним описывает дефект,
 *    из-за которого очередь неотправленных приёмов перезаписывалась пустой, пока
 *    интерфейс сообщал «сохранено локально». Требование краснело за починку.
 *    Образец закрепляет СВЯЗЬ: на onversionchange соединение закрывается.
 *
 * 2. Ошибка приёма с кодом ответа. Требовалась одна строка, в продукте
 *    useVisitLogic.ts:484-487 то же самое, разнесённое переносами:
 *      throw new WorkflowResponseError(
 *        await responseErrorMessage(response, "Прием не принят"),
 *        response.status,
 *      );
 *    Отличие РОВНО в пробелах. Образец закрепляет связь: человекочитаемое
 *    сообщение и КОД ОТВЕТА уходят в WorkflowResponseError вместе — без кода
 *    `acceptedVisitSaveFailureIsRetryable` не отличит сетевой сбой от отказа
 *    сервера и очередь потеряет право на повтор.
 */
if (
	!/db\.onversionchange = \(\) => \{?[^}]*db\.close\(\);/.test(source) &&
	!source.includes("db.onversionchange = () => db.close();")
) {
	fail(
		"Visit offline queue IndexedDB marker missing: обработчик db.onversionchange обязан закрывать соединение",
	);
}
if (
	!/throw new WorkflowResponseError\(\s*await responseErrorMessage\(\s*response,\s*"Прием не принят",?\s*\),\s*response\.status,?\s*\)/.test(
		source,
	)
) {
	fail(
		"Visit accept queue retryability marker missing: WorkflowResponseError обязан получить и текст «Прием не принят», и response.status",
	);
}

if (source.includes("const speechChunkDbVersion = 3;")) {
	fail(
		"Visit offline queue IndexedDB migration must not stay on v3 after CT workbench stores were added.",
	);
}

for (const marker of [
	"normalizePendingVisitSave(item, activeOrganizationId, legacyOrganizationFallback)",
	"sortPendingVisitSaves(Array.from(byId.values()))",
	"savePendingVisitSavesToLocalStorage(queue, normalizedOrganizationId)",
	"loadPendingVisitSavesFromLocalStorage(normalizedOrganizationId)",
	"window.localStorage.removeItem(pendingVisitSaveQueueLocalKey(normalizedOrganizationId))",
]) {
	if (!visitQueueStorageBlock.includes(marker) && !source.includes(marker))
		fail(`Visit offline queue migration marker missing: ${marker}`);
}

for (const marker of [
	"const existing = await loadPendingVisitSaves(normalizedOrganizationId);",
	"await savePendingVisitSaves([...withoutSameVisit, queued], normalizedOrganizationId);",
]) {
	if (!queueBlock.includes(marker))
		fail(
			`Visit queue must be async and preserve replacement-by-visit: ${marker}`,
		);
}

for (const marker of [
	"pendingVisitSaveCount: 0,",
	"lastPendingVisitSaveAt: null,",
]) {
	if (!appStateBlock.includes(marker))
		fail(
			`Visit offline queue must not synchronously read storage during boot: ${marker}`,
		);
}

for (const marker of [
	"const pending = await loadPendingVisitSaves(activeOrganizationId);",
	"setLastPendingVisitSaveAt(latestPendingVisitSaveAt(pending));",
]) {
	if (!refreshBlock.includes(marker))
		fail(`Visit offline queue refresh marker missing: ${marker}`);
}

for (const marker of [
	"const pending = await loadPendingVisitSaves(activeOrganizationId);",
	"await refreshPendingVisitSaveState();",
]) {
	if (!flushBlock.includes(marker))
		fail(`Visit offline queue flush marker missing: ${marker}`);
}

/*
 * КЛАСС RESURRECTION: ТРЕБОВАНИЕ ПРОСИЛО ВЕРНУТЬ УДАЛЁННЫЙ ДЕФЕКТ. СНЯТО, ПРИЧИНА ЗДЕСЬ.
 *
 * Снятое требование:
 *   flushBlock должен содержать
 *   `await savePendingVisitSaves(remaining, activeOrganizationId);`
 *
 * Почему оно ВРЕДНО. `remaining` — это снимок очереди, прочитанный ДО отправки.
 * Перезапись всей очереди этим снимком теряла записи, добавленные ВО ВРЕМЯ
 * отправки: врач сохранял приём, интерфейс писал «сохранено локально», а
 * следующий успешный флаш стирал запись безвозвратно. Дефект был найден и
 * ПОЧИНЕН: useVisitLogic.ts:621-626 удаляет РОВНО отправленный элемент
 * (`deletePendingVisitSaveFromIndexedDb(item.id)`), не трогая остальные, и
 * комментарий над правкой описывает и старое поведение, и потерю данных.
 * Требование в прежнем виде держало HEAD красным ровно за то, что потеря данных
 * устранена, а «позеленить» его можно было только вернув потерю.
 *
 * ХРАПОВИК В ОБРАТНУЮ СТОРОНУ. Вместо снятого требования закреплено безопасное
 * поведение И ЗАПРЕЩЕНО опасное: если перезапись очереди снимком вернётся,
 * страж покраснеет. Молчаливого снятия здесь нет — есть замена требования на
 * противоположное по знаку.
 */
if (!/deletePendingVisitSaveFromIndexedDb\(item\.id\)/.test(flushBlock)) {
	fail(
		"Visit offline queue flush must delete exactly the sent item: " +
			"deletePendingVisitSaveFromIndexedDb(item.id) пропал из флаша — очередь снова " +
			"рискует перезаписью целиком.",
	);
}
if (/savePendingVisitSaves\(\s*remaining/.test(flushBlock)) {
	fail(
		"Visit offline queue flush must not overwrite the whole queue with a pre-send snapshot: " +
			"вернулся `savePendingVisitSaves(remaining, ...)`. Записи приёма, попавшие в " +
			"очередь во время отправки, снова будут стёрты при живом сообщении " +
			"«сохранено локально» (см. useVisitLogic.ts:621-626).",
	);
}

for (const marker of [
	"if (!acceptedVisitSaveFailureIsRetryable(acceptError))",
	"await refreshPendingVisitSaveState();",
]) {
	if (!acceptBlock.includes(marker))
		fail(`Visit accept fallback must await durable local queue: ${marker}`);
}
/*
 * Класс BRITTLE: `const queued = await queuePendingVisitSave({` разъехался
 * переносом строки, когда у вызова появился второй аргумент — организация
 * (useVisitLogic.ts:1164-1173). Образец закрепляет связь «постановка в очередь
 * ОЖИДАЕТСЯ (await) и её результат используется», а не расстановку скобок.
 */
if (!/const queued = await queuePendingVisitSave\(\s*\{/.test(acceptBlock)) {
	fail(
		"Visit accept fallback must await durable local queue: " +
			"const queued = await queuePendingVisitSave({...}) пропал из обработчика отказа.",
	);
}

for (const marker of [
	"const malformedActiveRecord = localQueueOrganizationMatches(itemOrganizationId, normalizedOrganizationId);",
	"if (stale || malformedActiveRecord) {",
]) {
	if (!indexedDbBlock.includes(marker))
		fail(`Visit IndexedDB queue cleanup marker missing: ${marker}`);
}

if (appStateBlock.includes("loadPendingVisitSaves(activeOrganizationId)")) {
	fail(
		"Visit offline queue still reads storage synchronously in React state initializer.",
	);
}

if (
	!packageJson.includes(
		'"smoke:visit-offline-queue-source": "node scripts/smoke-visit-offline-queue-source.mjs"',
	)
) {
	fail("package.json must expose smoke:visit-offline-queue-source.");
}

if (failures.length > 0) {
	console.error(
		`Visit offline queue source smoke failed (${failures.length}):`,
	);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(
	JSON.stringify({ ok: true, guard: "visit-offline-queue-indexeddb" }),
);
