/**
 * Опознание формата файла по содержимому, а не по расширению.
 *
 * ЗАЧЕМ ПО СОДЕРЖИМОМУ
 * Расширение врёт систематически. Выгрузка приходит как «база.txt», внутри
 * которой DBF; как «backup.zip», внутри которого MDF; как «data.db», который
 * может быть и SQLite, и Paradox, и просто переименованным чем угодно. Решать
 * по расширению значит регулярно ошибаться на первом же шаге.
 *
 * ЧЕСТНОСТЬ ПРО ЧИТАЕМОСТЬ
 * Часть форматов читается полностью (DBF, SQLite, табличные тексты), часть —
 * нет (Firebird, MS SQL, Access, 1CD): это закрытые страничные форматы, и
 * написать для них читалку «на коленке» нельзя, а сделать вид, что написал, —
 * худшее из возможного. Для нечитаемых форматов возвращается точное опознание с
 * версией и конкретная инструкция: чем открыть и что выгрузить. Такая
 * инструкция полезнее неверно прочитанных данных.
 */

export type SourceFormatId =
	| "dbf"
	| "dbf_memo"
	| "sqlite"
	| "access_jet3"
	| "access_jet4"
	| "access_ace"
	| "firebird"
	| "interbase"
	| "mssql_mdf"
	| "mssql_backup"
	| "onec_1cd"
	| "paradox"
	| "dicom"
	| "zip_ooxml"
	| "zip_archive"
	| "pdf"
	| "rtf"
	| "sql_dump"
	| "json"
	| "xml"
	| "delimited"
	| "utf16_text"
	| "unknown";

export interface FormatSignature {
	id: SourceFormatId;
	/** Название для оператора. */
	title: string;
	/** Читается ли движком переноса прямо сейчас. */
	readable: boolean;
	/** Версия или подвид, если удалось определить. */
	version: string | null;
	/** Что делать оператору, если формат не читается. */
	guidance: string | null;
	/** Насколько уверенно опознан: 1 — по магической сигнатуре, ниже — по признакам. */
	confidence: number;
}

/** Сравнивает байты по смещению. */
function matches(
	buffer: Buffer,
	offset: number,
	bytes: readonly number[],
): boolean {
	if (buffer.length < offset + bytes.length) return false;
	for (let index = 0; index < bytes.length; index += 1) {
		if (buffer[offset + index] !== bytes[index]) return false;
	}
	return true;
}

function asciiAt(buffer: Buffer, offset: number, length: number): string {
	if (buffer.length < offset + length) return "";
	return buffer.subarray(offset, offset + length).toString("latin1");
}

/** Версии DBF по первому байту. Совпадает с таблицей в parsers/dbf.ts. */
const DBF_VERSIONS: Record<number, string> = {
	2: "FoxBASE",
	3: "dBASE III+",
	4: "dBASE IV",
	5: "dBASE 5",
	48: "Visual FoxPro",
	49: "Visual FoxPro с автоинкрементом",
	50: "Visual FoxPro с Varchar",
	67: "dBASE IV SQL",
	123: "dBASE IV с memo",
	131: "dBASE III+ с memo",
	139: "dBASE IV с memo",
	142: "dBASE IV SQL-система",
	245: "FoxPro 2.x с memo",
	251: "FoxPro",
};

/**
 * Опознаёт формат по первым байтам файла.
 *
 * Достаточно первых нескольких килобайт: все проверяемые сигнатуры лежат в
 * начале файла. Читать больше незачем и вредно — опознание должно быть дешёвым,
 * чтобы прогон по каталогу с тысячей файлов не занимал минуты.
 */
