import type { TextDecoder } from "node:util";
import type { MemoFile } from "../formats/dbfMemo.js";
import { parseMemoPointer } from "../formats/dbfMemo.js";
import type { DbfMeta } from "./types.js";

/** Выравнивает строку по числу колонок, не отбрасывая содержимое. */
export function alignRow(
	row: string[],
	columnCount: number,
	delimiter?: string | null,
): string[] {
	if (row.length === columnCount) return row;
	if (row.length < columnCount)
		return [...row, ...Array<string>(columnCount - row.length).fill("")];
	// Хвост склеивается в последнюю колонку — текст не теряется.
	const head = row.slice(0, columnCount - 1);
	return [
		...head,
		row.slice(columnCount - 1).join(delimiter ?? " "),
	];
}

/**
 * Подставляет значения memo-полей в партию строк DBF.
 * Поле типа M хранит номер блока, а не текст: без .fpt/.dbt в карточку
 * пациента попала бы строка «14» вместо анамнеза.
 */
export async function applyDbfMemoFields(
	rows: string[][],
	memoFieldIndexes: number[],
	memo: MemoFile,
): Promise<void> {
	for (const row of rows) {
		for (const fieldIndex of memoFieldIndexes) {
			const pointer = parseMemoPointer(row[fieldIndex] ?? "");
			row[fieldIndex] = pointer > 0 ? await memo.read(pointer) : "";
		}
	}
}

/** Декодирует одну запись DBF. Логика типов та же, что в parsers/dbf.ts. */
export function decodeDbfRecord(
	record: Buffer,
	meta: DbfMeta,
	decoder: TextDecoder,
): string[] {
	const values: string[] = [];
	let offset = 1;
	for (const field of meta.fields) {
		const raw = record.subarray(offset, offset + field.length);
		offset += field.length;

		switch (field.type) {
			case "I":
				values.push(raw.length >= 4 ? String(raw.readInt32LE(0)) : "");
				break;
			case "L": {
				const char = String.fromCharCode(raw[0] ?? 0x20).toUpperCase();
				values.push(
					char === "T" || char === "Y"
						? "1"
						: char === "F" || char === "N"
							? "0"
							: "",
				);
				break;
			}
			case "D": {
				const text = decoder.decode(raw).replace(/\0/g, "").trim();
				values.push(/^\d{8}$/.test(text) && text !== "00000000" ? text : "");
				break;
			}
			case "Y": {
				if (raw.length < 8) {
					values.push("");
					break;
				}
				// Деньги: восемь байт целого с четырьмя знаками, через BigInt.
				const scaled = raw.readBigInt64LE(0);
				const negative = scaled < 0n;
				const absolute = negative ? -scaled : scaled;
				values.push(
					`${negative ? "-" : ""}${absolute / 10000n}.${(absolute % 10000n).toString().padStart(4, "0")}`,
				);
				break;
			}
			case "B":
			case "O":
				values.push(raw.length >= 8 ? String(raw.readDoubleLE(0)) : "");
				break;
			case "+":
				values.push(raw.length >= 4 ? String(raw.readUInt32LE(0)) : "");
				break;
			case "T":
			case "@": {
				if (raw.length < 8) {
					values.push("");
					break;
				}
				const julianDay = raw.readInt32LE(0);
				const millis = raw.readInt32LE(4);
				if (julianDay === 0) {
					values.push("");
					break;
				}
				const date = new Date((julianDay - 2440588) * 86_400_000 + millis);
				values.push(
					Number.isNaN(date.getTime())
						? ""
						: date.toISOString().replace(".000Z", "Z"),
				);
				break;
			}
			default:
				values.push(decoder.decode(raw).replace(/\0/g, "").trim());
				break;
		}
	}
	return values;
}

/** Состояние кавычек в конце фрагмента: внутри значения или нет. */
export function quoteStateOf(fragment: string): boolean {
	let inQuotes = false;
	let fieldEmpty = true;
	for (let index = 0; index < fragment.length; index += 1) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const char = fragment[index]!;
		if (inQuotes) {
			if (char === '"') {
				if (fragment[index + 1] === '"') {
					index += 1;
					continue;
				}
				inQuotes = false;
			}
			continue;
		}
		if (char === '"' && fieldEmpty) {
			inQuotes = true;
			fieldEmpty = false;
			continue;
		}
		fieldEmpty =
			char === "," ||
			char === ";" ||
			char === "\t" ||
			char === "|" ||
			char === "\n";
	}
	return inQuotes;
}

/**
 * Разбивает поток текста на строки таблицы, соблюдая кавычки через границы чанков.
 *
 * Именно здесь проходит разница между «читаю построчно» и «читаю по правилам
 * RFC 4180». Значение с переводом строки внутри кавычек — обычное дело для
 * колонки «Жалобы» — растягивается на несколько физических строк файла и может
 * попасть на границу чанка. Состояние кавычек живёт между чанками, поэтому такая
 * запись не разрывается.
 */
export class DelimitedRowAccumulator {
	private buffer = "";
	private inQuotes = false;

	constructor(private readonly delimiter: string) {}

	/** Добавляет текст и возвращает завершённые строки. */
	push(text: string): string[][] {
		this.buffer += text;
		return this.drain(false);
	}

	/** Отдаёт остаток после конца файла. */
	flush(): string[][] {
		return this.drain(true);
	}

	private drain(final: boolean): string[][] {
		const rows: string[][] = [];
		let row: string[] = [];
		let field = "";
		let consumedTo = 0;

		for (let index = 0; index < this.buffer.length; index += 1) {
			// biome-ignore lint/style/noNonNullAssertion: automated suppression
			const char = this.buffer[index]!;

			if (this.inQuotes) {
				if (char === '"') {
					if (this.buffer[index + 1] === '"') {
						field += '"';
						index += 1;
						continue;
					}
					this.inQuotes = false;
					continue;
				}
				field += char;
				continue;
			}

			if (char === '"') {
				// Открывающей считается только кавычка в начале поля.
				if (field.length === 0) this.inQuotes = true;
				else field += char;
				continue;
			}

			if (char === this.delimiter) {
				row.push(field);
				field = "";
				continue;
			}

			if (char === "\n") {
				row.push(field);
				field = "";
				rows.push(row);
				row = [];
				// Позиция, до которой буфер разобран без остатка.
				consumedTo = index + 1;
				continue;
			}

			field += char;
		}

		if (final) {
			if (field.length > 0 || row.length > 0) {
				row.push(field);
				rows.push(row);
			}
			this.buffer = "";
			return rows.filter((candidate) =>
				candidate.some((cell) => cell.trim() !== ""),
			);
		}

		/**
		 * Незавершённый хвост остаётся в буфере: он либо оборван посередине строки,
		 * либо находится внутри кавычек. Состояние inQuotes при этом надо вернуть к
		 * тому, каким оно было на позиции consumedTo, — иначе следующий чанк будет
		 * разобран с неверным флагом.
		 */
		const tail = this.buffer.slice(consumedTo);
		this.buffer = tail;
		this.inQuotes = quoteStateOf(tail);

		return rows.filter((candidate) =>
			candidate.some((cell) => cell.trim() !== ""),
		);
	}
}
