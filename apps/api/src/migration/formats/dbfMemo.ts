import { open, stat } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

/**
 * Чтение memo-файлов DBF: .FPT (FoxPro) и .DBT (dBASE).
 *
 * ЗАЧЕМ ЭТО ОБЯЗАТЕЛЬНО
 * В таблице DBF поле типа M хранит не текст, а НОМЕР БЛОКА в отдельном файле.
 * Без этого файла перенос сохранял в карточку пациента строку «14» вместо
 * анамнеза. Раньше движок честно предупреждал об этом и шёл дальше — но
 * предупреждение не заменяет данных: именно в memo-полях у стоматологических
 * систем лежит всё, ради чего переносят историю, — жалобы, анамнез, описание
 * лечения, заметки врача. Перенести пациентов без них значит перенести
 * телефонный справочник.
 *
 * ДВА ФОРМАТА, И ОНИ РАЗНЫЕ
 * FPT (FoxPro): у каждого блока свой заголовок с типом и точной длиной.
 * DBT (dBASE III): длины нет вовсе, текст заканчивается двумя байтами 0x1A.
 * Путать их нельзя: чтение DBT правилами FPT даёт мусор в первых восьми байтах
 * каждого поля.
 */

export type MemoFormat = "fpt" | "dbt3" | "dbt4";

export interface MemoFile {
	format: MemoFormat;
	/** Размер блока в байтах: номер блока умножается на него. */
	blockSize: number;
	filePath: string;
	/** Читает текст по номеру блока. Пустой блок и нулевой номер дают пустую строку. */
	read(blockNumber: number): Promise<string>;
	close(): Promise<void>;
}

/** Стандартные расширения memo рядом с таблицей, в порядке предпочтения. */
const MEMO_EXTENSIONS = ["fpt", "FPT", "dbt", "DBT"];

/**
 * Ищет memo-файл рядом с таблицей.
 *
 * Имя совпадает с именем .dbf, отличается только расширением. Регистр проверяем
 * оба: выгрузки из DOS приходят в верхнем регистре, а файловые системы Linux
 * различают регистр — «PACIENT.DBF» и «pacient.fpt» рядом не найдутся, если
 * искать только в одном написании.
 */
export async function findMemoFile(dbfPath: string): Promise<string | null> {
	const directory = path.dirname(dbfPath);
	const base = path.basename(dbfPath).replace(/\.[^.]*$/, "");

	for (const extension of MEMO_EXTENSIONS) {
		for (const candidateBase of [
			base,
			base.toUpperCase(),
			base.toLowerCase(),
		]) {
			const candidate = path.join(directory, `${candidateBase}.${extension}`);
			try {
				const info = await stat(candidate);
				if (info.isFile() && info.size > 0) return candidate;
			} catch {
				// Файла нет — пробуем следующее написание.
			}
		}
	}
	return null;
}

/** Признак блока с окончанием текста в dBASE III: два байта 0x1A. */
function findDbtTerminator(buffer: Buffer): number {
	for (let index = 0; index + 1 < buffer.length; index += 1) {
		if (buffer[index] === 0x1a && buffer[index + 1] === 0x1a) return index;
	}
	// Одиночный терминатор тоже встречается в старых файлах.
	const single = buffer.indexOf(0x1a);
	return single === -1 ? buffer.length : single;
}

/**
 * Открывает memo-файл и определяет его формат.
 *
 * Формат определяется по содержимому заголовка, а не по расширению: встречаются
 * файлы .dbt, внутри которых на самом деле FPT, — так бывает после переименования
 * при выгрузке.
 */
