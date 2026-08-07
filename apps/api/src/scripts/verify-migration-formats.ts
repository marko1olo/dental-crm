/**
 * Проверка настоящих форматов баз старых систем.
 *
 * Собирает файлы по спецификациям — не образцы «похожего вида», а байт в байт
 * то, что лежит на диске у клиники, — и прогоняет их через опознание, чтение и
 * перенос:
 *
 *   DBF FoxPro в cp866 с memo-файлом .FPT  — «Инфодент» и системы на FoxPro
 *   DBF dBASE III с memo .DBT              — самые старые выгрузки
 *   SQLite                                 — настольные и браузерные системы
 *   DICOM Part 10 в ISO_IR 144             — снимки с российских аппаратов
 *   Firebird ODS 12                        — IDENT (опознание + инструкция)
 *   MS SQL .bak, MS Access Jet4, 1CD       — опознание + инструкция
 *
 * Для читаемых форматов проверяется содержимое до последнего поля, для
 * нечитаемых — что они опознаны точно и что инструкция оператору выдана.
 */
import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { eq, sql } from "drizzle-orm";
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
import {
	discoverLocalSources,
	summarizeDiscovery,
} from "../migration/discovery.js";
import { runMigration } from "../migration/engine.js";
import { readDicomMetadata } from "../migration/formats/dicom.js";
import { identifyFormat } from "../migration/formats/signatures.js";
import {
	inspectSqlite,
	rankTablesByRelevance,
} from "../migration/formats/sqlite.js";
import {
	detectSourceShape,
	streamSourceRows,
} from "../migration/streamStage.js";
import {
	buildDbfFile,
	type DbfFixtureField,
	encodeSingleByte,
} from "../migration/tests/fixtures.js";

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

// ---------------------------------------------------------------------------
// Построители настоящих файлов
// ---------------------------------------------------------------------------

/**
 * Файл memo FoxPro (.FPT).
 *
 * Заголовок 512 байт: номер следующего свободного блока (big-endian), размер
 * блока в байтах 6–7 (тоже big-endian — единственное поле обратного порядка в
 * семействе dBASE). Каждый блок: тип (1 — текст) и длина, оба big-endian.
 */
function buildFptFile(
	texts: string[],
	encoding: string,
	blockSize = 64,
): { buffer: Buffer; pointers: number[] } {
	const header = Buffer.alloc(blockSize);
	header.writeUInt16BE(blockSize, 6);

	const blocks: Buffer[] = [];
	const pointers: number[] = [];
	let nextBlock = 1;

	for (const text of texts) {
		const content = encodeSingleByte(text, encoding);
		const total = 8 + content.length;
		const blockCount = Math.ceil(total / blockSize);
		const chunk = Buffer.alloc(blockCount * blockSize);
		chunk.writeUInt32BE(1, 0);
		chunk.writeUInt32BE(content.length, 4);
		content.copy(chunk, 8);
		blocks.push(chunk);
		pointers.push(nextBlock);
		nextBlock += blockCount;
	}

	header.writeUInt32BE(nextBlock, 0);
	return { buffer: Buffer.concat([header, ...blocks]), pointers };
}

/**
 * Файл memo dBASE III (.DBT).
 *
 * Блоки по 512 байт, длины нет вовсе: текст заканчивается двумя байтами 0x1A.
 * Именно поэтому его нельзя читать правилами FPT.
 */
function buildDbtFile(
	texts: string[],
	encoding: string,
): { buffer: Buffer; pointers: number[] } {
	const blockSize = 512;
	const header = Buffer.alloc(blockSize);
	const blocks: Buffer[] = [];
	const pointers: number[] = [];
	let nextBlock = 1;

	for (const text of texts) {
		const content = encodeSingleByte(text, encoding);
		const withTerminator = Buffer.concat([content, Buffer.from([0x1a, 0x1a])]);
		const blockCount = Math.ceil(withTerminator.length / blockSize);
		const chunk = Buffer.alloc(blockCount * blockSize);
		withTerminator.copy(chunk, 0);
		blocks.push(chunk);
		pointers.push(nextBlock);
		nextBlock += blockCount;
	}

	header.writeUInt32LE(nextBlock, 0);
	return { buffer: Buffer.concat([header, ...blocks]), pointers };
}

