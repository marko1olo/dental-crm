import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { TextDecoder } from "node:util";
import { normalizeDecodedText } from "../encoding.js";
import { DelimitedRowAccumulator, decodeDbfRecord } from "./batchTransformer.js";
import {
	DBF_LANGUAGE_ENCODINGS,
	type DbfMeta,
	STREAM_BATCH_ROWS,
	type StreamDbfBatch,
	type StreamDelimitedBatch,
} from "./types.js";

/** Читает ASCII-строку из буфера — для сравнения сигнатур. */
export function asciiHead(buffer: Buffer, offset: number, length: number): string {
	if (buffer.length < offset + length) return "";
	return buffer.subarray(offset, offset + length).toString("latin1");
}

/** Читает только заголовок DBF: размер файла при этом не важен. */
export async function readDbfMeta(filePath: string): Promise<DbfMeta> {
	const handle = await open(filePath, "r");
	try {
		const headerStart = Buffer.alloc(32);
		await handle.read(headerStart, 0, 32, 0);

		const declaredRecords = headerStart.readUInt32LE(4);
		const headerLength = headerStart.readUInt16LE(8);
		const recordLength = headerStart.readUInt16LE(10);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const languageDriver = headerStart[29]!;

		if (headerLength < 64 || recordLength === 0) {
			throw new Error(
				"Заголовок DBF повреждён: не согласуются длины заголовка и записи.",
			);
		}

		const descriptors = Buffer.alloc(headerLength - 32);
		await handle.read(descriptors, 0, descriptors.length, 32);

		const warnings: string[] = [];
		let encoding = DBF_LANGUAGE_ENCODINGS[languageDriver] ?? "";
		const encodingFromHeader = Boolean(encoding);
		if (!encoding) {
			encoding = "windows-1251";
			warnings.push(
				`В заголовке файла не указана кодовая страница (байт 29 = 0x${languageDriver.toString(16)}). Текст прочитан как windows-1251 — проверьте ФИО в предпросмотре.`,
			);
		}

		const ascii = new TextDecoder("ascii");
		const fields: DbfMeta["fields"] = [];
		for (let offset = 0; offset + 32 <= descriptors.length; offset += 32) {
			if (descriptors[offset] === 0x0d) break;
			const name = ascii
				.decode(descriptors.subarray(offset, offset + 11))
				.replace(/\0.*$/, "")
				.trim();
			if (!name) continue;
			fields.push({
				name,
				type: String.fromCharCode(descriptors[offset + 11] ?? 0x43),
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				length: descriptors[offset + 16]!,
			});
		}

		if (fields.length === 0)
			throw new Error("В заголовке DBF не найдено ни одного описания поля.");

		return {
			headerLength,
			recordLength,
			declaredRecords,
			fields,
			columns: fields.map((field) => field.name),
			encoding,
			encodingFromHeader,
			warnings,
		};
	} finally {
		await handle.close();
	}
}

/** Первые N живых записей — для портрета колонок. */
export async function collectDbfSample(
	filePath: string,
	meta: DbfMeta,
	limit: number,
): Promise<string[][]> {
	const rows: string[][] = [];
	for await (const batch of streamDbfRows(
		filePath,
		meta,
		Math.min(limit, STREAM_BATCH_ROWS),
	)) {
		for (const row of batch.rows) {
			rows.push(row);
			if (rows.length >= limit) return rows;
		}
	}
	return rows;
}

/**
 * Выдаёт записи DBF партиями.
 *
 * Читает файл дескриптором по смещениям, поэтому в памяти живёт одна партия.
 * Записи с признаком удаления пропускаются, как и в разборе целиком: удаление в
 * DBF ленивое, и файл может содержать десятилетия вычеркнутых записей.
 */
export async function* streamDbfRows(
	filePath: string,
	meta: DbfMeta,
	batchRows: number,
): AsyncGenerator<StreamDbfBatch> {
	const decoder = new TextDecoder(meta.encoding);
	const handle = await open(filePath, "r");
	try {
		const fileSize = (await handle.stat()).size;
		const availableRecords = Math.floor(
			(fileSize - meta.headerLength) / meta.recordLength,
		);
		const totalRecords =
			meta.declaredRecords === 0
				? availableRecords
				: Math.min(meta.declaredRecords, availableRecords);

		const chunkBuffer = Buffer.alloc(meta.recordLength * batchRows);
		let processed = 0;

		while (processed < totalRecords) {
			const recordsToRead = Math.min(batchRows, totalRecords - processed);
			const bytesToRead = recordsToRead * meta.recordLength;
			const position = meta.headerLength + processed * meta.recordLength;
			const { bytesRead } = await handle.read(
				chunkBuffer,
				0,
				bytesToRead,
				position,
			);
			if (bytesRead <= 0) break;

			const rows: string[][] = [];
			let skippedDeleted = 0;
			const fullRecords = Math.floor(bytesRead / meta.recordLength);

			for (let index = 0; index < fullRecords; index += 1) {
				const start = index * meta.recordLength;
				const record = chunkBuffer.subarray(start, start + meta.recordLength);
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				const flag = record[0]!;
				// 0x1A — маркер конца файла в старых DBF; всё после него мусор.
				if (flag === 0x1a) {
					processed = totalRecords;
					break;
				}
				if (flag === 0x2a) {
					skippedDeleted += 1;
					continue;
				}
				rows.push(decodeDbfRecord(record, meta, decoder));
			}

			processed += fullRecords;
			if (rows.length > 0 || skippedDeleted > 0) yield { rows, skippedDeleted };
		}
	} finally {
		await handle.close();
	}
}

/**
 * Выдаёт строки текстовой таблицы партиями.
 *
 * Кодировка определяется по голове файла один раз, а декодирование идёт
 * потоково через TextDecoder со stream: true — иначе многобайтовый символ,
 * попавший на границу чанка, превратился бы в вопросительный ромб.
 */
export async function* streamDelimitedRows(
	filePath: string,
	encoding: string,
	delimiter: string,
	hasHeader: boolean,
	batchRows: number,
): AsyncGenerator<StreamDelimitedBatch> {
	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(encoding, { fatal: false });
	} catch {
		decoder = new TextDecoder("utf-8", { fatal: false });
	}

	const accumulator = new DelimitedRowAccumulator(delimiter);
	let pending: string[][] = [];
	let headerDropped = !hasHeader;
	let first = true;

	const stream = createReadStream(filePath, { highWaterMark: 1024 * 1024 });

	for await (const chunk of stream) {
		let text = decoder.decode(chunk as Buffer, { stream: true });
		if (first) {
			// BOM удаляется один раз: иначе он приклеится к имени первой колонки.
			text = normalizeDecodedText(text);
			first = false;
		} else {
			text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		}

		for (const row of accumulator.push(text)) {
			if (!headerDropped) {
				headerDropped = true;
				continue;
			}
			pending.push(row);
		}

		while (pending.length >= batchRows) {
			yield { rows: pending.slice(0, batchRows) };
			pending = pending.slice(batchRows);
		}
	}

	const tailText = decoder.decode();
	if (tailText) {
		for (const row of accumulator.push(
			tailText.replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
		)) {
			if (!headerDropped) {
				headerDropped = true;
				continue;
			}
			pending.push(row);
		}
	}

	for (const row of accumulator.flush()) {
		if (!headerDropped) {
			headerDropped = true;
			continue;
		}
		pending.push(row);
	}

	while (pending.length > 0) {
		yield { rows: pending.slice(0, batchRows) };
		pending = pending.slice(batchRows);
	}
}
