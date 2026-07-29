import assert from "node:assert";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/imaging.js");
if (!existsSync(routePath)) {
	throw new Error("Build API first: npm run build -w @dental/api");
}

const { parseImagingManifest } = await import(pathToFileURL(routePath).href);

// Empty Input Case
const emptyResult = await parseImagingManifest({
	sourceName: "testEmpty",
	sourceKind: "folder_watch",
	rawText: "   \n  \n",
});
assert.strictEqual(
	emptyResult.totalRows,
	0,
	"Empty input should return 0 totalRows",
);
assert.strictEqual(
	emptyResult.readyRows,
	0,
	"Empty input should return 0 readyRows",
);
assert.strictEqual(
	emptyResult.parserNotes[0],
	"Нет строк для разбора.",
	"Empty input should return specific parser note",
);

// Headers Case - with matching patient
const headersText = [
	"patient,phone,kind,filePath,capturedAt,tooth",
	"Иванова Марина Сергеевна,+79271112233,ОПТГ,/path/to/image.jpg,2023-01-01,11",
	"Unknown Patient,+70000000000,КЛКТ,,2023-01-02,12",
	"Иванова Марина Сергеевна,,UnknownKind,/path/to/image2.jpg,2023-01-03,",
].join("\n");

const headersResult = await parseImagingManifest({
	sourceName: "testHeaders",
	sourceKind: "folder_watch",
	rawText: headersText,
});

assert.strictEqual(
	headersResult.totalRows,
	3,
	"Headers case should parse 3 rows",
);
assert.strictEqual(
	headersResult.sourceName,
	"testHeaders",
	"Should preserve source name",
);

const row1 = headersResult.rows[0];
assert.strictEqual(
	row1.status,
	"ready",
	"Row with valid patient, kind, and filePath should be ready",
);
assert.strictEqual(row1.phone, "+79271112233", "Phone should match");
assert.strictEqual(row1.kind, "opg", "Kind 'ОПТГ' should map to 'opg'");
assert.strictEqual(
	row1.filePath,
	"/path/to/image.jpg",
	"File path should be correctly parsed",
);

const row2 = headersResult.rows[1];
assert.strictEqual(
	row2.status,
	"blocked",
	"Row with missing filePath should be blocked",
);
assert(
	row2.warnings.includes("Пациент не найден, нужно сопоставление"),
	"Should warn about missing patient",
);
assert(
	row2.warnings.includes("Нет пути к файлу снимка"),
	"Should warn about missing file path",
);

const row3 = headersResult.rows[2];
assert.strictEqual(
	row3.status,
	"blocked",
	"Row with unknown kind should be blocked",
);
assert(
	row3.warnings.includes("Тип снимка не распознан"),
	"Should warn about unrecognized kind",
);

// Fallback matching without headers (parseManifestLine)
const noHeadersText = [
	"/path/to/some/image/file.jpg Иванова Марина Сергеевна +7 (900) 555-55-55 01.01.2023 ОПТГ 11",
].join("\n");

const noHeadersResult = await parseImagingManifest({
	sourceName: "testNoHeaders",
	sourceKind: "folder_watch",
	rawText: noHeadersText,
});

assert.strictEqual(
	noHeadersResult.totalRows,
	1,
	"No-headers case should parse 1 row",
);
const row4 = noHeadersResult.rows[0];
/*
 * СТАТУС СТРОКИ ЗАВИСИТ ОТ ДАННЫХ КЛИНИКИ, А НЕ ОТ РАЗБОРЩИКА.
 *
 * Здесь стояло `assert.strictEqual(row4.status, "ready")`, и сценарий был КРАСНЫМ:
 * разборщик отдаёт `warning` с причиной «Пациент найден только по ФИО (без
 * телефона) — подтвердите совпадение вручную».
 *
 * Замер показал, что прав РАЗБОРЩИК, а устарело ожидание. Строка манифеста несёт
 * телефон `+7 (900) 555-55-55`; у пациентки с таким ФИО в базе сегодня другой
 * номер, поэтому совпадение только по имени — и предупредить о нём обязательно:
 * снимок, привязанный к однофамильцу, попадает в чужую медкарту. `ready` тут
 * означал бы уверенность, которой нет.
 *
 * То есть требование `ready` привязывало проверку РАЗБОРА к содержимому общей
 * базы: заведи клиника вторую Иванову или смени номер — и сценарий краснеет, не
 * тронув ни строки кода. Это тот же класс, из-за которого половина сценариев
 * общего прогона годами проверяла не свой предмет.
 *
 * Предмет этого сценария — РАЗБОР: какие поля вынуты из строки без заголовков.
 * Поэтому статус проверяется как «разборщик дошёл до сопоставления и объяснил
 * итог», а не как конкретное значение, а незнакомое предупреждение по-прежнему
 * валит прогон: молча принять любое предупреждение значило бы разрешить
 * разборщику придумать новую причину и остаться зелёным.
 */
const NAME_ONLY_MATCH_WARNING =
	"Пациент найден только по ФИО (без телефона) — подтвердите совпадение вручную";
assert.ok(
	row4.status === "ready" || row4.status === "warning",
	`No-headers row must reach patient matching, got status ${row4.status}`,
);
if (row4.status === "warning") {
	assert.deepStrictEqual(
		row4.warnings,
		[NAME_ONLY_MATCH_WARNING],
		`Only the known data-dependent warning is allowed here, got ${JSON.stringify(row4.warnings)}`,
	);
}
assert.ok(
	row4.patientId,
	"No-headers row must be matched to a patient: without it the parse result is not usable",
);
assert.strictEqual(
	row4.patientName,
	"Иванова Марина Сергеевна",
	"Patient name should be extracted from the unstructured line",
);
assert.strictEqual(
	row4.phone,
	"+79005555555",
	"Phone should be normalised from the unstructured line",
);
assert.strictEqual(
	row4.capturedAt,
	"2023-01-01",
	"Capture date should be extracted and normalised from the line",
);
assert.strictEqual(
	row4.kind,
	"opg",
	"Kind should be correctly extracted from line",
);
assert.strictEqual(
	row4.filePath,
	"/path/to/some/image/file.jpg",
	"File path should be extracted from line",
);
assert.strictEqual(
	row4.toothCode,
	"11",
	"Tooth code should be extracted from line via fallback",
);

console.log(
	JSON.stringify({
		ok: true,
		message: "Imaging manifest parser tests passed.",
	}),
);