export function identifyFormat(head: Buffer, fileName = ""): FormatSignature {
	const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

	// ---- SQLite. Строка-заголовок фиксирована спецификацией.
	if (asciiAt(head, 0, 15) === "SQLite format 3") {
		return {
			id: "sqlite",
			title: "База SQLite",
			readable: true,
			version: "3",
			guidance: null,
			confidence: 1,
		};
	}

	// ---- DICOM. Префикс 128 байт, затем «DICM».
	if (asciiAt(head, 128, 4) === "DICM") {
		return {
			id: "dicom",
			title: "Снимок DICOM",
			readable: true,
			version: "Part 10",
			guidance: null,
			confidence: 1,
		};
	}

	// ---- MS Access. Сигнатура в заголовке страницы 0.
	if (asciiAt(head, 4, 15) === "Standard Jet DB") {
		return {
			id: "access_jet4",
			title: "База Microsoft Access (Jet 4, .mdb)",
			readable: false,
			version: "Jet 4 (Access 2000–2003)",
			guidance:
				"Формат закрытый и постранично зашифрованный. Откройте базу в Microsoft Access или в бесплатном MDB Viewer, выделите таблицы пациентов, приёмов и платежей и сохраните каждую как CSV в кодировке UTF-8. Полученные файлы переносятся полностью.",
			confidence: 1,
		};
	}
	if (asciiAt(head, 4, 19) === "Standard ACE DB") {
		return {
			id: "access_ace",
			title: "База Microsoft Access (ACE, .accdb)",
			readable: false,
			version: "ACE (Access 2007+)",
			guidance:
				"Откройте базу в Microsoft Access и экспортируйте нужные таблицы в CSV (UTF-8) либо в XLSX. Прямое чтение .accdb требует драйвера Microsoft, которого нет на сервере клиники.",
			confidence: 1,
		};
	}
	if (asciiAt(head, 4, 15).startsWith("Standard Jet")) {
		return {
			id: "access_jet3",
			title: "База Microsoft Access (Jet 3, .mdb)",
			readable: false,
			version: "Jet 3 (Access 97)",
			guidance:
				"Access 97 не открывается современными версиями Office. Используйте MDB Viewer Plus или mdbtools и выгрузите таблицы в CSV.",
			confidence: 1,
		};
	}

	/**
	 * Firebird и InterBase. Заголовок страницы базы: тип страницы 0x01 в первом
	 * байте, версия страницы во втором, и сигнатура ODS в 16-битных полях.
	 * Различаются по номеру ODS: Firebird идёт с 10 и выше, InterBase — до 10.
	 */
	if (head.length > 32 && head[0] === 0x01 && head[1] === 0x00) {
		const odsVersion = head.readUInt16LE(18);
		const isPlausibleOds = odsVersion >= 8 && odsVersion <= 20;
		if (isPlausibleOds || extension === "fdb" || extension === "gdb") {
			const firebird = odsVersion >= 10;
			return {
				id: firebird ? "firebird" : "interbase",
				title: firebird ? "База Firebird" : "База InterBase",
				readable: false,
				version: isPlausibleOds ? `ODS ${odsVersion}` : null,
				guidance:
					"На этом формате работает IDENT и часть систем на его основе. Выгрузка делается штатно: установите Firebird ISQL или IBExpert, подключитесь к файлу базы и выполните выгрузку таблиц пациентов, приёмов и платежей в CSV. Пароль по умолчанию у IDENT обычно SYSDBA/masterkey — уточните у администратора клиники.",
				confidence: isPlausibleOds ? 0.9 : 0.5,
			};
		}
	}

	/**
	 * Резервная копия MS SQL Server. Формат MTF (Microsoft Tape Format):
	 * блок начинается с четырёхсимвольного идентификатора «TAPE», дальше идут
	 * поля переменной длины. Проверяем только идентификатор — то, что за ним,
	 * у разных версий сервера различается.
	 *
	 * Эта проверка стоит ДО файла данных: клиника отдаёт резервную копию на
	 * порядок чаще, чем отсоединённый файл базы.
	 */
	if (asciiAt(head, 0, 4) === "TAPE" || asciiAt(head, 0, 8) === "MSSQLBAK") {
		return {
			id: "mssql_backup",
			title: "Резервная копия Microsoft SQL Server (.bak)",
			readable: false,
			version: null,
			guidance:
				"Восстановите копию на любом экземпляре SQL Server (RESTORE DATABASE) и выгрузите нужные таблицы в CSV мастером экспорта SSMS. На этом формате работает DentalPRO и ряд систем на MS SQL.",
			confidence: 0.9,
		};
	}

	/**
	 * Файл данных MS SQL. Надёжной сигнатуры в первых байтах у него нет: страница
	 * 0 заполнена служебными полями. Опознаётся по строке в загрузочной странице,
	 * которая лежит на девятой странице файла (смещение 0x9000), плюс по
	 * расширению — одного расширения мало, но вместе этого достаточно, чтобы не
	 * молчать о явно принесённом .mdf.
	 */
	const mdfMarker =
		head.length > 0x1000 &&
		head
			.subarray(0, Math.min(head.length, 0x4000))
			.toString("latin1")
			.includes("Microsoft SQL Server");
	if (
		mdfMarker ||
		extension === "mdf" ||
		extension === "ndf" ||
		extension === "ldf"
	) {
		return {
			id: "mssql_mdf",
			title: "Файл данных Microsoft SQL Server (.mdf)",
			readable: false,
			version: null,
			guidance:
				"Файл данных нельзя прочитать в отрыве от сервера. Подключите базу к SQL Server (sp_attach_db) либо восстановите из резервной копии, затем выгрузите таблицы в CSV мастером экспорта SSMS.",
			confidence: mdfMarker ? 0.9 : 0.6,
		};
	}

	// ---- 1С: файловая база.
	if (asciiAt(head, 0, 8) === "1CDBMSV8") {
		return {
			id: "onec_1cd",
			title: "Файловая база 1С:Предприятие (.1CD)",
			readable: false,
			version: asciiAt(head, 8, 4).replace(/\0/g, "") || null,
			guidance:
				"Откройте базу в конфигураторе 1С и выгрузите справочники «Пациенты» и документы приёмов и оплат обработкой «Выгрузка в CSV» либо через «Все функции → Стандартные → Выгрузка загрузка данных XML».",
			confidence: 1,
		};
	}

	// ---- Paradox: старые системы на Borland.
	if (
		head.length > 2 &&
		head[2] === 0x00 &&
		(head[4] === 0x00 || head[4] === 0x01) &&
		extension === "db"
	) {
		const recordSize = head.readUInt16LE(0);
		if (recordSize > 0 && recordSize < 32768) {
			return {
				id: "paradox",
				title: "Таблица Paradox",
				readable: false,
				version: null,
				guidance:
					"Откройте таблицу в Paradox или в LibreOffice Base через драйвер Paradox и сохраните как CSV. Файлы .px, .mb рядом с таблицей — индексы и memo, их нужно держать в той же папке.",
				confidence: 0.5,
			};
		}
	}

	// ---- DBF. Проверяем не только версию, но и согласованность заголовка.
	if (head.length > 32) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const version = head[0]!;
		const label = DBF_VERSIONS[version];
		if (label) {
			const headerLength = head.readUInt16LE(8);
			const recordLength = head.readUInt16LE(10);
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const month = head[2]!;
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const day = head[3]!;
			const plausible =
				headerLength >= 64 &&
				recordLength > 0 &&
				month >= 1 &&
				month <= 12 &&
				day >= 1 &&
				day <= 31;
			if (plausible) {
				// Старший бит версии означает наличие memo-файла рядом.
				const hasMemo =
					(version & 0x80) !== 0 ||
					version === 0x30 ||
					version === 0xf5 ||
					version === 0x7b;
				return {
					id: "dbf",
					title: `Таблица ${label}`,
					readable: true,
					version: label,
					guidance: hasMemo
						? "У таблицы есть memo-поля: положите рядом файл .fpt или .dbt с тем же именем, иначе длинные тексты (жалобы, анамнез) не перенесутся."
						: null,
					confidence: 1,
				};
			}
		}
	}

	// ---- Memo-файлы DBF. Сами по себе бесполезны, но их надо узнавать.
	if (extension === "fpt" || extension === "dbt") {
		return {
			id: "dbf_memo",
			title: "Файл memo для таблицы DBF",
			readable: true,
			version: null,
			guidance:
				"Это приложение к таблице DBF, а не самостоятельная база. Загрузите вместе с одноимённым файлом .dbf — тексты подтянутся автоматически.",
			confidence: 0.9,
		};
	}

	// ---- ZIP-контейнеры: книги Excel и обычные архивы.
	if (
		matches(head, 0, [0x50, 0x4b, 0x03, 0x04]) ||
		matches(head, 0, [0x50, 0x4b, 0x05, 0x06])
	) {
		const asText = head
			.subarray(0, Math.min(head.length, 4096))
			.toString("latin1");
		const ooxml =
			asText.includes("[Content_Types].xml") ||
			asText.includes("xl/") ||
			asText.includes("word/");
		return {
			id: ooxml ? "zip_ooxml" : "zip_archive",
			title: ooxml ? "Книга Excel или документ Office" : "Архив ZIP",
			readable: ooxml,
			version: null,
			guidance: ooxml
				? null
				: "Распакуйте архив и загрузите файлы по отдельности: движок читает таблицы, а не архивы целиком.",
			confidence: 0.9,
		};
	}

	if (asciiAt(head, 0, 4) === "%PDF") {
		return {
			id: "pdf",
			title: "Документ PDF",
			readable: false,
			version: asciiAt(head, 5, 3),
			guidance:
				"PDF — это печатная форма, а не база. Если это распечатка списка пациентов, попросите выгрузку в CSV или XLSX: разбор таблицы из PDF даёт ошибки в каждой десятой строке.",
			confidence: 1,
		};
	}

	if (asciiAt(head, 0, 5) === "{\\rtf") {
		return {
			id: "rtf",
			title: "Документ RTF",
			readable: false,
			version: null,
			guidance: "Сохраните как CSV или XLSX.",
			confidence: 1,
		};
	}

	// ---- UTF-16 без BOM: половина байт нулевые.
	if (head.length >= 64) {
		let oddZero = 0;
		const pairs = Math.min(512, Math.floor(head.length / 2));
		for (let index = 0; index < pairs; index += 1) {
			if (head[index * 2 + 1] === 0) oddZero += 1;
		}
		if (oddZero / pairs > 0.7) {
			return {
				id: "utf16_text",
				title: "Текст в UTF-16",
				readable: true,
				version: null,
				guidance: null,
				confidence: 0.8,
			};
		}
	}

	// ---- Текстовые форматы по содержимому начала.
	const text = head.subarray(0, Math.min(head.length, 8192)).toString("utf8");
	const trimmed = text.replace(/^﻿/, "").trimStart();

	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return {
			id: "json",
			title: "Выгрузка JSON",
			readable: true,
			version: null,
			guidance: null,
			confidence: 0.85,
		};
	}
	if (trimmed.startsWith("<?xml") || /^<[A-Za-z_]/.test(trimmed)) {
		return {
			id: "xml",
			title: "Выгрузка XML",
			readable: true,
			version: null,
			guidance: null,
			confidence: 0.85,
		};
	}
	if (
		/\b(INSERT\s+INTO|CREATE\s+TABLE|COPY\s+\w+\s+FROM\s+stdin)\b/i.test(
			trimmed,
		)
	) {
		return {
			id: "sql_dump",
			title: "Дамп базы данных (SQL)",
			readable: false,
			version: null,
			guidance:
				"Восстановите дамп в PostgreSQL или MySQL и выгрузите таблицы в CSV. Разбирать дамп текстом небезопасно: строки с кавычками и переводами строк ломаются молча, а это поля «Жалобы» и «Анамнез».",
			confidence: 0.9,
		};
	}

	// ---- Таблица с разделителем: несколько строк с одинаковым числом разделителей.
	const lines = trimmed
		.split(/\r?\n/)
		.filter((line) => line.trim())
		.slice(0, 20);
	if (lines.length >= 2) {
		for (const delimiter of [";", "\t", ",", "|"]) {
			const counts = lines.map((line) => line.split(delimiter).length);
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const first = counts[0]!;
			if (
				first >= 2 &&
				counts.filter((count) => count === first).length / counts.length >= 0.8
			) {
				return {
					id: "delimited",
					title: `Таблица с разделителем «${delimiter === "\t" ? "табуляция" : delimiter}»`,
					readable: true,
					version: null,
					guidance: null,
					confidence: 0.8,
				};
			}
		}
	}

	return {
		id: "unknown",
		title: "Формат не опознан",
		readable: false,
		version: null,
		guidance:
			"Содержимое не похоже ни на один известный формат. Проверьте, не повреждён ли файл, и при возможности выгрузите данные из старой системы заново в CSV или XLSX.",
		confidence: 0,
	};
}

/** Форматы, которые движок читает сам, без участия оператора. */
const _READABLE_FORMATS: ReadonlySet<SourceFormatId> = new Set<SourceFormatId>([
	"dbf",
	"sqlite",
	"zip_ooxml",
	"json",
	"xml",
	"delimited",
	"utf16_text",
	"dicom",
]);