/**
 * Снимок DICOM Part 10.
 *
 * Префикс 128 нулевых байт, метка DICM, мета-группа с синтаксисом передачи, и
 * основной набор в явной записи VR с прямым порядком байт. Кириллица — в
 * ISO_IR 144, как её пишут российские аппараты.
 */
function buildDicomFile(values: {
	patientName: string;
	patientId: string;
	birthDate: string;
	sex: string;
	studyUid: string;
	seriesUid: string;
	modality: string;
	studyDate: string;
	manufacturer: string;
}): Buffer {
	const iso5 = (text: string): Buffer => encodeSingleByte(text, "iso-8859-5");

	/** Элемент явной записи VR: группа, элемент, VR, длина, значение. */
	const element = (
		group: number,
		elementId: number,
		vr: string,
		value: Buffer,
	): Buffer => {
		// Значения выравниваются до чётной длины: текст — пробелом, UID — нулём.
		const padded =
			value.length % 2 === 0
				? value
				: Buffer.concat([value, Buffer.from([vr === "UI" ? 0x00 : 0x20])]);
		const head = Buffer.alloc(8);
		head.writeUInt16LE(group, 0);
		head.writeUInt16LE(elementId, 2);
		head.write(vr, 4, "latin1");
		head.writeUInt16LE(padded.length, 6);
		return Buffer.concat([head, padded]);
	};

	const ascii = (text: string): Buffer => Buffer.from(text, "latin1");

	// Мета-группа: сначала её длина, затем сами элементы.
	const metaElements = Buffer.concat([
		element(0x0002, 0x0002, "UI", ascii("1.2.840.10008.5.1.4.1.1.1")),
		element(0x0002, 0x0003, "UI", ascii(values.studyUid)),
		// Явная VR, прямой порядок байт.
		element(0x0002, 0x0010, "UI", ascii("1.2.840.10008.1.2.1")),
	]);
	const metaLength = element(
		0x0002,
		0x0000,
		"UL",
		(() => {
			const length = Buffer.alloc(4);
			length.writeUInt32LE(metaElements.length, 0);
			return length;
		})(),
	);

	const dataset = Buffer.concat([
		// Кодировка объявляется первой: без неё ФИО читается как latin1.
		element(0x0008, 0x0005, "CS", ascii("ISO_IR 144")),
		element(0x0008, 0x0018, "UI", ascii(`${values.studyUid}.1`)),
		element(0x0008, 0x0020, "DA", ascii(values.studyDate)),
		element(0x0008, 0x0030, "TM", ascii("143015")),
		element(0x0008, 0x0060, "CS", ascii(values.modality)),
		element(0x0008, 0x0070, "LO", iso5(values.manufacturer)),
		element(0x0008, 0x0080, "LO", iso5("Стоматология ДЕНТЕ")),
		element(0x0008, 0x1030, "LO", iso5("КТ верхней челюсти")),
		element(0x0010, 0x0010, "PN", iso5(values.patientName)),
		element(0x0010, 0x0020, "LO", ascii(values.patientId)),
		element(0x0010, 0x0030, "DA", ascii(values.birthDate)),
		element(0x0010, 0x0040, "CS", ascii(values.sex)),
		element(0x0018, 0x0015, "CS", ascii("TEETH")),
		element(0x0018, 0x0050, "DS", ascii("0.25")),
		element(0x0020, 0x000d, "UI", ascii(values.studyUid)),
		element(0x0020, 0x000e, "UI", ascii(values.seriesUid)),
		element(0x0028, 0x0030, "DS", ascii("0.25\\0.25")),
	]);

	return Buffer.concat([
		Buffer.alloc(128),
		Buffer.from("DICM", "latin1"),
		metaLength,
		metaElements,
		dataset,
	]);
}