export async function openMemoFile(
	filePath: string,
	encoding: string,
): Promise<MemoFile> {
	const handle = await open(filePath, "r");

	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(encoding);
	} catch {
		decoder = new TextDecoder("windows-1251");
	}

	try {
		const header = Buffer.alloc(512);
		await handle.read(header, 0, 512, 0);

		/**
		 * FPT: байты 6–7 содержат размер блока в порядке BIG-endian — единственное
		 * поле обратного порядка в форматах семейства dBASE, и его легко прочитать
		 * неверно. Остальные числа в FPT тоже big-endian.
		 */
		const fptBlockSize = header.readUInt16BE(6);
		const dbtBlockSizeField = header.readUInt16LE(20);

		const looksLikeFpt =
			fptBlockSize >= 32 &&
			fptBlockSize <= 32768 &&
			(fptBlockSize & (fptBlockSize - 1)) === 0;

		if (looksLikeFpt) {
			const blockSize = fptBlockSize;
			return {
				format: "fpt",
				blockSize,
				filePath,
				async read(blockNumber: number): Promise<string> {
					if (!Number.isFinite(blockNumber) || blockNumber <= 0) return "";
					const position = blockNumber * blockSize;
					const blockHeader = Buffer.alloc(8);
					const headerRead = await handle.read(blockHeader, 0, 8, position);
					if (headerRead.bytesRead < 8) return "";

					// Тип блока: 1 — текст, 0 — картинка, 2 — объект.
					const blockType = blockHeader.readUInt32BE(0);
					const length = blockHeader.readUInt32BE(4);
					if (blockType !== 1) return "";
					// Защита от повреждённого заголовка: 64 МБ в одном поле не бывает.
					if (length === 0 || length > 64 * 1024 * 1024) return "";

					const content = Buffer.alloc(length);
					await handle.read(content, 0, length, position + 8);
					return decoder.decode(content).replace(/\0+$/g, "").trim();
				},
				async close(): Promise<void> {
					await handle.close();
				},
			};
		}

		/**
		 * DBT. У dBASE IV в заголовке есть размер блока, у dBASE III его нет и он
		 * всегда 512. Нулевое или неправдоподобное поле означает третью версию.
		 */
		const isDbase4 = dbtBlockSizeField >= 64 && dbtBlockSizeField <= 32768;
		const blockSize = isDbase4 ? dbtBlockSizeField : 512;

		return {
			format: isDbase4 ? "dbt4" : "dbt3",
			blockSize,
			filePath,
			async read(blockNumber: number): Promise<string> {
				if (!Number.isFinite(blockNumber) || blockNumber <= 0) return "";
				const position = blockNumber * blockSize;

				/**
				 * У dBASE IV блок начинается с маркера 0xFF 0xFF 0x08 0x00 и длины.
				 * У dBASE III длины нет: читаем блоками до терминатора 0x1A 0x1A.
				 */
				if (isDbase4) {
					const blockHeader = Buffer.alloc(8);
					const headerRead = await handle.read(blockHeader, 0, 8, position);
					if (headerRead.bytesRead < 8) return "";
					if (blockHeader[0] === 0xff && blockHeader[1] === 0xff) {
						const length = blockHeader.readUInt32LE(4);
						if (length > 8 && length < 64 * 1024 * 1024) {
							const content = Buffer.alloc(length - 8);
							await handle.read(content, 0, content.length, position + 8);
							return decoder.decode(content).replace(/\0+$/g, "").trim();
						}
					}
				}

				// dBASE III либо блок без корректного заголовка: читаем до терминатора.
				const chunks: Buffer[] = [];
				let offset = position;
				for (let guard = 0; guard < 256; guard += 1) {
					const chunk = Buffer.alloc(blockSize);
					const { bytesRead } = await handle.read(chunk, 0, blockSize, offset);
					if (bytesRead <= 0) break;
					const used = chunk.subarray(0, bytesRead);
					const terminator = findDbtTerminator(used);
					if (terminator < used.length) {
						chunks.push(used.subarray(0, terminator));
						break;
					}
					chunks.push(used);
					offset += bytesRead;
				}

				return decoder
					.decode(Buffer.concat(chunks))
					.replace(/\0+$/g, "")
					.trim();
			},
			async close(): Promise<void> {
				await handle.close();
			},
		};
	} catch (error) {
		await handle.close();
		throw error;
	}
}

/**
 * Значение memo-поля из таблицы — это номер блока.
 *
 * FoxPro пишет его четырьмя байтами двоичного числа, dBASE — десятичной строкой
 * в поле длиной 10 символов, дополненной пробелами. Пустое поле означает
 * отсутствие текста, и это не ошибка.
 */
export function parseMemoPointer(rawValue: string): number {
	const trimmed = rawValue.trim();
	if (!trimmed) return 0;
	const numeric = Number(trimmed);
	return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}
