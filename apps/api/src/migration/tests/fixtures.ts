/**
 * Построители настоящих двоичных файлов для тестов переноса.
 *
 * ЗАЧЕМ НЕ ГОТОВЫЕ ФАЙЛЫ В РЕПОЗИТОРИИ
 * Двоичный образец в тестовых данных нельзя прочитать глазами при разборе
 * упавшего теста: непонятно, что именно в нём лежит и какое поведение он
 * проверяет. Здесь файл собирается по спецификации в коде, поэтому видно, какой
 * байт что означает, и можно менять условие (кодовую страницу, тип поля,
 * признак удаления) не пересоздавая образцы.
 */

/** Кодирует текст в однобайтовую кодировку через обратную таблицу декодера. */
export function encodeSingleByte(text: string, encoding: string): Buffer {
	const decoder = new TextDecoder(encoding);
	const map = new Map<number, number>();
	for (let byte = 0; byte <= 0xff; byte += 1) {
		const code = decoder.decode(Uint8Array.of(byte)).codePointAt(0);
		if (code !== undefined && !map.has(code)) map.set(code, byte);
	}
	// Незакодируемый символ становится «?» — так же поступают настоящие экспортёры.
	return Buffer.from(
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		[...text].map((char) => map.get(char.codePointAt(0)!) ?? 0x3f),
	);
}

export interface DbfFixtureField {
	name: string;
	/** C, N, D, L, I, Y, M и прочие односимвольные коды типов dBASE. */
	type: string;
	length: number;
	decimals?: number;
}

export interface DbfFixtureOptions {
	/** Идентификатор кодовой страницы для байта 29 заголовка. */
	languageDriver: number;
	/** Кодировка, которой кодируется текст полей. Должна отвечать languageDriver. */
	encoding: string;
	/** Индексы записей, помечаемых как удалённые. */
	deletedIndexes?: number[];
	/** Версия в байте 0. По умолчанию 0x03 — dBASE III+ без memo. */
	version?: number;
}

/** Собирает файл .dbf по спецификации dBASE III/IV. */
export function buildDbfFile(
	fields: DbfFixtureField[],
	records: string[][],
	options: DbfFixtureOptions,
): Buffer {
	const headerLength = 32 + fields.length * 32 + 1;
	const recordLength = fields.reduce((sum, field) => sum + field.length, 0) + 1;

	const header = Buffer.alloc(headerLength, 0);
	header[0] = options.version ?? 0x03;
	// Дата последнего изменения: 15.03.2024 (год от 1900).
	header[1] = 124;
	header[2] = 3;
	header[3] = 15;
	header.writeUInt32LE(records.length, 4);
	header.writeUInt16LE(headerLength, 8);
	header.writeUInt16LE(recordLength, 10);
	header[29] = options.languageDriver;

	fields.forEach((field, index) => {
		const offset = 32 + index * 32;
		Buffer.from(field.name, "ascii").copy(
			header,
			offset,
			0,
			Math.min(10, field.name.length),
		);
		header[offset + 11] = field.type.charCodeAt(0);
		header[offset + 16] = field.length;
		header[offset + 17] = field.decimals ?? 0;
	});
	header[headerLength - 1] = 0x0d;

	const body = records.map((record, recordIndex) => {
		const buffer = Buffer.alloc(recordLength, 0x20);
		buffer[0] = options.deletedIndexes?.includes(recordIndex) ? 0x2a : 0x20;
		let offset = 1;
		fields.forEach((field, fieldIndex) => {
			const value = record[fieldIndex] ?? "";
			let bytes: Buffer;
			if (field.type === "I") {
				bytes = Buffer.alloc(4);
				bytes.writeInt32LE(Number(value) || 0);
			} else if (field.type === "Y") {
				bytes = Buffer.alloc(8);
				bytes.writeBigInt64LE(BigInt(Math.round(Number(value) * 10000)));
			} else if (field.type === "L") {
				bytes = Buffer.from(value || " ", "ascii");
			} else {
				bytes = encodeSingleByte(value, options.encoding);
			}
			if (field.type === "N") {
				// Числовые поля в DBF выравниваются по правому краю.
				bytes.copy(
					buffer,
					offset + Math.max(0, field.length - bytes.length),
					0,
					Math.min(field.length, bytes.length),
				);
			} else {
				bytes.copy(buffer, offset, 0, Math.min(field.length, bytes.length));
			}
			offset += field.length;
		});
		return buffer;
	});

	// 0x1A — маркер конца файла, его ставят все настоящие экспортёры.
	return Buffer.concat([header, ...body, Buffer.from([0x1a])]);
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

function crc32(buffer: Buffer): number {
	let table = crc32.table;
	if (!table) {
		table = new Int32Array(256);
		for (let index = 0; index < 256; index += 1) {
			let value = index;
			for (let bit = 0; bit < 8; bit += 1) {
				value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
			}
			table[index] = value;
		}
		crc32.table = table;
	}
	let crc = -1;
	for (const byte of buffer) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]!;
	}
	return (crc ^ -1) >>> 0;
}
crc32.table = undefined as Int32Array | undefined;