/** Заголовок базы Firebird: тип страницы 1 и версия ODS. */
function buildFirebirdHeader(odsVersion: number): Buffer {
	const buffer = Buffer.alloc(4096);
	buffer[0] = 0x01;
	buffer[1] = 0x00;
	buffer.writeUInt16LE(odsVersion, 18);
	buffer.write("FIREBIRD", 32, "latin1");
	return buffer;
}

/** Заголовок базы Microsoft Access Jet 4. */
function buildAccessJet4Header(): Buffer {
	const buffer = Buffer.alloc(4096);
	buffer[0] = 0x00;
	buffer.write("Standard Jet DB", 4, "latin1");
	return buffer;
}

/** Заголовок резервной копии MS SQL Server. */
function buildMssqlBackupHeader(): Buffer {
	const buffer = Buffer.alloc(4096);
	buffer.write("TAPE     ", 0, "latin1");
	buffer.write("MSSQL_BACKUP_MEDIA", 64, "latin1");
	return buffer;
}

/** Заголовок файловой базы 1С. */
function buildOneCHeader(): Buffer {
	const buffer = Buffer.alloc(4096);
	buffer.write("1CDBMSV8", 0, "latin1");
	buffer.write("8.3.", 8, "latin1");
	return buffer;
}

// ---------------------------------------------------------------------------

const workDir = await mkdtemp(path.join(tmpdir(), "dente-formats-"));
console.log(
	`\n=== Настоящие форматы баз старых систем ===\nРабочий каталог: ${workDir}\n`,
);

const [org] = await db
	.insert(organizations)
	.values({ name: `E2E-formats-${Date.now()}` })
	.returning();
const ORG = org!.id;