/**
 * Собирает ZIP без сжатия (метод 0). readZipEntries поддерживает и метод 0,
 * и deflate; несжатый вариант делает содержимое читаемым при отладке теста.
 */
function buildZip(files: Array<{ name: string; content: string }>): Buffer {
	const locals: Buffer[] = [];
	const centrals: Buffer[] = [];
	let offset = 0;

	for (const file of files) {
		const nameBytes = Buffer.from(file.name, "utf8");
		const data = Buffer.from(file.content, "utf8");
		const checksum = crc32(data);

		const local = Buffer.alloc(30 + nameBytes.length);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4); // версия
		local.writeUInt16LE(0, 6); // флаги
		local.writeUInt16LE(0, 8); // метод: без сжатия
		local.writeUInt32LE(checksum, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBytes.length, 26);
		nameBytes.copy(local, 30);
		locals.push(local, data);

		const central = Buffer.alloc(46 + nameBytes.length);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt16LE(0, 8);
		central.writeUInt16LE(0, 10); // метод
		central.writeUInt32LE(checksum, 16);
		central.writeUInt32LE(data.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(nameBytes.length, 28);
		central.writeUInt32LE(offset, 42);
		nameBytes.copy(central, 46);
		centrals.push(central);

		offset += local.length + data.length;
	}

	const centralDirectory = Buffer.concat(centrals);
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0);
	eocd.writeUInt16LE(files.length, 8);
	eocd.writeUInt16LE(files.length, 10);
	eocd.writeUInt32LE(centralDirectory.length, 12);
	eocd.writeUInt32LE(offset, 16);

	return Buffer.concat([...locals, centralDirectory, eocd]);
}

export interface XlsxFixtureCell {
	/** Адрес вида «A1». Пропущенные адреса означают пустые ячейки. */
	ref: string;
	value: string;
	/** inlineStr по умолчанию; «n» — число, «date» — число со стилем даты. */
	type?: "inlineStr" | "n" | "date";
}

/**
 * Собирает книгу .xlsx с ячейками по адресам.
 *
 * Ключевая особенность образца: пустые ячейки НЕ записываются вовсе — именно так
 * поступает Excel, и именно на этом ломается разбор по порядку тегов.
 */
export function buildXlsxFile(
	sheetName: string,
	cells: XlsxFixtureCell[],
): Buffer {
	const byRow = new Map<number, XlsxFixtureCell[]>();
	for (const cell of cells) {
		const rowNumber = Number(/\d+/.exec(cell.ref)?.[0] ?? "1");
		const group = byRow.get(rowNumber) ?? [];
		group.push(cell);
		byRow.set(rowNumber, group);
	}

	const rowsXml = [...byRow.entries()]
		.sort((left, right) => left[0] - right[0])
		.map(([rowNumber, rowCells]) => {
			const cellsXml = rowCells
				.map((cell) => {
					if (cell.type === "n")
						return `<c r="${cell.ref}"><v>${cell.value}</v></c>`;
					// Стиль 1 объявлен в styles.xml как формат даты (numFmtId 14).
					if (cell.type === "date")
						return `<c r="${cell.ref}" s="1"><v>${cell.value}</v></c>`;
					const escaped = cell.value
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;");
					return `<c r="${cell.ref}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
				})
				.join("");
			return `<row r="${rowNumber}">${cellsXml}</row>`;
		})
		.join("");

	const escapedSheetName = sheetName
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/"/g, "&quot;");

	return buildZip([
		{
			name: "[Content_Types].xml",
			content:
				'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
		},
		{
			name: "xl/workbook.xml",
			content: `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapedSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
		},
		{
			name: "xl/_rels/workbook.xml.rels",
			content:
				'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
		},
		{
			name: "xl/styles.xml",
			content:
				'<?xml version="1.0"?><styleSheet><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>',
		},
		{
			name: "xl/worksheets/sheet1.xml",
			content: `<?xml version="1.0"?><worksheet><sheetData>${rowsXml}</sheetData></worksheet>`,
		},
	]);
}