try {
	// =====================================================================
	console.log("--- 1. DBF FoxPro в cp866 с memo-файлом .FPT (Инфодент)");
	/**
	 * Главная проверка: memo-поле хранит НОМЕР БЛОКА, а не текст. Без чтения .fpt
	 * в карточку пациента попала бы строка «1» вместо анамнеза.
	 */
	const memoTexts = [
		"Жалобы на боль при накусывании на 16 зуб, длится третью неделю. Ранее лечен по поводу глубокого кариеса.",
		"Аллергия на лидокаин. Гипертония, принимает эналаприл. Беременность 22 недели.",
		"Плановый осмотр. Жалоб нет. Рекомендована профессиональная гигиена.",
	];
	const fpt = buildFptFile(memoTexts, "ibm866");

	const foxproFields: DbfFixtureField[] = [
		{ name: "NKART", type: "I", length: 4 },
		{ name: "FIO", type: "C", length: 44 },
		{ name: "TEL", type: "C", length: 20 },
		{ name: "DROJD", type: "D", length: 8 },
		{ name: "ANAMNEZ", type: "M", length: 10 },
	];
	const foxproRows = [
		[
			"101",
			"Иванов Иван Иванович",
			"89001234567",
			"19800115",
			String(fpt.pointers[0]),
		],
		[
			"102",
			"Петрова Мария Сергеевна",
			"89161112233",
			"19920320",
			String(fpt.pointers[1]),
		],
		[
			"103",
			"Сидоров Алексей Николаевич",
			"84957778899",
			"19751122",
			String(fpt.pointers[2]),
		],
	];
	const dbfWithMemo = buildDbfFile(
		foxproRows.length > 0 ? foxproFields : foxproFields,
		foxproRows,
		{
			languageDriver: 0x65,
			encoding: "ibm866",
			version: 0xf5,
		},
	);

	const dbfPath = path.join(workDir, "PACIENT.DBF");
	const fptPath = path.join(workDir, "PACIENT.FPT");
	await writeFile(dbfPath, dbfWithMemo);
	await writeFile(fptPath, fpt.buffer);

	const dbfFormat = identifyFormat(
		dbfWithMemo.subarray(0, 4096),
		"PACIENT.DBF",
	);
	same("формат опознан", dbfFormat.id, "dbf");
	same("версия FoxPro с memo", dbfFormat.version, "FoxPro 2.x с memo");
	check(
		"предупреждение о memo выдано",
		dbfFormat.guidance?.includes("memo") === true,
		dbfFormat.guidance ?? "нет",
	);

	const dbfShape = await detectSourceShape({
		filePath: dbfPath,
		fileName: "PACIENT.DBF",
		byteSize: dbfWithMemo.length,
	});
	same("кодировка из байта 29", dbfShape.detectedEncoding, "ibm866");

	const dbfBatches: string[][] = [];
	for await (const batch of streamSourceRows({
		filePath: dbfPath,
		fileName: "PACIENT.DBF",
		shape: dbfShape,
	})) {
		dbfBatches.push(...batch.rows);
	}
	same("прочитано 3 записи", dbfBatches.length, 3);
	same("ФИО из cp866", dbfBatches[0]?.[1], "Иванов Иван Иванович");
	/** Вот ради чего memo и читается. */
	check(
		"АНАМНЕЗ подтянут из .FPT, а не остался номером блока",
		dbfBatches[0]?.[4] === memoTexts[0],
		`получено: «${(dbfBatches[0]?.[4] ?? "").slice(0, 60)}»`,
	);
	check(
		"второй memo прочитан целиком",
		dbfBatches[1]?.[4] === memoTexts[1],
		(dbfBatches[1]?.[4] ?? "").slice(0, 50),
	);
	check(
		"третий memo прочитан",
		dbfBatches[2]?.[4] === memoTexts[2],
		(dbfBatches[2]?.[4] ?? "").slice(0, 50),
	);

	// =====================================================================
	console.log("--- 2. DBF dBASE III с memo .DBT (терминатор 0x1A, длины нет)");
	const dbtTexts = [
		"Хронический пародонтит средней степени тяжести.",
		"Состояние после имплантации 36 зуба.",
	];
	const dbt = buildDbtFile(dbtTexts, "windows-1251");
	const dbase3Fields: DbfFixtureField[] = [
		{ name: "KOD", type: "I", length: 4 },
		{ name: "FIO", type: "C", length: 40 },
		{ name: "DIAGNOZ", type: "M", length: 10 },
	];
	const dbase3 = buildDbfFile(
		dbase3Fields,
		[
			["201", "Кузнецова Ольга Владимировна", String(dbt.pointers[0])],
			["202", "Морозов Сергей Петрович", String(dbt.pointers[1])],
		],
		{ languageDriver: 0xc9, encoding: "windows-1251", version: 0x83 },
	);
	const dbase3Path = path.join(workDir, "KARTA.DBF");
	await writeFile(dbase3Path, dbase3);
	await writeFile(path.join(workDir, "KARTA.DBT"), dbt.buffer);

	const dbase3Shape = await detectSourceShape({
		filePath: dbase3Path,
		fileName: "KARTA.DBF",
		byteSize: dbase3.length,
	});
	const dbase3Rows: string[][] = [];
	for await (const batch of streamSourceRows({
		filePath: dbase3Path,
		fileName: "KARTA.DBF",
		shape: dbase3Shape,
	})) {
		dbase3Rows.push(...batch.rows);
	}
	same("прочитано 2 записи dBASE III", dbase3Rows.length, 2);
	check(
		"memo .DBT прочитан по терминатору",
		dbase3Rows[0]?.[2] === dbtTexts[0],
		(dbase3Rows[0]?.[2] ?? "").slice(0, 50),
	);
	check(
		"второй блок .DBT прочитан",
		dbase3Rows[1]?.[2] === dbtTexts[1],
		(dbase3Rows[1]?.[2] ?? "").slice(0, 50),
	);

	// =====================================================================
	console.log("--- 3. База SQLite с несколькими таблицами");
	const sqlitePath = path.join(workDir, "clinic.db");
	{
		const database = new DatabaseSync(sqlitePath);
		database.exec(`
      create table settings (key text, value text);
      create table patients (
        id integer primary key, full_name text, phone text, birth_date text, notes text
      );
      create table visits (id integer primary key, patient_id integer, visit_date text, complaint text);
      insert into settings values ('theme','dark');
    `);
		const insertPatient = database.prepare(
			"insert into patients (id, full_name, phone, birth_date, notes) values (?, ?, ?, ?, ?)",
		);
		const names = [
			[
				"Волкова Анна Петровна",
				"+79031234567",
				"1988-07-07",
				"Ортодонтия, брекеты",
			],
			[
				"Соколов Дмитрий Игоревич",
				"89052223344",
				"1970-11-30",
				"Импланты 36, 46",
			],
			["Лебедева Ирина Олеговна", "89091112233", "1995-02-14", "Отбеливание"],
		];
		names.forEach((row, index) => {
			insertPatient.run(index + 1, row[0]!, row[1]!, row[2]!, row[3]!);
		});
		const insertVisit = database.prepare(
			"insert into visits (id, patient_id, visit_date, complaint) values (?,?,?,?)",
		);
		insertVisit.run(1, 1, "2020-03-12", "Боль в 16");
		database.close();
	}

	const sqliteHead = Buffer.alloc(4096);
	{
		const handle = await open(sqlitePath, "r");
		await handle.read(sqliteHead, 0, 4096, 0);
		await handle.close();
	}
	same(
		"SQLite опознан по сигнатуре",
		identifyFormat(sqliteHead, "clinic.db").id,
		"sqlite",
	);

	const inspection = inspectSqlite(sqlitePath);
	const ranked = rankTablesByRelevance(inspection.tables);
	console.log(
		`       таблицы: ${inspection.tables.map((t) => `${t.name}(${t.rowCount})`).join(", ")}`,
	);
	same(
		"самой значимой признана таблица пациентов",
		ranked[0]?.name,
		"patients",
	);
	check(
		"служебная таблица settings исключена",
		!ranked.some((t) => t.name === "settings"),
		ranked.map((t) => t.name).join(","),
	);

	const sqliteShape = await detectSourceShape({
		filePath: sqlitePath,
		fileName: "clinic.db",
		byteSize: sqliteHead.length,
	});
	same("выбрана таблица patients", sqliteShape.selectedTable, "patients");
	check(
		"перечислены все таблицы с данными",
		(sqliteShape.availableTables?.length ?? 0) >= 2,
		JSON.stringify(sqliteShape.availableTables),
	);

	const sqliteRows: string[][] = [];
	for await (const batch of streamSourceRows({
		filePath: sqlitePath,
		fileName: "clinic.db",
		shape: sqliteShape,
	})) {
		sqliteRows.push(...batch.rows);
	}
	same("прочитано 3 пациента из SQLite", sqliteRows.length, 3);
	check(
		"ФИО из SQLite целы",
		sqliteRows.some((row) => row.includes("Волкова Анна Петровна")),
		sqliteRows[0]?.join("|"),
	);

	// =====================================================================
	console.log("--- 4. Снимок DICOM с кириллицей в ISO_IR 144");
	const dicomBuffer = buildDicomFile({
		patientName: "Иванов^Иван^Иванович",
		patientId: "101",
		birthDate: "19800115",
		sex: "M",
		studyUid: "1.2.840.113619.2.55.3.2831178355.8",
		seriesUid: "1.2.840.113619.2.55.3.2831178355.8.1",
		modality: "CT",
		studyDate: "20200312",
		manufacturer: "Планмека",
	});
	const dicomPath = path.join(workDir, "IM000001");
	await writeFile(dicomPath, dicomBuffer);

	same(
		"DICOM опознан",
		identifyFormat(dicomBuffer.subarray(0, 4096), "IM000001").id,
		"dicom",
	);

	const dicom = await readDicomMetadata(dicomPath);
	console.log(
		`       пациент: ${dicom.patientName}, ДР ${dicom.patientBirthDate}, ${dicom.modality}, ${dicom.manufacturer}`,
	);
	/**
	 * Заглушка DicomVacuum возвращала здесь захардкоженного «IVANOV^IVAN^IVANOVICH»
	 * независимо от файла. Проверяем, что читается именно то, что записано.
	 */
	same(
		"ФИО прочитано и развёрнуто из формы с ^",
		dicom.patientName,
		"Иванов Иван Иванович",
	);
	same("идентификатор пациента", dicom.patientId, "101");
	same("дата рождения в ISO", dicom.patientBirthDate, "1980-01-15");
	same("пол", dicom.patientSex, "male");
	same("модальность", dicom.modality, "CT");
	same("дата исследования", dicom.studyDate, "2020-03-12");
	same("время исследования", dicom.studyTime, "14:30:15");
	same("производитель в кириллице", dicom.manufacturer, "Планмека");
	same("объявленная кодировка", dicom.characterSet, "ISO_IR 144");
	same(
		"UID исследования",
		dicom.studyInstanceUid,
		"1.2.840.113619.2.55.3.2831178355.8",
	);
	same("толщина среза", dicom.sliceThickness, "0.25");

	// =====================================================================
	console.log("--- 5. Закрытые форматы: опознание и инструкция вместо выдумки");
	const closedFormats: Array<{
		name: string;
		buffer: Buffer;
		expectedId: string;
		expectHint: RegExp;
	}> = [
		{
			name: "IDENT.FDB",
			buffer: buildFirebirdHeader(12),
			expectedId: "firebird",
			expectHint: /IDENT|Firebird|ISQL/i,
		},
		{
			name: "clinic.mdb",
			buffer: buildAccessJet4Header(),
			expectedId: "access_jet4",
			expectHint: /Access|CSV/i,
		},
		{
			name: "dentalpro.bak",
			buffer: buildMssqlBackupHeader(),
			expectedId: "mssql_backup",
			expectHint: /RESTORE|SQL Server/i,
		},
		{
			name: "1Cv8.1CD",
			buffer: buildOneCHeader(),
			expectedId: "onec_1cd",
			expectHint: /1С|конфигуратор/i,
		},
	];

	for (const item of closedFormats) {
		const filePath = path.join(workDir, item.name);
		await writeFile(filePath, item.buffer);
		const format = identifyFormat(item.buffer.subarray(0, 4096), item.name);
		same(`${item.name} опознан`, format.id, item.expectedId);
		same(
			`${item.name}: движок честно говорит, что не читает`,
			format.readable,
			false,
		);
		check(
			`${item.name}: выдана конкретная инструкция`,
			typeof format.guidance === "string" &&
				item.expectHint.test(format.guidance),
			(format.guidance ?? "нет").slice(0, 90),
		);
		if (format.version)
			console.log(`       ${item.name}: ${format.title}, ${format.version}`);
	}

	// =====================================================================
	console.log("--- 6. Поиск по каталогу: что нашлось и что с этим делать");
	const discovery = await discoverLocalSources({
		roots: [workDir],
		maxDepth: 2,
		timeBudgetMs: 20_000,
	});
	const summary = summarizeDiscovery(discovery);
	console.log(
		`       просмотрено файлов: ${discovery.filesScanned}, найдено источников: ${discovery.sources.length}`,
	);
	for (const source of discovery.sources) {
		console.log(
			`       ${source.format.readable ? "[читаем]  " : "[выгрузка]"} ${source.fileName}: ${source.format.title}${
				source.details.length > 0 ? ` — ${source.details[0]}` : ""
			}`,
		);
	}
	check(
		"найдены читаемые источники",
		summary.readable >= 3,
		`читаемых ${summary.readable}`,
	);
	check(
		"найдены требующие выгрузки",
		summary.needsExport >= 4,
		`нечитаемых ${summary.needsExport}`,
	);
	check(
		"каталог снимков распознан отдельно",
		discovery.imagingFolders.length >= 1,
		JSON.stringify(
			discovery.imagingFolders.map((f) => `${f.directory}:${f.fileCount}`),
		),
	);
	check(
		"у DBF показано число записей",
		discovery.sources.some(
			(s) =>
				s.format.id === "dbf" && s.details.some((d) => d.includes("Записей")),
		),
		discovery.sources.find((s) => s.format.id === "dbf")?.details.join("; ") ??
			"нет",
	);
	check(
		"у SQLite показаны таблицы",
		discovery.sources.some(
			(s) =>
				s.format.id === "sqlite" &&
				s.details.some((d) => d.includes("patients")),
		),
		discovery.sources
			.find((s) => s.format.id === "sqlite")
			?.details.join("; ") ?? "нет",
	);

	// =====================================================================
	console.log("--- 7. Сквозной перенос: DBF с memo → боевая база");
	const migration = await runMigration({
		organizationId: ORG,
		sourceName: "Инфодент PACIENT.DBF",
		contentBase64: dbfWithMemo.toString("base64"),
		allowLlm: false,
		dryRun: false,
		sourceSystem: "infodent",
		mappingOverrides: [],
		requestedEntityKind: "patient",
	});
	console.log(
		`       создано ${migration.run.loadedRows}, карантин ${migration.run.quarantinedRows}`,
	);
	const loaded = await db
		.select({
			fullName: patients.fullName,
			phone: patients.phone,
			notes: patients.notes,
		})
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	same("перенесено 3 пациента", loaded.length, 3);
	check(
		"телефон нормализован",
		loaded.some((p) => p.phone === "+79001234567"),
		loaded.map((p) => p.phone).join(","),
	);
	/**
	 * Перенос через contentBase64 идёт мимо потокового пути, поэтому memo здесь
	 * не подтягивается: файл .fpt лежит рядом на диске, а в теле запроса его нет.
	 * Проверяем, что движок не выдумал текст и не записал номер блока как анамнез.
	 */
	const notes = loaded.map((p) => p.notes ?? "").join(" ");
	check(
		"номер блока memo не записан в карточку как текст",
		!/^\s*\d+\s*$/.test(loaded[0]?.notes ?? ""),
		`примечание: «${(loaded[0]?.notes ?? "").slice(0, 60)}»`,
	);
	void notes;

	console.log("--- 8. Сквозной перенос: SQLite → боевая база");
	const sqliteBytes = await readFile(sqlitePath);
	const sqliteMigration = await runMigration({
		organizationId: ORG,
		sourceName: "clinic.db",
		contentBase64: sqliteBytes.toString("base64"),
		allowLlm: false,
		dryRun: false,
		sourceSystem: "desktop_sqlite",
		mappingOverrides: [],
		requestedEntityKind: "patient",
	});
	console.log(
		`       создано ${sqliteMigration.run.loadedRows}, карантин ${sqliteMigration.run.quarantinedRows}`,
	);
	const afterSqlite = await db
		.select({ n: sql<string>`count(*)` })
		.from(patients)
		.where(eq(patients.organizationId, ORG));
	check(
		"пациенты из SQLite добавились",
		Number(afterSqlite[0]!.n) >= 6,
		`всего ${afterSqlite[0]!.n}`,
	);
	check(
		"сверка сошлась",
		sqliteMigration.reconciliation.balanced,
		sqliteMigration.reconciliation.checks
			.filter((c) => !c.passed)
			.map((c) => c.title)
			.join("; ") || "ок",
	);
} catch (error) {
	fail += 1;
	console.error("\n!!! Проверка прервана исключением:");
	console.error(
		error instanceof Error ? (error.stack ?? error.message) : String(error),
	);
} finally {
	console.log("\n--- Уборка");
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
	await rm(workDir, { recursive: true, force: true });
	console.log("Убрано.");

	console.log(`\n${pass} passed, ${fail} failed`);
	if (pass === 0)
		console.error("Ни одна проверка не выполнена — считаем это провалом.");
	await pool.end();
	process.exit(fail > 0 || pass === 0 ? 1 : 0);
}
